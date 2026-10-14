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
import { MobileFilters } from './mobile-filters';
import { PriceFilter } from './price-filter';
import { RangeFilter } from './range-filter';
import { SortSelect } from './sort-select';

const CHIP =
  'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-body-sm font-medium whitespace-nowrap transition-colors duration-150';
const CHIP_OFF = 'border-line-strong/45 bg-surface text-fg hover:border-brand/60';
const CHIP_ON = 'border-brand bg-brand text-fg-inverse';

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
    ...(priceLabel
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
      <div className="flex items-center gap-x-3 gap-y-2 border-y border-line py-3">
        <div className="hidden min-w-0 flex-1 flex-wrap items-center gap-2 lg:flex">
          {facets.formats.map(({ value, count }) => {
            const on = filters.format.includes(value);
            return (
              <Link
                key={value}
                href={href(toggleFormat(filters, value))}
                rel="nofollow"
                scroll={false}
                className={cn(CHIP, on ? CHIP_ON : CHIP_OFF)}
              >
                {on ? <Check aria-hidden className="-ml-0.5 h-4 w-4" /> : null}
                {t(`formats.${value as ProductFormat}`)}
                {/* Links cannot be "pressed"; the state is part of the accessible name instead. */}
                {on ? <span className="sr-only">({t('filterApplied')})</span> : null}
                <span className={cn('text-caption', on ? 'text-ivory-100/75' : 'text-fg-subtle')}>
                  {count}
                </span>
              </Link>
            );
          })}
          <span aria-hidden className="mx-1 h-6 w-px bg-line" />
          <Link
            href={href({ ...filters, inStock: !filters.inStock, page: 1 })}
            rel="nofollow"
            scroll={false}
            className={cn(CHIP, filters.inStock ? CHIP_ON : CHIP_OFF)}
          >
            {filters.inStock ? <Check aria-hidden className="-ml-0.5 h-4 w-4" /> : null}
            {t('inStockOnly')}
            {filters.inStock ? <span className="sr-only">({t('filterApplied')})</span> : null}
          </Link>
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
          {facets.attributes.map((facet) => (
            <AttributeChips
              key={facet.key}
              facet={facet}
              filters={filters}
              basePath={basePath}
              formAction={formAction}
              href={href}
              yes={t('yes')}
            />
          ))}
        </div>

        <MobileFilters
          basePath={basePath}
          formAction={formAction}
          filters={filters}
          facets={facets}
          total={total}
        />
        <p className="ml-auto text-body-sm whitespace-nowrap text-fg-muted" aria-live="polite">
          {t('results', { count: total })}
        </p>
        <SortSelect value={filters.sort} query={toSearchParams(filters)} />
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
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-brand-soft pr-2 pl-3 text-body-sm font-medium text-forest-900 transition-colors hover:bg-sage-200"
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
 * The filter of one product attribute in the desktop bar: chips for choices and yes/no
 * attributes, a range popover for numbers. Counts come from the API for the current listing.
 */
function AttributeChips({
  facet,
  filters,
  basePath,
  formAction,
  href,
  yes,
}: {
  facet: AttributeFacetDto;
  filters: CatalogFilters;
  basePath: string;
  formAction: string;
  href: (next: CatalogFilters) => string;
  yes: string;
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
        className={cn(CHIP, on ? CHIP_ON : CHIP_OFF)}
      >
        {on ? <Check aria-hidden className="-ml-0.5 h-4 w-4" /> : null}
        {facet.label}
        <span className="sr-only">: {yes}</span>
        <span className={cn('text-caption', on ? 'text-ivory-100/75' : 'text-fg-subtle')}>
          {option.count}
        </span>
      </Link>
    );
  }
  return (
    <span role="group" aria-label={facet.label} className="flex flex-wrap items-center gap-2">
      <span aria-hidden className="mx-1 h-6 w-px bg-line" />
      <span className="text-caption font-semibold text-fg-subtle">{facet.label}</span>
      {facet.options.map((option) => {
        const on = selected.includes(option.key);
        return (
          <Link
            key={option.key}
            href={href(toggleAttribute(filters, facet.key, option.key))}
            rel="nofollow"
            scroll={false}
            className={cn(CHIP, on ? CHIP_ON : CHIP_OFF)}
          >
            {on ? <Check aria-hidden className="-ml-0.5 h-4 w-4" /> : null}
            {option.label}
            <span className={cn('text-caption', on ? 'text-ivory-100/75' : 'text-fg-subtle')}>
              {option.count}
            </span>
          </Link>
        );
      })}
    </span>
  );
}
