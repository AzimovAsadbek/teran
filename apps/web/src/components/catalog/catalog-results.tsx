import { SearchX } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { ButtonLink } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { ProductGridSkeleton } from '@/components/ui/skeleton';
import { getProductList } from '@/lib/data/catalog';
import {
  parseCatalogFilters,
  toApiQuery,
  toSearchParams,
  type RawSearchParams,
} from '@/features/catalog/query';
import { FilterBar } from './filter-bar';
import { Pagination } from './pagination';
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

  const extra: Record<string, string> = scope.q ? { q: scope.q } : {};
  const hrefFor = (page: number) => {
    const query = toSearchParams({ ...filters, page }, extra);
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <>
      <FilterBar basePath={basePath} filters={filters} facets={list.facets} total={list.total} />
      {list.items.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center sm:py-20">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-forest-900">
            <SearchX aria-hidden className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-display-sm text-forest-900">{t('emptyTitle')}</h2>
          <p className="mt-2 max-w-md text-body text-fg-muted">{t('emptyText')}</p>
          <ButtonLink href="/catalog" variant="secondary" className="mt-6">
            {t('title')}
          </ButtonLink>
        </div>
      ) : (
        <>
          {/* Keeps the outline in order: page title (h1), this list (h2), product names (h3). */}
          <h2 className="sr-only">{t('productsHeading')}</h2>
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:mt-8 sm:gap-x-6 sm:gap-y-12 md:grid-cols-3 xl:grid-cols-4">
            {list.items.map((product, index) => (
              <li key={product.id}>
                <ProductCard product={product} priority={index < 4} />
              </li>
            ))}
          </ul>
        </>
      )}
      <Pagination page={list.page} totalPages={list.totalPages} hrefFor={hrefFor} />
    </>
  );
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
