import type { Prisma } from '../generated/prisma/client.js';

/**
 * The single definition of "visible on the storefront": active, published, and sellable in at
 * least one active pack size. Drafts, archived products and products without variants never leak.
 */
export function visibleProductWhere(now: Date = new Date()): Prisma.ProductWhereInput {
  return {
    status: 'ACTIVE',
    publishedAt: { lte: now },
    variants: { some: { isActive: true } },
  };
}
