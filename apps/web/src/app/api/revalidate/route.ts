import { createHash, timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';

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
  return NextResponse.json({ revalidated: tags });
}
