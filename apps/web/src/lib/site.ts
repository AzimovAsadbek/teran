import { isRetailTea } from '@teran/contracts/constants';

/** Public origin used for canonical URLs, sitemaps and social metadata. */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);

/**
 * An address the outside world can open (structured data, social previews): picture addresses
 * that are absolute already (object storage, ADR-043) stay as they are, site paths get the site.
 */
export function absoluteUrl(path: string): string {
  return /^https?:\/\//.test(path) ? path : `${siteUrl}${path}`;
}

/**
 * When true the storefront shows a notice that products, prices, images and draft texts are
 * placeholders. Set NEXT_PUBLIC_DEMO_CONTENT=false only once real content has been loaded.
 */
export const isDemoContent = process.env.NEXT_PUBLIC_DEMO_CONTENT !== 'false';

/** Build-time storefront switch. When open, only the Tea branch offers priced online orders. */
export const showPrices = process.env.NEXT_PUBLIC_SHOW_PRICES === 'true';

export function sellsOnline(categoryPath: string): boolean {
  return showPrices && isRetailTea(categoryPath);
}

/** Open Graph locale codes for the supported languages. */
export const ogLocales = { uz: 'uz_UZ', ru: 'ru_RU', en: 'en_US' } as const;
