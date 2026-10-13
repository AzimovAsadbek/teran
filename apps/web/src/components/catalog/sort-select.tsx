'use client';

import { PRODUCT_SORTS, type ProductSort } from '@teran/contracts';
import { useTranslations } from 'next-intl';
import { useId, useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';

/** Sort control; changing it rewrites the URL (and resets pagination) without a full reload. */
export function SortSelect({ value, query }: { value: ProductSort; query: string }) {
  const t = useTranslations('Catalog');
  const id = useId();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm text-ink-700">
        {t('sort')}
      </label>
      <select
        id={id}
        value={value}
        disabled={pending}
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
        className="h-11 rounded-full border border-sage-500 bg-white px-4 pr-9 text-sm font-medium text-forest-900"
      >
        {PRODUCT_SORTS.map((sort) => (
          <option key={sort} value={sort}>
            {t(`sortOptions.${sort}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
