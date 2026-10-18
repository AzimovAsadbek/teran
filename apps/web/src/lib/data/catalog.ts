import 'server-only';
import type {
  CategoryDto,
  CategoryPageDto,
  CollectionDto,
  Locale,
  ProductDetailDto,
  ProductListDto,
  ProductSummaryDto,
  SitemapEntriesDto,
} from '@teran/contracts';
import { cacheLife, cacheTag } from 'next/cache';
import { apiGet, apiGetOrNull } from '@/lib/api/server';
import { detailPrices, listPrices, summaryPrices } from './prices';

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

/** A category page by path ("tea", "tea/green-tea"), its new address if moved, or null. */
export async function getCategoryPage(
  locale: Locale,
  path: string,
): Promise<CategoryPageDto | null> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  return apiGetOrNull<CategoryPageDto>(
    `/catalog/category-page?locale=${locale}&path=${encodeURIComponent(path)}`,
  );
}

/** The current slug of a renamed product or collection, for permanent redirects. */
export async function getSlugRedirect(
  entity: 'products' | 'collections',
  slug: string,
): Promise<string | null> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  const found = await apiGetOrNull<{ slug: string }>(
    `/catalog/redirects/${entity}/${encodeURIComponent(slug)}`,
  );
  return found?.slug ?? null;
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
  return listPrices(
    await apiGet<ProductListDto>(`/catalog/products?locale=${locale}${separator}${query}`),
  );
}

/** Null when no public product has this slug (unknown, draft, archived or unpublished). */
export async function getProduct(locale: Locale, slug: string): Promise<ProductDetailDto | null> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  const product = await apiGetOrNull<ProductDetailDto>(
    `/catalog/products/${encodeURIComponent(slug)}?locale=${locale}`,
  );
  return product ? detailPrices(product) : null;
}

export async function getRelatedProducts(
  locale: Locale,
  slug: string,
): Promise<ProductSummaryDto[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  const related = await apiGet<ProductSummaryDto[]>(
    `/catalog/products/${encodeURIComponent(slug)}/related?locale=${locale}`,
  );
  return related.map(summaryPrices);
}

export async function getSitemapEntries(): Promise<SitemapEntriesDto> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog', 'content');
  return apiGet<SitemapEntriesDto>('/catalog/sitemap');
}
