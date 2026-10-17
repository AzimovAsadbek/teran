import type { Locale, ProductDetailDto, ProductSummaryDto } from '@teran/contracts';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound, permanentRedirect } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/catalog/breadcrumbs';
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
import { DemoNotice } from '@/components/ui/demo-notice';
import { Skeleton } from '@/components/ui/skeleton';
import { Link, getPathname } from '@/i18n/navigation';
import { getProduct, getRelatedProducts, getSlugRedirect } from '@/lib/data/catalog';
import { getCheckoutOptions } from '@/lib/data/content';
import { namesFormat } from '@/lib/format';
import { jsonLd, localizedUrl, pageMetadata } from '@/lib/seo';
import { siteUrl } from '@/lib/site';

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
  if (!product) return { robots: { index: false } };
  const image = largestImageUrl(product);
  return pageMetadata({
    title: product.seoTitle ?? product.name,
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

  const [t, tc, options] = await Promise.all([
    getTranslations('Product'),
    getTranslations('Catalog'),
    getCheckoutOptions(locale).catch(() => null),
  ]);
  const requestedSku = Array.isArray(query.variant) ? query.variant[0] : query.variant;
  const initialVariant =
    product.variants.find((variant) => variant.sku === requestedSku) ??
    product.defaultVariant ??
    product.variants[0];
  if (!initialVariant) notFound();

  const productUrl = localizedUrl(`/products/${product.slug}`, locale);
  // Mirrors exactly what the page shows: no ratings or reviews (TERAN has none yet).
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription ?? product.description ?? undefined,
    image: product.images.map(
      (image) => `${siteUrl}${image.src}/${image.widths[image.widths.length - 1]}.webp`,
    ),
    sku: initialVariant.sku,
    brand: { '@type': 'Brand', name: 'TERAN' },
    category: product.category.name,
    offers: product.variants.map((variant) => ({
      '@type': 'Offer',
      sku: variant.sku,
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

  // The product's own parts sit in the page column; the rows of products bring their own.
  return (
    <>
      <div className="container-page">
        <Breadcrumbs
          locale={locale}
          items={[
            ...product.breadcrumbs.map((crumb) => ({ label: crumb.name, href: `/${crumb.path}` })),
            { label: product.name },
          ]}
        />
        {/* The reference's two halves: gallery left, the product's column right. */}
        <div className="mt-6 grid grid-cols-1 gap-8 sm:mt-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <ProductGallery images={product.images} name={product.name} />
          </div>
          <div className="lg:pt-11">
            <p className="flex flex-wrap items-center gap-3">
              <Link
                href={`/${product.category.path}`}
                className="inline-flex min-h-8 items-center rounded-full bg-jade-700 px-[1.375rem] text-[1rem] tracking-[0.04em] text-ivory-50 uppercase transition-[filter] duration-200 hover:brightness-110"
              >
                {product.category.name}
              </Link>
              {namesFormat(product.format) ? (
                <span className="text-eyebrow text-fg-subtle">
                  {tc(`formats.${product.format}`)}
                </span>
              ) : null}
            </p>
            <h1 className="mt-6 font-heading text-[1.75rem] leading-[1.2] text-fg sm:text-[2rem]">
              {product.name}
            </h1>
            {product.isNew || product.onSale ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {product.isNew ? <Badge tone="new">{t('badgeNew')}</Badge> : null}
                {product.onSale ? <Badge tone="sale">{t('badgeSale')}</Badge> : null}
              </div>
            ) : null}
            <div className="mt-4">
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
            </div>
            <DeliveryInfo options={options} />
            <DemoNotice variant="inline" className="mt-4" />
          </div>
        </div>
        <PreparationSection product={product} />
      </div>
      <Suspense fallback={<RailFallback />}>
        <RelatedProducts product={product} />
      </Suspense>
      <div className="container-page">
        <DifferenceSection product={product} />
      </div>
      <RecentlyViewed
        current={summaryOf(product)}
        title={t('recentlyViewed')}
        cta={tn('shopAll')}
        labels={railLabels}
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
      />
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="mt-9 grid gap-8 sm:mt-11 lg:grid-cols-2 lg:gap-12 xl:gap-16" aria-hidden>
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
          <div className="container-page">
            <ProductSkeleton />
          </div>
        }
      >
        <ProductView params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
