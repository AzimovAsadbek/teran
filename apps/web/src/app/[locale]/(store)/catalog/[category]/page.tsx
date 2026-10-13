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
import { getCategories } from '@/lib/data/catalog';
import { pageMetadata } from '@/lib/seo';

async function findCategory(locale: Locale, slug: string) {
  const categories = await getCategories(locale);
  return categories.find((category) => category.slug === slug) ?? null;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<'/[locale]/catalog/[category]'>): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const { category: slug } = await params;
  const category = await findCategory(locale, slug).catch(() => undefined);
  if (category === undefined) return {}; // API unavailable: the error UI sets noindex itself
  if (!category) return { robots: { index: false } };
  const filters = parseCatalogFilters(await searchParams);
  return pageMetadata({
    title: category.seoTitle ?? category.name,
    description: category.seoDescription ?? category.description ?? undefined,
    href: `/catalog/${category.slug}`,
    query: filters.page > 1 ? `page=${filters.page}` : '',
    locale,
    noIndex: hasRefinements(filters),
  });
}

async function CategoryListing({
  params,
  searchParams,
}: Pick<PageProps<'/[locale]/catalog/[category]'>, 'params' | 'searchParams'>) {
  const [{ category: slug }, locale, t] = await Promise.all([
    params,
    getLocale(),
    getTranslations('Catalog'),
  ]);
  const category = await findCategory(locale, slug);
  if (!category) notFound();

  return (
    <>
      <Breadcrumbs
        items={[{ label: t('title'), href: '/catalog' }, { label: category.name }]}
        locale={locale}
      />
      <ListingHeader
        title={category.name}
        description={category.description}
        illustrationKey={category.illustrationKey}
      />
      <Suspense fallback={<ProductGridSkeleton count={8} className="mt-24" />}>
        <CatalogResults
          basePath={`/catalog/${category.slug}`}
          scope={{ category: category.slug }}
          searchParams={searchParams}
        />
      </Suspense>
    </>
  );
}

export default function CategoryPage({
  params,
  searchParams,
}: PageProps<'/[locale]/catalog/[category]'>) {
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
        <CategoryListing params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
