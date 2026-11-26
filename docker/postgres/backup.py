#!/usr/bin/env python3
"""Create a PostgreSQL and media snapshot, or rehearse its restore in a fresh database."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import time
from datetime import datetime, timezone
from uuid import uuid4

METRICS = '''SELECT json_build_object(
  'orders', count(*), 'orderTotals', (SELECT jsonb_object_agg(currency, amount) FROM
    (SELECT currency, sum(total)::text AS amount FROM "Order" GROUP BY currency) t),
  'variants', (SELECT count(*) FROM "ProductVariant"),
  'stock', (SELECT coalesce(sum("stockQuantity"), 0) FROM "ProductVariant"),
  'stockFingerprint', (SELECT encode(sha256(convert_to(coalesce(string_agg(id::text || ':' ||
    "stockQuantity"::text, ',' ORDER BY id), ''), 'UTF8')), 'hex') FROM "ProductVariant"),
  'samples', (SELECT coalesce(json_agg(path ORDER BY path), '[]'::json) FROM (
    (SELECT "storageKey" || '/' || widths[1] || '.webp' AS path FROM "ProductImage"
     WHERE cardinality(widths) > 0 ORDER BY id LIMIT 12)
    UNION ALL
    (SELECT "imageKey" || '/' || "imageWidths"[1] || '.webp' FROM "MediaItem"
     WHERE "imageKey" IS NOT NULL AND cardinality("imageWidths") > 0 ORDER BY id LIMIT 6)
    UNION ALL
    (SELECT "videoKey" || CASE "videoType" WHEN 'video/webm' THEN '/video.webm' ELSE '/video.mp4' END
     FROM "MediaItem" WHERE "videoKey" IS NOT NULL ORDER BY id LIMIT 3)
  ) sample)) FROM "Order"'''


def pg(*args):
    container = os.getenv('BACKUP_PG_CONTAINER')
    return (['docker', 'exec', '-i', container] if container else []) + list(args)


def psql(database):
    return pg('psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', os.environ['PGUSER'], '-d', database)


def sha(path):
    with path.open('rb') as f:
        digest = hashlib.sha256()
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            digest.update(chunk)
        return digest.hexdigest()


def copy_media(source, target):
    if ':' in str(source):
        subprocess.run(['rclone', 'copy', str(source), str(target)], check=True)
    else:
        shutil.copytree(source, target)


def sample_hashes(root, paths):
    hashes = {}
    for name in paths:
        path = (root / name).resolve()
        if root.resolve() not in path.parents or not path.is_file() or path.stat().st_size == 0:
            raise ValueError(f'Missing or empty media sample: {name}')
        hashes[name] = sha(path)
    return hashes


def create(args):
    database = os.environ['PGDATABASE']
    root = Path(args.directory).resolve()
    if args.media and ':' not in args.media and Path(args.media).resolve() in (root, *root.parents):
        raise ValueError('Snapshot directory must be outside the media directory')
    root.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc)
    name = stamp.strftime('%Y%m%dT%H%M%SZ-') + uuid4().hex[:12]
    final = root / name
    with tempfile.TemporaryDirectory(dir=root, prefix='.partial-') as work:
        out = Path(work) / name
        out.mkdir()
        # Keep one snapshot open while pg_dump and the baseline read the same committed rows.
        with subprocess.Popen(psql(database), stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                              text=True, bufsize=1) as session:
            try:
                session.stdin.write('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;\nSELECT pg_export_snapshot();\n')
                session.stdin.flush()
                snapshot = session.stdout.readline().strip()
                if not re.fullmatch(r'[0-9A-Fa-f-]+', snapshot):
                    raise RuntimeError('Could not export a database snapshot')
                with (out / 'database.dump').open('wb') as dump:
                    subprocess.run(pg('pg_dump', '-U', os.environ['PGUSER'], '-d', database,
                                      '-Fc', '--snapshot', snapshot), stdout=dump, check=True)
                session.stdin.write(METRICS + ';\nCOMMIT;\n')
                session.stdin.close()
                metrics = json.loads(session.stdout.read())
                if session.wait() != 0:
                    raise RuntimeError('Could not read snapshot metrics')
            finally:
                if not session.stdin.closed:
                    session.stdin.close()
        files = {}
        if args.media:
            copy_media(args.media, out / 'media')
            files = sample_hashes(out / 'media', metrics['samples'])
        manifest = dict(captured=stamp.isoformat(), metrics=metrics, files=files,
                        scope='database-and-media' if args.media else 'database',
                        dump=sha(out / 'database.dump'))
        (out / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
        out.rename(final)
    if args.offsite:
        target = args.offsite.rstrip('/') + '/' + name
        # Publish the manifest last so an interrupted upload cannot be selected for restore.
        subprocess.run(['rclone', 'copy', str(final), target, '--immutable', '--exclude', '/manifest.json'], check=True)
        subprocess.run(['rclone', 'copyto', str(final / 'manifest.json'), target + '/manifest.json', '--immutable'], check=True)
    print(final)


def latest(root):
    if ':' in root:
        entries = subprocess.check_output(['rclone', 'lsf', root, '--recursive', '--files-only',
                                           '--include', '/*/manifest.json'], text=True).splitlines()
        names = [entry.split('/')[0] for entry in entries]
    else:
        names = [p.parent.name for p in Path(root).glob('*/manifest.json')]
    ids = sorted(n for n in names if re.fullmatch(r'[0-9]{8}T[0-9]{6}Z-[a-f0-9]{12}', n))
    if not ids:
        raise ValueError('No completed snapshot found')
    return root.rstrip('/') + '/' + ids[-1]


def verify(args):
    start = time.monotonic()
    with tempfile.TemporaryDirectory(prefix='teran-restore-') as work:
        root = Path(work)
        if ':' in args.snapshot:
            source = root / 'download'
            copy_media(args.snapshot, source)
        else:
            source = Path(args.snapshot)
        manifest = json.loads((source / 'manifest.json').read_text())
        scope = manifest.get('scope', 'database-and-media')
        if scope not in ('database', 'database-and-media'):
            raise ValueError('Unknown snapshot scope')
        if sha(source / 'database.dump') != manifest['dump']:
            raise ValueError('Database dump checksum differs')
        db = 'teran_restore_' + uuid4().hex
        user = os.environ['PGUSER']
        subprocess.run(pg('createdb', '-U', user, db), check=True)
        try:
            with (source / 'database.dump').open('rb') as dump:
                subprocess.run(pg('pg_restore', '-U', user, '-d', db, '--no-owner', '--no-acl', '--exit-on-error'), stdin=dump, check=True)
            restored = json.loads(subprocess.check_output(psql(db) + ['-c', METRICS]))
            if restored != manifest['metrics']:
                raise ValueError('Restored order totals, inventory or media keys differ')
            hashes = {}
            if scope == 'database-and-media':
                copy_media(source / 'media', root / 'restored-media')
                hashes = sample_hashes(root / 'restored-media', restored['samples'])
            if hashes != manifest['files']:
                raise ValueError('Restored media checksums differ')
        finally:
            subprocess.run(pg('dropdb', '-U', user, db), check=True)
    print(json.dumps(dict(scope=scope, captured=manifest['captured'], verified=datetime.now(timezone.utc).isoformat(),
                          seconds=round(time.monotonic() - start, 2), orders=restored['orders'],
                          totals=restored['orderTotals'], stock=restored['stock'], media=len(hashes))))


if __name__ == '__main__':
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='action', required=True)
    make = commands.add_parser('create')
    make.add_argument('directory')
    mode = make.add_mutually_exclusive_group(required=True)
    mode.add_argument('--media', help='Include this uploads directory or rclone source')
    mode.add_argument('--database-only', action='store_true', help='Capture PostgreSQL without fetching media')
    make.add_argument('--offsite', help='Independent rclone destination for completed snapshots')
    check = commands.add_parser('verify')
    check.add_argument('snapshot', help='Snapshot directory or rclone path to the snapshot')
    recent = commands.add_parser('verify-latest')
    recent.add_argument('snapshot', help='Directory or rclone root containing dated snapshots')
    options = parser.parse_args()
    if options.action == 'verify-latest':
        options.snapshot = latest(options.snapshot)
    (create if options.action == 'create' else verify)(options)
