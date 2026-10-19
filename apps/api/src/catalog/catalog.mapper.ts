import {
  ILLUSTRATION_KEYS,
  MAX_LINE_QUANTITY,
  NEW_PRODUCT_DAYS,
  ratingAverage,
  type BrewingDto,
  type CategoryRefDto,
  type IllustrationKey,
  type ImageDto,
  type Locale,
  type ProductAttributeDto,
  type ProductDetailDto,
  type ProductFilmDto,
  type ProductSummaryDto,
  type StockLevel,
  type VariantDto,
} from '@teran/contracts';
import type { Prisma } from '../generated/prisma/client.js';
import { localeChain, pickTranslation } from '../common/i18n.js';
import { toMoney, toMoneyOrNull } from '../common/money.js';
import {
  PRODUCT_FILM_CARD_FILE,
  PRODUCT_FILM_MASK_FILE,
  videoFileName,
} from '../media/image-processing.js';

export const PUBLIC_UPLOADS_PATH = '/uploads';

/** A category with what links to it need: slug, name and its parent's slug for the path. */
export function categoryRefSelect(locale: Locale) {
  const chain = localeChain(locale);
  const names = { where: { locale: { in: chain } }, select: { locale: true, name: true } };
  return {
    slug: true,
    translations: names,
    parent: { select: { slug: true, translations: names } },
  } satisfies Prisma.CategorySelect;
}

type CategoryRefRow = Prisma.CategoryGetPayload<{ select: ReturnType<typeof categoryRefSelect> }>;

/** Address of a category below the locale: "tea" or "tea/green-tea". */
export function categoryPath(category: { slug: string; parent: { slug: string } | null }): string {
  return category.parent ? `${category.parent.slug}/${category.slug}` : category.slug;
}

export function toCategoryRef(category: CategoryRefRow, locale: Locale): CategoryRefDto {
  return {
    slug: category.slug,
    name: pickTranslation(category.translations, locale)?.name ?? category.slug,
    path: categoryPath(category),
  };
}

/** Top-level category first, then the category itself. */
export function categoryBreadcrumbs(category: CategoryRefRow, locale: Locale): CategoryRefDto[] {
  const own = toCategoryRef(category, locale);
  if (!category.parent) return [own];
  const parent = {
    slug: category.parent.slug,
    name: pickTranslation(category.parent.translations, locale)?.name ?? category.parent.slug,
    path: category.parent.slug,
  };
  return [parent, own];
}

export function summaryInclude(locale: Locale) {
  const chain = localeChain(locale);
  return {
    translations: { where: { locale: { in: chain } } },
    category: { select: categoryRefSelect(locale) },
    variants: {
      where: { isActive: true },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    },
    // The first image for the card, the second for the card's hover state.
    images: {
      orderBy: { position: 'asc' },
      take: 2,
      include: { translations: { where: { locale } } },
    },
  } satisfies Prisma.ProductInclude;
}

export function detailInclude(locale: Locale) {
  const chain = localeChain(locale);
  const labels = { where: { locale: { in: chain } } };
  return {
    ...summaryInclude(locale),
    images: { orderBy: { position: 'asc' }, include: { translations: { where: { locale } } } },
    productType: { include: { translations: labels } },
    attributeValues: {
      where: { attribute: { isVisible: true } },
      include: {
        attribute: { include: { translations: labels } },
        option: { include: { translations: labels } },
      },
    },
  } satisfies Prisma.ProductInclude;
}

export type SummaryProduct = Prisma.ProductGetPayload<{
  include: ReturnType<typeof summaryInclude>;
}>;
export type DetailProduct = Prisma.ProductGetPayload<{ include: ReturnType<typeof detailInclude> }>;
type VariantRow = SummaryProduct['variants'][number];
type ImageRow = SummaryProduct['images'][number];
/** A stored image as the mappers need it (alternative texts optional: some queries skip them). */
export type StoredImageRow = Pick<
  ImageRow,
  'storageKey' | 'widths' | 'width' | 'height' | 'altText' | 'transparent'
> & {
  translations?: readonly { locale: string; altText: string }[];
  /** The picture's living film (product pictures only; other queries leave it out). */
  videoKey?: string | null;
  videoType?: string | null;
  videoWidth?: number | null;
  videoHeight?: number | null;
  videoFiles?: readonly string[];
};
type AttributeValueRow = DetailProduct['attributeValues'][number];

/** Localised plain text stored as { "uz": "…", "ru": "…", "en": "…" } (validated on write). */
export function pickLocalizedText(value: unknown, locale: Locale): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const texts = value as Record<string, unknown>;
  for (const candidate of localeChain(locale)) {
    const text = texts[candidate];
    if (typeof text === 'string' && text.trim() !== '') return text;
  }
  return null;
}

/**
 * The product's attribute values grouped per attribute, in the order the product type defines.
 * Values left over from a previous product type are ignored.
 */
export function toProductAttributes(
  values: readonly AttributeValueRow[],
  productTypeId: string | null,
  locale: Locale,
): ProductAttributeDto[] {
  const byAttribute = new Map<string, AttributeValueRow[]>();
  for (const value of values) {
    if (value.attribute.productTypeId !== productTypeId) continue;
    const rows = byAttribute.get(value.attributeId) ?? [];
    rows.push(value);
    byAttribute.set(value.attributeId, rows);
  }

  const attributes: (ProductAttributeDto & { position: number })[] = [];
  for (const rows of byAttribute.values()) {
    const { attribute } = rows[0]!;
    const options = rows
      .flatMap((row) => (row.option ? [row.option] : []))
      .sort((a, b) => a.position - b.position || a.key.localeCompare(b.key))
      .map((option) => ({
        key: option.key,
        label: pickTranslation(option.translations, locale)?.label ?? option.key,
      }));
    const scalar = rows.find((row) => row.optionId === null);
    const text = scalar ? pickLocalizedText(scalar.textValue, locale) : null;
    const entry = {
      key: attribute.key,
      label: pickTranslation(attribute.translations, locale)?.label ?? attribute.key,
      kind: attribute.kind,
      unit: attribute.unit,
      text,
      number: scalar?.numberValue?.toString() ?? null,
      boolean: scalar?.booleanValue ?? null,
      options,
      position: attribute.position,
    };
    const hasValue =
      entry.options.length > 0 ||
      entry.text !== null ||
      entry.number !== null ||
      entry.boolean !== null;
    if (hasValue) attributes.push(entry);
  }
  return attributes
    .sort((a, b) => a.position - b.position || a.key.localeCompare(b.key))
    .map(({ position: _position, ...attribute }) => attribute);
}

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
    barcode: variant.barcode ?? null,
  };
}

/** Columns of a cover picture chosen in the admin area (categories, collections). */
export interface CoverColumns {
  imageKey: string | null;
  imageWidths: number[];
  imageWidth: number | null;
  imageHeight: number | null;
  imageTransparent: boolean;
}

/** A category's or collection's cover picture, or null (the storefront shows a neutral visual). */
export function coverImageDto(row: CoverColumns, alt: string): ImageDto | null {
  if (!row.imageKey || !row.imageWidth || !row.imageHeight) return null;
  return {
    src: `${PUBLIC_UPLOADS_PATH}/${row.imageKey}`,
    widths: row.imageWidths,
    width: row.imageWidth,
    height: row.imageHeight,
    alt,
    transparent: row.imageTransparent,
  };
}

/**
 * A product image's alternative text in the visitor's language, as entered in the admin area;
 * otherwise the product's name (never another language's text, which a screen reader would
 * mispronounce).
 */
export function productImageAlt(
  image: { translations?: readonly { locale: string; altText: string }[] },
  locale: Locale,
  name: string,
): string {
  return image.translations?.find((translation) => translation.locale === locale)?.altText ?? name;
}

export function toImageDto(image: StoredImageRow, alt: string): ImageDto {
  return {
    src: `${PUBLIC_UPLOADS_PATH}/${image.storageKey}`,
    widths: image.widths,
    width: image.width,
    height: image.height,
    alt: image.altText ?? alt,
    transparent: image.transparent,
    film: productFilm(image),
  };
}

/** A product picture's film: its file, the cards' smaller copy and where it moves, if stored. */
export function productFilm(image: StoredImageRow): ProductFilmDto | null {
  if (!image.videoKey || (image.videoType !== 'video/mp4' && image.videoType !== 'video/webm')) {
    return null;
  }
  const base = `${PUBLIC_UPLOADS_PATH}/${image.videoKey}`;
  const files = image.videoFiles ?? [];
  return {
    src: `${base}/${videoFileName(image.videoType)}`,
    cardSrc: files.includes('card') ? `${base}/${PRODUCT_FILM_CARD_FILE}` : null,
    mask: files.includes('mask') ? `${base}/${PRODUCT_FILM_MASK_FILE}` : null,
    type: image.videoType,
    width: image.videoWidth ?? null,
    height: image.videoHeight ?? null,
  };
}

/** How to brew a product, from its brewing columns; null when none is set. */
function brewingOf(product: SummaryProduct): BrewingDto | null {
  const hasBrewing =
    product.brewTempCelsius !== null ||
    product.brewTimeMinSeconds !== null ||
    product.brewAmountGrams !== null;
  return hasBrewing
    ? {
        temperatureCelsius: product.brewTempCelsius,
        temperatureMaxCelsius: product.brewTempMaxCelsius,
        timeMinSeconds: product.brewTimeMinSeconds,
        timeMaxSeconds: product.brewTimeMaxSeconds,
        amountGrams: product.brewAmountGrams?.toString() ?? null,
        amountMaxGrams: product.brewAmountMaxGrams?.toString() ?? null,
      }
    : null;
}

function isNew(publishedAt: Date | null, now: Date): boolean {
  if (!publishedAt) return false;
  return now.getTime() - publishedAt.getTime() <= NEW_PRODUCT_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * @param stageImage The product's first cut-out image, when the caller looked it up (product
 *   lists do, for the home page stage); otherwise the first image is used if it is a cut-out.
 */
export function toProductSummary(
  product: SummaryProduct,
  locale: Locale,
  now: Date = new Date(),
  stageImage?: StoredImageRow | null,
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
  // A second photograph for the card's hover state; a cut-out is for the home page stage only.
  const secondImage = product.images[1]?.transparent ? undefined : product.images[1];

  return {
    id: product.id,
    slug: product.slug,
    name,
    shortDescription: translation?.shortDescription ?? null,
    category: toCategoryRef(product.category, locale),
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
    image: firstImage ? toImageDto(firstImage, productImageAlt(firstImage, locale, name)) : null,
    stageImage: stageImage
      ? toImageDto(stageImage, productImageAlt(stageImage, locale, name))
      : firstImage?.transparent
        ? toImageDto(firstImage, productImageAlt(firstImage, locale, name))
        : null,
    hoverImage: secondImage
      ? toImageDto(secondImage, productImageAlt(secondImage, locale, name))
      : null,
    illustrationKey: asIllustrationKey(product.illustrationKey),
    origin: translation?.origin ?? null,
    brewing: brewingOf(product),
    // Kept on the product as its published reviews change (ADR-042), so lists need no join.
    rating:
      product.ratingCount > 0
        ? {
            average: ratingAverage(product.ratingSum, product.ratingCount),
            count: product.ratingCount,
          }
        : null,
  };
}

export function toProductDetail(
  product: DetailProduct,
  locale: Locale,
  now: Date = new Date(),
): ProductDetailDto {
  const summary = toProductSummary(product, locale, now);
  const translation = pickTranslation(product.translations, locale);

  return {
    ...summary,
    productType: product.productType
      ? {
          key: product.productType.key,
          name:
            pickTranslation(product.productType.translations, locale)?.name ??
            product.productType.key,
        }
      : null,
    attributes: toProductAttributes(product.attributeValues, product.productTypeId, locale),
    breadcrumbs: categoryBreadcrumbs(product.category, locale),
    description: translation?.description ?? null,
    ingredients: translation?.ingredients ?? null,
    tastingNotes: translation?.tastingNotes ?? null,
    caffeineLevel: product.caffeineLevel,
    images: product.images.map((image) =>
      toImageDto(image, productImageAlt(image, locale, summary.name)),
    ),
    variants: product.variants.map(toVariantDto),
    seoTitle: translation?.seoTitle ?? null,
    seoDescription: translation?.seoDescription ?? null,
    updatedAt: product.updatedAt.toISOString(),
  };
}
