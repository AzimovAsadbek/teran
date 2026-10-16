import type { ImageDto, Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { imageSources } from './navigation';
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

type OgImage = { url: string; width?: number; height?: number; alt?: string };

/** The site's share picture, for pages without one of their own (see app/[locale]/layout.tsx). */
export const DEFAULT_OG_IMAGE: OgImage = {
  url: '/brand/og-default.png',
  width: 1200,
  height: 630,
  alt: 'TERAN',
};

/**
 * An item's own picture as its share image (an article's, category's or collection's cover): the
 * rendition closest to 1280 px with its real dimensions. Undefined without a picture, so the page
 * falls back to the site's default.
 */
export function coverShareImage(image: ImageDto | null | undefined): OgImage | undefined {
  if (!image) return undefined;
  const { src } = imageSources(image, 1280);
  const width = Number(/\/(\d+)\.webp$/.exec(src)?.[1] ?? image.width);
  return {
    url: src,
    width,
    height: Math.round((width * image.height) / image.width),
    alt: image.alt,
  };
}

/**
 * Standard page metadata: title, description, canonical, hreflang and Open Graph. Next.js replaces
 * nested metadata objects rather than merging them, so every page states its share picture here:
 * its own (`image`/`images`) or the site's default.
 */
export function pageMetadata({
  title,
  description,
  href,
  locale,
  image,
  images,
  type = 'website',
  noIndex = false,
  query = '',
}: {
  /** Page title; use { absolute } to bypass the "%s — TERAN" template (e.g. the home page). */
  title: string | { absolute: string };
  description?: string;
  href: Href;
  locale: Locale;
  /** The page's own share picture (an article's cover, a category's cover…). */
  image?: OgImage;
  images?: OgImage[];
  type?: 'website' | 'article';
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
      type,
      images: images ?? [image ?? DEFAULT_OG_IMAGE],
    },
    // Only set when needed: an explicit `robots: undefined` would override the layout's default.
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
  };
}

/** Serialises JSON-LD safely for a <script type="application/ld+json"> tag. */
export function jsonLd(data: Record<string, unknown>): { __html: string } {
  return { __html: JSON.stringify(data).replace(/</g, '\\u003c') };
}
