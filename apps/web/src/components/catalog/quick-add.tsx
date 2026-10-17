'use client';

import type { VariantDto } from '@teran/contracts';
import { Check, Loader2, ShoppingBag } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { cartActions, useCart } from '@/features/cart/cart-store';
import { cn } from '@/lib/cn';
import { QUICK_ACTION } from './quick-action';

/**
 * One-click add of the default pack size from a product card, as the reference's cards do it
 * (QUICK_ACTION): a round bag button on touch screens, an "Add to bag · price" pill with a mouse.
 */
export function QuickAdd({
  variant,
  productName,
  price,
}: {
  variant: VariantDto | null;
  productName: string;
  /** The default pack's price, shown in the pill. */
  price: string | null;
}) {
  const t = useTranslations('Product');
  const locale = useLocale();
  const { pendingKey } = useCart();
  // A tick for a moment after the pack was added (the bag also opens with it).
  const [added, setAdded] = useState(false);

  if (!variant || variant.stockLevel === 'out_of_stock') return null;
  const pending = pendingKey === `add:${variant.id}`;

  return (
    <button
      type="button"
      aria-disabled={pending || undefined}
      aria-busy={pending || undefined}
      onClick={async () => {
        // Not `disabled` while pending, so keyboard focus stays on the button.
        if (pending) return;
        if (await cartActions.add(variant.id, 1, locale)) {
          setAdded(true);
          window.setTimeout(() => setAdded(false), 1200);
        }
      }}
      aria-label={t('quickAdd', { name: productName })}
      className={cn(
        QUICK_ACTION,
        'aria-busy:cursor-progress',
        (pending || added) && 'pointer-fine:opacity-100',
      )}
    >
      {pending ? (
        <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
      ) : added ? (
        <Check aria-hidden className="h-5 w-5 motion-safe:animate-pop-in" />
      ) : (
        <>
          <ShoppingBag aria-hidden className="h-5 w-5 pointer-fine:hidden" />
          <span
            aria-hidden
            className="hidden truncate text-[1rem] leading-6 font-medium pointer-fine:inline"
          >
            {t('addToCart')}
            {price ? <span className="ml-1.5 font-bold">{price}</span> : null}
          </span>
        </>
      )}
    </button>
  );
}
