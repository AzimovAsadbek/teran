'use client';

import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, ButtonLink } from '@/components/ui/button';

/** Route-level error boundary: a friendly message, never the error details. */
export default function StoreError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('Errors');
  const tc = useTranslations('Common');
  return (
    <div className="container-page flex flex-col items-center py-24 text-center" role="alert">
      {/* A streamed error keeps the 200 status, so keep the error UI out of search indexes. */}
      <meta name="robots" content="noindex" />
      <h1 className="text-display-lg text-forest-900">{t('serverTitle')}</h1>
      <p className="mt-4 max-w-md text-lg text-ink-700">{t('serverText')}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>
          <RotateCcw aria-hidden className="h-4 w-4" />
          {tc('retry')}
        </Button>
        <ButtonLink href="/" variant="secondary">
          {t('backHome')}
        </ButtonLink>
      </div>
    </div>
  );
}
