import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { isDemoContent, siteUrl } from '@/lib/site';

/** Personal, transactional and internal-search pages are not for search engines. */
const PRIVATE_PATHS = [
  '/account',
  '/cart',
  '/checkout',
  '/orders',
  '/search',
  '/admin',
  '/newsletter',
];

export default function robots(): MetadataRoute.Robots {
  // A demonstration catalogue (placeholder products and prices) must never be indexed.
  if (isDemoContent) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  const disallow = ['/api/'];
  for (const locale of routing.locales) {
    const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;
    for (const path of PRIVATE_PATHS) disallow.push(`${prefix}${path}`);
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
