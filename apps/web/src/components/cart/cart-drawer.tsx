'use client';

import { ShoppingBag } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { Price } from '@/components/ui/price';
import { ButtonLink } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { cartActions, useCart } from '@/features/cart/cart-store';
import { Link } from '@/i18n/navigation';
import { useApiErrorMessage } from '@/lib/use-api-error-message';
import { CartLines, FreeDeliveryProgress } from './cart-lines';

export function CartDrawer() {
  const t = useTranslations('Cart');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const { cart, drawerOpen, error, status } = useCart();
  const errorMessage = useApiErrorMessage(error);

  useEffect(() => {
    void cartActions.load(locale);
  }, [locale]);

  const hasLines = (cart?.lines.length ?? 0) > 0;

  return (
    <Sheet
      open={drawerOpen}
      onClose={cartActions.closeDrawer}
      side="right"
      title={t('drawerTitle')}
      closeLabel={tc('close')}
      footer={
        hasLines && cart ? (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold text-forest-900">{t('subtotal')}</span>
              <Price amount={cart.subtotal} className="text-lg" />
            </div>
            <p className="text-sm text-ink-500">{t('deliveryNote')}</p>
            {!cart.isCheckoutReady ? (
              <p className="text-sm text-danger-700">{t('notReady')}</p>
            ) : null}
            <ButtonLink
              href="/checkout"
              size="lg"
              className="w-full"
              aria-disabled={!cart.isCheckoutReady}
              onClick={(event) => {
                if (!cart.isCheckoutReady) event.preventDefault();
                else cartActions.closeDrawer();
              }}
            >
              {t('checkout')}
            </ButtonLink>
            <Link
              href="/cart"
              onClick={cartActions.closeDrawer}
              className="block text-center text-sm font-semibold text-forest-900 underline-offset-4 hover:underline"
            >
              {t('viewCart')}
            </Link>
          </div>
        ) : null
      }
    >
      <div className="px-5 py-4">
        {errorMessage ? (
          <p
            role="alert"
            className="mb-3 rounded-xl bg-danger-100 px-4 py-3 text-sm text-danger-700"
          >
            {errorMessage}
          </p>
        ) : null}
        {status === 'loading' && !cart ? (
          <p className="py-10 text-center text-ink-500">{tc('loading')}</p>
        ) : null}
        {cart && hasLines ? (
          <div className="space-y-4">
            <FreeDeliveryProgress cart={cart} />
            <CartLines cart={cart} compact />
          </div>
        ) : null}
        {cart && !hasLines ? <EmptyCart onNavigate={cartActions.closeDrawer} /> : null}
      </div>
    </Sheet>
  );
}

export function EmptyCart({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations('Cart');
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-leaf-100 text-forest-900">
        <ShoppingBag aria-hidden className="h-7 w-7" />
      </span>
      <p className="mt-5 font-display text-2xl font-semibold text-forest-900">{t('empty')}</p>
      <p className="mt-2 max-w-xs text-ink-700">{t('emptyText')}</p>
      <ButtonLink href="/catalog" className="mt-6" onClick={onNavigate}>
        {t('startShopping')}
      </ButtonLink>
    </div>
  );
}
