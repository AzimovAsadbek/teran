import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

/**
 * Locale routing. Only an explicit choice — the TERAN_LOCALE cookie, set when a visitor opens a
 * language version — may redirect an unprefixed (Uzbek) URL to another language. The browser's
 * Accept-Language never does, so crawlers and first-time visitors always get the language of the
 * URL they requested and every language version stays reachable and indexable.
 */
export default function proxy(request: NextRequest) {
  if (!request.headers.has('accept-language')) return handleI18nRouting(request);
  const headers = new Headers(request.headers);
  headers.delete('accept-language');
  return handleI18nRouting(new NextRequest(request, { headers }));
}

export const config = {
  // Everything except API/upload proxies, Next.js internals and files with an extension.
  matcher: '/((?!api|uploads|_next|_vercel|.*\\..*).*)',
};
