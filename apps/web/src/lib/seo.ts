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
export function alternates(href: Href, locale: Locale): NonNullable<Metadata['alternates']> {
  const languages: Record<string, string> = {};
  for (const candidate of routing.locales) {
    languages[candidate] = localizedUrl(href, candidate);
  }
  languages['x-default'] = localizedUrl(href, routing.defaultLocale);
  return { canonical: localizedUrl(href, locale), languages };
}

/** Standard page metadata: title, description, canonical, hreflang and Open Graph. */
export function pageMetadata({
  title,
  description,
  href,
  locale,
  images,
  noIndex = false,
}: {
  title: string;
  description?: string;
  href: Href;
  locale: Locale;
  images?: { url: string; width?: number; height?: number; alt?: string }[];
  noIndex?: boolean;
}): Metadata {
  const url = localizedUrl(href, locale);
  return {
    title,
    description,
    alternates: noIndex ? undefined : alternates(href, locale),
    openGraph: {
      title,
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
