'use client';

import type { ProductSort } from '@teran/contracts/constants';
import { useTranslations } from 'next-intl';
import { useId, useTransition } from 'react';
import { SelectChevron } from '@/components/ui/field';
import { usePathname, useRouter } from '@/i18n/navigation';
import { VISIBLE_SORTS } from '@/features/catalog/sorts';
import { SORT_SELECT } from './filter-styles';

/** Sort control; changing it rewrites the URL (and resets pagination) without a full reload. */
export function SortSelect({ value, query }: { value: ProductSort; query: string }) {
  const t = useTranslations('Catalog');
  const id = useId();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    // Phones sort from the filter drawer, which keeps the toolbar on one line.
    <div className="hidden min-w-0 items-center gap-2 sm:flex">
      <label htmlFor={id} className="sr-only">
        {t('sort')}
      </label>
      <div className="relative min-w-0">
        <select
          id={id}
          value={value}
          aria-busy={pending || undefined}
          onChange={(event) => {
            const params = new URLSearchParams(query);
            params.delete('page');
            if (event.target.value === 'featured') params.delete('sort');
            else params.set('sort', event.target.value);
            params.sort();
            const search = params.toString();
            startTransition(() => {
              router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
            });
          }}
          className={SORT_SELECT}
        >
          {VISIBLE_SORTS.map((sort) => (
            <option key={sort} value={sort}>
              {t(`sortOptions.${sort}`)}
            </option>
          ))}
        </select>
        <SelectChevron />
      </div>
    </div>
  );
}
