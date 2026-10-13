import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { Breadcrumbs } from '@/components/catalog/breadcrumbs';
import { CatalogResults } from '@/components/catalog/catalog-results';
import { ListingHeader, ListingHeaderSkeleton } from '@/components/catalog/listing-header';
import { ProductGridSkeleton } from '@/components/ui/skeleton';
import { hasRefinements, parseCatalogFilters } from '@/features/catalog/query';
import { getCollections } from '@/lib/data/catalog';
import { pageMetadata } from '@/lib/seo';

async function findCollection(locale: Locale, slug: string) {
  const collections = await getCollections(locale);
  return collections.find((collection) => collection.slug === slug) ?? null;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<'/[locale]/collections/[collection]'>): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const { collection: slug } = await params;
  const collection = await findCollection(locale, slug).catch(() => undefined);
  if (collection === undefined) return {}; // API unavailable: the error UI sets noindex itself
  if (!collection) return { robots: { index: false } };
  const filters = parseCatalogFilters(await searchParams);
  return pageMetadata({
    title: collection.seoTitle ?? collection.name,
    description: collection.seoDescription ?? collection.description ?? undefined,
    href: `/collections/${collection.slug}`,
    query: filters.page > 1 ? `page=${filters.page}` : '',
    locale,
    noIndex: hasRefinements(filters),
  });
}

async function CollectionListing({
  params,
  searchParams,
}: Pick<PageProps<'/[locale]/collections/[collection]'>, 'params' | 'searchParams'>) {
  const [{ collection: slug }, locale, t] = await Promise.all([
    params,
    getLocale(),
    getTranslations('Nav'),
  ]);
  const collection = await findCollection(locale, slug);
  if (!collection) notFound();

  return (
    <>
      <Breadcrumbs
        items={[{ label: t('collections') }, { label: collection.name }]}
        locale={locale}
      />
      <ListingHeader
        eyebrow={t('collections')}
        title={collection.name}
        description={collection.description}
        illustrationKey={collection.illustrationKey}
      />
      <Suspense fallback={<ProductGridSkeleton count={8} className="mt-24" />}>
        <CatalogResults
          basePath={`/collections/${collection.slug}`}
          scope={{ collection: collection.slug }}
          searchParams={searchParams}
        />
      </Suspense>
    </>
  );
}

export default function CollectionPage({
  params,
  searchParams,
}: PageProps<'/[locale]/collections/[collection]'>) {
  return (
    <div className="container-page pt-6 pb-20">
      <Suspense
        fallback={
          <>
            <div className="h-5" />
            <ListingHeaderSkeleton />
            <ProductGridSkeleton count={8} className="mt-24" />
          </>
        }
      >
        <CollectionListing params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
