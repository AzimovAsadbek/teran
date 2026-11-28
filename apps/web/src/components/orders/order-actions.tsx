'use client';

import type {
  Locale,
  OnlinePaymentMethod,
  PaymentOptionDto,
  PaymentSessionDto,
  ReorderResultDto,
} from '@teran/contracts';
import { ArrowUpRight, RefreshCw, ShoppingBag } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, useTransition } from 'react';
import { PaymentMethodCard } from '@/components/payments/payment-method-card';
import { ProviderMark } from '@/components/payments/payment-ui';
import { formatMoney } from '@/lib/format';
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
  amount,
}: {
  number: string;
  /** Guest order link secret; signed-in owners do not need it. */
  token: string | null;
  /** Online methods that can be used now (live or demo). */
  options: PaymentOptionDto[];
  current: OnlinePaymentMethod | null;
  amount: string;
}) {
  const t = useTranslations('Checkout');
  const locale = useLocale() as Locale;
  const currency = useTranslations('Common')('currency.UZS');
  const router = useRouter();
  const sending = useRef(false);
  const [choose, setChoose] = useState(false);
  const [method, setMethod] = useState(
    current && options.some((option) => option.method === current)
      ? current
      : (options[0]?.method ?? ''),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const errorMessage = useApiErrorMessage(error);
  const chosen = options.find((option) => option.method === method) ?? options[0];

  // A browser Back gesture can restore this exact pre-provider history entry, including its
  // busy button. Reopen the verified order before offering another attempt.
  useEffect(() => {
    function restoreOrder() {
      if (window.history.state?.teranPaymentOpened !== number) return;
      const state = { ...window.history.state };
      delete state.teranPaymentOpened;
      window.history.replaceState(state, '');
      router.replace(
        token
          ? `/orders/${number}?token=${encodeURIComponent(token)}`
          : `/account/orders/${number}`,
      );
    }
    restoreOrder();
    window.addEventListener('pageshow', restoreOrder);
    return () => window.removeEventListener('pageshow', restoreOrder);
  }, [number, token, router]);

  async function pay() {
    if (!chosen || sending.current) return;
    sending.current = true;
    setPending(true);
    setError(null);
    try {
      const session = await apiRequest<PaymentSessionDto>(`/orders/${number}/payments`, {
        method: 'POST',
        body: { method: chosen.method, locale, ...(token ? { token } : {}) },
      });
      if (session.redirectUrl) {
        window.history.replaceState({ ...window.history.state, teranPaymentOpened: number }, '');
        window.location.assign(session.redirectUrl);
        return;
      }
      sending.current = false;
      setPending(false);
      router.refresh();
    } catch (caught) {
      sending.current = false;
      setError(caught instanceof ApiError ? caught : new ApiError(0, null));
      setPending(false);
      if (caught instanceof ApiError && caught.status === 409) router.refresh();
    }
  }

  if (!chosen) return <Notice tone="warning">{t('noPayments')}</Notice>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ProviderMark method={chosen.method} name={t(`paymentMethods.${chosen.method}`)} />
        {options.length > 1 && (
          <button
            type="button"
            aria-expanded={choose}
            disabled={pending}
            onClick={() => setChoose(!choose)}
            className="min-h-11 text-body-sm font-semibold text-brand underline underline-offset-4"
          >
            {t('changeMethod')}
          </button>
        )}
      </div>
      {choose && (
        <fieldset className="space-y-2" disabled={pending}>
          <legend className="mb-2 text-label">{t('paymentSection')}</legend>
          {options.map((option) => (
            <PaymentMethodCard
              key={option.method}
              option={option}
              name="payMethod"
              checked={chosen.method === option.method}
              onChange={() => setMethod(option.method)}
            />
          ))}
        </fieldset>
      )}
      {chosen.availability === 'demo' && (
        <p className="text-helper font-semibold text-warning">{t('paymentDemoNote')}</p>
      )}
      {errorMessage && (
        <Notice tone="danger" role="alert">
          {errorMessage}
        </Notice>
      )}
      <Button
        size="lg"
        className="h-auto min-h-13 w-full gap-2 px-4 py-3 whitespace-normal"
        onClick={() => void pay()}
        loading={pending}
      >
        {pending
          ? t('redirectingToPayment')
          : t('payAmount', {
              method: t(`paymentMethods.${chosen.method}`),
              amount: formatMoney(amount, locale, currency),
            })}
        {!pending && <ArrowUpRight aria-hidden className="size-4 shrink-0" />}
      </Button>
    </div>
  );
}

/** Refreshes the server-rendered order. The bounded schedule also covers a delayed callback. */
export function CheckAgain() {
  const t = useTranslations('Checkout');
  const router = useRouter();
  const [checking, startTransition] = useTransition();
  useEffect(() => {
    const refreshVisible = () => {
      if (document.visibilityState === 'visible') startTransition(() => router.refresh());
    };
    const timers = [3000, 7500, 15000, 30000].map((delay) =>
      window.setTimeout(refreshVisible, delay),
    );
    document.addEventListener('visibilitychange', refreshVisible);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      document.removeEventListener('visibilitychange', refreshVisible);
    };
  }, [router]);
  return (
    <Button
      variant="secondary"
      onClick={() => startTransition(() => router.refresh())}
      loading={checking}
    >
      {!checking && <RefreshCw aria-hidden className="size-4" />}
      {t(checking ? 'checkingStatus' : 'checkAgain')}
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
