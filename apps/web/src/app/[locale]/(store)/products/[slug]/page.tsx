import type { Locale, ProductDetailDto, ProductSummaryDto } from '@teran/contracts';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound, permanentRedirect } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/catalog/breadcrumbs';
import { Stars } from '@/components/catalog/stars';
import { ProductRail } from '@/components/home/product-rail';
import { RailFallback } from '@/components/home/rail-sections';
import { ProductGallery } from '@/components/product/product-gallery';
import {
  AttributeRows,
  DifferenceSection,
  DeliveryInfo,
  PreparationSection,
  ProductTabsSection,
} from '@/components/product/product-info';
import { PurchasePanel } from '@/components/product/purchase-panel';
import { RecentlyViewed } from '@/components/product/recently-viewed';
import { formatAverage, ReviewsSection } from '@/components/product/reviews-section';
import { DemoNotice } from '@/components/ui/demo-notice';
import { Skeleton } from '@/components/ui/skeleton';
import { getPathname } from '@/i18n/navigation';
import { getProduct, getRelatedProducts, getSlugRedirect } from '@/lib/data/catalog';
import { getCheckoutOptions } from '@/lib/data/content';
import { getProductReviews } from '@/lib/data/reviews';
import { namesFormat } from '@/lib/format';
import { jsonLd, localizedUrl, pageMetadata } from '@/lib/seo';
import { ShareButton } from '@/components/product/share-button';
import { ContactToOrder } from '@/components/social/contact-to-order';
import { packLabel } from '@/lib/format';
import { showPrices, siteUrl } from '@/lib/site';

function largestImageUrl(product: ProductDetailDto): string | null {
  const image = product.images[0];
  if (!image) return null;
  const width = image.widths.includes(1280) ? 1280 : image.widths[image.widths.length - 1];
  return `${siteUrl}${image.src}/${width}.webp`;
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/products/[slug]'>): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const { slug } = await params;
  let product: ProductDetailDto | null;
  try {
    product = await getProduct(locale, slug);
  } catch {
    return {}; // API unavailable: the page shows the error UI, which sets noindex itself
  }
  if (!product) {
    // Settled before the page streams, so crawlers get a real 404, or a 308 to a renamed tea.
    const current = await getSlugRedirect('products', slug).catch(() => null);
    if (current) permanentRedirect(getPathname({ href: `/products/${current}`, locale }));
    notFound();
  }
  const image = largestImageUrl(product);
  const title = product.seoTitle ?? product.name;
  const pack = product.variants.length === 1 ? product.variants[0]?.weightGrams : null;
  return pageMetadata({
    // "TERAN G8810 — Yashil choy, 400 g": a name that carries the brand needs no "— TERAN".
    title: /teran/i.test(title)
      ? { absolute: `${title} — ${product.category.name}${pack ? `, ${pack} g` : ''}` }
      : title,
    description: product.seoDescription ?? product.shortDescription ?? undefined,
    href: `/products/${product.slug}`,
    locale,
    images: image ? [{ url: image, alt: product.name }] : undefined,
  });
}

const AVAILABILITY = {
  in_stock: 'https://schema.org/InStock',
  low_stock: 'https://schema.org/LimitedAvailability',
  out_of_stock: 'https://schema.org/OutOfStock',
} as const;

async function ProductView({
  params,
  searchParams,
}: Pick<PageProps<'/[locale]/products/[slug]'>, 'params' | 'searchParams'>) {
  const [{ slug }, query, locale] = await Promise.all([params, searchParams, getLocale()]);
  const product = await getProduct(locale, slug);
  if (!product) {
    // A renamed product keeps its old links working.
    const current = await getSlugRedirect('products', slug).catch(() => null);
    if (current) permanentRedirect(getPathname({ href: `/products/${current}`, locale }));
    notFound();
  }

  const [t, tc, options, reviews] = await Promise.all([
    getTranslations('Product'),
    getTranslations('Catalog'),
    getCheckoutOptions(locale).catch(() => null),
    getProductReviews(product.slug).catch(() => null),
  ]);
  const requestedSku = Array.isArray(query.variant) ? query.variant[0] : query.variant;
  const initialVariant =
    product.variants.find((variant) => variant.sku === requestedSku) ??
    product.defaultVariant ??
    product.variants[0];
  if (!initialVariant) notFound();

  const productUrl = localizedUrl(`/products/${product.slug}`, locale);
  const rating = product.rating;
  // Mirrors exactly what the page shows: the customers' average and the reviews on the page.
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    url: productUrl,
    name: product.name,
    description: product.shortDescription ?? product.description ?? undefined,
    image: product.images.map(
      (image) => `${siteUrl}${image.src}/${image.widths[image.widths.length - 1]}.webp`,
    ),
    sku: initialVariant.sku,
    ...(initialVariant.barcode ? { gtin13: initialVariant.barcode } : {}),
    brand: { '@type': 'Brand', name: 'TERAN' },
    category: product.category.name,
    ...(rating
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: rating.average,
            ratingCount: rating.count,
            bestRating: 5,
            worstRating: 1,
          },
          review: reviews?.items.map((review) => ({
            '@type': 'Review',
            author: { '@type': 'Person', name: review.authorName },
            datePublished: review.createdAt.slice(0, 10),
            ...(review.comment ? { reviewBody: review.comment } : {}),
            reviewRating: { '@type': 'Rating', ratingValue: review.rating, bestRating: 5 },
          })),
        }
      : {}),
    // No offer (it would publish the price) while the shop shows no prices.
    offers: !showPrices
      ? undefined
      : product.variants.map((variant) => ({
          '@type': 'Offer',
          sku: variant.sku,
          ...(variant.barcode ? { gtin13: variant.barcode } : {}),
          price: variant.price,
          priceCurrency: variant.currency,
          availability: AVAILABILITY[variant.stockLevel],
          url: `${productUrl}?variant=${encodeURIComponent(variant.sku)}`,
          itemCondition: 'https://schema.org/NewCondition',
        })),
  };

  const th = await getTranslations('Home');
  const tn = await getTranslations('Nav');
  const railLabels = {
    tabList: th('showcaseTabs'),
    previous: th('showcasePrevious'),
    next: th('showcaseNext'),
  };

  // The product's own parts sit in the reference's 1440 px frame; the rows of products bring their
  // own, in the same frame.
  return (
    <>
      <div className="container-frame">
        <Breadcrumbs
          locale={locale}
          items={[
            ...product.breadcrumbs.map((crumb) => ({ label: crumb.name, href: `/${crumb.path}` })),
            { label: product.name },
          ]}
        />
        {/* The reference's two halves: gallery left, the product's column right. */}
        <div className="mt-6 grid grid-cols-1 gap-8 sm:mt-8 min-[46.875rem]:grid-cols-2 min-[46.875rem]:gap-10">
          {/* Edge to edge on phones, as the reference's gallery. */}
          <div className="-mx-4 min-[46.875rem]:mx-0">
            <ProductGallery images={product.images} name={product.name} />
          </div>
          <div className="lg:pt-11">
            <p className="flex flex-wrap items-center gap-3">
              {/* The tea type as the reference's coloured label (not a link; the breadcrumbs are). */}
              <span className="inline-flex min-h-8 items-center rounded-full bg-jade-700 px-[1.375rem] text-[1rem] tracking-[0.04em] text-ivory-50 uppercase">
                {product.category.name}
              </span>
              {namesFormat(product.format) ? (
                <span className="text-eyebrow text-fg-subtle">
                  {tc(`formats.${product.format}`)}
                </span>
              ) : null}
            </p>
            <h1 className="mt-6 font-heading text-[1.75rem] leading-[1.2] text-fg sm:text-[2rem]">
              {product.name}
            </h1>
            {/* The customers' stars, leading to the reviews further down (ADR-042). */}
            <a
              href="#reviews"
              className="mt-2.5 inline-flex flex-wrap items-center gap-2 text-body-sm hover:underline hover:underline-offset-2"
            >
              <Stars value={rating?.average ?? 0} className="text-[1.125rem]" />
              {rating ? (
                <>
                  <span className="font-semibold text-fg">
                    {formatAverage(rating.average, locale)}
                  </span>
                  <span className="text-fg-subtle">
                    {t('reviews.count', { count: rating.count })}
                  </span>
                </>
              ) : (
                <span className="text-fg-subtle">{t('reviews.none')}</span>
              )}
            </a>
            {product.isNew || (showPrices && product.onSale) ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {product.isNew ? <Badge tone="new">{t('badgeNew')}</Badge> : null}
                {showPrices && product.onSale ? <Badge tone="sale">{t('badgeSale')}</Badge> : null}
              </div>
            ) : null}
            <div className="mt-4">
              {showPrices ? (
                <PurchasePanel
                  productName={product.name}
                  format={product.format}
                  variants={product.variants}
                  initialVariantId={initialVariant.id}
                  image={product.images[0] ?? null}
                  details={
                    <>
                      <ProductTabsSection product={product} />
                      <AttributeRows product={product} />
                    </>
                  }
                />
              ) : (
                // No price and no bag for now: the pack, then how to order where the bag button
                // would be (before the long description, so phones reach it without scrolling),
                // then the product's facts.
                <>
                  <p className="text-[1.125rem] leading-[1.6] text-fg">
                    {product.variants
                      .map((variant) =>
                        packLabel(variant, product.format, locale, (key, values) =>
                          t(`units.${key}`, values),
                        ),
                      )
                      .join(' · ')}
                  </p>
                  {/* The product cards' "Order" pill leads here (#order). */}
                  <div id="order" className="scroll-mt-36">
                    <ContactToOrder
                      title={t('orderByContactTitle')}
                      text={t('orderByContactText')}
                      className="mt-5"
                    />
                  </div>
                  <ProductTabsSection product={product} />
                  <AttributeRows product={product} />
                </>
              )}
            </div>
            <DeliveryInfo options={options} />
            <DemoNotice variant="inline" className="mt-4" />
            <div className="mt-4">
              <ShareButton title={product.name} />
            </div>
          </div>
        </div>
        <PreparationSection product={product} />
      </div>
      <Suspense fallback={<RailFallback />}>
        <RelatedProducts product={product} />
      </Suspense>
      <div className="container-frame">
        <DifferenceSection product={product} />
        <ReviewsSection slug={product.slug} reviews={reviews} />
      </div>
      <RecentlyViewed
        current={summaryOf(product)}
        title={t('recentlyViewed')}
        cta={tn('shopAll')}
        labels={railLabels}
        frame="content"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
    </>
  );
}

/** The card's fields of a product (what the recently-viewed row keeps on the device). */
function summaryOf(product: ProductDetailDto): ProductSummaryDto {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    shortDescription: product.shortDescription,
    category: product.category,
    format: product.format,
    isFeatured: product.isFeatured,
    isNew: product.isNew,
    onSale: product.onSale,
    stockLevel: product.stockLevel,
    priceFrom: product.priceFrom,
    compareAtPriceFrom: product.compareAtPriceFrom,
    currency: product.currency,
    variantCount: product.variantCount,
    defaultVariant: product.defaultVariant,
    image: product.image,
    stageImage: product.stageImage,
    hoverImage: product.hoverImage,
    illustrationKey: product.illustrationKey,
    origin: product.origin,
    brewing: product.brewing,
    rating: product.rating,
  };
}

/** The reference's "they go together" row: related products, and the way to the whole category. */
async function RelatedProducts({ product }: { product: ProductDetailDto }) {
  const locale = await getLocale();
  const [t, th, tn] = await Promise.all([
    getTranslations('Product'),
    getTranslations('Home'),
    getTranslations('Nav'),
  ]);
  const related = await getRelatedProducts(locale, product.slug).catch(() => []);
  if (related.length === 0) return null;
  return (
    <div className="mt-2">
      <ProductRail
        tabs={[
          {
            id: 'related',
            label: t('related'),
            products: related,
            href: `/${product.category.path}`,
            cta: tn('shopIn', { name: product.category.name }),
          },
        ]}
        labels={{
          tabList: th('showcaseTabs'),
          previous: th('showcasePrevious'),
          next: th('showcaseNext'),
        }}
        heading="serif"
        frame="content"
      />
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div
      className="mt-9 grid gap-8 sm:mt-11 min-[46.875rem]:grid-cols-2 min-[46.875rem]:gap-10"
      aria-hidden
    >
      <Skeleton className="aspect-square" />
      <div className="space-y-4 lg:pt-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="mt-8 h-9 w-1/2" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-13 w-full" />
      </div>
    </div>
  );
}

/**
 * The shell (header, breadcrumbs skeleton) streams first; the product resolves inside Suspense. An
 * unknown slug therefore renders the not-found UI with `noindex` and a 200 status — Next.js commits
 * the status before streaming (docs/architecture/decisions.md, ADR-010).
 */
export default function ProductPage({
  params,
  searchParams,
}: PageProps<'/[locale]/products/[slug]'>) {
  return (
    <div className="pt-6 pb-section sm:pt-8">
      <Suspense
        fallback={
          <div className="container-frame">
            <ProductSkeleton />
          </div>
        }
      >
        <ProductView params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
