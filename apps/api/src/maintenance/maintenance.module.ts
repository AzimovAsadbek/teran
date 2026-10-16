import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module.js';
import { TelegramModule } from '../telegram/telegram.module.js';
import { JobsController } from './jobs.controller.js';
import { MaintenanceService } from './maintenance.service.js';

/**
 * Background housekeeping of expired records, and the endpoint that runs the scheduled jobs where
 * the API cannot keep its own timers (serverless hosting).
 */
@Module({
  imports: [PaymentsModule, TelegramModule],
  controllers: [JobsController],
  providers: [MaintenanceService],
})
export class MaintenanceModule {}
