import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { Breadcrumbs } from '@/components/catalog/breadcrumbs';
import { CatalogResults, CatalogResultsSkeleton } from '@/components/catalog/catalog-results';
import {
  CategoryChipsFallback,
  CategoryChipsLoader,
  ListingHeader,
} from '@/components/catalog/listing-header';
import { hasRefinements, parseCatalogFilters } from '@/features/catalog/query';
import { pageMetadata } from '@/lib/seo';

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
    description: t('description'),
    href: '/catalog',
    query: filters.page > 1 ? `page=${filters.page}` : '',
    locale,
    noIndex: hasRefinements(filters),
  });
}

export default async function CatalogPage({ searchParams }: PageProps<'/[locale]/catalog'>) {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations('Catalog');
  return (
    <div className="container-page pt-4 pb-section sm:pt-6">
      <Breadcrumbs items={[{ label: t('title') }]} locale={locale} />
      <ListingHeader title={t('title')} description={t('description')} illustrationKey="green">
        <Suspense fallback={<CategoryChipsFallback />}>
          <CategoryChipsLoader />
        </Suspense>
      </ListingHeader>
      <Suspense fallback={<CatalogResultsSkeleton />}>
        <CatalogResults basePath="/catalog" scope={{}} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
