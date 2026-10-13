import type { Prisma } from '../generated/prisma/client.js';

/**
 * Recomputes Product.minPrice from its active variants. Must be called inside the same
 * transaction as any variant change (price, activation, creation) so sorting and price
 * filters never disagree with the variants themselves.
 */
export async function refreshMinPrice(
  tx: Prisma.TransactionClient,
  productId: string,
): Promise<void> {
  const { _min } = await tx.productVariant.aggregate({
    where: { productId, isActive: true },
    _min: { price: true },
  });
  await tx.product.update({ where: { id: productId }, data: { minPrice: _min.price } });
}
