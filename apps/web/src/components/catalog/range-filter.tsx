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
 * A number attribute filter (e.g. net weight) as a popover with "from" and "to" fields. Like the
 * price filter it is a <details> element with a GET form, so it works without JavaScript.
 */
export function RangeFilter({
  basePath,
  formAction,
  filters,
  attributeKey,
  label,
  summary,
  placeholders,
  chipClassName,
}: {
  basePath: string;
  formAction: string;
  filters: CatalogFilters;
  attributeKey: string;
  label: string;
  /** Chip text: the label, or the active range. */
  summary: string;
  placeholders: { min: string; max: string };
  chipClassName: string;
}) {
  const t = useTranslations('Catalog');
  const router = useRouter();
  const id = useId();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [min = '', max = ''] = (filters.attributes[attributeKey]?.[0] ?? '').split('~');
  const active = Boolean(min || max);

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
          <HiddenFilterInputs filters={filters} omitAttribute={attributeKey} />
          <fieldset>
            <legend className="text-label text-fg">{label}</legend>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`${id}-min`} className="mb-1.5 block text-helper text-fg-muted">
                  {t('rangeFrom')}
                </label>
                <input
                  id={`${id}-min`}
                  name={`attrmin.${attributeKey}`}
                  inputMode="decimal"
                  autoComplete="off"
                  defaultValue={min}
                  placeholder={placeholders.min}
                  className={inputClasses({ size: 'sm' })}
                />
              </div>
              <div>
                <label htmlFor={`${id}-max`} className="mb-1.5 block text-helper text-fg-muted">
                  {t('rangeTo')}
                </label>
                <input
                  id={`${id}-max`}
                  name={`attrmax.${attributeKey}`}
                  inputMode="decimal"
                  autoComplete="off"
                  defaultValue={max}
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
