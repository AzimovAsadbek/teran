import { z } from 'zod';
import { emailSchema, localeSchema, moneySchema, optionalText } from './common.js';
import { illustrationKeySchema, imageSchema, productFormatSchema } from './catalog.js';
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

export const PAYMENT_STATUSES = [
  'PENDING',
  'REQUIRES_ACTION',
  'PROCESSING',
  'PAID',
  'FAILED',
  'REFUNDED',
  'CANCELLED',
  'EXPIRED',
  'REFUND_PENDING',
  'PARTIALLY_REFUNDED',
] as const;
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

/**
 * Payment lifecycle (docs/architecture/payments.md). Only the API changes a payment's status, and
 * only along these edges; anything else is rejected.
 *
 * - PENDING: created, nothing asked of the customer yet (cash on delivery stays here until paid).
 * - REQUIRES_ACTION: the customer must complete the payment on the provider's page.
 * - PROCESSING: the provider is working on it (e.g. a transaction is open).
 * - PAID: money captured (online) or cash recorded by staff.
 * - FAILED, CANCELLED, EXPIRED: ended without payment; the customer may start a new attempt
 *   while the order still awaits payment.
 * - REFUND_PENDING → REFUNDED or PARTIALLY_REFUNDED: money returned after payment.
 */
export const PAYMENT_STATUS_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  PENDING: ['REQUIRES_ACTION', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED'],
  REQUIRES_ACTION: ['PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED'],
  PROCESSING: ['PAID', 'FAILED', 'CANCELLED', 'EXPIRED'],
  PAID: ['REFUND_PENDING', 'REFUNDED', 'PARTIALLY_REFUNDED'],
  REFUND_PENDING: ['REFUNDED', 'PARTIALLY_REFUNDED', 'PAID'],
  PARTIALLY_REFUNDED: ['REFUND_PENDING', 'REFUNDED'],
  FAILED: [],
  CANCELLED: [],
  EXPIRED: [],
  REFUNDED: [],
};

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  return PAYMENT_STATUS_TRANSITIONS[from].includes(to);
}

/**
 * Payment methods the platform knows about. Which are offered at checkout is configured by the
 * API (PAYMENT_METHODS_ENABLED); online methods additionally need a configured provider, or the
 * demonstration mode, before they can be used.
 */
export const PAYMENT_METHODS = ['CASH_ON_DELIVERY', 'CLICK', 'PAYME', 'CARD'] as const;
export const paymentMethodSchema = z.enum(PAYMENT_METHODS);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const ONLINE_PAYMENT_METHODS = ['CLICK', 'PAYME', 'CARD'] as const;
export const onlinePaymentMethodSchema = z.enum(ONLINE_PAYMENT_METHODS);
export type OnlinePaymentMethod = z.infer<typeof onlinePaymentMethodSchema>;

export function isOnlinePaymentMethod(method: PaymentMethod): method is OnlinePaymentMethod {
  return (ONLINE_PAYMENT_METHODS as readonly string[]).includes(method);
}

export const PAYMENT_PROVIDERS = ['CASH', 'DEMO', 'CLICK', 'PAYME'] as const;
export const paymentProviderSchema = z.enum(PAYMENT_PROVIDERS);
export type PaymentProviderCode = z.infer<typeof paymentProviderSchema>;

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

/**
 * How a payment method can be offered right now:
 * - live: processed by the real provider (credentials configured and verified at start-up);
 * - demo: processed by the simulated demo provider, no money moves (clearly labelled);
 * - unavailable: known but not configured, shown disabled.
 */
export const PAYMENT_AVAILABILITY = ['live', 'demo', 'unavailable'] as const;
export const paymentOptionSchema = z.object({
  method: paymentMethodSchema,
  availability: z.enum(PAYMENT_AVAILABILITY),
});
export type PaymentOptionDto = z.infer<typeof paymentOptionSchema>;

export const checkoutOptionsSchema = z.object({
  deliveryMethods: z.array(deliveryMethodSchema),
  /** Methods that can be chosen (live or demo). */
  paymentMethods: z.array(paymentMethodSchema),
  /** Every method the store presents, including unavailable ones, in display order. */
  paymentOptions: z.array(paymentOptionSchema),
  /** Minutes an online payment can stay unpaid before the order is cancelled. */
  onlinePaymentWindowMinutes: z.number().int(),
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
  /** Signed-in customers: also save the delivery address to their address book. */
  saveAddress: z.boolean().optional(),
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
  format: productFormatSchema,
  sku: z.string(),
  weightGrams: z.number().int().nullable(),
  unitCount: z.number().int().nullable(),
  unitPrice: moneySchema,
  quantity: z.number().int(),
  lineTotal: moneySchema,
  image: imageSchema.nullable(),
  illustrationKey: illustrationKeySchema.nullable(),
});

/**
 * - payment_not_completed: an online payment did not succeed within the payment window, so the
 *   order was cancelled automatically and its items returned to stock;
 * - store: cancelled by the store (the customer is contacted directly).
 */
export const ORDER_CANCEL_REASONS = ['payment_not_completed', 'store'] as const;
export type OrderCancelReason = (typeof ORDER_CANCEL_REASONS)[number];

/** A status change as the customer sees it: when, and to what (staff notes are never included). */
export const orderEventSchema = z.object({
  status: orderStatusSchema,
  at: z.string(),
});

/** One payment attempt, without provider internals. */
export const orderPaymentSchema = z.object({
  method: paymentMethodSchema,
  status: paymentStatusSchema,
  amount: moneySchema,
  currency: z.string(),
  /** Processed by the simulated demo provider: no money moved. */
  demo: z.boolean(),
  createdAt: z.string(),
  paidAt: z.string().nullable(),
  failureCode: z.string().nullable(),
});
export type OrderPaymentDto = z.infer<typeof orderPaymentSchema>;

export const orderSchema = z.object({
  number: z.string(),
  status: orderStatusSchema,
  paymentStatus: paymentStatusSchema,
  paymentMethod: paymentMethodSchema,
  createdAt: z.string(),
  events: z.array(orderEventSchema),
  payments: z.array(orderPaymentSchema),
  /** An online payment is still required and can be started now (until paymentDueAt). */
  awaitingPayment: z.boolean(),
  /** When the order is cancelled if an online payment has not succeeded by then. */
  paymentDueAt: z.string().nullable(),
  /** Why a cancelled order was cancelled, as the customer may see it (never a staff note). */
  cancelReason: z.enum(ORDER_CANCEL_REASONS).nullable(),
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

/** Where to send the customer to pay; null when nothing needs to be done online. */
export const paymentSessionSchema = z.object({
  status: paymentStatusSchema,
  method: paymentMethodSchema,
  demo: z.boolean(),
  /** Absolute provider URL, or a site path for the demo payment page. */
  redirectUrl: z.string().nullable(),
});
export type PaymentSessionDto = z.infer<typeof paymentSessionSchema>;

export const placedOrderSchema = z.object({
  order: orderSchema,
  /** Secret token for the guest order-status link; only returned once, at placement. */
  accessToken: z.string(),
  payment: paymentSessionSchema.nullable(),
});
export type PlacedOrderDto = z.infer<typeof placedOrderSchema>;

/** Start a new payment attempt for an order that still awaits payment (retry or switch method). */
export const startPaymentSchema = z.object({
  method: paymentMethodSchema,
  locale: localeSchema.default('uz'),
  /** Guest orders: the secret token from the order link. Signed-in owners do not need it. */
  token: z.string().min(20).max(200).optional(),
});
export type StartPaymentInput = z.input<typeof startPaymentSchema>;

/** Simulated outcomes of the demo provider; each is deterministic. */
export const DEMO_PAYMENT_OUTCOMES = ['success', 'failure', 'cancel', 'pending'] as const;
export const demoPaymentActionSchema = z.object({
  token: z.string().min(20).max(200),
  outcome: z.enum(DEMO_PAYMENT_OUTCOMES),
});
export type DemoPaymentOutcome = (typeof DEMO_PAYMENT_OUTCOMES)[number];

export const demoPaymentSchema = z.object({
  orderNumber: z.string(),
  method: paymentMethodSchema,
  status: paymentStatusSchema,
  amount: moneySchema,
  currency: z.string(),
  expiresAt: z.string().nullable(),
  /** Where the customer continues after the simulated payment (order page). */
  returnPath: z.string(),
});
export type DemoPaymentDto = z.infer<typeof demoPaymentSchema>;

/**
 * Where a customer lands after a provider's (or the demo) payment page. The page shows the order's
 * payment state as the API knows it: arriving here never marks anything as paid.
 */
export const paymentReturnSchema = z.object({
  orderNumber: z.string(),
  paymentStatus: paymentStatusSchema,
  awaitingPayment: z.boolean(),
  /** Site path of the order page (with the guest link token for guest orders). */
  orderPath: z.string(),
});
export type PaymentReturnDto = z.infer<typeof paymentReturnSchema>;

export const paymentTokenQuerySchema = z.object({ token: z.string().min(20).max(200) });

export const orderLookupQuerySchema = z.object({ token: z.string().min(20).max(200) });
