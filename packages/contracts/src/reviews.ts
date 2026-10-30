import { z } from 'zod';
import { localeSchema, paginationQuerySchema } from './common.js';
import { REVIEW_COMMENT_MAX } from './constants.js';

/*
 * Product ratings and reviews (ADR-042): a signed-in customer gives a product 1 to 5 stars, with
 * an optional comment, once (saving again replaces it). A review shows at once; staff can hide it
 * or delete it. Nothing here is ever written on a customer's behalf.
 */

export const REVIEW_STATUSES = ['PUBLISHED', 'HIDDEN'] as const;
export const reviewStatusSchema = z.enum(REVIEW_STATUSES);
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

/** What a customer sends: the stars and, optionally, a few words. */
export const reviewInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z
    .string()
    .trim()
    .max(REVIEW_COMMENT_MAX)
    .nullish()
    .transform((value) => (value ? value : null)),
});
export type ReviewInput = z.input<typeof reviewInputSchema>;

/** A published review as every visitor sees it: the author's first name and initial only. */
export const publicReviewSchema = z.object({
  id: z.uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  /** "Aziza K." */
  authorName: z.string(),
  /** The author has a delivered order with this product. */
  verifiedPurchase: z.boolean(),
  /** The language the comment was written in. */
  locale: localeSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PublicReviewDto = z.infer<typeof publicReviewSchema>;

/** How a product's stars spread: how many reviews gave 5, 4, 3, 2 and 1 star. */
export const ratingBreakdownSchema = z.object({
  average: z.number().min(0).max(5),
  count: z.number().int().min(0),
  /** Index 0 is five stars, index 4 one star. */
  stars: z.array(z.number().int().min(0)).length(5),
});
export type RatingBreakdownDto = z.infer<typeof ratingBreakdownSchema>;

export const productReviewsQuerySchema = paginationQuerySchema.extend({
  pageSize: z.coerce.number().int().min(1).max(50).default(6),
});

/** A page of a product's published reviews, newest first, with the stars' breakdown. */
export const productReviewsSchema = z.object({
  items: z.array(publicReviewSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
  summary: ratingBreakdownSchema,
});
export type ProductReviewsDto = z.infer<typeof productReviewsSchema>;

/** The signed-in customer's own review of a product (hidden ones too, so they know). */
export const myReviewSchema = publicReviewSchema.extend({ status: reviewStatusSchema });
export type MyReviewDto = z.infer<typeof myReviewSchema>;

/** A review in the admin area, with its product and its author's contact. */
export const adminReviewSchema = z.object({
  id: z.uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  status: reviewStatusSchema,
  verifiedPurchase: z.boolean(),
  locale: localeSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  product: z.object({ id: z.uuid(), slug: z.string(), name: z.string() }),
  customer: z.object({ id: z.uuid(), name: z.string(), email: z.string() }),
});
export type AdminReviewDto = z.infer<typeof adminReviewSchema>;

export const adminReviewListQuerySchema = paginationQuerySchema.extend({
  status: reviewStatusSchema.optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type AdminReviewListQuery = z.infer<typeof adminReviewListQuerySchema>;

export const adminReviewUpdateSchema = z.object({ status: reviewStatusSchema });
export type AdminReviewUpdate = z.infer<typeof adminReviewUpdateSchema>;

/** "Aziza K.": a reviewer's first name and the initial of their last name, if any. */
export function reviewAuthorName(firstName: string, lastName: string | null): string {
  const first = firstName.trim() || '—';
  const initial = lastName?.trim().charAt(0);
  return initial ? `${first} ${initial.toUpperCase()}.` : first;
}

/** The average of a product's stars to one decimal (4.75 → 4.8), from their sum and count. */
export function ratingAverage(sum: number, count: number): number {
  return count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
}
