#!/usr/bin/env python3
"""Run TERAN's local snapshots and rehearse restoration in an isolated PostgreSQL container."""
import argparse
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone
from uuid import uuid4


HERE = Path(__file__).resolve().parent
SNAPSHOTS = Path('/var/backups/teran/snapshots')
POSTGRES = 'teran-production-postgres-1'
API = 'teran-production-api-1'
SNAPSHOT_NAME = re.compile(r'\d{8}T\d{6}Z-[a-f0-9]{12}')


def output(*command):
    return subprocess.check_output(command, text=True).strip()


def expire_old_snapshots():
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    completed = sorted(path for path in SNAPSHOTS.iterdir()
                       if SNAPSHOT_NAME.fullmatch(path.name) and not path.is_symlink()
                       and (path / 'manifest.json').is_file())
    for path in completed[:-2]:
        captured = datetime.strptime(path.name[:16], '%Y%m%dT%H%M%SZ').replace(tzinfo=timezone.utc)
        if captured < cutoff:
            shutil.rmtree(path)


def create():
    user, database = output('docker', 'exec', POSTGRES, 'printenv', 'POSTGRES_USER', 'POSTGRES_DB').splitlines()
    fields = ['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET']
    script = 'process.stdout.write(JSON.stringify(' + json.dumps(fields) + '.map(k => process.env[k])))'
    endpoint, key, secret, bucket = json.loads(output('docker', 'exec', API, 'node', '-e', script))
    if not all([endpoint, key, secret, bucket]):
        raise RuntimeError('The running API has no complete R2 media configuration')
    rclone = {'TYPE': 's3', 'PROVIDER': 'Cloudflare', 'REGION': 'auto', 'ENDPOINT': endpoint,
              'ACCESS_KEY_ID': key, 'SECRET_ACCESS_KEY': secret, 'NO_CHECK_BUCKET': 'true'}
    env = {**os.environ, 'PGUSER': user, 'PGDATABASE': database, 'BACKUP_PG_CONTAINER': POSTGRES,
           'RCLONE_CONFIG': '/dev/null', **{'RCLONE_CONFIG_TERANMEDIA_' + k: v for k, v in rclone.items()}}
    subprocess.run([sys.executable, str(HERE / 'backup.py'), 'create', str(SNAPSHOTS),
                    '--media', 'teranmedia:' + bucket], check=True, env=env)
    expire_old_snapshots()


def verify():
    name = 'teran-snapshot-test-' + uuid4().hex[:12]
    image = output('docker', 'inspect', '--format', '{{.Image}}', POSTGRES)
    # The temporary database uses the exact live PostgreSQL image and has no network interface
    # shared with the production stack. Docker removes its anonymous volume when it stops.
    subprocess.run(['docker', 'run', '-d', '--rm', '--network', 'none', '--name', name,
                    '-e', 'POSTGRES_PASSWORD', '-e', 'POSTGRES_USER=teran_restore', image],
                   env={**os.environ, 'POSTGRES_PASSWORD': secrets.token_urlsafe(32)},
                   check=True, stdout=subprocess.DEVNULL)
    try:
        for _ in range(60):
            ready = subprocess.run(['docker', 'exec', name, 'pg_isready', '-h', '127.0.0.1',
                                    '-U', 'teran_restore', '-d', 'postgres'],
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if ready.returncode == 0:
                break
            time.sleep(1)
        else:
            raise RuntimeError('The isolated restore database did not start')
        subprocess.run([sys.executable, str(HERE / 'backup.py'), 'verify-latest', str(SNAPSHOTS)],
                       env={**os.environ, 'PGUSER': 'teran_restore', 'BACKUP_PG_CONTAINER': name},
                       check=True)
    finally:
        subprocess.run(['docker', 'stop', name], check=True, stdout=subprocess.DEVNULL)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('create', 'verify'))
    args = parser.parse_args()
    os.umask(0o077)
    (create if args.action == 'create' else verify)()
