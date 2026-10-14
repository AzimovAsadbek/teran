import { z } from 'zod';
import { emailSchema, moneySchema, optionalText } from './common.js';
import { PASSWORD_MAX_LENGTH } from './constants.js';
import { illustrationKeySchema, imageSchema, productFormatSchema } from './catalog.js';
import { cartSchema } from './cart.js';
import { orderStatusSchema, paymentMethodSchema, paymentStatusSchema } from './orders.js';
import { regionCodeSchema, uzPhoneSchema } from './uzbekistan.js';

// ─── Address book ───────────────────────────────────────────────────────────

/** Saved addresses per customer; enough for home, office and a few relatives. */
export const MAX_ADDRESSES = 10;

export const addressInputSchema = z.object({
  label: optionalText(40),
  recipientName: z.string().trim().min(2).max(120),
  phone: uzPhoneSchema,
  regionCode: regionCodeSchema,
  city: z.string().trim().min(2).max(80),
  addressLine: z.string().trim().min(3).max(200),
  landmark: optionalText(200),
  isDefault: z.boolean().default(false),
});
export type AddressInput = z.input<typeof addressInputSchema>;

export const addressSchema = z.object({
  id: z.uuid(),
  label: z.string().nullable(),
  recipientName: z.string(),
  phone: z.string(),
  regionCode: z.string(),
  city: z.string(),
  addressLine: z.string(),
  landmark: z.string().nullable(),
  isDefault: z.boolean(),
  createdAt: z.string(),
});
export type AddressDto = z.infer<typeof addressSchema>;

// ─── Orders as the customer sees them ───────────────────────────────────────

export const ACCOUNT_ORDER_FILTERS = ['all', 'active', 'completed', 'cancelled'] as const;
export const accountOrderFilterSchema = z.enum(ACCOUNT_ORDER_FILTERS);
export type AccountOrderFilter = z.infer<typeof accountOrderFilterSchema>;

export const accountOrdersQuerySchema = z.object({
  status: accountOrderFilterSchema.default('all'),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(20).default(10),
});

export const accountOrderListItemSchema = z.object({
  number: z.string(),
  createdAt: z.string(),
  status: orderStatusSchema,
  paymentStatus: paymentStatusSchema,
  paymentMethod: paymentMethodSchema,
  total: moneySchema,
  currency: z.string(),
  itemCount: z.number().int(),
  /** The customer has something to do: pay an online order that is still awaiting payment. */
  needsAttention: z.boolean(),
});
export type AccountOrderListItem = z.infer<typeof accountOrderListItemSchema>;

export const accountSummarySchema = z.object({
  ordersCount: z.number().int(),
  activeOrdersCount: z.number().int(),
  addressesCount: z.number().int(),
  memberSince: z.string(),
  recentOrders: z.array(accountOrderListItemSchema),
  attentionOrders: z.array(accountOrderListItemSchema),
});
export type AccountSummaryDto = z.infer<typeof accountSummarySchema>;

/** A product the customer bought before, aggregated over non-cancelled orders. */
export const purchasedProductSchema = z.object({
  productSlug: z.string(),
  productName: z.string(),
  sku: z.string(),
  format: productFormatSchema,
  weightGrams: z.number().int().nullable(),
  unitCount: z.number().int().nullable(),
  totalQuantity: z.number().int(),
  ordersCount: z.number().int(),
  lastOrderedAt: z.string(),
  image: imageSchema.nullable(),
  illustrationKey: illustrationKeySchema.nullable(),
  /** The same pack can be bought again today (active, published, in stock). */
  available: z.boolean(),
});
export type PurchasedProductDto = z.infer<typeof purchasedProductSchema>;

/**
 * Why a line of an earlier order was not (fully) put back in the cart: no longer sold, out of
 * stock, or only partly (stock, per-line limit or the cart's line limit).
 */
export const REORDER_SKIP_REASONS = ['unavailable', 'out_of_stock', 'limited'] as const;
export const reorderResultSchema = z.object({
  cart: cartSchema,
  added: z.array(z.string()),
  skipped: z.array(z.object({ sku: z.string(), reason: z.enum(REORDER_SKIP_REASONS) })),
});
export type ReorderResultDto = z.infer<typeof reorderResultSchema>;

// ─── Profile and security ───────────────────────────────────────────────────

/** Changing the sign-in e-mail requires the current password (re-authentication). */
export const changeEmailSchema = z.object({
  newEmail: emailSchema,
  currentPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});
export type ChangeEmailInput = z.input<typeof changeEmailSchema>;

/** A signed-in device, without identifiers or addresses (only "sign out other devices" acts on it). */
export const accountSessionSchema = z.object({
  current: z.boolean(),
  createdAt: z.string(),
  lastSeenAt: z.string(),
  /** Browser and system, shortened from the User-Agent header. */
  device: z.string().nullable(),
});
export type AccountSessionDto = z.infer<typeof accountSessionSchema>;

export const accountProfileSchema = z.object({
  email: z.string(),
  firstName: z.string(),
  lastName: z.string().nullable(),
  phone: z.string().nullable(),
  locale: z.string(),
  memberSince: z.string(),
  isActive: z.boolean(),
});
export type AccountProfileDto = z.infer<typeof accountProfileSchema>;
