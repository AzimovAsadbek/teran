import type { Locale } from '@teran/contracts';
import type { MetadataRoute } from 'next';
import { connection } from 'next/server';
import { routing } from '@/i18n/routing';
import { getSitemapEntries } from '@/lib/data/catalog';
import { localizedUrl } from '@/lib/seo';

const STATIC_PAGES = [
  '/',
  '/catalog',
  '/about',
  '/wholesale',
  '/journal',
  '/media',
  '/media/photos',
  '/media/videos',
  '/assistant',
  '/contact',
  '/faq',
  '/delivery',
  '/returns',
  '/privacy',
  '/terms',
] as const;

/** One entry per language version, each listing all versions (hreflang) and x-default. */
function entries(path: string, lastModified?: string): MetadataRoute.Sitemap {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) languages[locale] = localizedUrl(path, locale);
  languages['x-default'] = localizedUrl(path, routing.defaultLocale);
  return routing.locales.map((locale: Locale) => ({
    url: localizedUrl(path, locale),
    lastModified,
    alternates: { languages },
  }));
}

/**
 * Generated per request from the live catalogue (cached, invalidated with the "catalog" and
 * "content" tags) — never at build time, so it cannot contain data from a build environment.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const data = await getSitemapEntries().catch(() => null);
  return [
    ...STATIC_PAGES.flatMap((path) => entries(path)),
    ...(data?.categories ?? []).flatMap((item) => entries(`/${item.path}`, item.updatedAt)),
    ...(data?.collections ?? []).flatMap((item) =>
      entries(`/collections/${item.slug}`, item.updatedAt),
    ),
    ...(data?.products ?? []).flatMap((item) => entries(`/products/${item.slug}`, item.updatedAt)),
    ...(data?.articles ?? []).flatMap((item) => entries(`/journal/${item.slug}`, item.updatedAt)),
  ];
}
