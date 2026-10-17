'use client';

import {
  DEMO_PAYMENT_OUTCOMES,
  type DemoPaymentDto,
  type DemoPaymentOutcome,
  type Locale,
} from '@teran/contracts';
import { FlaskConical } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button, buttonClasses } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Price } from '@/components/ui/price';
import { apiRequest } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/format';
import { useApiErrorMessage } from '@/lib/use-api-error-message';

const OPEN = new Set(['PENDING', 'REQUIRES_ACTION', 'PROCESSING']);

/**
 * Stand-in for a payment provider's page in demo mode. It never asks for card details: the
 * customer picks the outcome to simulate, the API records it (marked as a demonstration), and the
 * customer continues to the order, which shows the state the API recorded.
 */
export function DemoPayment({ token, initial }: { token: string; initial: DemoPaymentDto }) {
  const t = useTranslations('Payment');
  const tc = useTranslations('Checkout');
  const locale = useLocale() as Locale;
  const [payment, setPayment] = useState(initial);
  const [pending, setPending] = useState<DemoPaymentOutcome | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const errorMessage = useApiErrorMessage(error);
  const open = OPEN.has(payment.status);

  async function simulate(outcome: DemoPaymentOutcome) {
    setPending(outcome);
    setError(null);
    try {
      setPayment(
        await apiRequest<DemoPaymentDto>('/payments/demo', {
          method: 'POST',
          body: { token, outcome },
        }),
      );
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, null));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mx-auto max-w-xl rounded-panel border border-line bg-surface p-6 shadow-soft sm:p-9">
      <p className="inline-flex items-center gap-2 rounded-full bg-gold-100 px-3 py-1 text-caption font-bold tracking-wide text-fg uppercase">
        <FlaskConical aria-hidden className="h-4 w-4" />
        {tc('demoBadge')}
      </p>
      <h1 className="mt-4 text-display-md text-fg">{t('demoTitle')}</h1>
      <p className="mt-2 text-body text-fg-muted">{t('demoIntro')}</p>

      <dl className="mt-6 divide-y divide-line rounded-card border border-line">
        <div className="flex justify-between gap-4 px-4 py-3">
          <dt className="text-body-sm text-fg-muted">
            {t('order', { number: payment.orderNumber })}
          </dt>
          <dd>
            <Price amount={payment.amount} className="text-title" />
          </dd>
        </div>
        <div className="flex justify-between gap-4 px-4 py-3 text-body-sm">
          <dt className="text-fg-muted">{t('method')}</dt>
          <dd className="font-semibold text-fg">{tc(`paymentMethods.${payment.method}`)}</dd>
        </div>
        <div className="flex justify-between gap-4 px-4 py-3 text-body-sm">
          <dt className="text-fg-muted">{t('status')}</dt>
          <dd className="font-semibold text-fg" aria-live="polite">
            {tc(`paymentStatuses.${payment.status}`)}
          </dd>
        </div>
        {payment.expiresAt && open ? (
          <div className="flex justify-between gap-4 px-4 py-3 text-body-sm">
            <dt className="text-fg-muted">{t('payBefore')}</dt>
            <dd className="text-fg">{formatDateTime(payment.expiresAt, locale)}</dd>
          </div>
        ) : null}
      </dl>

      {errorMessage ? (
        <Notice tone="danger" role="alert" className="mt-5">
          {error?.status === 409 ? t('windowEnded') : errorMessage}
        </Notice>
      ) : null}

      {open ? (
        <fieldset className="mt-6">
          <legend className="text-label text-fg">{t('chooseOutcome')}</legend>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {DEMO_PAYMENT_OUTCOMES.filter(
              (outcome) => !(outcome === 'pending' && payment.status === 'PROCESSING'),
            ).map((outcome) => (
              <Button
                key={outcome}
                variant={outcome === 'success' ? 'primary' : 'secondary'}
                loading={pending === outcome}
                disabled={pending !== null}
                onClick={() => void simulate(outcome)}
              >
                {t(`outcomes.${outcome}`)}
              </Button>
            ))}
          </div>
        </fieldset>
      ) : (
        <Notice
          tone={payment.status === 'PAID' ? 'success' : 'warning'}
          role="status"
          className="mt-6"
        >
          {t('resultTitle', { status: tc(`paymentStatuses.${payment.status}`) })}
        </Notice>
      )}

      {/* The return path already carries the locale prefix, so a plain link is used. */}
      <a
        href={payment.returnPath}
        className={buttonClasses(open ? 'ghost' : 'primary', 'md', 'mt-6')}
      >
        {t('continueToOrder')}
      </a>
    </div>
  );
}
