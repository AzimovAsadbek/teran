'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
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
      <div role="alert" className="mt-8">
        <Notice tone="danger" title={t('loadError')}>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => void cartActions.load(locale, true)}
          >
            {tc('retry')}
          </Button>
        </Notice>
      </div>
    );
  }

  if (!cart) return <CartSkeleton />;

  if (cart.lines.length === 0) {
    // The reference's empty bag: a centred message and a pill, no frame around it, in the space
    // the loading placeholder held (cart page).
    return (
      <div className="flex min-h-[20.25rem] items-center justify-center sm:min-h-[19.75rem]">
        <EmptyCart />
      </div>
    );
  }

  return (
    <>
      {/* The page's h1 names the bag for assistive technology; this is its visible title. */}
      <p aria-hidden className="font-headline text-[2.5rem] text-forest-900 sm:text-[3.125rem]">
        {t('drawerTitle')}
      </p>
      <div className="mt-6 grid grid-cols-1 gap-6 sm:mt-8 lg:grid-cols-12 lg:items-start lg:gap-10">
        <section
          aria-label={t('drawerTitle')}
          className="rounded-panel border border-line bg-surface p-5 sm:p-8 lg:col-span-7 xl:col-span-8"
        >
          <CartLines cart={cart} />
        </section>

        <aside
          aria-labelledby="cart-summary"
          className="space-y-4 lg:sticky lg:top-24 lg:col-span-5 xl:col-span-4"
        >
          <div className="rounded-panel border border-line bg-surface p-6 shadow-soft">
            <h2 id="cart-summary" className="text-display-sm text-forest-900">
              {t('summary')}
            </h2>
            <p className="mt-1 text-body-sm text-fg-subtle">
              {t('itemCount', { count: cart.itemCount })}
            </p>
            <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-line pt-4">
              <span className="text-title text-fg">{t('subtotal')}</span>
              <Price amount={cart.subtotal} className="text-title-lg" />
            </div>
            <p className="mt-1 text-helper text-fg-subtle">{t('deliveryNote')}</p>

            {errorMessage ? (
              <Notice tone="danger" role="alert" compact className="mt-4">
                {errorMessage}
              </Notice>
            ) : null}
            {!cart.isCheckoutReady ? (
              <Notice tone="danger" compact className="mt-4">
                {t('notReady')}
              </Notice>
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
              <ArrowRight aria-hidden className="h-4 w-4" />
            </ButtonLink>
          </div>

          <FreeDeliveryProgress cart={cart} />

          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 text-body-sm font-semibold text-brand underline-offset-4 hover:underline"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            {t('continueShopping')}
          </Link>
        </aside>
      </div>
    </>
  );
}

/**
 * Two placeholder lines, no taller than the bag's empty state (cart page), so nothing below moves
 * when the bag turns out to be empty, the most common case on a first visit.
 */
function CartSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-10" aria-hidden>
      <div className="space-y-6 rounded-panel border border-line bg-surface p-5 sm:p-8 lg:col-span-7 xl:col-span-8">
        {[0, 1].map((index) => (
          <div key={index} className="flex gap-4">
            <Skeleton className="h-24 w-24 rounded-control sm:h-28 sm:w-28" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="mt-4 h-9 w-28" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="hidden h-64 rounded-panel lg:col-span-5 lg:block xl:col-span-4" />
    </div>
  );
}
