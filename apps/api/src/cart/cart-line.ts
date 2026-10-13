import { MAX_LINE_QUANTITY, type CartLineIssue } from '@teran/contracts';

export interface CartLineState {
  requestedQuantity: number;
  productVisible: boolean;
  variantActive: boolean;
  stockQuantity: number;
}

export interface CartLineEvaluation {
  /** Quantity that can actually be ordered right now. */
  quantity: number;
  issue: CartLineIssue | null;
  orderable: boolean;
}

/**
 * Decides what a cart line means against the current catalogue. Used both when showing the cart
 * and when placing an order, so what the customer sees is exactly what gets ordered.
 * Reading never mutates the stored quantity: if stock comes back, the original request returns.
 */
export function evaluateCartLine(state: CartLineState): CartLineEvaluation {
  if (!state.productVisible || !state.variantActive) {
    return { quantity: 0, issue: 'unavailable', orderable: false };
  }
  const available = Math.min(state.stockQuantity, MAX_LINE_QUANTITY);
  if (available <= 0) {
    return { quantity: 0, issue: 'out_of_stock', orderable: false };
  }
  if (state.requestedQuantity > available) {
    return { quantity: available, issue: 'quantity_reduced', orderable: true };
  }
  return { quantity: state.requestedQuantity, issue: null, orderable: true };
}

export function isProductPublic(
  product: { status: string; publishedAt: Date | null },
  now: Date,
): boolean {
  return product.status === 'ACTIVE' && product.publishedAt !== null && product.publishedAt <= now;
}
