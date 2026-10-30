/*
 * Search engine optimisation (docs/architecture/seo.md, ADR-060), one module per concern:
 *
 * - indexing.ts — whether this build may be indexed at all (also read by next.config.ts);
 * - urls.ts — localised absolute addresses and the language versions of a page (hreflang);
 * - metadata.ts — every page's title, description, canonical URL, alternates and Open Graph;
 * - robots.ts — robots.txt and the robots meta tag pages start from;
 * - sitemap.ts — the sitemap's entries;
 * - json-ld.ts and schema.ts — structured data: safe serialisation and what each page describes.
 */
export { searchIndexing, type IndexingDecision } from './indexing';
export { coverShareImage, DEFAULT_OG_IMAGE, pageMetadata } from './metadata';
export { defaultRobots, PRIVATE_PATHS, robotsRules } from './robots';
export {
  BRAND_ID,
  jsonLd,
  ORGANIZATION_ID,
  serializeJsonLd,
  WEBSITE_ID,
  type JsonLdObject,
} from './json-ld';
export {
  articleSchema,
  breadcrumbSchema,
  faqSchema,
  pointsOfSaleSchema,
  productSchema,
  storeSchema,
  type Crumb,
  type PointOfSale,
} from './schema';
export { buildSitemap, sitemapEntries } from './sitemap';
export { hreflangLinks, languageVersions, localizedUrl, type Href } from './urls';
