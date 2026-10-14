'use client';

import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { inputClasses } from '@/components/ui/field';
import {
  parseCatalogFilters,
  toSearchParams,
  type CatalogFilters,
  type RawSearchParams,
} from '@/features/catalog/query';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { HiddenFilterInputs } from './hidden-filter-inputs';

/**
 * Price range in a popover. Built on <details>, so it opens and submits (as a GET form) even
 * without JavaScript; with it, Esc and a click outside close it and the URL is built client-side.
 */
export function PriceFilter({
  basePath,
  formAction,
  filters,
  summary,
  placeholders,
  chipClassName,
}: {
  basePath: string;
  formAction: string;
  filters: CatalogFilters;
  /** Chip text: "Price", or the active range. */
  summary: string;
  placeholders: { min: string; max: string };
  chipClassName: string;
}) {
  const t = useTranslations('Catalog');
  const router = useRouter();
  const id = useId();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = detailsRef.current;
    if (!details) return;
    const onPointerDown = (event: PointerEvent) => {
      if (details.open && event.target instanceof Node && !details.contains(event.target)) {
        details.open = false;
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !details.open) return;
      details.open = false;
      details.querySelector('summary')?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw: RawSearchParams = {};
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (typeof value === 'string' && value !== '') raw[key] = value;
    }
    const query = toSearchParams({ ...parseCatalogFilters(raw), page: 1 });
    if (detailsRef.current) detailsRef.current.open = false;
    router.push(query ? `${basePath}?${query}` : basePath, { scroll: false });
  }

  const active = filters.minPrice !== undefined || filters.maxPrice !== undefined;

  return (
    <details ref={detailsRef} className="group relative">
      <summary
        className={cn(
          chipClassName,
          'cursor-pointer list-none [&::-webkit-details-marker]:hidden',
          active
            ? 'border-brand bg-brand text-fg-inverse'
            : 'border-line-strong/45 bg-surface text-fg hover:border-brand/60',
        )}
      >
        {summary}
        {active ? <span className="sr-only">({t('filterApplied')})</span> : null}
        <ChevronDown
          aria-hidden
          className="h-4 w-4 transition-transform duration-150 group-open:rotate-180"
        />
      </summary>
      <div className="absolute top-full left-0 z-30 mt-2 w-[19rem] rounded-card border border-line bg-surface p-4 shadow-overlay motion-safe:animate-pop-in">
        <form action={formAction} method="get" onSubmit={apply}>
          <HiddenFilterInputs filters={filters} omitPrice />
          <fieldset>
            <legend className="text-label text-fg">{t('price')}</legend>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`${id}-min`} className="mb-1.5 block text-helper text-fg-muted">
                  {t('priceMinLabel')}
                </label>
                <input
                  id={`${id}-min`}
                  name="minPrice"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  defaultValue={filters.minPrice}
                  placeholder={placeholders.min}
                  className={inputClasses({ size: 'sm' })}
                />
              </div>
              <div>
                <label htmlFor={`${id}-max`} className="mb-1.5 block text-helper text-fg-muted">
                  {t('priceMaxLabel')}
                </label>
                <input
                  id={`${id}-max`}
                  name="maxPrice"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  defaultValue={filters.maxPrice}
                  placeholder={placeholders.max}
                  className={inputClasses({ size: 'sm' })}
                />
              </div>
            </div>
          </fieldset>
          <Button type="submit" size="sm" className="mt-4 w-full">
            {t('apply')}
          </Button>
        </form>
      </div>
    </details>
  );
}
