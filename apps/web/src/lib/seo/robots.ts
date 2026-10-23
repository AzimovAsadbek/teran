import type { Metadata, MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import type { IndexingDecision } from './indexing';

/**
 * Personal, transactional and token pages, internal search results and the admin area: never for
 * search engines. Their pages are `noindex` as well.
 */
export const PRIVATE_PATHS = [
  '/account',
  '/cart',
  '/checkout',
  '/orders',
  '/payments',
  '/search',
  '/faq/search',
  '/admin',
  '/newsletter',
] as const;

/**
 * robots.txt (ADR-060): a build that is not indexable keeps every crawler out; the real shop lets
 * them read everything public — pages, pictures, styles and scripts — but the API and the private
 * paths in every language, and names its sitemap.
 */
export function robotsRules(decision: IndexingDecision, origin: string): MetadataRoute.Robots {
  if (!decision.indexable) return { rules: { userAgent: '*', disallow: '/' } };
  const disallow = ['/api/'];
  for (const locale of routing.locales) {
    const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;
    for (const path of PRIVATE_PATHS) disallow.push(`${prefix}${path}`);
  }
  return { rules: { userAgent: '*', allow: '/', disallow }, sitemap: `${origin}/sitemap.xml` };
}

/**
 * The robots meta tag every page starts from (app/[locale]/layout.tsx); a page can only narrow it.
 * Indexing and following are the defaults and go unsaid, so nothing contradicts the `noindex` of a
 * private page or the one Next.js adds to a 404; large image previews are allowed (the photographs
 * are TERAN's own). A build that may not be indexed says what its X-Robots-Tag header says.
 */
export function defaultRobots(decision: IndexingDecision): NonNullable<Metadata['robots']> {
  return decision.indexable ? { 'max-image-preview': 'large' } : { index: false, follow: false };
}
