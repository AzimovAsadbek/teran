import type { Locale, ProductDetailDto, ProductSummaryDto } from '@teran/contracts';
import { Truck } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound, permanentRedirect } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { BrewingGauge } from '@/components/brand/brewing-gauge';
import { FiveTeas } from '@/components/brand/five-teas';
import { BusinessLine } from '@/components/catalog/business-line';
import { PACK_IMAGES } from '@/components/brand/pack-images';
import { TeaStage, teaTint } from '@/components/brand/tea-stage';
import { Breadcrumbs } from '@/components/catalog/breadcrumbs';
import { productFamily } from '@/components/catalog/product-family';
import { Stars } from '@/components/catalog/stars';
import { ProductRail } from '@/components/home/product-rail';
import { RailFallback } from '@/components/home/rail-sections';
import { OrderBar } from '@/components/product/order-bar';
import { ProductGallery } from '@/components/product/product-gallery';
import {
  AttributeRows,
  DifferenceSection,
  DeliveryInfo,
  ProductTabsSection,
} from '@/components/product/product-info';
import { PurchasePanel } from '@/components/product/purchase-panel';
import { RecentlyViewed } from '@/components/product/recently-viewed';
import { formatAverage, ReviewsSection } from '@/components/product/reviews-section';
import { JsonLd } from '@/components/seo/json-ld';
import { DemoNotice } from '@/components/ui/demo-notice';
import { Skeleton } from '@/components/ui/skeleton';
import { PACK_COLOURS, teaCodeOf } from '@/content/brand';
import { wholesalePage } from '@/content/pages/wholesale';
import { getPathname, Link } from '@/i18n/navigation';
import { getProduct, getRelatedProducts, getSlugRedirect } from '@/lib/data/catalog';
import { getCheckoutOptions } from '@/lib/data/content';
import { getProductReviews } from '@/lib/data/reviews';
import { brewingMeasures } from '@/lib/brewing';
import { namesFormat } from '@/lib/format';
import { coverShareImage, pageMetadata, productSchema } from '@/lib/seo';
import { ShareButton } from '@/components/product/share-button';
import { packLabel } from '@/lib/format';
import { showPrices } from '@/lib/site';

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
  const title = product.seoTitle ?? product.name;
  const pack = product.variants.length === 1 ? product.variants[0]?.weightGrams : null;
  const image = coverShareImage(product.images[0]);
  return pageMetadata({
    // "TERAN G8810 — Yashil choy, 400 g": a name that carries the brand needs no "— TERAN".
    title: /teran/i.test(title)
      ? { absolute: `${title} — ${product.category.name}${pack ? `, ${pack} g` : ''}` }
      : title,
    description: product.seoDescription ?? product.shortDescription ?? undefined,
    href: `/products/${product.slug}`,
    locale,
    locales: product.locales,
    image: image ? { ...image, alt: product.name } : undefined,
  });
}

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

  const [t, tc, tb, options, reviews] = await Promise.all([
    getTranslations('Product'),
    getTranslations('Catalog'),
    getTranslations('Brewing'),
    getCheckoutOptions(locale).catch(() => null),
    getProductReviews(product.slug).catch(() => null),
  ]);
  // TERAN's own five: their stage, their name set like the pack, their colour (ADR-050/051).
  const code = teaCodeOf(product.slug);
  const packColour = code ? PACK_COLOURS[code] : null;
  const family = productFamily(product.illustrationKey, product.category.path);
  const FamilyIcon = family.icon;
  const measures = brewingMeasures(product.brewing, tb);
  const formatLabel = namesFormat(product.format) ? tc(`formats.${product.format}`) : null;
  // "Gift sets · Gift set" says one thing twice.
  const showFormat =
    formatLabel !== null &&
    !product.category.name.toLowerCase().startsWith(formatLabel.toLowerCase().slice(0, 4));
  // A single bottle or whisk ("1 piece") says nothing the name does not (as on the cards).
  const packs = product.variants.filter(
    (variant) => variant.unitCount !== 1 || variant.weightGrams,
  );
  const packLine =
    packs.length > 0
      ? product.variants
          .map((variant) =>
            packLabel(variant, product.format, locale, (key, values) => t(`units.${key}`, values)),
          )
          .join(' · ')
      : null;
  const titleRest = code ? product.name.replace(code, '').trim() : null;
  const requestedSku = Array.isArray(query.variant) ? query.variant[0] : query.variant;
  const initialVariant =
    product.variants.find((variant) => variant.sku === requestedSku) ??
    product.defaultVariant ??
    product.variants[0];
  if (!initialVariant) notFound();

  const rating = product.rating;
  // Mirrors exactly what the page shows: the customers' average and the reviews on the page.
  const structuredData = productSchema({
    product,
    locale,
    variant: initialVariant,
    reviews: reviews?.items ?? null,
    withOffers: showPrices,
  });

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
        {/* Two halves from 1024 px, gallery left and the product's column right; on a tablet held
            upright one column, the picture and then its words at a comfortable width, so the
            picture is never smaller than on a phone and no half stands empty. */}
        <div className="mt-6 grid grid-cols-1 gap-8 sm:mt-8 lg:grid-cols-2 lg:gap-10">
          {/* Edge to edge on phones, as the reference's gallery. */}
          <div className="-mx-4 min-[46.875rem]:mx-auto min-[46.875rem]:w-full min-[46.875rem]:max-w-[36rem] lg:mx-0 lg:max-w-none">
            <ProductGallery
              images={product.images}
              name={product.name}
              arrival={code ? null : family.sheen}
              stage={
                code && packColour
                  ? {
                      slide: (
                        <TeaStage
                          code={code}
                          colour={packColour}
                          name={product.name}
                          leaves={product.hoverImage ?? product.images[1] ?? null}
                          cup={product.image}
                          entering
                          priority
                          packSizes="(min-width: 95rem) 340px, (min-width: 64rem) calc(24vw - 2rem), (min-width: 46.875rem) 17rem, 48vw"
                        />
                      ),
                      thumb: (
                        <span
                          aria-hidden
                          className="absolute inset-0 flex items-end justify-center"
                          style={{ backgroundColor: teaTint(packColour) }}
                        >
                          <Image
                            src={PACK_IMAGES[code]}
                            alt=""
                            sizes="56px"
                            className="h-[86%] w-auto -rotate-3"
                          />
                        </span>
                      ),
                    }
                  : null
              }
            />
          </div>
          <div className="min-[46.875rem]:mx-auto min-[46.875rem]:w-full min-[46.875rem]:max-w-[36rem] lg:mx-0 lg:max-w-none lg:pt-8">
            <p className="flex flex-wrap items-center gap-2.5">
              {/* The type as a coloured label (not a link; the breadcrumbs are): TERAN's teas keep
                  the brand's teal, every other family its own ink and mark (product-family.ts). */}
              <span
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full px-[1.125rem] text-[1rem] tracking-[0.04em] text-ivory-50 uppercase"
                style={{ backgroundColor: code ? 'var(--color-jade-700)' : family.ink }}
              >
                {code ? null : <FamilyIcon aria-hidden className="h-4 w-4" />}
                {product.category.name}
              </span>
              {showFormat ? (
                <span className="text-eyebrow text-fg-subtle">{formatLabel}</span>
              ) : null}
              {product.isNew ? (
                <span className="inline-flex min-h-7 items-center rounded-full border border-forest-700 px-3 text-[0.8125rem] font-semibold text-forest-700">
                  {t('badgeNew')}
                </span>
              ) : null}
              {showPrices && product.onSale ? (
                <span className="inline-flex min-h-7 items-center rounded-full bg-forest-700 px-3 text-[0.8125rem] font-semibold text-ivory-50">
                  {t('badgeSale')}
                </span>
              ) : null}
            </p>
            {code && packColour && titleRest !== null ? (
              // Set like the pack: the brand, then the tea's code in its own colour.
              <h1 className="mt-5 font-headline [--headline-weight:600]">
                <span className="block text-[1.125rem] leading-none tracking-[0.2em] text-fg-subtle">
                  {titleRest}{' '}
                </span>
                <span
                  className="mt-2 block text-[3.5rem] leading-[0.9] sm:text-[4.5rem]"
                  style={{ color: packColour }}
                >
                  {code}
                </span>
              </h1>
            ) : (
              <h1 className="mt-5 font-heading text-[clamp(2.125rem,1.55rem+1.6vw,3.25rem)] leading-[1.08] text-balance text-fg">
                {product.name}
              </h1>
            )}
            {/* The customers' stars, leading to the reviews further down (ADR-042): empty, with
                "No ratings yet", until customers rate — the owner's decision. */}
            <a
              href="#reviews"
              className="mt-3 inline-flex flex-wrap items-center gap-2 text-body-sm hover:underline hover:underline-offset-2"
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
            <div className="mt-5">
              {showPrices ? (
                <>
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
                  {/* After the purchase itself, never above it. */}
                  <BusinessLine
                    text={t('businessLine')}
                    cta={wholesalePage[locale].formTitle}
                    className="mt-5"
                  />
                  <DeliveryInfo options={options} />
                </>
              ) : (
                // No price and no bag for now: the pack, the card's own "Order" (to the contact
                // page with this tea named) and what happens next, then the product's facts. The
                // channels themselves stay in the footer, the contact page and the floating
                // button (ADR-045).
                <>
                  {packLine ? (
                    <p className="text-[1.125rem] leading-[1.6] text-fg">{packLine}</p>
                  ) : null}
                  {product.stockLevel === 'out_of_stock' ? null : (
                    <OrderBar
                      href={`/contact?tea=${encodeURIComponent(product.slug)}`}
                      label={t('orderNow')}
                      ariaLabel={t('orderAction', { name: product.name })}
                      name={product.name}
                      thumb={orderThumb(product, code)}
                    />
                  )}
                  <p className="mt-3 flex items-start gap-2 text-body-sm text-fg-muted">
                    <Truck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-jade-700" />
                    <span>
                      {t('deliveryTextByContact')}{' '}
                      <Link
                        href="/delivery"
                        className="font-semibold text-brand underline decoration-brand/40 underline-offset-4 hover:decoration-brand"
                      >
                        {t('deliveryLink')}
                      </Link>
                    </span>
                  </p>
                  <BusinessLine
                    text={t('businessLine')}
                    cta={wholesalePage[locale].formTitle}
                    className="mt-5"
                  />
                </>
              )}
            </div>
            {measures.length > 0 ? (
              // How it is brewed, as the same gauge as the five-tea stage (ADR-051).
              <section aria-labelledby="preparation" className="mt-8 border-t border-line pt-6">
                <h2 id="preparation" className="font-heading text-[1.375rem] leading-tight text-fg">
                  {tb('method')}
                </h2>
                <BrewingGauge
                  measures={measures}
                  colour={packColour ?? family.ink}
                  className="mt-4"
                />
              </section>
            ) : null}
            {showPrices ? null : (
              <>
                <ProductTabsSection product={product} />
                <AttributeRows product={product} />
              </>
            )}
            <DemoNotice variant="inline" className="mt-4" />
            <div className="mt-4">
              <ShareButton title={product.name} />
            </div>
          </div>
        </div>
      </div>
      {code ? (
        // TERAN's five read on one ruler, this one lit: how it differs from the other four.
        <div className="container-frame mt-12 sm:mt-16">
          <Suspense fallback={null}>
            <FiveTeas locale={locale} current={code} id="five-teas" />
          </Suspense>
        </div>
      ) : null}
      <Suspense fallback={<RailFallback />}>
        <RelatedProducts product={product} />
      </Suspense>
      <div className="container-frame">
        {/* The pack's printed values belong to TERAN's own teas, not to every product. */}
        {code ? <DifferenceSection product={product} /> : null}
        <ReviewsSection slug={product.slug} reviews={reviews} />
      </div>
      <RecentlyViewed
        current={summaryOf(product)}
        title={t('recentlyViewed')}
        cta={tn('shopAll')}
        labels={railLabels}
        frame="content"
      />
      <JsonLd data={structuredData} />
    </>
  );
}

/** The order bar's small picture: the pouch for TERAN's teas, else the first photograph. */
function orderThumb(
  product: ProductDetailDto,
  code: ReturnType<typeof teaCodeOf>,
): { src: string; alt: string } | null {
  if (code) return { src: PACK_IMAGES[code].src, alt: '' };
  const image = product.images[0];
  if (!image) return null;
  const width = image.widths.find((candidate) => candidate >= 96) ?? image.widths[0] ?? image.width;
  return { src: `${image.src}/${width}.webp`, alt: '' };
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
      className="mt-9 grid gap-8 sm:mt-11 lg:grid-cols-2 lg:gap-10 [&>*]:min-[46.875rem]:mx-auto [&>*]:min-[46.875rem]:w-full [&>*]:min-[46.875rem]:max-w-[36rem] [&>*]:lg:mx-0 [&>*]:lg:max-w-none"
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
