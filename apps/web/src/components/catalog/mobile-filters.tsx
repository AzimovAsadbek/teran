'use client';

import type { FacetsDto } from '@teran/contracts';
import { PRODUCT_SORTS } from '@teran/contracts/constants';
import { SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox, inputClasses, radioDotClasses } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';
import {
  parseCatalogFilters,
  toSearchParams,
  type CatalogFilters,
  type RawSearchParams,
} from '@/features/catalog/query';
import { useRouter } from '@/i18n/navigation';

/**
 * Filter drawer for phones and tablets: one GET form, so several choices are applied together with
 * a single "show results" action (and it still works if JavaScript fails to load).
 */
export function MobileFilters({
  basePath,
  formAction,
  filters,
  facets,
  total,
}: {
  basePath: string;
  /** Locale-prefixed URL used when the form is submitted natively (no JavaScript). */
  formAction: string;
  filters: CatalogFilters;
  facets: FacetsDto;
  total: number;
}) {
  const t = useTranslations('Catalog');
  const tc = useTranslations('Common');
  const formId = useId();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const activeCount =
    filters.format.length +
    (filters.inStock ? 1 : 0) +
    (filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0) +
    Object.keys(filters.attributes).length;

  // With JavaScript, build a clean URL (no empty or default values); without it the GET form still works.
  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw: RawSearchParams = {};
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (typeof value !== 'string' || value === '') continue;
      const existing = raw[key];
      raw[key] =
        existing === undefined
          ? value
          : [...(Array.isArray(existing) ? existing : [existing]), value];
    }
    const query = toSearchParams({ ...parseCatalogFilters(raw), page: 1 });
    setOpen(false);
    router.push(query ? `${basePath}?${query}` : basePath, { scroll: false });
  }

  return (
    <div className="lg:hidden">
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <SlidersHorizontal aria-hidden className="h-4 w-4" />
        {t('filters')}
        {activeCount > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-micro font-bold text-fg-inverse figures">
            {activeCount}
          </span>
        ) : null}
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        side="right"
        title={t('filterBy')}
        closeLabel={tc('close')}
        footer={
          <Button type="submit" form={formId} size="lg" className="w-full">
            {t('showResults', { count: total })}
          </Button>
        }
      >
        <form
          id={formId}
          action={formAction}
          method="get"
          onSubmit={(event) => applyFilters(event)}
          className="divide-y divide-line-subtle px-5 sm:px-6"
        >
          <Group legend={t('sort')}>
            {PRODUCT_SORTS.map((sort) => (
              <label
                key={sort}
                className="flex min-h-11 cursor-pointer items-center gap-3 text-body"
              >
                <input
                  type="radio"
                  name="sort"
                  value={sort}
                  defaultChecked={filters.sort === sort}
                  className={radioDotClasses}
                />
                {t(`sortOptions.${sort}`)}
              </label>
            ))}
          </Group>

          {facets.formats.length > 0 ? (
            <Group legend={t('format')}>
              {facets.formats.map(({ value, count }) => (
                <label
                  key={value}
                  className="flex min-h-11 cursor-pointer items-center gap-3 text-body"
                >
                  {/* Checkboxes submit repeated values; the catalogue parser accepts both forms. */}
                  <Checkbox
                    name="format"
                    value={value}
                    defaultChecked={filters.format.includes(value)}
                  />
                  <span className="flex-1">{t(`formats.${value}`)}</span>
                  <span className="text-body-sm text-fg-subtle">{count}</span>
                </label>
              ))}
            </Group>
          ) : null}

          <Group legend={t('price')}>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <label className="text-helper text-fg-muted">
                {t('priceMinLabel')}
                <input
                  name="minPrice"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  defaultValue={filters.minPrice}
                  placeholder={
                    facets.priceRange
                      ? String(Math.floor(Number(facets.priceRange.min)))
                      : undefined
                  }
                  className={inputClasses({ className: 'mt-1.5' })}
                />
              </label>
              <label className="text-helper text-fg-muted">
                {t('priceMaxLabel')}
                <input
                  name="maxPrice"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  defaultValue={filters.maxPrice}
                  placeholder={
                    facets.priceRange ? String(Math.ceil(Number(facets.priceRange.max))) : undefined
                  }
                  className={inputClasses({ className: 'mt-1.5' })}
                />
              </label>
            </div>
          </Group>

          {facets.attributes.map((facet) => {
            const selected = filters.attributes[facet.key] ?? [];
            if (facet.kind === 'NUMBER') {
              if (!facet.range) return null;
              const [min = '', max = ''] = (selected[0] ?? '').split('~');
              return (
                <Group
                  key={facet.key}
                  legend={facet.unit ? `${facet.label}, ${facet.unit}` : facet.label}
                >
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <label className="text-helper text-fg-muted">
                      {t('rangeFrom')}
                      <input
                        name={`attrmin.${facet.key}`}
                        inputMode="decimal"
                        autoComplete="off"
                        defaultValue={min}
                        placeholder={facet.range.min}
                        className={inputClasses({ className: 'mt-1.5' })}
                      />
                    </label>
                    <label className="text-helper text-fg-muted">
                      {t('rangeTo')}
                      <input
                        name={`attrmax.${facet.key}`}
                        inputMode="decimal"
                        autoComplete="off"
                        defaultValue={max}
                        placeholder={facet.range.max}
                        className={inputClasses({ className: 'mt-1.5' })}
                      />
                    </label>
                  </div>
                </Group>
              );
            }
            if (facet.kind === 'BOOLEAN') {
              const option = facet.options.find((entry) => entry.key === 'true');
              if (!option) return null;
              return (
                <div key={facet.key} className="py-5">
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body font-medium">
                    <Checkbox
                      name={`attr.${facet.key}`}
                      value="true"
                      defaultChecked={selected.includes('true')}
                    />
                    <span className="flex-1">{facet.label}</span>
                    <span className="text-body-sm font-normal text-fg-subtle">{option.count}</span>
                  </label>
                </div>
              );
            }
            return (
              <Group key={facet.key} legend={facet.label}>
                {facet.options.map((option) => (
                  <label
                    key={option.key}
                    className="flex min-h-11 cursor-pointer items-center gap-3 text-body"
                  >
                    <Checkbox
                      name={`attr.${facet.key}`}
                      value={option.key}
                      defaultChecked={selected.includes(option.key)}
                    />
                    <span className="flex-1">{option.label}</span>
                    <span className="text-body-sm text-fg-subtle">{option.count}</span>
                  </label>
                ))}
              </Group>
            );
          })}

          <div className="py-5">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body font-medium">
              <Checkbox name="inStock" value="true" defaultChecked={filters.inStock} />
              {t('inStockOnly')}
            </label>
          </div>
        </form>
      </Sheet>
    </div>
  );
}

function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="py-5">
      <legend className="float-left mb-2 w-full text-label text-fg">{legend}</legend>
      <div className="clear-left">{children}</div>
    </fieldset>
  );
}
