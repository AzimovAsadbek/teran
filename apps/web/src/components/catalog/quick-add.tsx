'use client';

import type { VariantDto } from '@teran/contracts';
import { Check, Loader2, ShoppingBag } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { cartActions, useCart } from '@/features/cart/cart-store';
import { useApiErrorMessage } from '@/lib/use-api-error-message';

export function QuickAdd({
  variant,
  productName,
}: {
  variant: VariantDto | null;
  productName: string;
}) {
  const t = useTranslations('Product');
  const locale = useLocale();
  const { pendingKey, error } = useCart();
  const [failed, setFailed] = useState(false);
  const errorMessage = useApiErrorMessage(failed ? error : null);
  // A tick for a moment after the pack was added (the bag also opens with it).
  const [added, setAdded] = useState(false);

  if (!variant || variant.stockLevel === 'out_of_stock') return null;
  const pending = pendingKey === `add:${variant.id}`;

  return (
    <>
      <button
        type="button"
        aria-disabled={pending || undefined}
        aria-busy={pending || undefined}
        aria-label={t('quickAdd', { name: productName })}
        className="card-order mt-2 min-h-11 aria-busy:cursor-progress"
        onClick={async () => {
          if (pending) return;
          setFailed(false);
          if (await cartActions.add(variant.id, 1, locale)) {
            setAdded(true);
            window.setTimeout(() => setAdded(false), 1200);
          } else setFailed(true);
        }}
      >
        {pending ? (
          <Loader2 aria-hidden className="size-4 animate-spin" />
        ) : added ? (
          <Check aria-hidden className="size-4" />
        ) : (
          <ShoppingBag aria-hidden className="hidden size-4 sm:block" />
        )}
        {pending ? t('adding') : added ? t('added') : t('addToCart')}
      </button>
      {errorMessage ? (
        <p role="alert" className="mt-1 text-helper text-danger">
          {errorMessage}
        </p>
      ) : null}
    </>
  );
}
