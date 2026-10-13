'use client';

import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

/** Error boundary for admin pages: keeps the admin navigation and offers a retry, never details. */
export default function AdminError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations('Errors');
  const tc = useTranslations('Common');
  return (
    <div
      role="alert"
      className="rounded-[var(--radius-card)] bg-white px-6 py-12 text-center shadow-soft"
    >
      <h1 className="text-display-md text-forest-900">{t('serverTitle')}</h1>
      <p className="mx-auto mt-3 max-w-md text-ink-700">{t('serverText')}</p>
      <Button className="mt-6" onClick={retry}>
        <RotateCcw aria-hidden className="h-4 w-4" />
        {tc('retry')}
      </Button>
    </div>
  );
}
