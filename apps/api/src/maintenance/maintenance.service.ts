import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';

const FIRST_RUN_DELAY_MS = 60_000;
const INTERVAL_MS = 60 * 60_000;

export interface PurgeResult {
  sessions: number;
  carts: number;
  resetTokens: number;
}

/**
 * Removes rows that can no longer be used: expired sessions, expired carts (with their lines) and
 * password-reset tokens that are spent or expired. Runs a minute after start-up and then hourly in
 * every API process; the deletes are idempotent, so replicas may overlap safely.
 */
@Injectable()
export class MaintenanceService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(MaintenanceService.name);
  private readonly timers: NodeJS.Timeout[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  onApplicationBootstrap(): void {
    // Test suites call purgeExpired() themselves; a timer would race with their fixtures.
    if (this.config.get('NODE_ENV', { infer: true }) === 'test') return;
    const run = () =>
      void this.purgeExpired().catch((error: unknown) =>
        this.logger.warn({ err: error }, 'Clean-up of expired records failed'),
      );
    this.timers.push(
      setTimeout(run, FIRST_RUN_DELAY_MS).unref(),
      setInterval(run, INTERVAL_MS).unref(),
    );
  }

  onModuleDestroy(): void {
    for (const timer of this.timers) clearInterval(timer);
  }

  async purgeExpired(now = new Date()): Promise<PurgeResult> {
    const [sessions, carts, resetTokens] = await this.prisma.$transaction([
      this.prisma.session.deleteMany({ where: { expiresAt: { lte: now } } }),
      this.prisma.cart.deleteMany({ where: { expiresAt: { lte: now } } }),
      this.prisma.passwordResetToken.deleteMany({
        where: { OR: [{ usedAt: { not: null } }, { expiresAt: { lte: now } }] },
      }),
    ]);
    const result = {
      sessions: sessions.count,
      carts: carts.count,
      resetTokens: resetTokens.count,
    };
    if (result.sessions + result.carts + result.resetTokens > 0) {
      this.logger.log(result, 'Expired records removed');
    }
    return result;
  }
}
