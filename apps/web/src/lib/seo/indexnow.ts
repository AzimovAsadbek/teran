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
export function recentlyChanged(
  entries: MetadataRoute.Sitemap,
  now: number,
  sent: Set<string>,
  windowMs = CHANGE_WINDOW_MS,
): string[] {
  const urls: string[] = [];
  for (const entry of entries) {
    if (!entry.lastModified) continue;
    const at = new Date(entry.lastModified).getTime();
    if (Number.isNaN(at) || now - at > windowMs || at > now + 60_000) continue;
    const mark = `${entry.url}@${at}`;
    if (sent.has(mark)) continue;
    sent.add(mark);
    urls.push(entry.url);
  }
  return urls;
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
      urlList: urls.slice(0, 10_000),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  return response.status;
}
