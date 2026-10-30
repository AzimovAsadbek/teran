import type { ImageDto, Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { imageSources } from '@/lib/navigation';
import { ogLocales } from '@/lib/site';
import { hreflangLinks, languageVersions, localizedUrl, type Href } from './urls';

type OgImage = { url: string; width?: number; height?: number; alt?: string };

/** The site's share picture, for pages without one of their own (see app/[locale]/layout.tsx). */
export const DEFAULT_OG_IMAGE: OgImage = {
  url: '/brand/og-default.png',
  width: 1200,
  height: 630,
  alt: 'TERAN',
};

/**
 * An item's own picture as its share image (a product's, article's, category's or collection's):
 * the rendition closest to 1280 px with its real dimensions. Undefined without a picture, so the
 * page falls back to the site's default.
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
 * A title that names the brand already gets no "— TERAN" (in English "— TERAN Tea", ADR-068)
 * from the layout's template.
 */
function withoutSecondBrand(title: string): string | { absolute: string } {
  return /\bTERAN\b/i.test(title) ? { absolute: title } : title;
}

/**
 * Standard page metadata (ADR-060): title, description, canonical URL, hreflang and Open Graph.
 * Next.js replaces nested metadata objects rather than merging them, so every page states its
 * share picture here: its own (`image`/`images`) or the site's default.
 *
 * - `locales`: the languages the page's item has its own text in (the API's `locales`). Only
 *   those versions are listed; a page showing the Uzbek fallback text is `noindex`.
 * - `pagination`: a listing's page beyond the first keeps its number in the canonical URL and in
 *   the title. No other query parameter is ever canonical (filters and sorting are `noindex`).
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
  locales,
  pagination,
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
  /** Languages with their own text; omit for pages written in every language. */
  locales?: readonly Locale[];
  /** The listing's page number and its words ("Page 2"), from the second page on. */
  pagination?: { page: number; label: string };
}): Metadata {
  const paged = pagination && pagination.page > 1 ? pagination : undefined;
  const query = paged ? `page=${paged.page}` : '';
  const url = `${localizedUrl(href, locale)}${query ? `?${query}` : ''}`;
  const versions = languageVersions(locales);
  // In a language without its own text the page shows the Uzbek one: not a version of its own.
  const indexable = !noIndex && versions.includes(locale);
  const pageTitle =
    typeof title === 'string'
      ? withoutSecondBrand(paged ? `${title} — ${paged.label}` : title)
      : title;
  // Without a description of its own a page keeps the layout's (an explicit undefined would
  // remove it).
  const described = description ? { description } : {};
  const languages = hreflangLinks(href, versions, query);
  return {
    title: pageTitle,
    ...described,
    alternates: indexable
      ? { canonical: url, ...(Object.keys(languages).length > 0 ? { languages } : {}) }
      : undefined,
    openGraph: {
      title: typeof pageTitle === 'string' ? pageTitle : pageTitle.absolute,
      ...described,
      url,
      siteName: 'TERAN',
      locale: ogLocales[locale],
      ...(indexable && versions.length > 1
        ? {
            alternateLocale: versions
              .filter((version) => version !== locale)
              .map((version) => ogLocales[version]),
          }
        : {}),
      type,
      images: images ?? [image ?? DEFAULT_OG_IMAGE],
    },
    // Only set when needed: an explicit `robots: undefined` would override the layout's default.
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
  };
}
