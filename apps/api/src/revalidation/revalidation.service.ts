import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';

/** Cache tags understood by the storefront's revalidation route. */
export type CacheTag = 'catalog' | 'content' | 'settings';

const DEBOUNCE_MS = 1_000;
const REQUEST_TIMEOUT_MS = 3_000;

/**
 * Tells the Next.js storefront that cached data changed (product edits, stock movements,
 * settings). Calls are debounced and fire-and-forget: a storefront outage must never fail
 * an admin action or an order, and cached pages also expire on their own.
 */
@Injectable()
export class RevalidationService implements OnModuleDestroy {
  private readonly logger = new Logger(RevalidationService.name);
  private readonly url: string | undefined;
  private readonly secret: string | undefined;
  private readonly pending = new Set<CacheTag>();
  private timer: NodeJS.Timeout | undefined;

  constructor(config: ConfigService<Env, true>) {
    this.url = config.get('WEB_REVALIDATE_URL', { infer: true });
    this.secret = config.get('REVALIDATE_SECRET', { infer: true });
  }

  notify(...tags: CacheTag[]): void {
    if (!this.url || !this.secret) return;
    for (const tag of tags) this.pending.add(tag);
    this.timer ??= setTimeout(() => void this.flush(), DEBOUNCE_MS);
  }

  onModuleDestroy(): void {
    clearTimeout(this.timer);
  }

  private async flush(): Promise<void> {
    this.timer = undefined;
    const tags = [...this.pending];
    this.pending.clear();
    if (tags.length === 0 || !this.url || !this.secret) return;
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Revalidate-Secret': this.secret },
        body: JSON.stringify({ tags }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        this.logger.warn({ status: response.status, tags }, 'Storefront revalidation was rejected');
      }
    } catch (error) {
      this.logger.warn({ err: error, tags }, 'Storefront revalidation failed');
    }
  }
}
