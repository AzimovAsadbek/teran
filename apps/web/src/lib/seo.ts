import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { ogLocales, siteUrl } from './site';

type Href = Parameters<typeof getPathname>[0]['href'];

/** Absolute URL of a localised path (Uzbek has no prefix, other locales do). */
export function localizedUrl(href: Href, locale: Locale): string {
  return `${siteUrl}${getPathname({ href, locale })}`;
}

/**
 * Canonical + hreflang alternates for a page. Pass the path without locale prefix,
 * e.g. "/catalog" or { pathname: '/products/[slug]', params: { slug } }.
 */
export function alternates(
  href: Href,
  locale: Locale,
  query = '',
): NonNullable<Metadata['alternates']> {
  const suffix = query ? `?${query}` : '';
  const languages: Record<string, string> = {};
  for (const candidate of routing.locales) {
    languages[candidate] = `${localizedUrl(href, candidate)}${suffix}`;
  }
  languages['x-default'] = `${localizedUrl(href, routing.defaultLocale)}${suffix}`;
  return { canonical: `${localizedUrl(href, locale)}${suffix}`, languages };
}

/** Standard page metadata: title, description, canonical, hreflang and Open Graph. */
export function pageMetadata({
  title,
  description,
  href,
  locale,
  images,
  noIndex = false,
  query = '',
}: {
  /** Page title; use { absolute } to bypass the "%s — TERAN" template (e.g. the home page). */
  title: string | { absolute: string };
  description?: string;
  href: Href;
  locale: Locale;
  images?: { url: string; width?: number; height?: number; alt?: string }[];
  noIndex?: boolean;
  /** Query string kept in the canonical URL (pagination only; filters are never canonical). */
  query?: string;
}): Metadata {
  const url = `${localizedUrl(href, locale)}${query ? `?${query}` : ''}`;
  return {
    title,
    description,
    alternates: noIndex ? undefined : alternates(href, locale, query),
    openGraph: {
      title: typeof title === 'string' ? title : title.absolute,
      description,
      url,
      siteName: 'TERAN',
      locale: ogLocales[locale],
      type: 'website',
      ...(images ? { images } : {}),
    },
    robots: noIndex ? { index: false, follow: true } : undefined,
  };
}

/** Serialises JSON-LD safely for a <script type="application/ld+json"> tag. */
export function jsonLd(data: Record<string, unknown>): { __html: string } {
  return { __html: JSON.stringify(data).replace(/</g, '\\u003c') };
}
