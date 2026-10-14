import { MAX_LINE_QUANTITY } from '@teran/contracts';

/** Distinct lines allowed in one cart; protects the database from abuse. */
export const MAX_CART_LINES = 30;

export interface MergeLine {
  variantId: string;
  quantity: number;
}

export interface VariantAvailability {
  /** Active variant of a published, visible product. */
  orderable: boolean;
  stockQuantity: number;
}

/**
 * Merge rules for the cart a customer had on this device (as a guest) and the cart saved on their
 * account from an earlier visit, applied when they sign in or register:
 *
 * 1. The same variant in both carts becomes one line; quantities are added.
 * 2. The combined quantity is capped at the per-line limit and, for orderable variants, at the
 *    stock available now. A variant that is out of stock or no longer sold keeps its line (capped
 *    at the per-line limit) so the customer sees it flagged and decides; checkout refuses it.
 * 3. At most MAX_CART_LINES lines: the device cart's lines come first (the most recent intent),
 *    then the account cart's in their original order.
 * 4. Prices are never merged: every line is priced from the catalogue when the cart is read.
 *
 * Pure and deterministic, so merging the same inputs twice gives the same result.
 */
export function mergeCartLines(
  device: readonly MergeLine[],
  account: readonly MergeLine[],
  availability: ReadonlyMap<string, VariantAvailability>,
): MergeLine[] {
  const merged = new Map<string, number>();
  for (const line of [...device, ...account]) {
    if (line.quantity <= 0) continue;
    merged.set(line.variantId, (merged.get(line.variantId) ?? 0) + line.quantity);
  }

  const lines: MergeLine[] = [];
  for (const [variantId, requested] of merged) {
    if (lines.length >= MAX_CART_LINES) break;
    const variant = availability.get(variantId);
    let quantity = Math.min(requested, MAX_LINE_QUANTITY);
    if (variant?.orderable && variant.stockQuantity > 0) {
      quantity = Math.min(quantity, variant.stockQuantity);
    }
    lines.push({ variantId, quantity });
  }
  return lines;
}
