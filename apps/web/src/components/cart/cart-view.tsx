'use client';

import { ArrowLeft } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { Price } from '@/components/ui/price';
import { Skeleton } from '@/components/ui/skeleton';
import { cartActions, useCart } from '@/features/cart/cart-store';
import { Link } from '@/i18n/navigation';
import { useApiErrorMessage } from '@/lib/use-api-error-message';
import { EmptyCart } from './cart-drawer';
import { CartLines, FreeDeliveryProgress } from './cart-lines';

/** Full-page bag. Totals come from the API response; nothing is computed in the browser. */
export function CartView() {
  const t = useTranslations('Cart');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const { cart, status, error } = useCart();
  const errorMessage = useApiErrorMessage(error);

  // Always refetch here: the bag may have changed in another tab since this page session loaded it.
  useEffect(() => {
    void cartActions.load(locale, true);
  }, [locale]);

  if (!cart && status === 'error') {
    return (
      <div
        role="alert"
        className="mt-10 rounded-[var(--radius-card)] bg-danger-100 px-6 py-8 text-center"
      >
        <p className="font-semibold text-danger-700">{t('loadError')}</p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => void cartActions.load(locale, true)}
        >
          {tc('retry')}
        </Button>
      </div>
    );
  }

  if (!cart) return <CartSkeleton />;

  if (cart.lines.length === 0) {
    return (
      <div className="mt-6 rounded-[var(--radius-panel)] bg-white">
        <EmptyCart />
      </div>
    );
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-12">
      <section
        aria-label={t('drawerTitle')}
        className="rounded-[var(--radius-panel)] bg-white px-5 py-2 sm:px-8"
      >
        <CartLines cart={cart} />
      </section>

      <aside aria-labelledby="cart-summary" className="space-y-5 lg:sticky lg:top-28">
        <div className="rounded-[var(--radius-panel)] bg-white p-6 shadow-soft">
          <h2 id="cart-summary" className="font-display text-2xl font-semibold text-forest-900">
            {t('summary')}
          </h2>
          <p className="mt-1 text-sm text-ink-500">{t('itemCount', { count: cart.itemCount })}</p>
          <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-ivory-200 pt-4">
            <span className="font-semibold text-forest-900">{t('subtotal')}</span>
            <Price amount={cart.subtotal} className="text-xl" />
          </div>
          <p className="mt-2 text-sm text-ink-500">{t('deliveryNote')}</p>

          {errorMessage ? (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-danger-100 px-4 py-3 text-sm text-danger-700"
            >
              {errorMessage}
            </p>
          ) : null}
          {!cart.isCheckoutReady ? (
            <p className="mt-4 text-sm font-medium text-danger-700">{t('notReady')}</p>
          ) : null}

          <ButtonLink
            href="/checkout"
            size="lg"
            className="mt-5 w-full"
            aria-disabled={!cart.isCheckoutReady}
            onClick={(event) => {
              if (!cart.isCheckoutReady) event.preventDefault();
            }}
          >
            {t('checkout')}
          </ButtonLink>
        </div>

        <FreeDeliveryProgress cart={cart} />

        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 text-sm font-semibold text-forest-900 underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          {t('continueShopping')}
        </Link>
      </aside>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div
      className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12"
      aria-hidden
    >
      <div className="space-y-4 rounded-[var(--radius-panel)] bg-white p-6">
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex gap-4">
            <Skeleton className="h-24 w-24 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="mt-4 h-9 w-32" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="h-64 rounded-[var(--radius-panel)]" />
    </div>
  );
}
