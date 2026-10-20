import { listingBannerSlot, type Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound, permanentRedirect } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { Breadcrumbs } from '@/components/catalog/breadcrumbs';
import { CatalogResults, CatalogResultsSkeleton } from '@/components/catalog/catalog-results';
import {
  ListingHeader,
  ListingHeaderSkeleton,
  listingPictures,
} from '@/components/catalog/listing-header';
import { hasRefinements, parseCatalogFilters } from '@/features/catalog/query';
import { getCollections, getSlugRedirect } from '@/lib/data/catalog';
import { getPublicSettings } from '@/lib/data/content';
import { visualFor } from '@/lib/visuals';
import { PREMIUM_COLLECTION_SLUG } from '@/content/brand';
import { getPathname } from '@/i18n/navigation';
import { coverShareImage, pageMetadata } from '@/lib/seo';

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
  if (!collection) {
    // Settled before the page streams: a real 404, or a 308 to a renamed collection.
    const current = await getSlugRedirect('collections', slug).catch(() => null);
    if (current) permanentRedirect(getPathname({ href: `/collections/${current}`, locale }));
    notFound();
  }
  const filters = parseCatalogFilters(await searchParams);
  return pageMetadata({
    title: collection.seoTitle ?? collection.name,
    description: collection.seoDescription ?? collection.description ?? undefined,
    href: `/collections/${collection.slug}`,
    query: filters.page > 1 ? `page=${filters.page}` : '',
    locale,
    // A collection without products yet ("coming soon") is not offered to search engines.
    noIndex: hasRefinements(filters) || collection.productCount === 0,
    image: coverShareImage(collection.image),
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
  const [collection, settings] = await Promise.all([
    findCollection(locale, slug),
    getPublicSettings(locale).catch(() => null),
  ]);
  if (!collection) {
    // A renamed collection keeps its old links working.
    const current = await getSlugRedirect('collections', slug).catch(() => null);
    if (current) permanentRedirect(getPathname({ href: `/collections/${current}`, locale }));
    notFound();
  }

  const banner = visualFor(settings, listingBannerSlot('collection', collection.id));
  // TERAN's own five stand in the header in the pack order (its stored cover is a blend in a
  // spoon, none of them); another collection shows its products from beyond the grid's first
  // rows, when it has no banner or cover.
  const packs = collection.slug === PREMIUM_COLLECTION_SLUG && !banner;
  const pictures =
    banner || packs || collection.image
      ? []
      : await listingPictures(locale, { collection: collection.slug });

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
        image={packs ? null : collection.image}
        banner={banner}
        pictures={pictures}
        packs={packs}
      />
      <Suspense fallback={<CatalogResultsSkeleton />}>
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
    <div className="container-page pt-4 pb-section sm:pt-6">
      <Suspense
        fallback={
          <>
            <div className="h-5" />
            <ListingHeaderSkeleton chips={false} />
            <CatalogResultsSkeleton />
          </>
        }
      >
        <CollectionListing params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
