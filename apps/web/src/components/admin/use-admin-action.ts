'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api/errors';
import { useApiErrorMessage } from '@/lib/use-api-error-message';

/**
 * Runs an admin mutation, refreshes the server-rendered page on success and turns failures into a
 * readable message (conflicts get their own explanation).
 */
export function useAdminAction() {
  const t = useTranslations('Admin');
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const apiMessage = useApiErrorMessage(error);

  async function run(action: () => Promise<unknown>): Promise<boolean> {
    setPending(true);
    setError(null);
    try {
      await action();
      router.refresh();
      return true;
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, null));
      return false;
    } finally {
      setPending(false);
    }
  }

  const message =
    error === null
      ? null
      : error.code === 'CONFLICT'
        ? t('common.conflict')
        : error.code === 'INSUFFICIENT_STOCK'
          ? t('inventory.insufficient')
          : apiMessage;

  return { run, pending, error: message, clearError: () => setError(null) };
}
