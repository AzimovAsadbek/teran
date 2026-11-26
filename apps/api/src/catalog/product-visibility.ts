import {
  productAllowsOnlineSale,
  RETAIL_TEA_CATEGORY,
  type ProductSaleMode,
} from '@teran/contracts';
import type { Prisma } from '../generated/prisma/client.js';

export const onlineProductWhere = {
  OR: [
    { saleMode: 'ONLINE' },
    {
      saleMode: 'CATEGORY',
      category: {
        OR: [
          { slug: RETAIL_TEA_CATEGORY, parentId: null },
          { parent: { slug: RETAIL_TEA_CATEGORY } },
        ],
      },
    },
  ],
} satisfies Prisma.ProductWhereInput;

export const retailCategorySelect = {
  slug: true,
  isActive: true,
  parent: { select: { slug: true, isActive: true } },
} satisfies Prisma.CategorySelect;

export function isOnlineProduct({
  saleMode,
  category,
}: {
  saleMode: ProductSaleMode;
  category: Prisma.CategoryGetPayload<{ select: typeof retailCategorySelect }>;
}): boolean {
  return (
    category.isActive &&
    category.parent?.isActive !== false &&
    productAllowsOnlineSale(
      saleMode,
      category.parent ? category.parent.slug + '/' + category.slug : category.slug,
    )
  );
}

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
