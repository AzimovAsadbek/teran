import { describe, expect, it, vi } from 'vitest';
import { indexNowKey, INDEXNOW_ENDPOINT, recentlyChanged, submitToIndexNow } from './indexnow';

describe('IndexNow', () => {
  it('derives a stable 32-character key from the revalidation secret, none without it', () => {
    const key = indexNowKey('perf-only-secret');
    expect(key).toMatch(/^[0-9a-f]{32}$/);
    expect(indexNowKey('perf-only-secret')).toBe(key);
    expect(indexNowKey('another-secret')).not.toBe(key);
    expect(indexNowKey(undefined)).toBeNull();
    expect(indexNowKey('')).toBeNull();
  });

  it('announces pages changed in the last minutes, each change once', () => {
    const now = Date.parse('2026-10-30T10:00:00Z');
    const entries = [
      { url: 'https://terantrade.uz/products/new-tea', lastModified: '2026-10-30T09:58:00Z' },
      { url: 'https://terantrade.uz/ru/products/new-tea', lastModified: '2026-10-30T09:58:00Z' },
      { url: 'https://terantrade.uz/products/old-tea', lastModified: '2026-10-29T09:00:00Z' },
      { url: 'https://terantrade.uz/about' },
    ];
    const sent = new Set<string>();

    expect(recentlyChanged(entries, now, sent)).toEqual([
      'https://terantrade.uz/products/new-tea',
      'https://terantrade.uz/ru/products/new-tea',
    ]);
    // Asked again (another save): nothing new. Changed again: announced again.
    expect(recentlyChanged(entries, now + 60_000, sent)).toEqual([]);
    const edited = [{ ...entries[0]!, lastModified: '2026-10-30T10:01:00Z' }];
    expect(recentlyChanged(edited, now + 120_000, sent)).toEqual([entries[0]!.url]);
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
