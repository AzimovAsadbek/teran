import 'server-only';
import type { ProductReviewsDto } from '@teran/contracts';
import { cacheLife, cacheTag } from 'next/cache';
import { apiGetOrNull } from '@/lib/api/server';

/** Reviews shown on a product page before "show more" (the API's own page size for it). */
export const REVIEWS_PAGE_SIZE = 6;

/**
 * The first page of a product's published reviews, in whatever language each was written, with
 * the stars' breakdown; null for a product shoppers cannot see. Cached with the catalogue: the API
 * asks for the "catalog" tag whenever a review is saved, hidden or deleted (ADR-042).
 */
export async function getProductReviews(slug: string): Promise<ProductReviewsDto | null> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  return apiGetOrNull<ProductReviewsDto>(
    `/catalog/products/${encodeURIComponent(slug)}/reviews?pageSize=${REVIEWS_PAGE_SIZE}`,
  );
}
