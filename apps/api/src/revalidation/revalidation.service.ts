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

  private inFlight = false;
  private stopped = false;
  private delay = DEBOUNCE_MS;

  constructor(config: ConfigService<Env, true>) {
    this.url = config.get('WEB_REVALIDATE_URL', { infer: true });
    this.secret = config.get('REVALIDATE_SECRET', { infer: true });
  }

  notify(...tags: CacheTag[]): void {
    if (!this.url || !this.secret) return;
    for (const tag of tags) this.pending.add(tag);
    this.schedule();
  }

  private schedule(): void {
    if (!this.inFlight && !this.stopped && this.pending.size && !this.timer) {
      this.timer = setTimeout(() => void this.flush(), this.delay);
      this.timer.unref();
    }
  }

  onModuleDestroy(): void {
    this.stopped = true;
    clearTimeout(this.timer);
  }

  private async flush(): Promise<void> {
    this.timer = undefined;
    const tags = [...this.pending];
    this.pending.clear();
    if (tags.length === 0 || !this.url || !this.secret) return;
    this.inFlight = true;
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Revalidate-Secret': this.secret },
        body: JSON.stringify({ tags }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error('Revalidation returned HTTP ' + response.status);
      this.delay = DEBOUNCE_MS;
    } catch (error) {
      for (const tag of tags) this.pending.add(tag);
      this.delay = Math.min(this.delay * 2, 60_000);
      this.logger.warn({ err: error, tags, retryMs: this.delay }, 'Storefront revalidation failed');
    } finally {
      this.inFlight = false;
      this.schedule();
    }
  }
}
