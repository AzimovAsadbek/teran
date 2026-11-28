'use client';

import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PaymentShell } from '@/components/payments/payment-ui';
import { Button, ButtonLink } from '@/components/ui/button';

export default function PaymentError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations('Checkout');
  const tc = useTranslations('Common');
  return (
    <PaymentShell>
      <section
        className="mx-auto max-w-xl rounded-card border border-line bg-surface p-6 sm:p-9"
        role="alert"
      >
        <meta name="robots" content="noindex" />
        <h1 className="font-heading text-[2rem] leading-tight">{t('statusUnavailable')}</h1>
        <p className="mt-3 text-body text-fg-muted">{t('statusUnavailableNote')}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={retry}>
            <RefreshCw aria-hidden className="size-4" />
            {tc('retry')}
          </Button>
          <ButtonLink href="/account/orders" variant="secondary">
            {t('myOrders')}
          </ButtonLink>
        </div>
      </section>
    </PaymentShell>
  );
}
