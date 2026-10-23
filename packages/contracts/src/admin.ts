import { z } from 'zod';
import { emailSchema, moneySchema, optionalText, slugSchema, type Money } from './common.js';
import {
  attributeKeySchema,
  attributeKindSchema,
  caffeineLevelSchema,
  FILTERABLE_ATTRIBUTE_KINDS,
  illustrationKeySchema,
  productFormatSchema,
  type AttributeKind,
  type IllustrationKey,
  type ImageDto,
} from './catalog.js';
import type { CaffeineLevel, Locale, ProductFormat } from './constants.js';
import { mediaKindSchema, type MediaKind } from './content.js';
import type { AdminTelegramStatus, Readiness, ReadinessCode } from './publishing.js';
import { inquiryStatusSchema, type BusinessType, type InquiryStatus } from './inquiries.js';
import {
  orderStatusSchema,
  paymentStatusSchema,
  type OrderStatus,
  type PaymentMethod,
  type PaymentProviderCode,
  type PaymentStatus,
} from './orders.js';
import { passwordSchema, type UserRole } from './auth.js';
import { REGION_CODES } from './uzbekistan.js';

export const PRODUCT_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;
export const productStatusSchema = z.enum(PRODUCT_STATUSES);
export type ProductStatus = z.infer<typeof productStatusSchema>;

/** Articles and gallery items. ARCHIVED takes an item off the site and out of the default lists. */
export const ARTICLE_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
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

/** Localised plain text for TEXT attributes (Uzbek required when the attribute is set). */
export const attributeTextInputSchema = z.object({
  uz: z.string().trim().min(1).max(300),
  ru: optionalText(300),
  en: optionalText(300),
});

/**
 * One attribute value as edited in the admin. Exactly the field matching the attribute's kind is
 * used: optionIds (SELECT: one, MULTI_SELECT: several), number, boolean or text.
 */
export const productAttributeInputSchema = z.object({
  attributeId: z.uuid(),
  optionIds: z.array(z.uuid()).max(20).optional(),
  number: z.number().min(-1_000_000_000).max(1_000_000_000).nullable().optional(),
  boolean: z.boolean().nullable().optional(),
  text: attributeTextInputSchema.nullable().optional(),
});
export type ProductAttributeInput = z.infer<typeof productAttributeInputSchema>;

export const productUpsertSchema = z
  .object({
    slug: slugSchema,
    status: productStatusSchema,
    categoryId: z.uuid(),
    format: productFormatSchema,
    isFeatured: z.boolean(),
    caffeineLevel: caffeineLevelSchema.nullable(),
    brewTempCelsius: z.number().int().min(40).max(100).nullable(),
    /** Upper end when the pack gives a range ("80–90 °C"); null for one temperature. */
    brewTempMaxCelsius: z.number().int().min(40).max(100).nullable().default(null),
    brewTimeMinSeconds: z.number().int().min(10).max(3600).nullable(),
    brewTimeMaxSeconds: z.number().int().min(10).max(3600).nullable(),
    brewAmountGrams: z.number().min(0.1).max(50).multipleOf(0.1).nullable(),
    /** Upper end when the pack gives a range ("3–5 g"); null for one amount. */
    brewAmountMaxGrams: z.number().min(0.1).max(50).multipleOf(0.1).nullable().default(null),
    illustrationKey: illustrationKeySchema.nullable(),
    collectionIds: z.array(z.uuid()).max(20),
    /** Decides which attributes apply; null = common fields only. */
    productTypeId: z.uuid().nullable().default(null),
    /** Values for the product type's attributes; validated against the definitions by the API. */
    attributes: z.array(productAttributeInputSchema).max(40).default([]),
    /** Announce the product on the Telegram channel when it is published (once). */
    announceOnTelegram: z.boolean().default(false),
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
      product.brewTempMaxCelsius === null ||
      (product.brewTempCelsius !== null && product.brewTempMaxCelsius > product.brewTempCelsius),
    { error: 'brew_range_order', path: ['brewTempMaxCelsius'] },
  )
  .refine(
    (product) =>
      product.brewAmountMaxGrams === null ||
      (product.brewAmountGrams !== null && product.brewAmountMaxGrams > product.brewAmountGrams),
    { error: 'brew_range_order', path: ['brewAmountMaxGrams'] },
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

/** Most images a product can have. */
export const MAX_PRODUCT_IMAGES = 12;

/** Alternative text of one image per language (empty: the product's name is read instead). */
export const imageAltInputSchema = z.object({
  uz: optionalText(200),
  ru: optionalText(200),
  en: optionalText(200),
});
export type ImageAltInput = z.input<typeof imageAltInputSchema>;

// ─── Categories & collections ───────────────────────────────────────────────

export const taxonomyTranslationInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: optionalText(1000),
  /** Categories only: editorial text for the category page (plain text). */
  body: optionalText(4000),
  seoTitle: optionalText(70),
  seoDescription: optionalText(170),
  /** Alternative text of the cover picture (empty: the name is read instead). */
  imageAlt: optionalText(200),
});

export const taxonomyUpsertSchema = z.object({
  slug: slugSchema,
  position: z.number().int().min(0).max(10_000),
  isActive: z.boolean(),
  illustrationKey: illustrationKeySchema.nullable(),
  /** Categories only: the top-level category this one belongs to (null = top level). */
  parentId: z.uuid().nullable().default(null),
  /**
   * Categories only: the product type new products in the category start with (null = none).
   * Left out, the current one is kept.
   */
  productTypeId: z.uuid().nullable().optional(),
  translations: localizedInput(taxonomyTranslationInputSchema),
});
export type TaxonomyUpsertInput = z.input<typeof taxonomyUpsertSchema>;

// ─── Product types and attributes ───────────────────────────────────────────

const CHOICE_KINDS: readonly AttributeKind[] = ['SELECT', 'MULTI_SELECT'];

export const attributeOptionInputSchema = z.object({
  /** Present for existing options. */
  id: z.uuid().optional(),
  key: attributeKeySchema,
  translations: localizedInput(z.object({ label: z.string().trim().min(1).max(60) })),
});

export const attributeDefinitionInputSchema = z
  .object({
    /** Present for existing attributes. */
    id: z.uuid().optional(),
    key: attributeKeySchema,
    kind: attributeKindSchema,
    unit: optionalText(12),
    isRequired: z.boolean(),
    isFilterable: z.boolean(),
    isSearchable: z.boolean(),
    isVisible: z.boolean(),
    translations: localizedInput(
      z.object({ label: z.string().trim().min(1).max(60), hint: optionalText(200) }),
    ),
    options: z.array(attributeOptionInputSchema).max(50).default([]),
  })
  .refine((attribute) => !CHOICE_KINDS.includes(attribute.kind) || attribute.options.length > 0, {
    error: 'options_required',
    path: ['options'],
  })
  .refine((attribute) => CHOICE_KINDS.includes(attribute.kind) || attribute.options.length === 0, {
    error: 'options_not_allowed',
    path: ['options'],
  })
  .refine(
    (attribute) => !attribute.isFilterable || FILTERABLE_ATTRIBUTE_KINDS.includes(attribute.kind),
    { error: 'not_filterable', path: ['isFilterable'] },
  )
  .refine(
    (attribute) =>
      new Set(attribute.options.map((option) => option.key)).size === attribute.options.length,
    { error: 'duplicate_key', path: ['options'] },
  );
export type AttributeDefinitionInput = z.input<typeof attributeDefinitionInputSchema>;

export const productTypeUpsertSchema = z
  .object({
    key: attributeKeySchema,
    isActive: z.boolean(),
    position: z.number().int().min(0).max(10_000),
    /**
     * Products of the type have brewing guidance and a caffeine level (the product form offers
     * those fields). Left out, a new type has none and an existing one keeps its setting.
     */
    brewingGuide: z.boolean().optional(),
    translations: localizedInput(z.object({ name: z.string().trim().min(2).max(60) })),
    /** The complete, ordered attribute list; attributes left out are removed (if unused). */
    attributes: z.array(attributeDefinitionInputSchema).max(40),
  })
  .refine(
    (type) =>
      new Set(type.attributes.map((attribute) => attribute.key)).size === type.attributes.length,
    { error: 'duplicate_key', path: ['attributes'] },
  );
export type ProductTypeUpsertInput = z.input<typeof productTypeUpsertSchema>;

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
  paymentStatus: paymentStatusSchema.optional(),
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

/**
 * Staff record that a paid order's money was returned (the refund itself is made in the provider's
 * merchant cabinet, or in cash). Only for PAID payments; full amount only.
 */
export const recordRefundSchema = z.object({ note: z.string().trim().min(3).max(300) });

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
  /** Alternative text of the cover picture (empty: the title is read instead). */
  coverAlt: optionalText(200),
});

/** Gallery items an article may show. */
export const MAX_ARTICLE_MEDIA = 12;

export const articleUpsertSchema = z.object({
  slug: slugSchema,
  status: articleStatusSchema,
  illustrationKey: illustrationKeySchema.nullable(),
  /** Shown first in the home page's journal section. */
  isFeatured: z.boolean().default(false),
  /** Announce the article on the Telegram channel when it is published (once). */
  announceOnTelegram: z.boolean().default(false),
  /**
   * Publication date. Left out: set automatically on first publication. A future date schedules
   * the article (it stays off the site until then).
   */
  publishedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  /**
   * Gallery items (photographs, films) shown with the article, in order. Left out: unchanged.
   * Items are reused from the gallery; only published ones appear on the article page.
   */
  mediaIds: z
    .array(z.uuid())
    .max(MAX_ARTICLE_MEDIA)
    .refine((ids) => new Set(ids).size === ids.length, { error: 'duplicate' })
    .optional(),
  translations: localizedInput(articleTranslationInputSchema),
});
export type ArticleUpsertInput = z.input<typeof articleUpsertSchema>;

// ─── Media ("Lavhalar") ─────────────────────────────────────────────────────

export const mediaTranslationInputSchema = z.object({
  title: z.string().trim().min(2).max(120),
  caption: optionalText(400),
  /** Describes the photograph or poster for screen readers; the title is used when empty. */
  altText: optionalText(200),
});

export const mediaUpsertSchema = z.object({
  kind: mediaKindSchema,
  status: articleStatusSchema,
  /** Shown in the home page's media section. */
  isFeatured: z.boolean(),
  /** Seconds, shown on video tiles; optional. */
  videoDurationSeconds: z.number().int().min(1).max(3600).nullable(),
  translations: localizedInput(mediaTranslationInputSchema),
});
export type MediaUpsertInput = z.input<typeof mediaUpsertSchema>;

/** The new order of one kind's items (photographs and films are ordered separately). */
export const mediaReorderSchema = z.object({
  kind: mediaKindSchema,
  ids: z.array(z.uuid()).min(1).max(500),
});

export const adminMediaListQuerySchema = z.object({ kind: mediaKindSchema.optional() });

/**
 * Largest film the admin area uploads. Films go through the API, which keeps one in memory while
 * it checks and stores it; the reverse proxy in front of the API must accept request bodies a
 * little larger than this (docs/deployment/production.md). Larger films are added with the API's
 * scripts/add-gallery-film.ts.
 */
export const MAX_VIDEO_UPLOAD_BYTES = 64 * 1024 * 1024;

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
  /** Required readiness items that are not met (empty: complete). */
  missing: ReadinessCode[];
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
  productTypeId: string | null;
  attributes: ProductAttributeInput[];
  categoryId: string;
  format: ProductFormat;
  isFeatured: boolean;
  caffeineLevel: CaffeineLevel | null;
  brewTempCelsius: number | null;
  brewTempMaxCelsius: number | null;
  brewTimeMinSeconds: number | null;
  brewTimeMaxSeconds: number | null;
  brewAmountGrams: number | null;
  brewAmountMaxGrams: number | null;
  illustrationKey: IllustrationKey | null;
  collectionIds: string[];
  translations: AdminTranslation<z.output<typeof productTranslationInputSchema>>;
  variants: AdminVariant[];
  /** In display order: the first is the main image. */
  images: AdminProductImage[];
  announceOnTelegram: boolean;
  /** The Telegram announcement, once one exists. */
  telegram: AdminTelegramStatus | null;
  readiness: Readiness;
  publishedAt: string | null;
  updatedAt: string;
}

export interface AdminProductImage extends ImageDto {
  id: string;
  /** Alternative text per language as entered (null: the product's name is read). */
  altTexts: { uz: string | null; ru: string | null; en: string | null };
}

export interface AdminTaxonomy {
  id: string;
  slug: string;
  position: number;
  isActive: boolean;
  illustrationKey: IllustrationKey | null;
  productCount: number;
  /** Categories only. */
  parentId: string | null;
  childCount: number;
  /** Categories only: the product type new products start with. */
  productTypeId: string | null;
  /** The cover picture; null shows the neutral TERAN visual on the storefront. */
  image: ImageDto | null;
  translations: AdminTranslation<z.output<typeof taxonomyTranslationInputSchema>>;
  readiness: Readiness;
}

export interface AdminAttributeOption {
  id: string;
  key: string;
  translations: AdminTranslation<{ label: string }>;
  /** Products using this option; such options cannot be removed. */
  usageCount: number;
}

export interface AdminAttribute {
  id: string;
  key: string;
  kind: AttributeKind;
  unit: string | null;
  isRequired: boolean;
  isFilterable: boolean;
  isSearchable: boolean;
  isVisible: boolean;
  position: number;
  translations: AdminTranslation<{ label: string; hint?: string }>;
  options: AdminAttributeOption[];
  /** Products with a value for this attribute; such attributes cannot be removed. */
  usageCount: number;
}

export interface AdminProductType {
  id: string;
  key: string;
  isActive: boolean;
  position: number;
  /** Products of this type have brewing guidance and a caffeine level. */
  brewingGuide: boolean;
  productCount: number;
  translations: AdminTranslation<{ name: string }>;
  attributes: AdminAttribute[];
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
  paymentMethod: PaymentMethod;
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
  /** A paid online payment whose refund staff can record. */
  canRecordRefund: boolean;
  payments: AdminPayment[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminPaymentEvent {
  id: string;
  fromStatus: PaymentStatus | null;
  toStatus: PaymentStatus;
  source: string;
  detail: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface AdminPayment {
  id: string;
  method: PaymentMethod;
  provider: PaymentProviderCode;
  status: PaymentStatus;
  amount: Money;
  currency: string;
  /** Provider transaction id (never card data). */
  providerReference: string | null;
  failureCode: string | null;
  expiresAt: string | null;
  confirmedAt: string | null;
  createdAt: string;
  events: AdminPaymentEvent[];
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

/** A gallery item chosen for an article, as the editor lists it. */
export interface AdminArticleMedia {
  id: string;
  kind: MediaKind;
  status: ArticleStatus;
  title: string;
  image: ImageDto | null;
}

export interface AdminArticle {
  id: string;
  slug: string;
  status: ArticleStatus;
  illustrationKey: IllustrationKey | null;
  cover: ImageDto | null;
  /** Gallery items shown with the article, in order. */
  media: AdminArticleMedia[];
  isFeatured: boolean;
  announceOnTelegram: boolean;
  telegram: AdminTelegramStatus | null;
  publishedAt: string | null;
  updatedAt: string;
  translations: AdminTranslation<z.output<typeof articleTranslationInputSchema>>;
  readiness: Readiness;
}

export interface AdminMediaItem {
  id: string;
  kind: MediaKind;
  status: ArticleStatus;
  isFeatured: boolean;
  position: number;
  /** The photograph or the poster; null until one is uploaded. */
  image: ImageDto | null;
  /** The uploaded video file (videos only); `hasAudio`: it has a sound track. */
  video: { src: string; type: string; bytes: number; hasAudio: boolean } | null;
  videoDurationSeconds: number | null;
  /** Subtitles (WebVTT) for a video, when uploaded. */
  captions: { src: string } | null;
  publishedAt: string | null;
  updatedAt: string;
  translations: AdminTranslation<z.output<typeof mediaTranslationInputSchema>>;
  readiness: Readiness;
}

export interface SalesDay {
  date: string;
  orders: number;
  revenue: Money;
}

/** Work waiting for staff: shown as navigation badges and as the dashboard's to-do list. */
export interface AdminBadges {
  ordersByStatus: Record<OrderStatus, number>;
  newInquiries: { contact: number; wholesale: number };
  /** Active pack sizes at or below their low-stock level. */
  lowStock: number;
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

export interface AdminAuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorName: string | null;
  metadata: unknown;
  ipAddress: string | null;
  createdAt: string;
}
