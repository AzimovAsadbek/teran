import { Controller, Get, Headers, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { digestsEqual, sha256 } from '../common/crypto.js';
import type { Env } from '../config/env.js';
import { PaymentsService } from '../payments/payments.service.js';
import { TelegramService } from '../telegram/telegram.service.js';
import { MaintenanceService, type PurgeResult } from './maintenance.service.js';

interface JobsResult {
  payments: { expired: number; cancelledOrders: number };
  purged: PurgeResult;
  telegram: { sent: number; failed: number };
}

/**
 * Runs the scheduled jobs on request, for hosts where the API cannot keep its own timers running:
 * on Vercel, Vercel Cron calls it with `Authorization: Bearer <CRON_SECRET>`. Every job is
 * idempotent (Telegram posts are claimed before they are sent). Without CRON_SECRET, or with any
 * other credentials, it answers 404 like an unknown path.
 */
@ApiExcludeController()
@SkipThrottle()
@Controller('internal/jobs')
export class JobsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly maintenance: MaintenanceService,
    private readonly telegram: TelegramService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Get('run')
  async run(@Headers('authorization') authorization: string | undefined): Promise<JobsResult> {
    const secret = this.config.get('CRON_SECRET', { infer: true });
    const authorised =
      secret !== undefined &&
      authorization !== undefined &&
      digestsEqual(sha256(authorization), sha256(`Bearer ${secret}`));
    if (!authorised) throw new NotFoundException();
    const payments = await this.payments.expireOverdue();
    const purged = await this.maintenance.purgeExpired();
    const telegram = await this.telegram.processDue();
    return { payments, purged, telegram };
  }
}
