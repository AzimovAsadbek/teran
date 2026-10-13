import {
  ILLUSTRATION_KEYS,
  MAX_LINE_QUANTITY,
  NEW_PRODUCT_DAYS,
  type IllustrationKey,
  type ImageDto,
  type Locale,
  type ProductDetailDto,
  type ProductSummaryDto,
  type StockLevel,
  type VariantDto,
} from '@teran/contracts';
import type { Prisma } from '../generated/prisma/client.js';
import { localeChain, pickTranslation } from '../common/i18n.js';
import { toMoney, toMoneyOrNull } from '../common/money.js';

export const PUBLIC_UPLOADS_PATH = '/uploads';

export function summaryInclude(locale: Locale) {
  const chain = localeChain(locale);
  return {
    translations: { where: { locale: { in: chain } } },
    category: {
      select: {
        slug: true,
        translations: { where: { locale: { in: chain } }, select: { locale: true, name: true } },
      },
    },
    variants: {
      where: { isActive: true },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    },
    images: { orderBy: { position: 'asc' }, take: 1 },
  } satisfies Prisma.ProductInclude;
}

export function detailInclude(locale: Locale) {
  return {
    ...summaryInclude(locale),
    images: { orderBy: { position: 'asc' } },
  } satisfies Prisma.ProductInclude;
}

export type SummaryProduct = Prisma.ProductGetPayload<{
  include: ReturnType<typeof summaryInclude>;
}>;
export type DetailProduct = Prisma.ProductGetPayload<{ include: ReturnType<typeof detailInclude> }>;
type VariantRow = SummaryProduct['variants'][number];
type ImageRow = SummaryProduct['images'][number];

export function asIllustrationKey(value: string | null): IllustrationKey | null {
  return value !== null && (ILLUSTRATION_KEYS as readonly string[]).includes(value)
    ? (value as IllustrationKey)
    : null;
}

export function variantStockLevel(
  variant: Pick<VariantRow, 'stockQuantity' | 'lowStockThreshold'>,
): StockLevel {
  if (variant.stockQuantity <= 0) return 'out_of_stock';
  if (variant.stockQuantity <= variant.lowStockThreshold) return 'low_stock';
  return 'in_stock';
}

/** A product is as available as its best pack size. */
export function productStockLevel(levels: readonly StockLevel[]): StockLevel {
  if (levels.includes('in_stock')) return 'in_stock';
  if (levels.includes('low_stock')) return 'low_stock';
  return 'out_of_stock';
}

export function toVariantDto(variant: VariantRow): VariantDto {
  return {
    id: variant.id,
    sku: variant.sku,
    weightGrams: variant.weightGrams,
    unitCount: variant.unitCount,
    price: toMoney(variant.price),
    compareAtPrice: toMoneyOrNull(variant.compareAtPrice),
    currency: variant.currency,
    stockLevel: variantStockLevel(variant),
    maxQuantity: Math.max(0, Math.min(variant.stockQuantity, MAX_LINE_QUANTITY)),
  };
}

export function toImageDto(image: ImageRow, alt: string): ImageDto {
  return {
    src: `${PUBLIC_UPLOADS_PATH}/${image.storageKey}`,
    widths: image.widths,
    width: image.width,
    height: image.height,
    alt: image.altText ?? alt,
  };
}

function isNew(publishedAt: Date | null, now: Date): boolean {
  if (!publishedAt) return false;
  return now.getTime() - publishedAt.getTime() <= NEW_PRODUCT_DAYS * 24 * 60 * 60 * 1000;
}

export function toProductSummary(
  product: SummaryProduct,
  locale: Locale,
  now: Date = new Date(),
): ProductSummaryDto {
  const translation = pickTranslation(product.translations, locale);
  const name = translation?.name ?? product.slug;
  const variants = product.variants.map(toVariantDto);
  const cheapest = product.variants.reduce<VariantRow | undefined>(
    (best, variant) => (best === undefined || variant.price.lessThan(best.price) ? variant : best),
    undefined,
  );
  const purchasable = variants.find((variant) => variant.stockLevel !== 'out_of_stock');
  const firstImage = product.images[0];

  return {
    id: product.id,
    slug: product.slug,
    name,
    shortDescription: translation?.shortDescription ?? null,
    category: {
      slug: product.category.slug,
      name: pickTranslation(product.category.translations, locale)?.name ?? product.category.slug,
    },
    format: product.format,
    isFeatured: product.isFeatured,
    isNew: isNew(product.publishedAt, now),
    onSale: product.variants.some((variant) => variant.compareAtPrice !== null),
    stockLevel: productStockLevel(variants.map((variant) => variant.stockLevel)),
    priceFrom: cheapest ? toMoney(cheapest.price) : toMoney(0),
    compareAtPriceFrom: cheapest ? toMoneyOrNull(cheapest.compareAtPrice) : null,
    currency: cheapest?.currency ?? 'UZS',
    variantCount: variants.length,
    defaultVariant: purchasable ?? variants[0] ?? null,
    image: firstImage ? toImageDto(firstImage, name) : null,
    illustrationKey: asIllustrationKey(product.illustrationKey),
  };
}

export function toProductDetail(
  product: DetailProduct,
  locale: Locale,
  now: Date = new Date(),
): ProductDetailDto {
  const summary = toProductSummary(product, locale, now);
  const translation = pickTranslation(product.translations, locale);
  const hasBrewing =
    product.brewTempCelsius !== null ||
    product.brewTimeMinSeconds !== null ||
    product.brewAmountGrams !== null;

  return {
    ...summary,
    description: translation?.description ?? null,
    ingredients: translation?.ingredients ?? null,
    tastingNotes: translation?.tastingNotes ?? null,
    origin: translation?.origin ?? null,
    caffeineLevel: product.caffeineLevel,
    brewing: hasBrewing
      ? {
          temperatureCelsius: product.brewTempCelsius,
          timeMinSeconds: product.brewTimeMinSeconds,
          timeMaxSeconds: product.brewTimeMaxSeconds,
          amountGrams: product.brewAmountGrams?.toString() ?? null,
        }
      : null,
    images: product.images.map((image) => toImageDto(image, summary.name)),
    variants: product.variants.map(toVariantDto),
    seoTitle: translation?.seoTitle ?? null,
    seoDescription: translation?.seoDescription ?? null,
    updatedAt: product.updatedAt.toISOString(),
  };
}
