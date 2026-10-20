import { Leaf, SearchX } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { ButtonLink } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { ProductGridSkeleton } from '@/components/ui/skeleton';
import { getProductList } from '@/lib/data/catalog';
import {
  hasRefinements,
  parseCatalogFilters,
  toApiQuery,
  toSearchParams,
  type RawSearchParams,
} from '@/features/catalog/query';
import { FilterBar } from './filter-bar';
import { Pagination } from './pagination';
import { cn } from '@/lib/cn';
import { COLLECTION_CODES, PREMIUM_COLLECTION_SLUG, teaCodeOf } from '@/content/brand';
import { ProductCard } from './product-card';

const PAGE_SIZE = 24;

/** Filter bar, product grid and pagination for any listing (all teas, category, collection, search). */
export async function CatalogResults({
  basePath,
  scope,
  searchParams,
}: {
  basePath: string;
  scope: { category?: string; collection?: string; q?: string };
  searchParams: Promise<RawSearchParams>;
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

  return (
    <>
      {awaitingProducts ? null : (
        <FilterBar basePath={basePath} filters={filters} facets={list.facets} total={list.total} />
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

type CardLayout = 'card' | 'feature' | 'feature-phone' | 'lead';

/**
 * The grid fitted to the number of products when the listing fits on one page, so its last row is
 * never one card alone and a small listing is not a half-empty wall: one or two products as wide
 * feature cards; three or six in rows of three; four as two by two on a tablet; five across from
 * 1024 px; a longer list that would leave one card alone opens on a lead card two columns by two
 * rows; on a phone an odd last card spans both columns, lying down. Longer, paged lists keep
 * four across.
 */
function gridFor(count: number, onePage: boolean) {
  const card = (): CardLayout => 'card';
  const none = () => undefined;
  if (!onePage) {
    return { list: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4', layout: card, item: none };
  }
  const lastAlone = (index: number) => count % 2 === 1 && count > 2 && index === count - 1;
  const phoneLast = (index: number): CardLayout => (lastAlone(index) ? 'feature-phone' : 'card');
  const spanPhone = (index: number) => (lastAlone(index) ? 'max-md:col-span-2' : undefined);
  if (count <= 2) {
    return {
      list: count === 1 ? 'grid-cols-1 max-w-[60rem]' : 'grid-cols-1 gap-3 lg:grid-cols-2',
      layout: (): CardLayout => 'feature',
      item: none,
    };
  }
  if (count === 3 || count === 6) {
    return { list: 'grid-cols-2 md:grid-cols-3', layout: phoneLast, item: spanPhone };
  }
  if (count === 4) return { list: 'grid-cols-2 lg:grid-cols-4', layout: card, item: none };
  if (count === 5) {
    return {
      list: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
      layout: phoneLast,
      item: spanPhone,
    };
  }
  const lead = count % 4 === 1;
  return {
    list: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    layout: (index: number): CardLayout => (lead && index === 0 ? 'lead' : phoneLast(index)),
    item: (index: number) =>
      cn(lead && index === 0 && 'lg:col-span-2 lg:row-span-2', spanPhone(index)),
  };
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
