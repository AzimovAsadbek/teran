import type { Prisma } from '../generated/prisma/client.js';

/**
 * Returns every line of a cancelled order to stock and records each return in the inventory
 * ledger. Lines whose variant has since been deleted are skipped. Returns whether anything was
 * restocked (so callers can refresh the storefront's cached stock levels).
 */
export async function releaseOrderStock(
  tx: Prisma.TransactionClient,
  order: { id: string; items: readonly { variantId: string | null; quantity: number }[] },
  actorUserId: string | null,
): Promise<boolean> {
  let restocked = false;
  for (const item of order.items) {
    if (!item.variantId) continue;
    const variant = await tx.productVariant.update({
      where: { id: item.variantId },
      data: { stockQuantity: { increment: item.quantity } },
      select: { stockQuantity: true },
    });
    await tx.inventoryMovement.create({
      data: {
        variantId: item.variantId,
        delta: item.quantity,
        quantityAfter: variant.stockQuantity,
        reason: 'ORDER_CANCELLED',
        orderId: order.id,
        actorUserId,
      },
    });
    restocked = true;
  }
  return restocked;
}
