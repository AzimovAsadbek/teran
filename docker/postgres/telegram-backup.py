#!/usr/bin/env python3
"""Deliver encrypted TERAN database dumps and service status to the configured private group."""
import argparse
from datetime import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
from zoneinfo import ZoneInfo


CONFIG = Path('/etc/teran-backup')
ROOT = Path('/var/backups/teran/snapshots')
PART_SIZE = 45_000_000
BOT = 'teran_saver_bot'
SERVICES = {'Sayt': 'web', 'API': 'api', 'Baza': 'postgres'}
TIMEZONE = ZoneInfo('Asia/Tashkent')


def call(token, method, fields=None, document=None):
    # Feed the authenticated URL through stdin so neither the process list nor HTTP errors log it.
    cmd = ['curl', '--silent', '--show-error', '--connect-timeout', '15', '--max-time', '240',
           '--config', '-', '--request', 'POST']
    for name, value in (fields or {}).items():
        cmd.extend(['--form-string', name + '=' + str(value)])
    if document:
        cmd.extend(['--form', 'document=@' + str(document) + ';type=application/octet-stream'])
    result = subprocess.run(cmd, input=f'url = "https://api.telegram.org/bot{token}/{method}"\n',
                            text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError(f'Telegram {method} transport error {result.returncode}')
    reply = json.loads(result.stdout)
    if not reply.get('ok'):
        raise RuntimeError(f'Telegram {method} returned {reply.get("error_code")}')
    return reply['result']


def destination():
    token = (CONFIG / 'bot.token').read_text().strip()
    if not re.fullmatch(r'\d+:[\w-]+', token, re.ASCII):
        raise ValueError('Invalid Telegram credential format')
    chat_id = int((CONFIG / 'chat.id').read_text())
    if call(token, 'getMe')['username'].lower() != BOT:
        raise ValueError('Unexpected Telegram bot')
    chat = call(token, 'getChat', {'chat_id': chat_id})
    if (chat['id'] != chat_id or chat['type'] not in ('group', 'supergroup')
            or chat.get('username') or chat.get('active_usernames')):
        raise ValueError('The configured destination must be a private Telegram group')
    return token, chat_id


def service_status():
    lines = []
    version = None
    for label, suffix in SERVICES.items():
        result = subprocess.run(['docker', 'inspect', '--format',
                                 '{{.Config.Image}} {{if .State.Health}}{{.State.Health.Status}}'
                                 '{{else}}{{.State.Status}}{{end}}', 'teran-production-' + suffix + '-1'],
                                capture_output=True, text=True)
        if result.returncode == 0:
            image, state = result.stdout.strip().split()
            lines.append(f'{label} — {state}')
            if suffix == 'web':
                version = image.rpartition(':')[2]
        else:
            lines.append(f'{label} — topilmadi')
    lines.append(f'Reliz {version or "noma’lum"} · diskda {shutil.disk_usage(ROOT).free // (1024**3)} GiB bo‘sh')
    return '\n'.join(lines)


def write_state(path, data):
    with tempfile.NamedTemporaryFile('w', dir=path.parent, delete=False) as file:
        json.dump(data, file)
        file.flush()
        os.fsync(file.fileno())
    os.replace(file.name, path)


def checksum(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def encrypt(folder, manifest):
    archive = folder / 'database.dump.age'
    if archive.exists():
        return archive
    raw = folder / 'database.dump'
    if checksum(raw) != manifest['dump']:
        raise ValueError('The source database checksum differs from the snapshot manifest')
    with tempfile.TemporaryDirectory(dir=folder) as work:
        temporary = Path(work) / archive.name
        subprocess.run(['age', '-R', str(CONFIG / 'recipient.txt'), '-o', str(temporary), str(raw)],
                       check=True)
        os.replace(temporary, archive)
    return archive


def publish(folder, token, chat_id):
    manifest = json.loads((folder / 'manifest.json').read_text())
    state_file = folder / 'telegram-delivery.json'
    state = json.loads(state_file.read_text()) if state_file.exists() else {'messages': []}
    if state.get('complete'):
        return
    archive = encrypt(folder, manifest)
    count = (archive.stat().st_size + PART_SIZE - 1) // PART_SIZE
    captured = datetime.fromisoformat(manifest['captured']).astimezone(TIMEZONE)
    title = f'TERAN · {captured:%d.%m.%Y %H:%M} (Toshkent)'
    prefix = 'TERAN-' + folder.name + '.dump.age'
    health = service_status()
    with tempfile.TemporaryDirectory(dir=folder) as work, archive.open('rb') as source:
        source.seek(len(state['messages']) * PART_SIZE)
        for index in range(len(state['messages']), count):
            filename = prefix if count == 1 else f'{prefix}.part{index + 1:04d}-of-{count:04d}'
            part = Path(work) / filename
            if count == 1:
                os.link(archive, part)
            else:
                with part.open('wb') as target:
                    remaining = PART_SIZE
                    while remaining:
                        block = source.read(min(1024 * 1024, remaining))
                        if not block:
                            break
                        target.write(block)
                        remaining -= len(block)
            caption = f'{title}\nShifrlangan baza · {index + 1}/{count}\nBaza nusxasi serverda. Rasm va videolar R2’da.\n\n{health}'
            message = call(token, 'sendDocument', {'chat_id': chat_id, 'caption': caption}, part)
            if message['chat']['id'] != chat_id or message['document']['file_size'] != part.stat().st_size:
                raise RuntimeError('Telegram delivery could not be verified')
            state['messages'].append({'message_id': message['message_id'], 'file_id': message['document']['file_id']})
            state['complete'] = len(state['messages']) == count
            write_state(state_file, state)
            part.unlink()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('publish', 'backup-failed', 'verify-failed'))
    args = parser.parse_args()
    os.umask(0o077)
    token, chat_id = destination()
    if args.action == 'publish':
        for manifest in sorted(ROOT.glob('*/manifest.json')):
            if re.fullmatch(r'\d{8}T\d{6}Z-[a-f0-9]{12}', manifest.parent.name):
                publish(manifest.parent, token, chat_id)
    else:
        failure = 'Zaxira olish' if args.action == 'backup-failed' else 'Zaxiradan tiklash sinovi'
        call(token, 'sendMessage', {'chat_id': chat_id, 'text': f'TERAN · {failure} bajarilmadi.\n' + service_status()})
