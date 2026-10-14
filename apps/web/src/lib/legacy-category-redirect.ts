import { NextResponse, type NextRequest } from 'next/server';

const LEGACY_CATEGORY = /^(\/(?:ru|en|uz))?\/catalog\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/;
const API_URL = (process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4000').replace(/\/$/, '');
const TIMEOUT_MS = 2_500;

interface CategoryPageAnswer {
  type: 'category' | 'redirect';
  path?: string;
  category?: { path: string };
}

/**
 * Category pages moved from /catalog/<slug> to /<path> (e.g. /catalog/green-tea → /tea/green-tea).
 * Old links get a real 308 here, before rendering starts (a redirect from a streamed page could
 * only be a client-side one). If the API cannot answer, the request continues to the page, which
 * redirects or shows the 404 itself.
 */
export async function legacyCategoryRedirect(request: NextRequest): Promise<NextResponse | null> {
  const match = LEGACY_CATEGORY.exec(request.nextUrl.pathname);
  if (!match) return null;
  const [, prefix = '', slug = ''] = match;
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (process.env.API_INTERNAL_KEY) headers['X-Internal-Key'] = process.env.API_INTERNAL_KEY;
    const response = await fetch(
      `${API_URL}/api/v1/catalog/category-page?path=${encodeURIComponent(slug)}`,
      { headers, signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (!response.ok) return null;
    const answer = (await response.json()) as CategoryPageAnswer;
    const path = answer.type === 'redirect' ? answer.path : answer.category?.path;
    if (!path || !/^[a-z0-9-]+(?:\/[a-z0-9-]+)?$/.test(path)) return null;
    const target = new URL(`${prefix}/${path}`, request.url);
    target.search = request.nextUrl.search;
    return NextResponse.redirect(target, 308);
  } catch {
    return null;
  }
}
