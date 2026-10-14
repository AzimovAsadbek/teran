'use client';

import type {
  Locale,
  OnlinePaymentMethod,
  PaymentOptionDto,
  PaymentSessionDto,
  ReorderResultDto,
} from '@teran/contracts';
import { CreditCard, RefreshCw, ShoppingBag } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { ChoiceCard } from '@/components/checkout/choice-card';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { cartActions } from '@/features/cart/cart-store';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { useApiErrorMessage } from '@/lib/use-api-error-message';

/**
 * Starts (or restarts) the online payment of an order that still awaits it, then sends the
 * customer to the provider's page (or the labelled demo page). Whether the order is paid is only
 * ever decided by the API from the provider's confirmation.
 */
export function PayOrder({
  number,
  token,
  options,
  current,
}: {
  number: string;
  /** Guest order link secret; signed-in owners do not need it. */
  token: string | null;
  /** Online methods that can be used now (live or demo). */
  options: PaymentOptionDto[];
  current: OnlinePaymentMethod | null;
}) {
  const t = useTranslations('Checkout');
  const locale = useLocale() as Locale;
  const [method, setMethod] = useState<string>(
    current && options.some((option) => option.method === current)
      ? current
      : (options[0]?.method ?? ''),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const errorMessage = useApiErrorMessage(error);

  async function pay() {
    if (!method || pending) return;
    setPending(true);
    setError(null);
    try {
      const session = await apiRequest<PaymentSessionDto>(`/orders/${number}/payments`, {
        method: 'POST',
        body: { method, locale, ...(token ? { token } : {}) },
      });
      if (session.redirectUrl) {
        window.location.assign(session.redirectUrl);
        return;
      }
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, null));
      setPending(false);
    }
  }

  if (options.length === 0) return null;
  const chosen = options.find((option) => option.method === method);
  return (
    <div className="space-y-3">
      {options.length > 1 ? (
        <fieldset className="space-y-2.5">
          <legend className="mb-2 text-label text-fg">{t('paymentSection')}</legend>
          {options.map((option) => (
            <ChoiceCard
              key={option.method}
              name="payMethod"
              value={option.method}
              checked={method === option.method}
              onChange={setMethod}
              title={t(`paymentMethods.${option.method}`)}
              aside={option.availability === 'demo' ? t('paymentAvailability.demo') : undefined}
              description={t(`paymentDescriptions.${option.method}`)}
            />
          ))}
        </fieldset>
      ) : null}
      {errorMessage ? (
        <Notice tone="danger" role="alert">
          {errorMessage}
        </Notice>
      ) : null}
      <Button size="lg" onClick={() => void pay()} loading={pending} disabled={!method}>
        {pending ? null : <CreditCard aria-hidden className="h-4 w-4" />}
        {pending
          ? t('redirectingToPayment')
          : t('payWith', { method: chosen ? t(`paymentMethods.${chosen.method}`) : '' })}
      </Button>
    </div>
  );
}

/** Reloads the order (the provider's confirmation may have arrived meanwhile). */
export function CheckAgain() {
  const t = useTranslations('Checkout');
  const router = useRouter();
  return (
    <Button variant="secondary" size="sm" onClick={() => router.refresh()}>
      <RefreshCw aria-hidden className="h-4 w-4" />
      {t('checkAgain')}
    </Button>
  );
}

/**
 * Puts an earlier order's items back in the bag at today's prices and stock. Nothing is ordered:
 * the customer reviews the bag and checks out as usual.
 */
export function ReorderButton({ number }: { number: string }) {
  const t = useTranslations('Account');
  const locale = useLocale() as Locale;
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ReorderResultDto | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const errorMessage = useApiErrorMessage(error);

  async function reorder() {
    setPending(true);
    setError(null);
    try {
      const outcome = await apiRequest<ReorderResultDto>(
        `/account/orders/${number}/reorder?locale=${locale}`,
        { method: 'POST' },
      );
      setResult(outcome);
      void cartActions.load(locale, true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, null));
    } finally {
      setPending(false);
    }
  }

  const skipped = result?.skipped.map((entry) =>
    t(`reorderReasons.${entry.reason}`, { sku: entry.sku }),
  );
  return (
    <div className="space-y-3">
      <Button variant="secondary" onClick={() => void reorder()} loading={pending}>
        {pending ? null : <ShoppingBag aria-hidden className="h-4 w-4" />}
        {t('reorder')}
      </Button>
      <p className="text-body-sm text-fg-subtle">{t('reorderHint')}</p>
      {errorMessage ? (
        <Notice tone="danger" role="alert">
          {errorMessage}
        </Notice>
      ) : null}
      {result ? (
        <Notice tone={result.added.length > 0 ? 'success' : 'warning'} role="status">
          {result.added.length > 0
            ? t('reorderAdded', { count: result.added.length })
            : t('reorderNone')}
          {skipped && skipped.length > 0 ? (
            <span className="block">{t('reorderSkipped', { items: skipped.join(', ') })}</span>
          ) : null}
          {result.added.length > 0 ? (
            <button
              type="button"
              onClick={cartActions.openDrawer}
              className="mt-1 block font-semibold underline underline-offset-2"
            >
              {t('viewBag')}
            </button>
          ) : null}
        </Notice>
      ) : null}
    </div>
  );
}
