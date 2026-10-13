import { z } from 'zod';
import { localeSchema, moneySchema, slugSchema } from './common.js';

export const PRODUCT_FORMATS = [
  'LOOSE_LEAF',
  'TEA_BAGS',
  'PYRAMIDS',
  'GIFT_SET',
  'ACCESSORY',
] as const;
export const productFormatSchema = z.enum(PRODUCT_FORMATS);
export type ProductFormat = z.infer<typeof productFormatSchema>;

export const CAFFEINE_LEVELS = ['NONE', 'LOW', 'MEDIUM', 'HIGH'] as const;
export const caffeineLevelSchema = z.enum(CAFFEINE_LEVELS);
export type CaffeineLevel = z.infer<typeof caffeineLevelSchema>;

export const PRODUCT_SORTS = ['featured', 'newest', 'price_asc', 'price_desc', 'name_asc'] as const;
export const productSortSchema = z.enum(PRODUCT_SORTS);
export type ProductSort = z.infer<typeof productSortSchema>;

export const STOCK_LEVELS = ['in_stock', 'low_stock', 'out_of_stock'] as const;
export const stockLevelSchema = z.enum(STOCK_LEVELS);
export type StockLevel = z.infer<typeof stockLevelSchema>;

/** Largest quantity of a single variant a retail customer can put in the cart. */
export const MAX_LINE_QUANTITY = 20;

/** Days after publication during which a product carries the "new" badge. */
export const NEW_PRODUCT_DAYS = 30;

/** Built-in artwork keys used for demo imagery and category tiles. */
export const ILLUSTRATION_KEYS = [
  'black',
  'green',
  'white',
  'oolong',
  'herbal',
  'fruit',
  'gift',
  'jasmine',
  'mint',
  'earl-grey',
] as const;
export const illustrationKeySchema = z.enum(ILLUSTRATION_KEYS);
export type IllustrationKey = z.infer<typeof illustrationKeySchema>;

/** Accepts `?format=A,B` as well as repeated `?format=A&format=B` query parameters. */
const commaList = <T extends z.ZodType>(item: T) =>
  z.preprocess((value) => {
    if (value === undefined || value === '') return undefined;
    const entries: unknown[] = Array.isArray(value) ? value : [value];
    return entries
      .flatMap((entry) => (typeof entry === 'string' ? entry.split(',') : []))
      .map((entry) => entry.trim())
      .filter(Boolean);
  }, z.array(item).max(10).optional());

export const productListQuerySchema = z
  .object({
    locale: localeSchema.default('uz'),
    category: slugSchema.optional(),
    collection: slugSchema.optional(),
    q: z.string().trim().min(1).max(100).optional(),
    format: commaList(productFormatSchema),
    minPrice: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
    maxPrice: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
    inStock: z.stringbool().optional(),
    featured: z.stringbool().optional(),
    sort: productSortSchema.default('featured'),
    page: z.coerce.number().int().min(1).max(1000).default(1),
    pageSize: z.coerce.number().int().min(1).max(48).default(24),
  })
  .refine(
    (query) =>
      query.minPrice === undefined ||
      query.maxPrice === undefined ||
      query.minPrice <= query.maxPrice,
    {
      error: 'min_price_above_max',
      path: ['minPrice'],
    },
  );
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const localeQuerySchema = z.object({ locale: localeSchema.default('uz') });
export type LocaleQuery = z.infer<typeof localeQuerySchema>;

export const searchSuggestQuerySchema = z.object({
  locale: localeSchema.default('uz'),
  q: z.string().trim().min(2).max(100),
});

// ─── Responses ──────────────────────────────────────────────────────────────

export const imageSchema = z.object({
  /** Base path; the file for a width is `${src}/${width}.webp`. */
  src: z.string(),
  widths: z.array(z.number().int()),
  width: z.number().int(),
  height: z.number().int(),
  alt: z.string(),
});
export type ImageDto = z.infer<typeof imageSchema>;

export const categoryRefSchema = z.object({ slug: z.string(), name: z.string() });

export const variantSchema = z.object({
  id: z.uuid(),
  sku: z.string(),
  weightGrams: z.number().int().nullable(),
  unitCount: z.number().int().nullable(),
  price: moneySchema,
  compareAtPrice: moneySchema.nullable(),
  currency: z.string(),
  stockLevel: stockLevelSchema,
  /** Most a customer may add to the cart right now (capped at MAX_LINE_QUANTITY). */
  maxQuantity: z.number().int(),
});
export type VariantDto = z.infer<typeof variantSchema>;

export const productSummarySchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  shortDescription: z.string().nullable(),
  category: categoryRefSchema,
  format: productFormatSchema,
  isFeatured: z.boolean(),
  isNew: z.boolean(),
  onSale: z.boolean(),
  stockLevel: stockLevelSchema,
  priceFrom: moneySchema,
  compareAtPriceFrom: moneySchema.nullable(),
  currency: z.string(),
  variantCount: z.number().int(),
  /** Variant used for one-click "add to bag" from listings (first purchasable one). */
  defaultVariant: variantSchema.nullable(),
  image: imageSchema.nullable(),
  illustrationKey: illustrationKeySchema.nullable(),
});
export type ProductSummaryDto = z.infer<typeof productSummarySchema>;

export const brewingSchema = z.object({
  temperatureCelsius: z.number().int().nullable(),
  timeMinSeconds: z.number().int().nullable(),
  timeMaxSeconds: z.number().int().nullable(),
  amountGrams: z.string().nullable(),
});

export const productDetailSchema = productSummarySchema.extend({
  description: z.string().nullable(),
  ingredients: z.string().nullable(),
  tastingNotes: z.string().nullable(),
  origin: z.string().nullable(),
  caffeineLevel: caffeineLevelSchema.nullable(),
  brewing: brewingSchema.nullable(),
  images: z.array(imageSchema),
  variants: z.array(variantSchema),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  updatedAt: z.string(),
});
export type ProductDetailDto = z.infer<typeof productDetailSchema>;

export const categorySchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  illustrationKey: illustrationKeySchema.nullable(),
  productCount: z.number().int(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
});
export type CategoryDto = z.infer<typeof categorySchema>;

export const collectionSchema = categorySchema;
export type CollectionDto = z.infer<typeof collectionSchema>;

export const facetsSchema = z.object({
  formats: z.array(z.object({ value: productFormatSchema, count: z.number().int() })),
  priceRange: z.object({ min: moneySchema, max: moneySchema }).nullable(),
});
export type FacetsDto = z.infer<typeof facetsSchema>;

export const productListSchema = z.object({
  items: z.array(productSummarySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
  facets: facetsSchema,
});
export type ProductListDto = z.infer<typeof productListSchema>;

export const searchSuggestionsSchema = z.object({
  products: z.array(productSummarySchema),
  categories: z.array(categoryRefSchema),
});
export type SearchSuggestionsDto = z.infer<typeof searchSuggestionsSchema>;

/** Minimal data for sitemap generation. */
export const sitemapEntriesSchema = z.object({
  products: z.array(z.object({ slug: z.string(), updatedAt: z.string() })),
  categories: z.array(z.object({ slug: z.string(), updatedAt: z.string() })),
  collections: z.array(z.object({ slug: z.string(), updatedAt: z.string() })),
  articles: z.array(z.object({ slug: z.string(), updatedAt: z.string() })),
});
export type SitemapEntriesDto = z.infer<typeof sitemapEntriesSchema>;
