import importlib.util
import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch


spec = importlib.util.spec_from_file_location('telegram_backup', Path(__file__).with_name('telegram-backup.py'))
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


class TelegramBackupTest(unittest.TestCase):
    def test_resume_upload_without_resending_acknowledged_parts(self):
        sent = []
        fail_second_part_once = True

        def send(token, method, fields, document):
            nonlocal fail_second_part_once
            self.assertEqual(method, 'sendDocument')
            self.assertEqual(fields['chat_id'], -123)
            if 'part0002' in document.name and fail_second_part_once:
                fail_second_part_once = False
                raise RuntimeError('Temporary network failure')
            content = document.read_bytes()
            sent.append(content)
            return {'message_id': len(sent), 'chat': {'id': -123},
                    'document': {'file_id': 'test-file-' + str(len(sent)), 'file_size': len(content)}}

        with TemporaryDirectory() as tmp:
            folder = Path(tmp)
            manifest = {'captured': '2026-11-26T00:00:00+00:00'}
            (folder / 'manifest.json').write_text(json.dumps(manifest))
            archive = folder / 'database.dump.age'
            encrypted = b'age encrypted test fixture'
            archive.write_bytes(encrypted)
            with (patch.object(worker, 'call', side_effect=send),
                  patch.object(worker, 'service_status', return_value='Sayt — healthy'),
                  patch.object(worker, 'PART_SIZE', 6)):
                with self.assertRaises(RuntimeError):
                    worker.publish(folder, 'test', -123)
                worker.publish(folder, 'test', -123)
                worker.publish(folder, 'test', -123)
            self.assertEqual(b''.join(sent), encrypted)
            self.assertTrue(json.loads((folder / 'telegram-delivery.json').read_text())['complete'])

    def test_reject_public_group_even_if_its_id_matches(self):
        with TemporaryDirectory() as tmp:
            config = Path(tmp)
            (config / 'bot.token').write_text('12345:test-token')
            (config / 'chat.id').write_text('-123')
            with (patch.object(worker, 'CONFIG', config),
                  patch.object(worker, 'call', side_effect=[
                      {'username': worker.BOT},
                      {'id': -123, 'type': 'supergroup', 'active_usernames': ['public_group']},
                  ])):
                with self.assertRaisesRegex(ValueError, 'private Telegram group'):
                    worker.destination()

    def test_broken_dump_is_rejected_before_encryption(self):
        with TemporaryDirectory() as tmp:
            folder = Path(tmp)
            (folder / 'database.dump').write_bytes(b'truncated')
            with self.assertRaisesRegex(ValueError, 'checksum'):
                worker.encrypt(folder, {'dump': '0' * 64})


if __name__ == '__main__':
    unittest.main()
