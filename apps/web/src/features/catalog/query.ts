import {
  PRODUCT_FORMATS,
  PRODUCT_SORTS,
  type ProductFormat,
  type ProductSort,
} from '@teran/contracts';

/** Catalogue filters as they appear in the storefront URL. */
export interface CatalogFilters {
  format: ProductFormat[];
  minPrice?: number;
  maxPrice?: number;
  inStock: boolean;
  sort: ProductSort;
  page: number;
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
    .filter((value): value is ProductFormat => (PRODUCT_FORMATS as readonly string[]).includes(value));
  const sort = first(params.sort);
  const page = Number(first(params.page));
  let minPrice = toPrice(first(params.minPrice));
  let maxPrice = toPrice(first(params.maxPrice));
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }
  return {
    format: [...new Set(formats)],
    minPrice,
    maxPrice,
    inStock: first(params.inStock) === 'true',
    sort: sort && (PRODUCT_SORTS as readonly string[]).includes(sort) ? (sort as ProductSort) : 'featured',
    page: Number.isInteger(page) && page > 1 && page <= 1000 ? page : 1,
  };
}

/** True when the URL narrows or reorders the listing (such pages are not indexed). */
export function hasRefinements(filters: CatalogFilters): boolean {
  return (
    filters.format.length > 0 ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.inStock ||
    filters.sort !== 'featured'
  );
}

/** Storefront URL query (only non-default values), e.g. "format=TEA_BAGS&sort=price_asc". */
export function toSearchParams(filters: CatalogFilters, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams(extra);
  if (filters.format.length > 0) params.set('format', [...filters.format].sort().join(','));
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  if (filters.inStock) params.set('inStock', 'true');
  if (filters.sort !== 'featured') params.set('sort', filters.sort);
  if (filters.page > 1) params.set('page', String(filters.page));
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
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  if (filters.inStock) params.set('inStock', 'true');
  params.set('sort', filters.sort);
  params.set('page', String(filters.page));
  params.set('pageSize', String(pageSize));
  params.sort();
  return params.toString();
}

export function toggleFormat(filters: CatalogFilters, format: ProductFormat): CatalogFilters {
  const next = filters.format.includes(format)
    ? filters.format.filter((value) => value !== format)
    : [...filters.format, format];
  return { ...filters, format: next, page: 1 };
}
