import { listingBannerSlot, type Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound, permanentRedirect } from 'next/navigation';
import { Suspense } from 'react';
import { getPathname } from '@/i18n/navigation';
import {
  hasRefinements,
  parseCatalogFilters,
  toSearchParams,
  type RawSearchParams,
} from '@/features/catalog/query';
import { getCategoryPage } from '@/lib/data/catalog';
import { getPublicSettings } from '@/lib/data/content';
import { visualFor } from '@/lib/visuals';
import { LEAF_BY_CATEGORY } from '@/components/brand/leaf-images';
import { coverShareImage, pageMetadata } from '@/lib/seo';
import { Breadcrumbs } from './breadcrumbs';
import { wholesalePage } from '@/content/pages/wholesale';
import { BusinessLine } from './business-line';
import { CatalogResults, CatalogResultsSkeleton, pastLastPage } from './catalog-results';
import { productFamily } from './product-family';
import {
  CategoryChipRow,
  ListingHeader,
  ListingHeaderSkeleton,
  listingPictures,
} from './listing-header';

/**
 * Metadata of a category page. Every category page is built from the same template and the data
 * of the API: no category has its own code.
 */
export async function categoryMetadata(
  locale: Locale,
  path: string,
  searchParams: RawSearchParams,
): Promise<Metadata> {
  const page = await getCategoryPage(locale, path).catch(() => undefined);
  if (page === undefined) return {}; // API unavailable: the error UI sets noindex itself
  // Settled before the page streams: a real 404 for an unknown address (every one-segment path
  // reaches this template), a 308 for a moved category.
  if (!page) notFound();
  const filters = parseCatalogFilters(searchParams);
  if (page.type === 'redirect') {
    const query = toSearchParams(filters);
    permanentRedirect(
      getPathname({ href: query ? `/${page.path}?${query}` : `/${page.path}`, locale }),
    );
  }
  const { category } = page;
  const [tc, pastEnd] = await Promise.all([
    getTranslations({ locale, namespace: 'Common' }),
    pastLastPage(locale, filters, { category: category.slug }),
  ]);
  return pageMetadata({
    title: category.seoTitle ?? category.name,
    description: category.seoDescription ?? category.description ?? undefined,
    href: `/${category.path}`,
    pagination: { page: filters.page, label: tc('pageN', { page: filters.page }) },
    locale,
    locales: category.locales,
    // A category without products yet ("coming soon") is not offered to search engines.
    noIndex: hasRefinements(filters) || category.productCount === 0 || pastEnd,
    image: coverShareImage(category.image),
  });
}

async function CategoryListing({
  path,
  searchParams,
}: {
  path: string;
  searchParams: Promise<RawSearchParams>;
}) {
  const [locale, t, query] = await Promise.all([
    getLocale() as Promise<Locale>,
    getTranslations('Catalog'),
    searchParams,
  ]);
  const [page, settings] = await Promise.all([
    getCategoryPage(locale, path),
    getPublicSettings(locale).catch(() => null),
  ]);
  if (!page) notFound();
  if (page.type === 'redirect') {
    // Renamed or moved: the old address leads permanently to the current one, filters included.
    const filters = toSearchParams(parseCatalogFilters(query));
    permanentRedirect(
      getPathname({ href: filters ? `/${page.path}?${filters}` : `/${page.path}`, locale }),
    );
  }

  const { category, parent, subcategories, breadcrumbs } = page;
  const banner = visualFor(settings, listingBannerSlot('category', category.id));
  // A kind of tea shows its own dry leaf; otherwise the category's products from beyond the
  // grid's first rows, when it has no banner or cover.
  const leaf = banner || category.image ? null : (LEAF_BY_CATEGORY[category.slug] ?? null);
  const pictures =
    banner || category.image || leaf
      ? []
      : await listingPictures(locale, { category: category.slug });
  const top = parent ?? category;
  const chips = [
    { href: `/${top.path}`, name: t('allIn', { name: top.name }), current: parent === null },
    // Subcategories with products (and the current one, which may be new and still empty).
    ...subcategories
      .filter((child) => child.productCount > 0 || child.slug === category.slug)
      .map((child) => ({
        href: `/${child.path}`,
        name: child.name,
        current: child.slug === category.slug,
      })),
  ];
  const paragraphs = (category.body ?? '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <>
      <Breadcrumbs
        items={breadcrumbs.map((crumb, index) =>
          index === breadcrumbs.length - 1
            ? { label: crumb.name }
            : { label: crumb.name, href: `/${crumb.path}` },
        )}
        locale={locale}
      />
      <ListingHeader
        title={category.name}
        description={category.description}
        illustrationKey={category.illustrationKey}
        image={category.image}
        banner={banner}
        pictures={pictures}
        leaf={leaf}
      >
        {chips.length > 1 ? <CategoryChipRow label={t('subcategories')} items={chips} /> : null}
      </ListingHeader>
      <Suspense fallback={<CatalogResultsSkeleton />}>
        <CatalogResults
          basePath={`/${category.path}`}
          scope={{ category: category.slug }}
          searchParams={searchParams}
        />
      </Suspense>
      {/* Gift sets are where a company buying gifts lands: the way to the request, on its kind. */}
      {productFamily(category.illustrationKey, category.path).key === 'gift' ? (
        <BusinessLine
          text={wholesalePage[locale].segments.CORPORATE}
          cta={wholesalePage[locale].formTitle}
          href="/wholesale?type=CORPORATE#request"
          className="mt-10 max-w-3xl"
        />
      ) : null}
      {paragraphs.length > 0 ? (
        <section className="mt-16 max-w-3xl space-y-4 border-t border-line pt-10 text-body text-fg-muted">
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="whitespace-pre-line">
              {paragraph}
            </p>
          ))}
        </section>
      ) : null}
    </>
  );
}

/** The one template behind every category page ("/tea", "/tea/green-tea", "/gift-sets"…). */
export function CategoryPage({
  path,
  searchParams,
}: {
  path: Promise<string>;
  searchParams: Promise<RawSearchParams>;
}) {
  return (
    <div className="container-page pt-4 pb-section sm:pt-6">
      <Suspense
        fallback={
          <>
            <div className="h-5" />
            <ListingHeaderSkeleton />
            <CatalogResultsSkeleton />
          </>
        }
      >
        <ResolvedCategory path={path} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ResolvedCategory({
  path,
  searchParams,
}: {
  path: Promise<string>;
  searchParams: Promise<RawSearchParams>;
}) {
  return <CategoryListing path={await path} searchParams={searchParams} />;
}
