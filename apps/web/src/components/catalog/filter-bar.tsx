import type { FacetsDto, ProductFormat } from '@teran/contracts';
import { Check, X } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link, getPathname } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { toSearchParams, toggleFormat, type CatalogFilters } from '@/features/catalog/query';
import { MobileFilters } from './mobile-filters';
import { SortSelect } from './sort-select';

const chip =
  'inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors';

/**
 * Desktop filters are plain links and a GET form, so filtering works without JavaScript and every
 * state has a shareable URL. `rel="nofollow"` keeps crawlers out of filter combinations.
 */
export async function FilterBar({
  basePath,
  filters,
  facets,
  total,
}: {
  basePath: string;
  filters: CatalogFilters;
  facets: FacetsDto;
  total: number;
}) {
  const [t, locale] = await Promise.all([getTranslations('Catalog'), getLocale()]);
  // Native form submissions need the locale prefix (links get it from <Link>).
  const formAction = getPathname({ href: basePath, locale });
  const href = (next: CatalogFilters) => {
    const query = toSearchParams(next);
    return query ? `${basePath}?${query}` : basePath;
  };
  const currentQuery = toSearchParams(filters);
  const refined =
    filters.format.length > 0 ||
    filters.inStock ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined;

  return (
    <div className="flex flex-col gap-4 border-y border-ivory-200 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="hidden flex-wrap items-center gap-2 lg:flex">
        {facets.formats.map(({ value, count }) => {
          const active = filters.format.includes(value);
          return (
            <Link
              key={value}
              href={href(toggleFormat(filters, value))}
              rel="nofollow"
              scroll={false}
              className={cn(
                chip,
                active
                  ? 'border-forest-900 bg-forest-900 text-ivory-50'
                  : 'border-ivory-300 bg-white text-forest-900 hover:border-forest-900/40',
              )}
            >
              {active ? <Check aria-hidden className="h-4 w-4" /> : null}
              {t(`formats.${value as ProductFormat}`)}
              {/* Links cannot be "pressed"; the state is part of the accessible name instead. */}
              {active ? <span className="sr-only">({t('filterApplied')})</span> : null}
              <span className={cn('text-xs', active ? 'text-ivory-100/80' : 'text-ink-500')}>
                {count}
              </span>
            </Link>
          );
        })}
        <Link
          href={href({ ...filters, inStock: !filters.inStock, page: 1 })}
          rel="nofollow"
          scroll={false}
          className={cn(
            chip,
            filters.inStock
              ? 'border-forest-900 bg-forest-900 text-ivory-50'
              : 'border-ivory-300 bg-white text-forest-900 hover:border-forest-900/40',
          )}
        >
          {filters.inStock ? <Check aria-hidden className="h-4 w-4" /> : null}
          {t('inStockOnly')}
          {filters.inStock ? <span className="sr-only">({t('filterApplied')})</span> : null}
        </Link>
        <form action={formAction} method="get" className="flex items-center gap-1.5">
          {filters.format.length > 0 ? (
            <input type="hidden" name="format" value={[...filters.format].sort().join(',')} />
          ) : null}
          {filters.inStock ? <input type="hidden" name="inStock" value="true" /> : null}
          {filters.sort !== 'featured' ? (
            <input type="hidden" name="sort" value={filters.sort} />
          ) : null}
          <span className="pl-2 text-sm text-ink-700">{t('price')}</span>
          <label className="sr-only" htmlFor="filter-min-price">
            {t('price')} — {t('minPrice')}
          </label>
          <input
            id="filter-min-price"
            name="minPrice"
            inputMode="numeric"
            pattern="[0-9]*"
            defaultValue={filters.minPrice}
            placeholder={
              facets.priceRange ? String(Math.floor(Number(facets.priceRange.min))) : t('minPrice')
            }
            className="h-10 w-28 rounded-full border border-ivory-300 bg-white px-3 text-sm"
          />
          <span aria-hidden className="text-ink-500">
            –
          </span>
          <label className="sr-only" htmlFor="filter-max-price">
            {t('price')} — {t('maxPrice')}
          </label>
          <input
            id="filter-max-price"
            name="maxPrice"
            inputMode="numeric"
            pattern="[0-9]*"
            defaultValue={filters.maxPrice}
            placeholder={
              facets.priceRange ? String(Math.ceil(Number(facets.priceRange.max))) : t('maxPrice')
            }
            className="h-10 w-28 rounded-full border border-ivory-300 bg-white px-3 text-sm"
          />
          <button
            type="submit"
            className="h-10 rounded-full bg-forest-900 px-4 text-sm font-semibold text-ivory-50 hover:bg-forest-800"
          >
            {t('apply')}
          </button>
        </form>
        {refined ? (
          <Link
            href={href({
              ...filters,
              format: [],
              inStock: false,
              minPrice: undefined,
              maxPrice: undefined,
              page: 1,
            })}
            rel="nofollow"
            className="inline-flex h-10 items-center gap-1 rounded-full px-3 text-sm font-semibold text-danger-700 hover:bg-danger-100"
          >
            <X aria-hidden className="h-4 w-4" />
            {t('clearFilters')}
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 lg:justify-end">
        <MobileFilters
          basePath={basePath}
          formAction={formAction}
          filters={filters}
          facets={facets}
          total={total}
        />
        <p className="text-sm whitespace-nowrap text-ink-700" aria-live="polite">
          {t('results', { count: total })}
        </p>
        <SortSelect value={filters.sort} query={currentQuery} />
      </div>
    </div>
  );
}
