import { describe, expect, it, vi } from 'vitest';
import { indexNowKey, INDEXNOW_ENDPOINT, announceRecent, submitToIndexNow } from './indexnow';

describe('IndexNow', () => {
  it('derives a stable 32-character key from the revalidation secret, none without it', () => {
    const key = indexNowKey('perf-only-secret');
    expect(key).toMatch(/^[0-9a-f]{32}$/);
    expect(indexNowKey('perf-only-secret')).toBe(key);
    expect(indexNowKey('another-secret')).not.toBe(key);
    expect(indexNowKey(undefined)).toBeNull();
    expect(indexNowKey('')).toBeNull();
  });

  it('announces pages changed in the last minutes, retries a 503, and remembers only accepted changes', async () => {
    const now = Date.parse('2026-10-30T10:00:00Z');
    const entries = [
      { url: 'https://terantrade.uz/products/new-tea', lastModified: '2026-10-30T09:58:00Z' },
      { url: 'https://terantrade.uz/ru/products/new-tea', lastModified: '2026-10-30T09:58:00Z' },
      { url: 'https://terantrade.uz/products/old-tea', lastModified: '2026-10-29T09:00:00Z' },
      { url: 'https://terantrade.uz/about' },
    ];
    const sent = new Map<string, number>([['old', now - 86400000]]);
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValue(new Response(null, { status: 202 }));
    const options = { now, fetcher, key: 'fixture', siteUrl: 'https://example.test' };
    vi.useFakeTimers();
    try {
      const delivery = announceRecent(entries, sent, options);
      await vi.advanceTimersByTimeAsync(1);
      expect(sent.size).toBe(0);
      await vi.advanceTimersByTimeAsync(1000);
      await delivery;
      expect([...sent.keys()]).toEqual(entries.slice(0, 2).map((entry) => entry.url));
      await announceRecent(entries, sent, options);
      expect(fetcher).toHaveBeenCalledTimes(2);
      await announceRecent([{ ...entries[0]!, lastModified: new Date(now) }], sent, options);
      expect(fetcher).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('sends the addresses with the key and where it is published', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));

    const status = await submitToIndexNow({
      urls: ['https://terantrade.uz/products/new-tea'],
      key: 'a'.repeat(32),
      siteUrl: 'https://terantrade.uz',
      fetcher,
    });

    expect(status).toBe(202);
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe(INDEXNOW_ENDPOINT);
    expect(JSON.parse(init.body)).toEqual({
      host: 'terantrade.uz',
      key: 'a'.repeat(32),
      keyLocation: `https://terantrade.uz/${'a'.repeat(32)}.txt`,
      urlList: ['https://terantrade.uz/products/new-tea'],
    });
    expect(
      await submitToIndexNow({ urls: [], key: 'k', siteUrl: 'https://terantrade.uz', fetcher }),
    ).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
