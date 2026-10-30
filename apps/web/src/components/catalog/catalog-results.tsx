import type { Locale } from '@teran/contracts';
import { Leaf, SearchX } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { ButtonLink } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { ProductGridSkeleton } from '@/components/ui/skeleton';
import { StateMessage } from '@/components/ui/state-message';
import { getProductList } from '@/lib/data/catalog';
import {
  hasRefinements,
  parseCatalogFilters,
  toApiQuery,
  toSearchParams,
  type CatalogFilters,
  type RawSearchParams,
} from '@/features/catalog/query';
import { FilterBar } from './filter-bar';
import { CategoryChipsLoader } from './listing-header';
import { Pagination } from './pagination';
import { cn } from '@/lib/cn';
import { COLLECTION_CODES, PREMIUM_COLLECTION_SLUG, teaCodeOf } from '@/content/brand';
import { gridFor } from './catalog-grid';
import { FamilyShelves } from './family-shelves';
import { ProductCard } from './product-card';
import { ClientMessages } from '@/i18n/client-messages';

const PAGE_SIZE = 24;

/** What a listing lists: everything, a category, a collection or a search's results. */
type ListingScope = { category?: string; collection?: string; q?: string };

/**
 * Whether a listing's page number lies past its last page (an old link, a category that emptied):
 * that page shows no products and is not indexed. Reads the same cached list as the page itself.
 */
export async function pastLastPage(
  locale: Locale,
  filters: CatalogFilters,
  scope: ListingScope,
): Promise<boolean> {
  if (filters.page <= 1) return false;
  const list = await getProductList(locale, toApiQuery(filters, scope, PAGE_SIZE)).catch(
    () => null,
  );
  return list !== null && filters.page > list.totalPages;
}

/** Filter bar, product grid and pagination for any listing (all teas, category, collection, search). */
export async function CatalogResults({
  basePath,
  scope,
  searchParams,
  shelves = false,
}: {
  basePath: string;
  scope: ListingScope;
  searchParams: Promise<RawSearchParams>;
  /** The whole catalogue: unfiltered, on its first page, its families as shelves. */
  shelves?: boolean;
}) {
  await connection();
  const [locale, params, t] = await Promise.all([
    getLocale(),
    searchParams,
    getTranslations('Catalog'),
  ]);
  const filters = parseCatalogFilters(params);
  const list = await getProductList(locale, toApiQuery(filters, scope, PAGE_SIZE)).catch(
    () => null,
  );

  if (!list) {
    return (
      <Notice tone="danger" role="alert" className="mt-8">
        {t('loadError')}
      </Notice>
    );
  }
  // TERAN's five in the order of their packs, as everywhere else (the listing's own order is the
  // admin's featured flag, not the collection's).
  const items =
    scope.collection === PREMIUM_COLLECTION_SLUG && filters.sort === 'featured'
      ? [...list.items].sort((a, b) => packOrder(a.slug) - packOrder(b.slug))
      : list.items;
  const grid = gridFor(items.length, list.totalPages === 1);

  const extra: Record<string, string> = scope.q ? { q: scope.q } : {};
  const hrefFor = (page: number) => {
    const query = toSearchParams({ ...filters, page }, extra);
    return query ? `${basePath}?${query}` : basePath;
  };

  // A category or collection that has no products yet (nothing filtered away): it was just created
  // in the admin area, so the page says products are coming instead of "nothing found".
  const awaitingProducts =
    list.total === 0 &&
    !hasRefinements(filters) &&
    !scope.q &&
    Boolean(scope.category ?? scope.collection);

  // The whole catalogue unrefined: a shelf a family (family-shelves.tsx) under the same filters,
  // every product on one page; any filter, sort or page gives the grid below.
  if (shelves && !hasRefinements(filters) && filters.page === 1 && list.total > 0) {
    return (
      <>
        <ClientMessages pick={['Catalog']}>
          <FilterBar
            basePath={basePath}
            filters={filters}
            facets={list.facets}
            total={list.total}
          />
        </ClientMessages>
        <FamilyShelves locale={locale as Locale} />
      </>
    );
  }

  // A search that found nothing, with nothing applied: no filters to change, so no filter bar —
  // the words echoed, the way to check them and the categories to start from.
  if (list.total === 0 && !hasRefinements(filters) && scope.q) {
    return (
      <StateMessage
        framed={false}
        headingLevel="h2"
        className="pt-8 sm:pt-10 lg:pt-12"
        title={t('emptyTitle')}
        text={t('searchEmptyText', { query: scope.q })}
        primary={{ href: '/catalog', label: t('shopAllTitle') }}
      >
        <div className="mt-6">
          <CategoryChipsLoader withAll={false} />
        </div>
      </StateMessage>
    );
  }

  return (
    <>
      {/* The bar's sort menu, price and range popovers and phone drawer are client components. */}
      {awaitingProducts ? null : (
        <ClientMessages pick={['Catalog']}>
          <FilterBar
            basePath={basePath}
            filters={filters}
            facets={list.facets}
            total={list.total}
          />
        </ClientMessages>
      )}
      {awaitingProducts ? (
        <div className="flex flex-col items-center py-16 text-center sm:py-20">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-fg">
            <Leaf aria-hidden className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-display-sm text-fg">{t('comingSoonTitle')}</h2>
          <p className="mt-2 max-w-md text-body text-fg-muted">{t('comingSoonText')}</p>
          <ButtonLink href="/catalog" variant="secondary" className="mt-6">
            {t('shopAllTitle')}
          </ButtonLink>
        </div>
      ) : list.items.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center sm:py-20">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-fg">
            <SearchX aria-hidden className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-display-sm text-fg">{t('emptyTitle')}</h2>
          <p className="mt-2 max-w-md text-body text-fg-muted">{t('emptyText')}</p>
          <ButtonLink href="/catalog" variant="secondary" className="mt-6">
            {t('title')}
          </ButtonLink>
        </div>
      ) : (
        <>
          {/* Keeps the outline in order: page title (h1), this list (h2), product names (h3). */}
          <h2 className="sr-only">{t('productsHeading')}</h2>
          {/* The reference's grid of white cards, fitted to how many there are (gridFor). */}
          <ul className={cn('mt-5 grid gap-2 sm:mt-6', grid.list)}>
            {items.map((product, index) => {
              const layout = grid.layout(index);
              return (
                <li key={product.id} className={grid.item(index)}>
                  <ProductCard
                    product={product}
                    priority={index < 4}
                    layout={layout}
                    sizes={
                      layout === 'feature'
                        ? '(min-width: 1024px) 26rem, 42vw'
                        : layout === 'lead'
                          ? '(min-width: 1024px) 48vw, 50vw'
                          : undefined
                    }
                  />
                </li>
              );
            })}
          </ul>
        </>
      )}
      <Pagination page={list.page} totalPages={list.totalPages} hrefFor={hrefFor} />
    </>
  );
}

/** A product's place in the pack order (TERAN's five first, the rest after, as they came). */
function packOrder(slug: string): number {
  const code = teaCodeOf(slug);
  return code ? COLLECTION_CODES.indexOf(code) : COLLECTION_CODES.length;
}

/** Toolbar and grid placeholders with the same footprint as the results. */
export function CatalogResultsSkeleton() {
  return (
    <div aria-hidden>
      <div className="mt-6 h-[3.875rem] border-y border-line sm:mt-8" />
      <ProductGridSkeleton count={8} className="mt-6 sm:mt-8" />
    </div>
  );
}
