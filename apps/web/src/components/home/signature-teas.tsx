import type { Locale, ProductDetailDto, ProductSummaryDto } from '@teran/contracts';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import {
  brandCopy,
  COLLECTION_CODES,
  PACK_COLOURS,
  PREMIUM_COLLECTION_SLUG,
  teaCodeOf,
} from '@/content/brand';
import { brewingMeasures } from '@/lib/brewing';
import { getProduct, getProductList } from '@/lib/data/catalog';
import { formatMoney, packLabel } from '@/lib/format';
import { showPrices } from '@/lib/site';
import { SignatureStage, type SignatureTea } from './signature-stage';

/**
 * TERAN's signature range on the home page: the five teas of the premium collection, each with
 * its own pack, its dry leaf (the owner's photograph) and its brewed cup, and only what TERAN
 * states about it — the owner's description and taste notes, the origin and the brewing printed
 * on the pack. Left out when the collection holds fewer than two of the five teas.
 */
export async function SignatureTeas() {
  await connection();
  const locale = (await getLocale()) as Locale;
  const [t, tp, tb, tc, list] = await Promise.all([
    getTranslations('Home'),
    getTranslations('Product'),
    getTranslations('Brewing'),
    getTranslations('Common'),
    getProductList(locale, `collection=${PREMIUM_COLLECTION_SLUG}&pageSize=8&sort=featured`).catch(
      () => null,
    ),
  ]);
  // In the packs' own order (XC2025, G8810, 8800, 8830, 8009).
  const items = (list?.items ?? [])
    .filter((product) => teaCodeOf(product.slug) !== null)
    .sort(
      (a, b) =>
        COLLECTION_CODES.indexOf(teaCodeOf(a.slug)!) - COLLECTION_CODES.indexOf(teaCodeOf(b.slug)!),
    );
  if (items.length < 2) return null;
  const details = await Promise.all(
    items.map((product) => getProduct(locale, product.slug).catch(() => null)),
  );

  const teas = items.map((product, index): SignatureTea => {
    const detail: ProductDetailDto | null = details[index] ?? null;
    const code = teaCodeOf(product.slug)!;
    const variant = product.defaultVariant;
    return {
      code,
      slug: product.slug,
      name: product.name,
      colour: PACK_COLOURS[code],
      origin: product.origin ?? null,
      description: product.shortDescription ?? null,
      notes: detail?.tastingNotes ?? null,
      measures: brewingMeasures(product.brewing, tb),
      pack: variant
        ? packLabel(variant, product.format, locale, (key, values) => tp(`units.${key}`, values))
        : null,
      orderLabel: tp('orderAction', { name: product.name }),
      addLabel: tp('quickAdd', { name: product.name }),
      price: showPrices && variant ? formatMoney(variant.price, locale, tc('currency.UZS')) : null,
      variantId: showPrices && variant && product.stockLevel !== 'out_of_stock' ? variant.id : null,
      leaves: leavesOf(product, detail),
      cup: product.image,
    };
  });

  const copy = brandCopy[locale];
  return (
    <SignatureStage
      teas={teas}
      heading={copy.collection.heading}
      text={copy.collection.text}
      labels={{
        tabs: t('signatureTabs'),
        view: t('signatureView'),
        order: tp('orderNow'),
        add: tp('addToCart'),
        adding: tp('adding'),
        added: tp('added'),
        notes: tp('tastingNotes'),
        origin: tp('origin'),
      }}
    />
  );
}

/** The tea's dry leaf: its second picture (the owner's photograph), else none. */
function leavesOf(product: ProductSummaryDto, detail: ProductDetailDto | null) {
  return product.hoverImage ?? detail?.images[1] ?? null;
}
