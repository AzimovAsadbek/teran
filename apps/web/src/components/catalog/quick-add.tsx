'use client';

import type { VariantDto } from '@teran/contracts';
import { Check, Loader2, ShoppingBag } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { cartActions, useCart } from '@/features/cart/cart-store';
import { cn } from '@/lib/cn';

/**
 * One-click add of the default pack size from a product card, as the reference's cards do it:
 * - touch screens: a round bag button over the picture's lower-right corner, always shown;
 * - with a mouse: a full-width "Add to bag · price" pill that rises over the foot of the picture
 *   when the card is pointed at or focused (always reachable by Tab).
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
        'absolute z-10 inline-flex items-center justify-center gap-1.5 rounded-full aria-busy:cursor-progress',
        'right-3 bottom-3 h-12 w-12 bg-surface text-forest-900 shadow-[0_4px_14px_-4px_rgb(14_61_18_/_0.35)] ring-1 ring-forest-900/10',
        'pointer-fine:inset-x-2 pointer-fine:bottom-2 pointer-fine:h-11 pointer-fine:w-auto pointer-fine:bg-forest-900 pointer-fine:px-4 pointer-fine:text-ivory-50 pointer-fine:shadow-none pointer-fine:ring-0 pointer-fine:hover:bg-forest-800',
        'transition-[opacity,translate,background-color] duration-200 ease-out',
        'pointer-fine:translate-y-2 pointer-fine:opacity-0 pointer-fine:group-focus-within:translate-y-0 pointer-fine:group-focus-within:opacity-100 pointer-fine:group-hover:translate-y-0 pointer-fine:group-hover:opacity-100',
        (pending || added) && 'pointer-fine:translate-y-0 pointer-fine:opacity-100',
      )}
    >
      {pending ? (
        <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
      ) : added ? (
        <Check aria-hidden className="h-5 w-5 motion-safe:animate-pop-in" />
      ) : (
        <>
          <ShoppingBag aria-hidden className="h-5 w-5 pointer-fine:hidden" />
          <span aria-hidden className="hidden truncate text-[1rem] font-medium pointer-fine:inline">
            {t('addToCart')}
            {price ? <span className="ml-1.5 font-bold">{price}</span> : null}
          </span>
        </>
      )}
    </button>
  );
}
