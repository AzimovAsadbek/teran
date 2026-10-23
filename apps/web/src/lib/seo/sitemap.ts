import type { Locale, SitemapEntriesDto } from '@teran/contracts';
import type { MetadataRoute } from 'next';
import { hreflangLinks, languageVersions, localizedUrl } from './urls';

/**
 * A page's entries: one per language version, each listing every version (hreflang) and
 * x-default. `locales` are the languages the page's item has its own text in; without it the page
 * is written in every language.
 */
export function sitemapEntries(
  path: string,
  { lastModified, locales }: { lastModified?: string; locales?: readonly Locale[] } = {},
): MetadataRoute.Sitemap {
  const versions = languageVersions(locales);
  const languages = hreflangLinks(path, versions);
  const alternates = Object.keys(languages).length > 0 ? { alternates: { languages } } : {};
  return versions.map((locale) => ({
    url: localizedUrl(path, locale),
    ...(lastModified ? { lastModified } : {}),
    ...alternates,
  }));
}

/**
 * The sitemap (ADR-060): the pages written in every language, then the catalogue and the journal
 * as the API lists them (public, published and stocked only; ADR-036), each in the languages it
 * has. Private pages, search results, filtered listings and redirects are never in it.
 */
export function buildSitemap({
  pages,
  data,
}: {
  /** Paths written in every language (static pages, the help centre, the gallery). */
  pages: readonly string[];
  /** The catalogue and journal, or null when the API could not be read. */
  data: SitemapEntriesDto | null;
}): MetadataRoute.Sitemap {
  const item = (path: string, entry: { updatedAt: string; locales?: readonly Locale[] }) =>
    sitemapEntries(path, { lastModified: entry.updatedAt, locales: entry.locales });
  return [
    ...pages.flatMap((path) => sitemapEntries(path)),
    ...(data?.categories ?? []).flatMap((entry) => item(`/${entry.path}`, entry)),
    ...(data?.collections ?? []).flatMap((entry) => item(`/collections/${entry.slug}`, entry)),
    ...(data?.products ?? []).flatMap((entry) => item(`/products/${entry.slug}`, entry)),
    ...(data?.articles ?? []).flatMap((entry) => item(`/journal/${entry.slug}`, entry)),
  ];
}
