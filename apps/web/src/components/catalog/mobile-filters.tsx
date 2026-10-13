'use client';

import { PRODUCT_SORTS, type FacetsDto } from '@teran/contracts';
import { SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { Sheet } from '@/components/ui/sheet';
import {
  parseCatalogFilters,
  toSearchParams,
  type CatalogFilters,
  type RawSearchParams,
} from '@/features/catalog/query';
import { useRouter } from '@/i18n/navigation';

/**
 * Mobile filter sheet: one GET form, so several choices are applied together with a single
 * "show results" action (and it still works if JavaScript fails to load).
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
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const activeCount =
    filters.format.length + (filters.inStock ? 1 : 0) + (filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0);

  // With JavaScript, build a clean URL (no empty or default values); without it the GET form still works.
  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw: RawSearchParams = {};
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (typeof value !== 'string' || value === '') continue;
      const existing = raw[key];
      raw[key] = existing === undefined ? value : [...(Array.isArray(existing) ? existing : [existing]), value];
    }
    const query = toSearchParams({ ...parseCatalogFilters(raw), page: 1 });
    setOpen(false);
    router.push(query ? `${basePath}?${query}` : basePath, { scroll: false });
  }

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-2 rounded-full border border-forest-900/25 px-4 text-sm font-semibold text-forest-900"
      >
        <SlidersHorizontal aria-hidden className="h-4 w-4" />
        {t('filters')}
        {activeCount > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-forest-900 px-1 text-[0.7rem] text-ivory-50">
            {activeCount}
          </span>
        ) : null}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} side="left" title={t('filterBy')} closeLabel={tc('close')}>
        <form action={formAction} method="get" className="flex h-full flex-col" onSubmit={(event) => applyFilters(event)}>
          <div className="flex-1 space-y-8 px-5 py-6">
            <fieldset>
              <legend className="text-eyebrow text-gold-700">{t('format')}</legend>
              <FormatCheckboxes facets={facets} selected={filters.format} />
            </fieldset>

            <fieldset>
              <legend className="text-eyebrow text-gold-700">{t('price')}</legend>
              <div className="mt-3 flex items-center gap-2">
                <label className="flex-1 text-sm text-ink-700">
                  {t('minPrice')}
                  <input name="minPrice" inputMode="numeric" pattern="[0-9]*" defaultValue={filters.minPrice} className="mt-1 h-12 w-full rounded-xl border border-sage-500 bg-white px-3" />
                </label>
                <label className="flex-1 text-sm text-ink-700">
                  {t('maxPrice')}
                  <input name="maxPrice" inputMode="numeric" pattern="[0-9]*" defaultValue={filters.maxPrice} className="mt-1 h-12 w-full rounded-xl border border-sage-500 bg-white px-3" />
                </label>
              </div>
            </fieldset>

            <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-ink-900">
              <input type="checkbox" name="inStock" value="true" defaultChecked={filters.inStock} className="h-5 w-5 accent-forest-900" />
              {t('inStockOnly')}
            </label>

            <fieldset>
              <legend className="text-eyebrow text-gold-700">{t('sort')}</legend>
              <div className="mt-3 space-y-1">
                {PRODUCT_SORTS.map((sort) => (
                  <label key={sort} className="flex min-h-11 items-center gap-3 text-sm text-ink-900">
                    <input type="radio" name="sort" value={sort} defaultChecked={filters.sort === sort} className="h-5 w-5 accent-forest-900" />
                    {t(`sortOptions.${sort}`)}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="sticky bottom-0 border-t border-ivory-200 bg-ivory-50 px-5 py-4">
            <button type="submit" className="h-12 w-full rounded-full bg-forest-900 text-sm font-semibold text-ivory-50">
              {t('showResults', { count: total })}
            </button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}

/**
 * The URL carries formats as one comma-separated value; checkboxes submit repeated values,
 * which the catalogue parser accepts as well (it normalises both forms).
 */
function FormatCheckboxes({ facets, selected }: { facets: FacetsDto; selected: string[] }) {
  const t = useTranslations('Catalog');
  return (
    <div className="mt-3 space-y-1">
      {facets.formats.map(({ value, count }) => (
        <label key={value} className="flex min-h-11 items-center gap-3 text-sm text-ink-900">
          <input type="checkbox" name="format" value={value} defaultChecked={selected.includes(value)} className="h-5 w-5 accent-forest-900" />
          <span className="flex-1">{t(`formats.${value}`)}</span>
          <span className="text-xs text-ink-500">{count}</span>
        </label>
      ))}
    </div>
  );
}
