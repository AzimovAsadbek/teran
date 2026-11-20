import type { ConfigService } from '@nestjs/config';
import { expect, it, vi } from 'vitest';
import type { Env } from '../config/env.js';
import { RevalidationService } from './revalidation.service.js';

it('retries a failed batch and merges new tags without a second edit of the first tag', async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValue(new Response(null, { status: 200 }));
  vi.stubGlobal('fetch', fetcher);
  const service = new RevalidationService({ get: () => 'fixture' } as unknown as ConfigService<
    Env,
    true
  >);
  try {
    service.notify('catalog');
    await vi.advanceTimersByTimeAsync(1000);
    service.notify('content');
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetcher.mock.calls[1]![1].body).tags).toEqual(['catalog', 'content']);
    await vi.advanceTimersByTimeAsync(60000);
    expect(fetcher).toHaveBeenCalledTimes(2);
  } finally {
    service.onModuleDestroy();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  }
});
