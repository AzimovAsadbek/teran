import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { Breadcrumbs } from '@/components/catalog/breadcrumbs';
import { CatalogResults, CatalogResultsSkeleton } from '@/components/catalog/catalog-results';
import {
  CategoryChipsFallback,
  CategoryChipsLoader,
  ListingHeader,
} from '@/components/catalog/listing-header';
import { PremiumCollectionBand } from '@/components/catalog/premium-collection-band';
import { hasRefinements, parseCatalogFilters } from '@/features/catalog/query';
import { getPublicSettings } from '@/lib/data/content';
import { pageMetadata } from '@/lib/seo';
import { showPrices } from '@/lib/site';
import { visualFor } from '@/lib/visuals';

export async function generateMetadata({
  searchParams,
}: PageProps<'/[locale]/catalog'>): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Catalog' });
  const tc = await getTranslations({ locale, namespace: 'Common' });
  const filters = parseCatalogFilters(await searchParams);
  return pageMetadata({
    title:
      filters.page > 1
        ? `${t('metaTitle')} — ${tc('pageN', { page: filters.page })}`
        : t('metaTitle'),
    description: showPrices ? t('shopAllDescription') : t('metaDescription'),
    href: '/catalog',
    query: filters.page > 1 ? `page=${filters.page}` : '',
    locale,
    noIndex: hasRefinements(filters),
  });
}

/**
 * The catalogue's header, with the banner set in Admin → Settings when there is one. Rendered at
 * once without it, then again with it: the box keeps its size, so nothing moves.
 */
async function CatalogHeader({ withBanner = false }: { withBanner?: boolean }) {
  const t = await getTranslations('Catalog');
  let banner = null;
  if (withBanner) {
    await connection();
    const locale = (await rootParams.locale()) as Locale;
    banner = visualFor(await getPublicSettings(locale).catch(() => null), 'banner:catalog');
  }
  return (
    <ListingHeader
      title={t('shopAllTitle')}
      // Price filters show only with prices, so the line does not promise them otherwise.
      description={showPrices ? t('shopAllDescription') : t('shopAllDescriptionNoPrices')}
      banner={banner}
      still
    >
      <Suspense fallback={<CategoryChipsFallback />}>
        <CategoryChipsLoader />
      </Suspense>
    </ListingHeader>
  );
}

/** The premium band, except under the shelves, whose tea shelf opens on the same five teas. */
async function PremiumBandUnlessShelves({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: PageProps<'/[locale]/catalog'>['searchParams'];
}) {
  const filters = parseCatalogFilters(await searchParams);
  if (!hasRefinements(filters) && filters.page === 1) return null;
  return <PremiumCollectionBand locale={locale} />;
}

export default async function CatalogPage({ searchParams }: PageProps<'/[locale]/catalog'>) {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations('Catalog');
  return (
    <div className="container-page pt-4 pb-section sm:pt-6">
      <Breadcrumbs items={[{ label: t('shopAllTitle') }]} locale={locale} />
      <Suspense fallback={<CatalogHeader />}>
        <CatalogHeader withBanner />
      </Suspense>
      <Suspense fallback={<CatalogResultsSkeleton />}>
        <CatalogResults basePath="/catalog" scope={{}} searchParams={searchParams} shelves />
      </Suspense>
      {/* Below a filtered or later page (the shelves open on TERAN's five): streams in without
          moving anything on the first screen. */}
      <Suspense fallback={null}>
        <PremiumBandUnlessShelves locale={locale} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
