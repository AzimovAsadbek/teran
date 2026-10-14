import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { PaymentsService } from './payments.service.js';

const INTERVAL_MS = 60_000;

/**
 * Runs PaymentsService.expireOverdue every minute, so stock held by an abandoned online payment is
 * returned shortly after the payment window ends. Safe in several API processes at once.
 */
@Injectable()
export class PaymentExpiryService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(PaymentExpiryService.name);
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly payments: PaymentsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  onApplicationBootstrap(): void {
    // Test suites call expireOverdue() themselves; a timer would race with their fixtures.
    if (this.config.get('NODE_ENV', { infer: true }) === 'test') return;
    this.timer = setInterval(() => {
      void this.payments
        .expireOverdue()
        .catch((error: unknown) =>
          this.logger.warn({ err: error }, 'Expiring overdue payments failed'),
        );
    }, INTERVAL_MS).unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
