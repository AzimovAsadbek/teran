import { Module } from '@nestjs/common';
import { TelegramProcessor } from './telegram.processor.js';
import { TelegramService } from './telegram.service.js';

/** Announcements on the Telegram channel (docs/architecture/telegram.md). */
@Module({
  providers: [TelegramService, TelegramProcessor],
  exports: [TelegramService],
})
export class TelegramModule {}
