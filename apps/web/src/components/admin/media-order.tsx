'use client';

import type { MediaKind } from '@teran/contracts';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { iconButtonClasses } from '@/components/ui/button';
import { apiRequest } from '@/lib/api/client';
import { cn } from '@/lib/cn';
import { table } from './table';
import { useAdminAction } from './use-admin-action';

/**
 * Moves one photograph or film a place earlier or later among its own kind (the order the
 * storefront shows; photographs and films are ordered separately).
 */
export function MediaOrder({
  kind,
  ids,
  index,
}: {
  kind: MediaKind;
  ids: string[];
  index: number;
}) {
  const t = useTranslations('Admin');
  const action = useAdminAction();

  async function move(step: -1 | 1) {
    const order = [...ids];
    const current = order[index];
    const swap = order[index + step];
    if (current === undefined || swap === undefined) return;
    order[index] = swap;
    order[index + step] = current;
    await action.run(() =>
      apiRequest('/admin/media/order', { method: 'PUT', body: { kind, ids: order } }),
    );
  }

  return (
    <span className={cn('inline-flex flex-col items-end gap-1', table.above)}>
      <span className="flex">
        <button
          type="button"
          onClick={() => void move(-1)}
          disabled={index === 0 || action.pending}
          className={iconButtonClasses('ghost', 'sm')}
          aria-label={t('media.moveUp')}
        >
          <ArrowUp aria-hidden className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => void move(1)}
          disabled={index === ids.length - 1 || action.pending}
          className={iconButtonClasses('ghost', 'sm')}
          aria-label={t('media.moveDown')}
        >
          <ArrowDown aria-hidden className="h-4 w-4" />
        </button>
      </span>
      {action.error ? (
        <span role="alert" className="text-helper text-danger">
          {action.error}
        </span>
      ) : null}
    </span>
  );
}
