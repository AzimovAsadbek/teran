import { z } from 'zod';
import { emailSchema, localeSchema, moneySchema, optionalText } from './common.js';
import { illustrationKeySchema, imageSchema } from './catalog.js';
import { regionCodeSchema, uzPhoneSchema } from './uzbekistan.js';

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;
export const orderStatusSchema = z.enum(ORDER_STATUSES);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED'] as const;
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

/**
 * Payment methods the platform knows about. Which are offered at checkout is configured by the
 * API (PAYMENT_METHODS_ENABLED); online providers are added here once integrated and verified.
 */
export const PAYMENT_METHODS = ['CASH_ON_DELIVERY'] as const;
export const paymentMethodSchema = z.enum(PAYMENT_METHODS);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

/**
 * Allowed order status transitions. This single table is enforced by the API and used by the
 * admin UI to offer only valid actions.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

// ─── Delivery methods ───────────────────────────────────────────────────────

export const deliveryMethodSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  estimate: z.string().nullable(),
  price: moneySchema,
  freeFromAmount: moneySchema.nullable(),
  currency: z.string(),
  /** Empty array = available in every region. */
  regionCodes: z.array(z.string()),
  requiresAddress: z.boolean(),
});
export type DeliveryMethodDto = z.infer<typeof deliveryMethodSchema>;

export const checkoutOptionsSchema = z.object({
  deliveryMethods: z.array(deliveryMethodSchema),
  paymentMethods: z.array(paymentMethodSchema),
});
export type CheckoutOptionsDto = z.infer<typeof checkoutOptionsSchema>;

// ─── Checkout ───────────────────────────────────────────────────────────────

export const checkoutCustomerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: uzPhoneSchema,
  email: emailSchema.optional().or(z.literal('').transform(() => undefined)),
});

export const checkoutDeliverySchema = z.object({
  methodCode: z.string().trim().min(1).max(50),
  regionCode: regionCodeSchema,
  city: z.string().trim().min(2).max(100),
  addressLine: optionalText(200),
  landmark: optionalText(200),
});

export const checkoutSchema = z.object({
  /** Generated once per checkout attempt by the client; repeated submissions return the same order. */
  idempotencyKey: z.uuid(),
  locale: localeSchema,
  customer: checkoutCustomerSchema,
  delivery: checkoutDeliverySchema,
  paymentMethod: paymentMethodSchema,
  note: optionalText(500),
  /** Total the customer reviewed. If the server total differs, the order is rejected with PRICE_CHANGED. */
  expectedTotal: moneySchema.optional(),
  acceptTerms: z.literal(true, { error: 'terms_required' }),
});
export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutPayload = z.output<typeof checkoutSchema>;

export const checkoutQuoteSchema = z.object({
  locale: localeSchema,
  methodCode: z.string().trim().min(1).max(50),
  regionCode: regionCodeSchema,
});
export type CheckoutQuoteInput = z.infer<typeof checkoutQuoteSchema>;

export const checkoutQuoteResultSchema = z.object({
  subtotal: moneySchema,
  deliveryFee: moneySchema,
  discountTotal: moneySchema,
  total: moneySchema,
  currency: z.string(),
});
export type CheckoutQuoteDto = z.infer<typeof checkoutQuoteResultSchema>;

// ─── Orders (customer view) ─────────────────────────────────────────────────

export const orderItemSchema = z.object({
  productName: z.string(),
  productSlug: z.string(),
  sku: z.string(),
  weightGrams: z.number().int().nullable(),
  unitCount: z.number().int().nullable(),
  unitPrice: moneySchema,
  quantity: z.number().int(),
  lineTotal: moneySchema,
  image: imageSchema.nullable(),
  illustrationKey: illustrationKeySchema.nullable(),
});

export const orderSchema = z.object({
  number: z.string(),
  status: orderStatusSchema,
  paymentStatus: paymentStatusSchema,
  paymentMethod: paymentMethodSchema,
  createdAt: z.string(),
  customerName: z.string(),
  customerPhone: z.string(),
  customerEmail: z.string().nullable(),
  deliveryMethodName: z.string(),
  regionCode: z.string(),
  city: z.string(),
  addressLine: z.string().nullable(),
  landmark: z.string().nullable(),
  note: z.string().nullable(),
  items: z.array(orderItemSchema),
  subtotal: moneySchema,
  deliveryFee: moneySchema,
  discountTotal: moneySchema,
  total: moneySchema,
  currency: z.string(),
});
export type OrderDto = z.infer<typeof orderSchema>;

export const placedOrderSchema = z.object({
  order: orderSchema,
  /** Secret token for the guest order-status link; only returned once, at placement. */
  accessToken: z.string(),
});
export type PlacedOrderDto = z.infer<typeof placedOrderSchema>;

export const orderLookupQuerySchema = z.object({ token: z.string().min(20).max(200) });
