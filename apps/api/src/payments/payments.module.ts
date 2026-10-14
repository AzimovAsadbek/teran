import { Module } from '@nestjs/common';
import { PaymentConfig } from './payment-config.js';
import { PaymentExpiryService } from './payment-expiry.service.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { ClickService } from './providers/click.service.js';
import { PaymeService } from './providers/payme.service.js';
import { ProviderCallbacksController } from './providers/provider-callbacks.controller.js';

/**
 * Payment attempts and their lifecycle, the demo provider, the Payme and Click integrations and
 * the job that expires abandoned online payments (docs/architecture/payments.md).
 */
@Module({
  controllers: [PaymentsController, ProviderCallbacksController],
  providers: [PaymentConfig, PaymentsService, PaymeService, ClickService, PaymentExpiryService],
  exports: [PaymentConfig, PaymentsService],
})
export class PaymentsModule {}
