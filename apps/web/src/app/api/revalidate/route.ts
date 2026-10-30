import { createHash, timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { after, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSitemapEntries } from '@/lib/data/catalog';
import { buildSitemap } from '@/lib/seo';
import { indexNowKey, recentlyChanged, submitToIndexNow } from '@/lib/seo/indexnow';
import { searchIndexing } from '@/lib/seo/indexing';
import { siteUrl } from '@/lib/site';

const bodySchema = z.object({
  tags: z
    .array(z.enum(['catalog', 'content', 'settings']))
    .min(1)
    .max(3),
});

function secretMatches(given: string | null, expected: string | undefined): boolean {
  if (!given || !expected) return false;
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(given), digest(expected));
}

/**
 * Called by the API after catalogue, content or settings changes. Cached loaders tagged with these
 * names are expired immediately, so the next visitor sees the change (prices, stock, texts).
 */
export async function POST(request: Request) {
  if (!secretMatches(request.headers.get('x-revalidate-secret'), process.env.REVALIDATE_SECRET)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const tags = [...new Set(parsed.data.tags)];
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  // A new or changed product, category or article is announced to the IndexNow engines at once,
  // from an indexable build only (ADR-068).
  if (searchIndexing.indexable && tags.some((tag) => tag !== 'settings')) after(announceChanges);
  return NextResponse.json({ revalidated: tags });
}

/** Changes already announced by this server process. */
const announced = new Set<string>();

/** Tells Bing, Yandex and the other IndexNow engines which pages changed just now. */
async function announceChanges(): Promise<void> {
  const key = indexNowKey(process.env.REVALIDATE_SECRET);
  const data = key ? await getSitemapEntries().catch(() => null) : null;
  if (!key || !data) return;
  const urls = recentlyChanged(buildSitemap({ pages: [], data }), Date.now(), announced);
  const status = await submitToIndexNow({ urls, key, siteUrl }).catch(() => 0);
  if (status !== null) console.info(JSON.stringify({ msg: 'indexnow', urls: urls.length, status }));
}
