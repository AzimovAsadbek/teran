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

/**
 * Prices and online ordering. Off by default since the owner asked (2026-10-17) to show no price
 * until TERAN confirms them: the storefront then shows no price anywhere (cards, product pages,
 * search, delivery fees, structured data), has no bag, and asks visitors to order
 * through TERAN's contact channels. Prices stay in the admin area and can be edited there at any
 * time. NEXT_PUBLIC_SHOW_PRICES=true (a build-time switch) turns both back on; the end-to-end stack
 * builds with it.
 */
export const showPrices = process.env.NEXT_PUBLIC_SHOW_PRICES === 'true';

/**
 * Whether the storefront links to the photo and film gallery (/media). Off since 2026-10-17: the
 * reference has no such page, and the owner asked for what it lacks to go. The gallery's pages,
 * the admin area's gallery and the home page's film band stay (the pages answer by their address,
 * unindexed); no menu, footer, banner or tile leads to them. NEXT_PUBLIC_SHOW_GALLERY=true (build
 * time) brings the links back.
 */
export const showGallery = process.env.NEXT_PUBLIC_SHOW_GALLERY === 'true';

/** Open Graph locale codes for the supported languages. */
export const ogLocales = { uz: 'uz_UZ', ru: 'ru_RU', en: 'en_US' } as const;
