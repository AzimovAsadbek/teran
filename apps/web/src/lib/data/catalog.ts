import 'server-only';
import type {
  CategoryDto,
  CollectionDto,
  Locale,
  ProductDetailDto,
  ProductListDto,
  ProductSummaryDto,
  SitemapEntriesDto,
} from '@teran/contracts';
import { cacheLife, cacheTag } from 'next/cache';
import { apiGet } from '@/lib/api/server';

/*
 * Catalogue loaders. Results are cached across requests and invalidated on demand: the API calls
 * /api/revalidate with the "catalog" tag whenever products, prices, stock or taxonomy change.
 * Callers must render these at request time (see `await connection()` in the components), so
 * builds never bake data from whatever database happened to be reachable during the build.
 */

export async function getCategories(locale: Locale): Promise<CategoryDto[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  return apiGet<CategoryDto[]>(`/catalog/categories?locale=${locale}`);
}

export async function getCollections(locale: Locale): Promise<CollectionDto[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  return apiGet<CollectionDto[]>(`/catalog/collections?locale=${locale}`);
}

/** `query` is a canonical query string (sorted keys) so equal filters share one cache entry. */
export async function getProductList(locale: Locale, query: string): Promise<ProductListDto> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  const separator = query ? '&' : '';
  return apiGet<ProductListDto>(`/catalog/products?locale=${locale}${separator}${query}`);
}

export async function getProduct(locale: Locale, slug: string): Promise<ProductDetailDto> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  return apiGet<ProductDetailDto>(`/catalog/products/${encodeURIComponent(slug)}?locale=${locale}`);
}

export async function getRelatedProducts(
  locale: Locale,
  slug: string,
): Promise<ProductSummaryDto[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  return apiGet<ProductSummaryDto[]>(
    `/catalog/products/${encodeURIComponent(slug)}/related?locale=${locale}`,
  );
}

export async function getSitemapEntries(): Promise<SitemapEntriesDto> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog', 'content');
  return apiGet<SitemapEntriesDto>('/catalog/sitemap');
}
