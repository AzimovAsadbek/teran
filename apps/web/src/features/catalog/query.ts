// Used by client filters too: the constants entry keeps Zod out of their bundle.
import {
  CAFFEINE_LEVELS,
  PRODUCT_FORMATS,
  PRODUCT_SORTS,
  type CaffeineLevel,
  type ProductFormat,
  type ProductSort,
} from '@teran/contracts/constants';

/** Catalogue filters as they appear in the storefront URL. */
export interface CatalogFilters {
  format: ProductFormat[];
  /** Caffeine levels, `caffeine=NONE,LOW` in the URL. */
  caffeine: CaffeineLevel[];
  minPrice?: number;
  maxPrice?: number;
  inStock: boolean;
  sort: ProductSort;
  page: number;
  /**
   * Product attribute filters, `attr.<key>=<values>` in the URL: option keys (several allowed),
   * "true"/"false", or a number range "min~max". Keys and values use the API's rules.
   */
  attributes: Record<string, string[]>;
}

const ATTRIBUTE_PREFIX = 'attr.';
const ATTRIBUTE_KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const NUMBER = /^\d{1,9}(?:\.\d{1,3})?$/;
const ATTRIBUTE_VALUE =
  /^(?:[a-z0-9]+(?:-[a-z0-9]+)*|(?:\d{1,9}(?:\.\d{1,3})?)?~(?:\d{1,9}(?:\.\d{1,3})?)?)$/;
const MAX_ATTRIBUTES = 10;

/**
 * Reads `attr.<key>` parameters (and the separate `attrmin.<key>` / `attrmax.<key>` fields a
 * number range form submits without JavaScript). Malformed keys or values are dropped.
 */
function parseAttributes(params: RawSearchParams): Record<string, string[]> {
  const attributes: Record<string, string[]> = {};
  const ranges: Record<string, { min?: string; max?: string }> = {};
  for (const [name, raw] of Object.entries(params)) {
    const values = (Array.isArray(raw) ? raw : [raw ?? ''])
      .flatMap((value) => value.split(','))
      .map((value) => value.trim())
      .filter(Boolean);
    if (name.startsWith(ATTRIBUTE_PREFIX)) {
      const key = name.slice(ATTRIBUTE_PREFIX.length);
      const valid = values.filter((value) => ATTRIBUTE_VALUE.test(value) && value !== '~');
      if (ATTRIBUTE_KEY.test(key) && valid.length > 0) {
        attributes[key] = [...new Set([...(attributes[key] ?? []), ...valid])].slice(0, 20);
      }
    } else if (name.startsWith('attrmin.') || name.startsWith('attrmax.')) {
      const key = name.slice('attrmin.'.length);
      const value = values[0];
      if (!ATTRIBUTE_KEY.test(key) || !value || !NUMBER.test(value)) continue;
      ranges[key] = { ...ranges[key], [name.startsWith('attrmin.') ? 'min' : 'max']: value };
    }
  }
  for (const [key, range] of Object.entries(ranges)) {
    attributes[key] = [`${range.min ?? ''}~${range.max ?? ''}`];
  }
  return Object.fromEntries(Object.entries(attributes).slice(0, MAX_ATTRIBUTES));
}

/** Writes the attribute filters into URL parameters, keys and values sorted. */
function writeAttributes(params: URLSearchParams, attributes: Record<string, string[]>): void {
  for (const key of Object.keys(attributes).sort()) {
    const values = attributes[key] ?? [];
    if (values.length > 0) params.set(`${ATTRIBUTE_PREFIX}${key}`, [...values].sort().join(','));
  }
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function toPrice(value: string | undefined): number | undefined {
  if (!value || !/^\d{1,10}$/.test(value)) return undefined;
  return Number(value);
}

/**
 * Lenient parsing: anything malformed in the URL is ignored rather than producing an error page,
 * since links are often edited or truncated by hand.
 */
export function parseCatalogFilters(params: RawSearchParams): CatalogFilters {
  // Accept both "format=A,B" (links) and "format=A&format=B" (checkbox forms).
  const rawFormats = Array.isArray(params.format) ? params.format : [params.format ?? ''];
  const formats = rawFormats
    .flatMap((value) => value.split(','))
    .filter((value): value is ProductFormat =>
      (PRODUCT_FORMATS as readonly string[]).includes(value),
    );
  const rawCaffeine = Array.isArray(params.caffeine) ? params.caffeine : [params.caffeine ?? ''];
  const caffeine = rawCaffeine
    .flatMap((value) => value.split(','))
    .filter((value): value is CaffeineLevel =>
      (CAFFEINE_LEVELS as readonly string[]).includes(value),
    );
  const sort = first(params.sort);
  const page = Number(first(params.page));
  let minPrice = toPrice(first(params.minPrice));
  let maxPrice = toPrice(first(params.maxPrice));
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }
  return {
    format: [...new Set(formats)],
    caffeine: [...new Set(caffeine)],
    minPrice,
    maxPrice,
    attributes: parseAttributes(params),
    inStock: first(params.inStock) === 'true',
    sort:
      sort && (PRODUCT_SORTS as readonly string[]).includes(sort)
        ? (sort as ProductSort)
        : 'featured',
    page: Number.isInteger(page) && page > 1 && page <= 1000 ? page : 1,
  };
}

/** True when the URL narrows or reorders the listing (such pages are not indexed). */
export function hasRefinements(filters: CatalogFilters): boolean {
  return (
    filters.format.length > 0 ||
    filters.caffeine.length > 0 ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.inStock ||
    filters.sort !== 'featured' ||
    Object.keys(filters.attributes).length > 0
  );
}

/** Storefront URL query (only non-default values), e.g. "format=TEA_BAGS&sort=price_asc". */
export function toSearchParams(
  filters: CatalogFilters,
  extra: Record<string, string> = {},
): string {
  const params = new URLSearchParams(extra);
  if (filters.format.length > 0) params.set('format', [...filters.format].sort().join(','));
  if (filters.caffeine.length > 0) params.set('caffeine', sortedLevels(filters.caffeine));
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  if (filters.inStock) params.set('inStock', 'true');
  if (filters.sort !== 'featured') params.set('sort', filters.sort);
  if (filters.page > 1) params.set('page', String(filters.page));
  writeAttributes(params, filters.attributes);
  params.sort();
  return params.toString();
}

/** API query for the listing; keys are sorted so equal filters share one cache entry. */
export function toApiQuery(
  filters: CatalogFilters,
  scope: { category?: string; collection?: string; q?: string },
  pageSize: number,
): string {
  const params = new URLSearchParams();
  if (scope.category) params.set('category', scope.category);
  if (scope.collection) params.set('collection', scope.collection);
  if (scope.q) params.set('q', scope.q);
  if (filters.format.length > 0) params.set('format', [...filters.format].sort().join(','));
  if (filters.caffeine.length > 0) params.set('caffeine', sortedLevels(filters.caffeine));
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  if (filters.inStock) params.set('inStock', 'true');
  params.set('sort', filters.sort);
  params.set('page', String(filters.page));
  params.set('pageSize', String(pageSize));
  writeAttributes(params, filters.attributes);
  params.sort();
  return params.toString();
}

/** Caffeine levels in their natural order (none to high), so equal filters share one URL. */
function sortedLevels(levels: CaffeineLevel[]): string {
  return CAFFEINE_LEVELS.filter((level) => levels.includes(level)).join(',');
}

export function toggleCaffeine(filters: CatalogFilters, level: CaffeineLevel): CatalogFilters {
  const next = filters.caffeine.includes(level)
    ? filters.caffeine.filter((value) => value !== level)
    : [...filters.caffeine, level];
  return { ...filters, caffeine: next, page: 1 };
}

export function toggleFormat(filters: CatalogFilters, format: ProductFormat): CatalogFilters {
  const next = filters.format.includes(format)
    ? filters.format.filter((value) => value !== format)
    : [...filters.format, format];
  return { ...filters, format: next, page: 1 };
}

/** Adds or removes one value of a choice (or yes/no) attribute filter. */
export function toggleAttribute(
  filters: CatalogFilters,
  key: string,
  value: string,
): CatalogFilters {
  const current = filters.attributes[key] ?? [];
  const next = current.includes(value)
    ? current.filter((entry) => entry !== value)
    : [...current, value];
  return withAttribute(filters, key, next);
}

/** Replaces the values of one attribute filter (an empty list removes it). */
export function withAttribute(
  filters: CatalogFilters,
  key: string,
  values: string[],
): CatalogFilters {
  const attributes = { ...filters.attributes };
  if (values.length > 0) attributes[key] = values;
  else delete attributes[key];
  return { ...filters, attributes, page: 1 };
}
