import { Module } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service.js';

/**
 * Background housekeeping of expired records. The other scheduled jobs keep their own timers in
 * their modules: payment expiry (PaymentExpiryService) and Telegram posts (TelegramProcessor).
 */
@Module({
  providers: [MaintenanceService],
})
export class MaintenanceModule {}
