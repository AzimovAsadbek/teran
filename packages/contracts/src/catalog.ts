import { z } from 'zod';
import { localeSchema, moneySchema, slugSchema } from './common.js';
import { PRODUCT_FORMATS, PRODUCT_SORTS } from './constants.js';

export const productFormatSchema = z.enum(PRODUCT_FORMATS);

export const CAFFEINE_LEVELS = ['NONE', 'LOW', 'MEDIUM', 'HIGH'] as const;
export const caffeineLevelSchema = z.enum(CAFFEINE_LEVELS);
export type CaffeineLevel = z.infer<typeof caffeineLevelSchema>;

export const productSortSchema = z.enum(PRODUCT_SORTS);

export const STOCK_LEVELS = ['in_stock', 'low_stock', 'out_of_stock'] as const;
export const stockLevelSchema = z.enum(STOCK_LEVELS);
export type StockLevel = z.infer<typeof stockLevelSchema>;

/**
 * Top-level category pages live at the site root (`/tea`), so their slugs must not collide with
 * the storefront's own pages, the locale prefixes or system paths.
 */
export const RESERVED_CATEGORY_SLUGS = [
  'about',
  'account',
  'admin',
  'api',
  'cart',
  'catalog',
  'checkout',
  'collections',
  'contact',
  'delivery',
  'en',
  'faq',
  'journal',
  'media',
  'newsletter',
  'orders',
  'payments',
  'privacy',
  'products',
  'returns',
  'ru',
  'search',
  'sitemap',
  'terms',
  'uploads',
  'uz',
  'wholesale',
] as const;

export function isReservedCategorySlug(slug: string): boolean {
  return (RESERVED_CATEGORY_SLUGS as readonly string[]).includes(slug);
}

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

// ─── Product types and attributes ───────────────────────────────────────────

export const ATTRIBUTE_KINDS = ['TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTI_SELECT'] as const;
export const attributeKindSchema = z.enum(ATTRIBUTE_KINDS);
export type AttributeKind = z.infer<typeof attributeKindSchema>;

/** Kinds that can be offered as filters (free text cannot). */
export const FILTERABLE_ATTRIBUTE_KINDS: readonly AttributeKind[] = [
  'NUMBER',
  'BOOLEAN',
  'SELECT',
  'MULTI_SELECT',
];

/** Identifier of an attribute or option, used in filter URLs: lower-case words and hyphens. */
export const attributeKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: 'invalid_key' });

/**
 * Attribute filters travel as `attr.<key>=<value>` query parameters:
 * - choice attributes: option keys, comma separated (`attr.roast-level=dark,medium`);
 * - yes/no attributes: `true` or `false`;
 * - numbers: a range `min~max`, either side optional (`attr.net-weight=100~250`).
 */
export const ATTRIBUTE_FILTER_PREFIX = 'attr.';
const ATTRIBUTE_VALUE_PATTERN =
  /^(?:[a-z0-9]+(?:-[a-z0-9]+)*|(?:\d{1,9}(?:\.\d{1,3})?)?~(?:\d{1,9}(?:\.\d{1,3})?)?)$/;
const attributeFiltersSchema = z
  .record(attributeKeySchema, z.array(z.string().regex(ATTRIBUTE_VALUE_PATTERN)).min(1).max(20))
  .refine((filters) => Object.keys(filters).length <= 10, { error: 'too_many_filters' });

/** Moves `attr.<key>` query parameters into one `attributes` object before validation. */
function collectAttributeFilters(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return raw;
  const query: Record<string, unknown> = {};
  const attributes: Record<string, string[]> = {};
  for (const [name, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!name.startsWith(ATTRIBUTE_FILTER_PREFIX)) {
      query[name] = value;
      continue;
    }
    const entries: unknown[] = Array.isArray(value) ? value : [value];
    const values = entries
      .flatMap((entry) => (typeof entry === 'string' ? entry.split(',') : []))
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (values.length > 0) attributes[name.slice(ATTRIBUTE_FILTER_PREFIX.length)] = values;
  }
  return Object.keys(attributes).length > 0 ? { ...query, attributes } : query;
}

const productListQueryObject = z
  .object({
    locale: localeSchema.default('uz'),
    /** A category slug; a top-level category includes its subcategories. */
    category: slugSchema.optional(),
    collection: slugSchema.optional(),
    /** A product type's key (e.g. "coffee"): only products of that type. */
    type: attributeKeySchema.optional(),
    q: z.string().trim().min(1).max(100).optional(),
    format: commaList(productFormatSchema),
    minPrice: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
    maxPrice: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
    inStock: z.stringbool().optional(),
    featured: z.stringbool().optional(),
    sort: productSortSchema.default('featured'),
    page: z.coerce.number().int().min(1).max(1000).default(1),
    pageSize: z.coerce.number().int().min(1).max(48).default(24),
    attributes: attributeFiltersSchema.optional(),
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
export const productListQuerySchema = z.preprocess(collectAttributeFilters, productListQueryObject);
export type ProductListQuery = z.output<typeof productListQueryObject>;

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
  /** A cut-out on a transparent background, rather than a photograph with its own background. */
  transparent: z.boolean().default(false),
});
export type ImageDto = z.infer<typeof imageSchema>;

/** A category in links: `path` is its address below the locale, e.g. "tea/green-tea". */
export const categoryRefSchema = z.object({ slug: z.string(), name: z.string(), path: z.string() });
export type CategoryRefDto = z.infer<typeof categoryRefSchema>;

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
  /**
   * The product's first cut-out image, for presentations that place the product in a scene (the
   * home page stage). Null when it has none; only product lists fill it in.
   */
  stageImage: imageSchema.nullable().default(null),
  /** The product's second image, shown when a card is pointed at (null with a single image). */
  hoverImage: imageSchema.nullable().default(null),
  illustrationKey: illustrationKeySchema.nullable(),
});
export type ProductSummaryDto = z.infer<typeof productSummarySchema>;

export const brewingSchema = z.object({
  temperatureCelsius: z.number().int().nullable(),
  timeMinSeconds: z.number().int().nullable(),
  timeMaxSeconds: z.number().int().nullable(),
  amountGrams: z.string().nullable(),
});

/** A product attribute ready for display; only attributes with a value are sent. */
export const productAttributeSchema = z.object({
  key: z.string(),
  label: z.string(),
  kind: attributeKindSchema,
  unit: z.string().nullable(),
  text: z.string().nullable(),
  /** Decimal string for NUMBER attributes. */
  number: z.string().nullable(),
  boolean: z.boolean().nullable(),
  options: z.array(z.object({ key: z.string(), label: z.string() })),
});
export type ProductAttributeDto = z.infer<typeof productAttributeSchema>;

export const productDetailSchema = productSummarySchema.extend({
  productType: z.object({ key: z.string(), name: z.string() }).nullable(),
  attributes: z.array(productAttributeSchema),
  /** Category chain from the top-level category to the product's own category. */
  breadcrumbs: z.array(categoryRefSchema),
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

export const collectionSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  illustrationKey: illustrationKeySchema.nullable(),
  /**
   * The cover picture chosen in the admin area (cards, menus, the listing header); its small
   * renditions serve as the thumbnail. Null when none is set: the storefront then shows a neutral
   * TERAN visual, never another item's picture.
   */
  image: imageSchema.nullable().default(null),
  /** Visible products; for a top-level category, its subcategories' products included. */
  productCount: z.number().int(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
});
export type CollectionDto = z.infer<typeof collectionSchema>;

export const categorySchema = collectionSchema.extend({
  parentSlug: z.string().nullable(),
  /** Address below the locale: "tea" or "tea/green-tea". */
  path: z.string(),
  /** Optional editorial text (plain text, paragraphs separated by blank lines). */
  body: z.string().nullable(),
  position: z.number().int(),
});
export type CategoryDto = z.infer<typeof categorySchema>;

/** Everything a category page needs, or the new address when the path has moved. */
export const categoryPageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('category'),
    category: categorySchema,
    parent: categorySchema.nullable(),
    /** Active subcategories (for a top-level category) or siblings (for a subcategory). */
    subcategories: z.array(categorySchema),
    breadcrumbs: z.array(categoryRefSchema),
  }),
  z.object({ type: z.literal('redirect'), path: z.string() }),
]);
export type CategoryPageDto = z.infer<typeof categoryPageSchema>;

export const categoryPathQuerySchema = z.object({
  locale: localeSchema.default('uz'),
  path: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?$/, { error: 'invalid_path' }),
});

/** A filter built from an attribute of the products in the current listing. */
export const attributeFacetSchema = z.object({
  key: z.string(),
  label: z.string(),
  kind: attributeKindSchema,
  unit: z.string().nullable(),
  /** Choice and yes/no attributes: values with the number of matching products. */
  options: z.array(z.object({ key: z.string(), label: z.string(), count: z.number().int() })),
  /** Number attributes: the smallest and largest value in the listing. */
  range: z.object({ min: z.string(), max: z.string() }).nullable(),
});
export type AttributeFacetDto = z.infer<typeof attributeFacetSchema>;

export const facetsSchema = z.object({
  formats: z.array(z.object({ value: productFormatSchema, count: z.number().int() })),
  priceRange: z.object({ min: moneySchema, max: moneySchema }).nullable(),
  attributes: z.array(attributeFacetSchema),
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
  categories: z.array(z.object({ slug: z.string(), path: z.string(), updatedAt: z.string() })),
  collections: z.array(z.object({ slug: z.string(), updatedAt: z.string() })),
  articles: z.array(z.object({ slug: z.string(), updatedAt: z.string() })),
});
export type SitemapEntriesDto = z.infer<typeof sitemapEntriesSchema>;
