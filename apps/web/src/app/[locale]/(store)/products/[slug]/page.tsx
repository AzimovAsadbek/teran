import type { Locale, ProductDetailDto } from '@teran/contracts';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/catalog/breadcrumbs';
import { ProductCard } from '@/components/catalog/product-card';
import { ProductGallery } from '@/components/product/product-gallery';
import { DeliveryInfo, ProductInfo } from '@/components/product/product-info';
import { PurchasePanel } from '@/components/product/purchase-panel';
import { DemoNotice } from '@/components/ui/demo-notice';
import { ProductGridSkeleton, Skeleton } from '@/components/ui/skeleton';
import { getProduct, getRelatedProducts } from '@/lib/data/catalog';
import { getCheckoutOptions } from '@/lib/data/content';
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
  if (!product) notFound();

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

  return (
    <>
      <Breadcrumbs
        locale={locale}
        items={[
          { label: tc('title'), href: '/catalog' },
          { label: product.category.name, href: `/catalog/${product.category.slug}` },
          { label: product.name },
        ]}
      />
      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16">
        <ProductGallery
          images={product.images}
          illustrationKey={product.illustrationKey}
          name={product.name}
        />
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="leaf">{product.category.name}</Badge>
            <Badge tone="muted">{tc(`formats.${product.format}`)}</Badge>
            {product.isNew ? <Badge tone="new">{t('badgeNew')}</Badge> : null}
            {product.onSale ? <Badge tone="sale">{t('badgeSale')}</Badge> : null}
          </div>
          <h1 className="text-display-lg mt-4 text-forest-900">{product.name}</h1>
          {product.shortDescription ? (
            <p className="mt-3 text-lg text-ink-700">{product.shortDescription}</p>
          ) : null}
          <div className="mt-8">
            <PurchasePanel
              productName={product.name}
              format={product.format}
              variants={product.variants}
              initialVariantId={initialVariant.id}
            />
          </div>
          <DemoNotice className="mt-6" />
          <div className="mt-6">
            <DeliveryInfo options={options} />
          </div>
          <ProductInfo product={product} />
        </div>
      </div>
      <Suspense fallback={<ProductGridSkeleton className="mt-20" />}>
        <RelatedProducts slug={product.slug} />
      </Suspense>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
    </>
  );
}

async function RelatedProducts({ slug }: { slug: string }) {
  const locale = await getLocale();
  const t = await getTranslations('Product');
  const related = await getRelatedProducts(locale, slug).catch(() => []);
  if (related.length === 0) return null;
  return (
    <section aria-labelledby="related-title" className="mt-24">
      <h2 id="related-title" className="text-display-md text-forest-900">
        {t('related')}
      </h2>
      <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 md:grid-cols-4">
        {related.map((item) => (
          <li key={item.id}>
            <ProductCard product={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProductSkeleton() {
  return (
    <div className="mt-11 grid gap-10 lg:grid-cols-2 lg:gap-16" aria-hidden>
      <Skeleton className="aspect-square rounded-[var(--radius-panel)]" />
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-14 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="mt-8 h-24 w-full" />
        <Skeleton className="h-12 w-full" />
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
    <div className="container-page pt-6 pb-24">
      <Suspense fallback={<ProductSkeleton />}>
        <ProductView params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
