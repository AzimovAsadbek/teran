import { z } from 'zod';
import { localeSchema, moneySchema } from './common.js';
import {
  MAX_LINE_QUANTITY,
  imageSchema,
  illustrationKeySchema,
  productFormatSchema,
  stockLevelSchema,
} from './catalog.js';

export const quantitySchema = z.coerce.number().int().min(1).max(MAX_LINE_QUANTITY);

export const addCartItemSchema = z.object({
  variantId: z.uuid(),
  quantity: quantitySchema.default(1),
});
export type AddCartItemInput = z.infer<typeof addCartItemSchema>;

export const updateCartItemSchema = z.object({
  quantity: quantitySchema,
});
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

export const cartQuerySchema = z.object({ locale: localeSchema.default('uz') });

/**
 * Why a cart line needs the customer's attention. Prices and stock are re-validated on every
 * cart read, so the cart always reflects the current catalogue.
 */
export const CART_LINE_ISSUES = ['unavailable', 'out_of_stock', 'quantity_reduced'] as const;
export const cartLineIssueSchema = z.enum(CART_LINE_ISSUES);
export type CartLineIssue = z.infer<typeof cartLineIssueSchema>;

export const cartLineSchema = z.object({
  id: z.uuid(),
  variantId: z.uuid(),
  productSlug: z.string(),
  productName: z.string(),
  format: productFormatSchema,
  sku: z.string(),
  weightGrams: z.number().int().nullable(),
  unitCount: z.number().int().nullable(),
  image: imageSchema.nullable(),
  illustrationKey: illustrationKeySchema.nullable(),
  unitPrice: moneySchema,
  compareAtPrice: moneySchema.nullable(),
  quantity: z.number().int(),
  lineTotal: moneySchema,
  maxQuantity: z.number().int(),
  stockLevel: stockLevelSchema,
  issue: cartLineIssueSchema.nullable(),
});
export type CartLineDto = z.infer<typeof cartLineSchema>;

export const deliveryHintSchema = z.object({
  methodName: z.string(),
  freeFromAmount: moneySchema,
  remaining: moneySchema,
});

export const cartSchema = z.object({
  lines: z.array(cartLineSchema),
  itemCount: z.number().int(),
  subtotal: moneySchema,
  currency: z.string(),
  /** True when every line can be ordered as-is. */
  isCheckoutReady: z.boolean(),
  /** Progress toward free delivery for the primary delivery method, when TERAN configured one. */
  deliveryHint: deliveryHintSchema.nullable(),
});
export type CartDto = z.infer<typeof cartSchema>;
