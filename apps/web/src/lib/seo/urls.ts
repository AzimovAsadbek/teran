import type { Locale } from '@teran/contracts';
import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { siteUrl } from '@/lib/site';

/** A page address without its locale: "/catalog" or { pathname: '/products/[slug]', params }. */
export type Href = Parameters<typeof getPathname>[0]['href'];

/** Absolute URL of a localised path (Uzbek has no prefix, other locales do). */
export function localizedUrl(href: Href, locale: Locale): string {
  return `${siteUrl}${getPathname({ href, locale })}`;
}

/**
 * The language versions a page has, in the site's order: the enabled languages it has its own
 * text in (`translated`, the API's `locales`), or every enabled language for a page written in
 * each of them. Undefined (an API from before ADR-060) counts as every language.
 */
export function languageVersions(translated?: readonly Locale[]): Locale[] {
  return translated
    ? routing.locales.filter((locale) => translated.includes(locale))
    : [...routing.locales];
}

/**
 * The hreflang set of a page: every version's address, and x-default for the Uzbek one (the
 * default language, served without a prefix). Empty for a page with a single version, which needs
 * none.
 */
export function hreflangLinks(
  href: Href,
  versions: readonly Locale[],
  query = '',
): Record<string, string> {
  if (versions.length < 2) return {};
  const suffix = query ? `?${query}` : '';
  const links: Record<string, string> = {};
  for (const locale of versions) links[locale] = `${localizedUrl(href, locale)}${suffix}`;
  if (versions.includes(routing.defaultLocale)) {
    links['x-default'] = `${localizedUrl(href, routing.defaultLocale)}${suffix}`;
  }
  return links;
}
