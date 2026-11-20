import { createHash } from 'node:crypto';
import type { MetadataRoute } from 'next';

/** The endpoint Bing, Yandex and the other IndexNow engines share: one notice reaches them all. */
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

/** Pages changed this recently are announced (the API asks for revalidation right after a change). */
export const CHANGE_WINDOW_MS = 15 * 60_000;

/**
 * The site's IndexNow key (ADR-068): derived from the revalidation secret the storefront already
 * holds, so no new secret is configured, and served at `/<key>.txt` (next.config rewrite). The
 * secret cannot be recovered from it.
 */
export function indexNowKey(secret: string | undefined): string | null {
  if (!secret) return null;
  return createHash('sha256').update(`indexnow:${secret}`).digest('hex').slice(0, 32);
}

/**
 * The addresses whose page changed within the window, each change announced once per server
 * process (`sent` remembers address and time).
 */
export async function announceRecent(
  entries: MetadataRoute.Sitemap,
  sent: Map<string, number>,
  options: {
    key: string;
    siteUrl: string;
    fetcher?: typeof fetch;
    now?: number;
  },
): Promise<void> {
  const now = options.now ?? Date.now();
  for (const [url, stamp] of sent) if (stamp < now - CHANGE_WINDOW_MS) sent.delete(url);
  const changes = new Map<string, number>();
  for (const entry of entries) {
    if (!entry.lastModified) continue;
    const stamp = new Date(entry.lastModified).getTime();
    if (!Number.isFinite(stamp) || stamp < now - CHANGE_WINDOW_MS || stamp > now + 60_000) continue;
    if (stamp > (sent.get(entry.url) ?? 0) && stamp > (changes.get(entry.url) ?? 0))
      changes.set(entry.url, stamp);
  }
  const urls = [...changes.keys()];
  for (let offset = 0; offset < urls.length; offset += 10_000) {
    const batch = urls.slice(offset, offset + 10_000);
    for (let attempt = 0; ; attempt++) {
      const status = await submitToIndexNow({ ...options, urls: batch }).catch(() => 0);
      if (status === 200 || status === 202) {
        for (const url of batch) sent.set(url, changes.get(url)!);
        break;
      }
      if (attempt === 2 || (status && status < 500 && status !== 429 && status !== 408)) {
        console.warn(JSON.stringify({ msg: 'indexnow', count: batch.length, status }));
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }
}

/** Tells the IndexNow engines about the addresses; resolves to the answer's status (or null). */
export async function submitToIndexNow({
  urls,
  key,
  siteUrl,
  fetcher = fetch,
}: {
  urls: readonly string[];
  key: string;
  siteUrl: string;
  fetcher?: typeof fetch;
}): Promise<number | null> {
  if (urls.length === 0) return null;
  const response = await fetcher(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: new URL(siteUrl).host,
      key,
      keyLocation: `${siteUrl}/${key}.txt`,
      urlList: urls,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  return response.status;
}
