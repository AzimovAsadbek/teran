import type { AttributeFacetDto, FacetsDto, ProductFormat } from '@teran/contracts';
import { Check, X } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link, getPathname } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/format';
import {
  toSearchParams,
  toggleAttribute,
  toggleFormat,
  withAttribute,
  type CatalogFilters,
} from '@/features/catalog/query';
import { FilterDropdown } from './filter-dropdown';
import {
  FILTER_BUTTON,
  FILTER_BUTTON_ON,
  FILTER_OPTION,
  FILTER_POPOVER_BUTTON,
} from './filter-styles';
import { MobileFilters } from './mobile-filters';
import { PriceFilter } from './price-filter';
import { RangeFilter } from './range-filter';
import { SortSelect } from './sort-select';
import { showPrices } from '@/lib/site';

const CHIP = FILTER_POPOVER_BUTTON;

/** The checkbox square of a dropdown choice. */
function Box({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded-[0.1875rem] border',
        on ? 'border-forest-900 bg-forest-900 text-ivory-50' : 'border-ink-500/70 bg-surface',
      )}
    >
      {on ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
    </span>
  );
}

/**
 * Listing toolbar. Desktop filters are links and GET forms, so filtering works without JavaScript
 * and every state has a shareable URL; `rel="nofollow"` keeps crawlers out of filter combinations.
 * Phones get one "Filters" drawer. Active filters are listed under the bar on every screen size,
 * each with its own remove link.
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
  const [t, tc, locale] = await Promise.all([
    getTranslations('Catalog'),
    getTranslations('Common'),
    getLocale(),
  ]);
  // Native form submissions need the locale prefix (links get it from <Link>).
  const formAction = getPathname({ href: basePath, locale });
  const href = (next: CatalogFilters) => {
    const query = toSearchParams(next);
    return query ? `${basePath}?${query}` : basePath;
  };
  const currency = tc('currency.UZS');
  const money = (value: number) => formatMoney(String(value), locale, currency);
  const { minPrice, maxPrice } = filters;
  const priceLabel =
    minPrice !== undefined && maxPrice !== undefined
      ? t('priceChipRange', { min: money(minPrice), max: money(maxPrice) })
      : minPrice !== undefined
        ? t('priceChipMin', { min: money(minPrice) })
        : maxPrice !== undefined
          ? t('priceChipMax', { max: money(maxPrice) })
          : null;

  const optionLabel = (facet: AttributeFacetDto | undefined, value: string) => {
    if (facet?.kind === 'BOOLEAN') return value === 'true' ? t('yes') : t('no');
    return facet?.options.find((option) => option.key === value)?.label ?? value;
  };
  const rangeLabel = (facet: AttributeFacetDto | undefined, value: string) => {
    const [min = '', max = ''] = value.split('~');
    const unit = facet?.unit ? ` ${facet.unit}` : '';
    if (min && max) return `${min}–${max}${unit}`;
    return min ? `≥ ${min}${unit}` : `≤ ${max}${unit}`;
  };
  const facetFor = (key: string) => facets.attributes.find((facet) => facet.key === key);
  const attributeChips = Object.entries(filters.attributes).flatMap(([key, values]) => {
    const facet = facetFor(key);
    const label = facet?.label ?? key;
    if (facet?.kind === 'NUMBER' || values.some((value) => value.includes('~'))) {
      return [
        {
          key: `attr-${key}`,
          label: t('rangeChip', { label, range: rangeLabel(facet, values[0] ?? '') }),
          href: href(withAttribute(filters, key, [])),
        },
      ];
    }
    return values.map((value) => ({
      key: `attr-${key}-${value}`,
      label: `${label}: ${optionLabel(facet, value)}`,
      href: href(toggleAttribute(filters, key, value)),
    }));
  });

  const active = [
    ...filters.format.map((format) => ({
      key: `format-${format}`,
      label: t(`formats.${format}`),
      href: href(toggleFormat(filters, format)),
    })),
    ...(filters.inStock
      ? [
          {
            key: 'inStock',
            label: t('inStockOnly'),
            href: href({ ...filters, inStock: false, page: 1 }),
          },
        ]
      : []),
    ...(showPrices && priceLabel
      ? [
          {
            key: 'price',
            label: priceLabel,
            href: href({ ...filters, minPrice: undefined, maxPrice: undefined, page: 1 }),
          },
        ]
      : []),
    ...attributeChips,
  ];
  const clearAll = href({
    ...filters,
    format: [],
    inStock: false,
    minPrice: undefined,
    maxPrice: undefined,
    attributes: {},
    page: 1,
  });

  return (
    <div className="mt-6 sm:mt-8">
      <div className="flex items-center gap-x-3 gap-y-2">
        <div className="hidden min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-3 lg:flex">
          {facets.formats.length > 0 ? (
            <FilterDropdown
              label={t('format')}
              selectedCount={filters.format.length}
              appliedLabel={t('filterApplied')}
            >
              <ul>
                {facets.formats.map(({ value, count }) => {
                  const on = filters.format.includes(value);
                  return (
                    <li key={value}>
                      <Link
                        href={href(toggleFormat(filters, value))}
                        rel="nofollow"
                        scroll={false}
                        aria-current={on ? 'true' : undefined}
                        className={FILTER_OPTION}
                      >
                        <Box on={on} />
                        <span className="flex-1">{t(`formats.${value as ProductFormat}`)}</span>
                        {on ? <span className="sr-only">({t('filterApplied')})</span> : null}
                        <span className="text-caption text-fg-subtle">{count}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </FilterDropdown>
          ) : null}
          {facets.attributes.map((facet) => (
            <AttributeFilter
              key={facet.key}
              facet={facet}
              filters={filters}
              basePath={basePath}
              formAction={formAction}
              href={href}
              yes={t('yes')}
              applied={t('filterApplied')}
            />
          ))}
          {showPrices ? (
            <PriceFilter
              basePath={basePath}
              formAction={formAction}
              filters={filters}
              summary={priceLabel ?? t('price')}
              placeholders={{
                min: facets.priceRange
                  ? String(Math.floor(Number(facets.priceRange.min)))
                  : t('minPrice'),
                max: facets.priceRange
                  ? String(Math.ceil(Number(facets.priceRange.max)))
                  : t('maxPrice'),
              }}
              chipClassName={CHIP}
            />
          ) : null}
          <Link
            href={href({ ...filters, inStock: !filters.inStock, page: 1 })}
            rel="nofollow"
            scroll={false}
            className={filters.inStock ? FILTER_BUTTON_ON : FILTER_BUTTON}
          >
            <Box on={filters.inStock} />
            {t('inStockOnly')}
            {filters.inStock ? <span className="sr-only">({t('filterApplied')})</span> : null}
          </Link>
        </div>

        <MobileFilters
          basePath={basePath}
          formAction={formAction}
          filters={filters}
          facets={facets}
          total={total}
        />
        <p
          className="ml-auto text-[0.875rem] whitespace-nowrap text-fg-muted lg:self-start lg:pt-2.5"
          aria-live="polite"
        >
          {t('results', { count: total })}
        </p>
        <div className="lg:self-start">
          <SortSelect value={filters.sort} query={toSearchParams(filters)} />
        </div>
      </div>

      {active.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 pt-3">
          <h2 className="sr-only">{t('activeFilters')}</h2>
          <ul className="flex flex-wrap items-center gap-2">
            {active.map((filter) => (
              <li key={filter.key}>
                <Link
                  href={filter.href}
                  rel="nofollow"
                  scroll={false}
                  aria-label={t('removeFilter', { label: filter.label })}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-brand-soft pr-2 pl-3 text-body-sm font-medium text-fg transition-colors hover:bg-sage-200"
                >
                  {filter.label}
                  <X aria-hidden className="h-3.5 w-3.5" />
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={clearAll}
            rel="nofollow"
            scroll={false}
            className="ml-1 text-body-sm font-semibold text-brand underline decoration-brand/40 underline-offset-4 hover:decoration-brand"
          >
            {t('clearFilters')}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The filter of one product attribute in the desktop bar: a dropdown of choices (with their
 * counts for the current listing), a toggle for yes/no attributes, a range popover for numbers.
 */
function AttributeFilter({
  facet,
  filters,
  basePath,
  formAction,
  href,
  yes,
  applied,
}: {
  facet: AttributeFacetDto;
  filters: CatalogFilters;
  basePath: string;
  formAction: string;
  href: (next: CatalogFilters) => string;
  yes: string;
  applied: string;
}) {
  const selected = filters.attributes[facet.key] ?? [];
  if (facet.kind === 'NUMBER') {
    if (!facet.range) return null;
    const [min = '', max = ''] = (selected[0] ?? '').split('~');
    const unit = facet.unit ? ` ${facet.unit}` : '';
    const summary =
      min || max
        ? `${facet.label}: ${min || facet.range.min}–${max || facet.range.max}${unit}`
        : facet.label;
    return (
      <RangeFilter
        basePath={basePath}
        formAction={formAction}
        filters={filters}
        attributeKey={facet.key}
        label={facet.unit ? `${facet.label}, ${facet.unit}` : facet.label}
        summary={summary}
        placeholders={{ min: facet.range.min, max: facet.range.max }}
        chipClassName={CHIP}
      />
    );
  }
  if (facet.kind === 'BOOLEAN') {
    const option = facet.options.find((entry) => entry.key === 'true');
    if (!option) return null;
    const on = selected.includes('true');
    return (
      <Link
        href={href(withAttribute(filters, facet.key, on ? [] : ['true']))}
        rel="nofollow"
        scroll={false}
        className={on ? FILTER_BUTTON_ON : FILTER_BUTTON}
      >
        <Box on={on} />
        {facet.label}
        <span className="sr-only">: {yes}</span>
        {on ? <span className="sr-only">({applied})</span> : null}
        <span className="text-caption text-fg-subtle">{option.count}</span>
      </Link>
    );
  }
  if (facet.options.length === 0) return null;
  return (
    <FilterDropdown label={facet.label} selectedCount={selected.length} appliedLabel={applied}>
      <ul>
        {facet.options.map((option) => {
          const on = selected.includes(option.key);
          return (
            <li key={option.key}>
              <Link
                href={href(toggleAttribute(filters, facet.key, option.key))}
                rel="nofollow"
                scroll={false}
                aria-current={on ? 'true' : undefined}
                className={FILTER_OPTION}
              >
                <Box on={on} />
                <span className="flex-1">{option.label}</span>
                {on ? <span className="sr-only">({applied})</span> : null}
                <span className="text-caption text-fg-subtle">{option.count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </FilterDropdown>
  );
}
