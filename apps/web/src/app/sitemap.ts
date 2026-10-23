import { DEFAULT_LOCALE, type MediaKind } from '@teran/contracts';
import type { MetadataRoute } from 'next';
import { connection } from 'next/server';
import { helpCentre } from '@/content/pages/faq';
import { getSitemapEntries } from '@/lib/data/catalog';
import { getMedia } from '@/lib/data/content';
import { buildSitemap } from '@/lib/seo';

const STATIC_PAGES = [
  '/',
  '/catalog',
  '/about',
  '/wholesale',
  '/journal',
  '/tea-101',
  '/media',
  '/contact',
  '/stores',
  '/faq',
  '/delivery',
  '/returns',
  '/privacy',
  '/terms',
  '/accessibility',
] as const;

/** The help centre's categories and articles (their addresses are the same in every language). */
const HELP_PAGES = [
  '/faq/articles',
  ...helpCentre('en', false).flatMap((category) => [
    `/faq/${category.id}`,
    ...category.articles.map((article) => `/faq/${category.id}/${article.slug}`),
  ]),
];

/** The gallery's page of each kind: listed once something of that kind is published. */
const MEDIA_PAGES: Record<MediaKind, string> = {
  PHOTO: '/media/photos',
  VIDEO: '/media/videos',
  SHORT: '/media/shorts',
};

async function publishedMediaPages(): Promise<string[]> {
  const kinds = Object.keys(MEDIA_PAGES) as MediaKind[];
  const totals = await Promise.all(
    kinds.map((kind) =>
      getMedia(DEFAULT_LOCALE, { kind, pageSize: 1 }).then(
        (media) => media.total,
        () => null, // unknown: listed, as before the gallery could be counted
      ),
    ),
  );
  return kinds.filter((_, index) => totals[index] !== 0).map((kind) => MEDIA_PAGES[kind]);
}

/**
 * Generated per request from the live catalogue (cached, invalidated with the "catalog" and
 * "content" tags) — never at build time, so it cannot contain data from a build environment.
 * What goes in, and in which languages, is decided in lib/seo/sitemap.ts.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const [data, mediaPages] = await Promise.all([
    getSitemapEntries().catch(() => null),
    publishedMediaPages(),
  ]);
  return buildSitemap({ pages: [...STATIC_PAGES, ...mediaPages, ...HELP_PAGES], data });
}
