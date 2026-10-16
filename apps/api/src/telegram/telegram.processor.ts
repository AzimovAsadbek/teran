import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { TelegramService } from './telegram.service.js';

const INTERVAL_MS = 60_000;

/**
 * Delivers due Telegram posts every minute in long-running API processes (posts waiting after a
 * rate limit or a connection failure). Serverless hosts run the same work from the scheduled-jobs
 * endpoint. Safe with several processes: each post is claimed before it is sent.
 */
@Injectable()
export class TelegramProcessor implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(TelegramProcessor.name);
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly telegram: TelegramService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  onApplicationBootstrap(): void {
    // Test suites drive delivery themselves; a timer would race with their fixtures.
    if (this.config.get('NODE_ENV', { infer: true }) === 'test') return;
    if (this.telegram.mode === 'disabled') return;
    this.timer = setInterval(() => {
      void this.telegram
        .processDue()
        .catch((error: unknown) => this.logger.warn({ err: error }, 'Telegram processing failed'));
    }, INTERVAL_MS).unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
