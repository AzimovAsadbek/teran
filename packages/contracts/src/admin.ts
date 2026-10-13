import { z } from 'zod';
import {
  emailSchema,
  moneySchema,
  optionalText,
  slugSchema,
  type Locale,
  type Money,
} from './common.js';
import {
  caffeineLevelSchema,
  illustrationKeySchema,
  productFormatSchema,
  type CaffeineLevel,
  type IllustrationKey,
  type ImageDto,
  type ProductFormat,
} from './catalog.js';
import { inquiryStatusSchema, type BusinessType, type InquiryStatus } from './inquiries.js';
import {
  orderStatusSchema,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from './orders.js';
import { passwordSchema, type UserRole } from './auth.js';
import { REGION_CODES } from './uzbekistan.js';

export const PRODUCT_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;
export const productStatusSchema = z.enum(PRODUCT_STATUSES);
export type ProductStatus = z.infer<typeof productStatusSchema>;

export const ARTICLE_STATUSES = ['DRAFT', 'PUBLISHED'] as const;
export const articleStatusSchema = z.enum(ARTICLE_STATUSES);
export type ArticleStatus = z.infer<typeof articleStatusSchema>;

const positiveMoney = moneySchema.refine((value) => Number(value) >= 0, {
  error: 'money_negative',
});

/**
 * Uzbek is the default locale and therefore required; Russian and English translations are optional
 * and fall back to Uzbek on the storefront when missing.
 */
function localizedInput<T extends z.ZodObject>(shape: T) {
  return z.object({ uz: shape, ru: shape.nullable(), en: shape.nullable() });
}

// ─── Products ───────────────────────────────────────────────────────────────

export const productTranslationInputSchema = z.object({
  name: z.string().trim().min(2).max(150),
  shortDescription: optionalText(300),
  description: optionalText(5000),
  ingredients: optionalText(1000),
  tastingNotes: optionalText(500),
  origin: optionalText(150),
  seoTitle: optionalText(70),
  seoDescription: optionalText(170),
});

export const variantInputSchema = z
  .object({
    /** Present for existing variants, absent for new ones. */
    id: z.uuid().optional(),
    sku: z
      .string()
      .trim()
      .min(2)
      .max(40)
      .regex(/^[A-Z0-9][A-Z0-9-]*$/, { error: 'invalid_sku' }),
    weightGrams: z.number().int().min(1).max(100_000).nullable(),
    unitCount: z.number().int().min(1).max(1000).nullable(),
    price: positiveMoney,
    compareAtPrice: positiveMoney.nullable(),
    lowStockThreshold: z.number().int().min(0).max(10_000),
    barcode: z
      .string()
      .trim()
      .regex(/^\d{8,14}$/, { error: 'invalid_barcode' })
      .nullable(),
    isActive: z.boolean(),
    /** Only used when creating a variant; later stock changes go through inventory adjustments. */
    initialStock: z.number().int().min(0).max(100_000).optional(),
  })
  .refine(
    (variant) =>
      variant.compareAtPrice === null || Number(variant.compareAtPrice) > Number(variant.price),
    {
      error: 'compare_at_not_above_price',
      path: ['compareAtPrice'],
    },
  )
  .refine((variant) => variant.weightGrams !== null || variant.unitCount !== null, {
    error: 'variant_size_required',
    path: ['weightGrams'],
  });
export type VariantInput = z.infer<typeof variantInputSchema>;

export const productUpsertSchema = z
  .object({
    slug: slugSchema,
    status: productStatusSchema,
    categoryId: z.uuid(),
    format: productFormatSchema,
    isFeatured: z.boolean(),
    caffeineLevel: caffeineLevelSchema.nullable(),
    brewTempCelsius: z.number().int().min(40).max(100).nullable(),
    brewTimeMinSeconds: z.number().int().min(10).max(3600).nullable(),
    brewTimeMaxSeconds: z.number().int().min(10).max(3600).nullable(),
    brewAmountGrams: z.number().min(0.1).max(50).multipleOf(0.1).nullable(),
    illustrationKey: illustrationKeySchema.nullable(),
    collectionIds: z.array(z.uuid()).max(20),
    translations: localizedInput(productTranslationInputSchema),
    variants: z.array(variantInputSchema).min(1).max(20),
  })
  .refine(
    (product) =>
      product.brewTimeMinSeconds === null ||
      product.brewTimeMaxSeconds === null ||
      product.brewTimeMaxSeconds >= product.brewTimeMinSeconds,
    { error: 'brew_time_order', path: ['brewTimeMaxSeconds'] },
  )
  .refine(
    (product) =>
      new Set(product.variants.map((variant) => variant.sku)).size === product.variants.length,
    {
      error: 'duplicate_sku',
      path: ['variants'],
    },
  );
export type ProductUpsertInput = z.input<typeof productUpsertSchema>;
export type ProductUpsertPayload = z.output<typeof productUpsertSchema>;

export const adminProductListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: productStatusSchema.optional(),
  categoryId: z.uuid().optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const imageReorderSchema = z.object({ imageIds: z.array(z.uuid()).min(1).max(30) });

// ─── Categories & collections ───────────────────────────────────────────────

export const taxonomyTranslationInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: optionalText(1000),
  seoTitle: optionalText(70),
  seoDescription: optionalText(170),
});

export const taxonomyUpsertSchema = z.object({
  slug: slugSchema,
  position: z.number().int().min(0).max(10_000),
  isActive: z.boolean(),
  illustrationKey: illustrationKeySchema.nullable(),
  translations: localizedInput(taxonomyTranslationInputSchema),
});
export type TaxonomyUpsertInput = z.input<typeof taxonomyUpsertSchema>;

// ─── Inventory ──────────────────────────────────────────────────────────────

export const MANUAL_INVENTORY_REASONS = ['RESTOCK', 'MANUAL_ADJUSTMENT', 'RETURN'] as const;
export const inventoryAdjustmentSchema = z.object({
  delta: z
    .number()
    .int()
    .min(-100_000)
    .max(100_000)
    .refine((delta) => delta !== 0, { error: 'delta_zero' }),
  reason: z.enum(MANUAL_INVENTORY_REASONS),
  note: optionalText(300),
});
export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;

export const inventoryListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  lowStockOnly: z.stringbool().optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

// ─── Orders ─────────────────────────────────────────────────────────────────

export const adminOrderListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: orderStatusSchema.optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const orderStatusUpdateSchema = z
  .object({
    status: orderStatusSchema,
    note: optionalText(500),
  })
  .refine((value) => value.status !== 'CANCELLED' || Boolean(value.note), {
    error: 'cancel_reason_required',
    path: ['note'],
  });
export type OrderStatusUpdateInput = z.input<typeof orderStatusUpdateSchema>;

export const recordPaymentSchema = z.object({ note: optionalText(300) });

// ─── Inquiries, newsletter, customers ───────────────────────────────────────

export const adminInquiryListQuerySchema = z.object({
  status: inquiryStatusSchema.optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const inquiryUpdateSchema = z.object({
  status: inquiryStatusSchema,
  internalNote: optionalText(2000),
});

export const adminSimpleListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Delivery methods ───────────────────────────────────────────────────────

export const deliveryMethodTranslationInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: optionalText(300),
  estimate: optionalText(100),
});

export const deliveryMethodUpsertSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, { error: 'invalid_code' }),
  isActive: z.boolean(),
  position: z.number().int().min(0).max(1000),
  price: positiveMoney,
  freeFromAmount: positiveMoney.nullable(),
  regionCodes: z.array(z.enum(REGION_CODES)).max(REGION_CODES.length),
  requiresAddress: z.boolean(),
  translations: localizedInput(deliveryMethodTranslationInputSchema),
});
export type DeliveryMethodUpsertInput = z.input<typeof deliveryMethodUpsertSchema>;

// ─── Articles ───────────────────────────────────────────────────────────────

export const articleTranslationInputSchema = z.object({
  title: z.string().trim().min(2).max(150),
  excerpt: optionalText(300),
  body: z.string().trim().min(20).max(20_000),
  seoTitle: optionalText(70),
  seoDescription: optionalText(170),
});

export const articleUpsertSchema = z.object({
  slug: slugSchema,
  status: articleStatusSchema,
  illustrationKey: illustrationKeySchema.nullable(),
  translations: localizedInput(articleTranslationInputSchema),
});
export type ArticleUpsertInput = z.input<typeof articleUpsertSchema>;

// ─── Staff accounts ─────────────────────────────────────────────────────────

export const staffCreateSchema = z.object({
  email: emailSchema,
  firstName: z.string().trim().min(1).max(60),
  lastName: optionalText(60),
  role: z.enum(['MANAGER', 'ADMIN']),
  password: passwordSchema,
});

export const staffUpdateSchema = z.object({
  role: z.enum(['MANAGER', 'ADMIN']),
  isActive: z.boolean(),
});

// ─── Admin responses (internal to the admin UI) ─────────────────────────────

export interface AdminProductListItem {
  id: string;
  slug: string;
  name: string;
  status: ProductStatus;
  categoryName: string;
  variantCount: number;
  priceMin: Money | null;
  priceMax: Money | null;
  totalStock: number;
  image: ImageDto | null;
  illustrationKey: IllustrationKey | null;
  updatedAt: string;
}

export interface AdminVariant {
  id: string;
  sku: string;
  weightGrams: number | null;
  unitCount: number | null;
  price: Money;
  compareAtPrice: Money | null;
  stockQuantity: number;
  lowStockThreshold: number;
  barcode: string | null;
  isActive: boolean;
}

export interface AdminTranslation<T> {
  uz: T;
  ru: T | null;
  en: T | null;
}

export interface AdminProductDetail {
  id: string;
  slug: string;
  status: ProductStatus;
  categoryId: string;
  format: ProductFormat;
  isFeatured: boolean;
  caffeineLevel: CaffeineLevel | null;
  brewTempCelsius: number | null;
  brewTimeMinSeconds: number | null;
  brewTimeMaxSeconds: number | null;
  brewAmountGrams: number | null;
  illustrationKey: IllustrationKey | null;
  collectionIds: string[];
  translations: AdminTranslation<z.output<typeof productTranslationInputSchema>>;
  variants: AdminVariant[];
  images: (ImageDto & { id: string })[];
  publishedAt: string | null;
  updatedAt: string;
}

export interface AdminTaxonomy {
  id: string;
  slug: string;
  position: number;
  isActive: boolean;
  illustrationKey: IllustrationKey | null;
  productCount: number;
  translations: AdminTranslation<z.output<typeof taxonomyTranslationInputSchema>>;
}

export interface AdminInventoryRow {
  variantId: string;
  sku: string;
  productId: string;
  productName: string;
  weightGrams: number | null;
  unitCount: number | null;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
}

export interface AdminInventoryMovement {
  id: string;
  delta: number;
  quantityAfter: number;
  reason: string;
  note: string | null;
  orderNumber: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface AdminOrderListItem {
  id: string;
  number: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  customerName: string;
  customerPhone: string;
  itemCount: number;
  total: Money;
  currency: string;
  createdAt: string;
}

export interface AdminOrderEvent {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  paymentStatus: PaymentStatus | null;
  note: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface AdminOrderDetail {
  id: string;
  number: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  locale: Locale;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerAccountEmail: string | null;
  deliveryMethodName: string;
  regionCode: string;
  city: string;
  addressLine: string | null;
  landmark: string | null;
  note: string | null;
  cancelReason: string | null;
  items: {
    productName: string;
    productSlug: string;
    format: ProductFormat;
    sku: string;
    weightGrams: number | null;
    unitCount: number | null;
    unitPrice: Money;
    quantity: number;
    lineTotal: Money;
  }[];
  subtotal: Money;
  deliveryFee: Money;
  discountTotal: Money;
  total: Money;
  currency: string;
  events: AdminOrderEvent[];
  allowedTransitions: OrderStatus[];
  canRecordPayment: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminContactInquiry {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string;
  locale: Locale;
  status: InquiryStatus;
  internalNote: string | null;
  createdAt: string;
}

export interface AdminWholesaleInquiry {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string | null;
  businessType: BusinessType;
  regionCode: string | null;
  city: string | null;
  monthlyVolume: string | null;
  message: string | null;
  locale: Locale;
  status: InquiryStatus;
  internalNote: string | null;
  createdAt: string;
}

export interface AdminCustomer {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  orderCount: number;
  createdAt: string;
  isActive: boolean;
}

export interface AdminStaffMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
}

export interface AdminNewsletterSubscriber {
  id: string;
  email: string;
  locale: Locale;
  status: 'SUBSCRIBED' | 'UNSUBSCRIBED';
  source: string | null;
  subscribedAt: string;
}

export interface AdminDeliveryMethod {
  id: string;
  code: string;
  isActive: boolean;
  position: number;
  price: Money;
  freeFromAmount: Money | null;
  regionCodes: string[];
  requiresAddress: boolean;
  translations: AdminTranslation<z.output<typeof deliveryMethodTranslationInputSchema>>;
}

export interface AdminArticle {
  id: string;
  slug: string;
  status: ArticleStatus;
  illustrationKey: IllustrationKey | null;
  publishedAt: string | null;
  updatedAt: string;
  translations: AdminTranslation<z.output<typeof articleTranslationInputSchema>>;
}

export interface SalesDay {
  date: string;
  orders: number;
  revenue: Money;
}

export interface AdminDashboard {
  currency: string;
  ordersToday: number;
  ordersAwaitingAction: number;
  revenueLast30Days: Money;
  ordersLast30Days: number;
  averageOrderValue: Money;
  newInquiries: number;
  lowStock: AdminInventoryRow[];
  recentOrders: AdminOrderListItem[];
  salesByDay: SalesDay[];
  topProducts: { productName: string; quantity: number; revenue: Money }[];
}
