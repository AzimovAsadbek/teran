'use client';

import { ArrowRight, ShoppingBag } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { Price } from '@/components/ui/price';
import { ButtonLink } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Sheet } from '@/components/ui/sheet';
import { cartActions, useCart } from '@/features/cart/cart-store';
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
      headerExtra={
        cart && hasLines ? (
          <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-caption text-fg-muted">
            {t('itemCount', { count: cart.itemCount })}
          </span>
        ) : null
      }
      footer={
        hasLines && cart ? (
          <div>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-title text-fg">{t('subtotal')}</span>
              <Price amount={cart.subtotal} className="text-title-lg" />
            </div>
            <p className="mt-1 text-helper text-fg-subtle">{t('deliveryNote')}</p>
            {!cart.isCheckoutReady ? (
              <Notice tone="danger" compact className="mt-3">
                {t('notReady')}
              </Notice>
            ) : null}
            <ButtonLink
              href="/checkout"
              size="lg"
              className="mt-4 w-full"
              aria-disabled={!cart.isCheckoutReady}
              onClick={(event) => {
                if (!cart.isCheckoutReady) event.preventDefault();
                else cartActions.closeDrawer();
              }}
            >
              {t('checkout')}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink
              href="/cart"
              variant="ghost"
              className="mt-1 w-full"
              onClick={cartActions.closeDrawer}
            >
              {t('viewCart')}
            </ButtonLink>
          </div>
        ) : null
      }
    >
      <div className="px-5 py-5 sm:px-6">
        {errorMessage ? (
          <Notice tone="danger" role="alert" className="mb-4">
            {errorMessage}
          </Notice>
        ) : null}
        {status === 'loading' && !cart ? (
          <p className="py-10 text-center text-body text-fg-subtle">{tc('loading')}</p>
        ) : null}
        {cart && hasLines ? (
          <div className="space-y-5">
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
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-forest-900">
        <ShoppingBag aria-hidden className="h-7 w-7" />
      </span>
      <p className="mt-5 text-display-sm text-forest-900">{t('empty')}</p>
      <p className="mt-2 max-w-xs text-body text-fg-muted">{t('emptyText')}</p>
      <ButtonLink href="/catalog" className="mt-6" onClick={onNavigate}>
        {t('startShopping')}
      </ButtonLink>
    </div>
  );
}
