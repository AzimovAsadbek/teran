import { SearchX } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { ButtonLink } from '@/components/ui/button';
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
      <p role="alert" className="mt-10 rounded-2xl bg-danger-100 px-5 py-4 text-danger-700">
        {t('loadError')}
      </p>
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
        <div className="flex flex-col items-center py-20 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ivory-100 text-forest-900">
            <SearchX aria-hidden className="h-7 w-7" />
          </span>
          <h2 className="mt-5 font-display text-3xl font-semibold text-forest-900">
            {t('emptyTitle')}
          </h2>
          <p className="mt-2 max-w-md text-ink-700">{t('emptyText')}</p>
          <ButtonLink href="/catalog" variant="secondary" className="mt-6">
            {t('title')}
          </ButtonLink>
        </div>
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4">
          {list.items.map((product, index) => (
            <li key={product.id}>
              <ProductCard product={product} priority={index < 4} />
            </li>
          ))}
        </ul>
      )}
      <Pagination page={list.page} totalPages={list.totalPages} hrefFor={hrefFor} />
    </>
  );
}
