/** Public origin used for canonical URLs, sitemaps and social metadata. */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);

/**
 * When true the storefront shows a notice that products, prices, images and draft texts are
 * placeholders. Set NEXT_PUBLIC_DEMO_CONTENT=false only once real content has been loaded.
 */
export const isDemoContent = process.env.NEXT_PUBLIC_DEMO_CONTENT !== 'false';

/** Open Graph locale codes for the supported languages. */
export const ogLocales = { uz: 'uz_UZ', ru: 'ru_RU', en: 'en_US' } as const;
