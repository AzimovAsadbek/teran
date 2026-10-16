import type { Prisma } from '../generated/prisma/client.js';

/**
 * The single definition of "visible on the storefront": active, published, sellable in at least
 * one active pack size, and in a category that is itself public (active, under an active parent).
 * Drafts, archived products, products without variants and products of a hidden category never
 * leak into listings, product pages, search, the sitemap or the bag.
 */
export function visibleProductWhere(now: Date = new Date()): Prisma.ProductWhereInput {
  return {
    status: 'ACTIVE',
    publishedAt: { lte: now },
    variants: { some: { isActive: true } },
    category: { isActive: true, OR: [{ parentId: null }, { parent: { isActive: true } }] },
  };
}
