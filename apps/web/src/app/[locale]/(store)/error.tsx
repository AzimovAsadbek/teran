'use client';

import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { StateMessage } from '@/components/ui/state-message';

/** Route-level error boundary: a friendly message, never the error details. */
export default function StoreError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations('Errors');
  const tc = useTranslations('Common');
  return (
    <div role="alert">
      {/* A streamed error keeps the 200 status, so keep the error UI out of search indexes. */}
      <meta name="robots" content="noindex" />
      <StateMessage
        title={t('serverTitle')}
        text={t('serverText')}
        primary={
          <Button onClick={retry} size="lg">
            <RotateCcw aria-hidden className="h-4 w-4" />
            {tc('retry')}
          </Button>
        }
        secondary={{ href: '/', label: t('backHome') }}
      />
    </div>
  );
}
