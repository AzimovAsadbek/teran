import type { Locale } from '@teran/contracts';
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
import { coverShareImage, pageMetadata } from '@/lib/seo';
import { Breadcrumbs } from './breadcrumbs';
import { CatalogResults, CatalogResultsSkeleton } from './catalog-results';
import { CategoryChipRow, ListingHeader, ListingHeaderSkeleton } from './listing-header';

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
  if (!page || page.type === 'redirect') return { robots: { index: false } };
  const { category } = page;
  const filters = parseCatalogFilters(searchParams);
  const tc = await getTranslations({ locale, namespace: 'Common' });
  const title = category.seoTitle ?? category.name;
  return pageMetadata({
    title: filters.page > 1 ? `${title} — ${tc('pageN', { page: filters.page })}` : title,
    description: category.seoDescription ?? category.description ?? undefined,
    href: `/${category.path}`,
    query: filters.page > 1 ? `page=${filters.page}` : '',
    locale,
    noIndex: hasRefinements(filters),
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
  const page = await getCategoryPage(locale, path);
  if (!page) notFound();
  if (page.type === 'redirect') {
    // Renamed or moved: the old address leads permanently to the current one, filters included.
    const filters = toSearchParams(parseCatalogFilters(query));
    permanentRedirect(
      getPathname({ href: filters ? `/${page.path}?${filters}` : `/${page.path}`, locale }),
    );
  }

  const { category, parent, subcategories, breadcrumbs } = page;
  const top = parent ?? category;
  const chips = [
    { href: `/${top.path}`, name: t('allIn', { name: top.name }), current: parent === null },
    ...subcategories.map((child) => ({
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
