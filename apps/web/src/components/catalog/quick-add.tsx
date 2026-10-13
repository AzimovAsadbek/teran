'use client';

import type { VariantDto } from '@teran/contracts';
import { Loader2, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { cartActions, useCart } from '@/features/cart/cart-store';
import { cn } from '@/lib/cn';

/** One-click add of the default pack size from a product card. */
export function QuickAdd({
  variant,
  productName,
}: {
  variant: VariantDto | null;
  productName: string;
}) {
  const t = useTranslations('Product');
  const locale = useLocale();
  const { pendingKey } = useCart();

  if (!variant || variant.stockLevel === 'out_of_stock') return null;
  const pending = pendingKey === `add:${variant.id}`;

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => void cartActions.add(variant.id, 1, locale)}
      aria-label={t('quickAdd', { name: productName })}
      className={cn(
        'glass absolute right-3 bottom-3 z-10 inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-forest-900',
        'transition-all duration-300 hover:bg-ivory-50 focus-visible:opacity-100',
        'lg:translate-y-2 lg:px-4 lg:opacity-0 lg:group-focus-within:translate-y-0 lg:group-focus-within:opacity-100 lg:group-hover:translate-y-0 lg:group-hover:opacity-100',
      )}
    >
      {pending ? (
        <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
      ) : (
        <Plus aria-hidden className="h-4 w-4" />
      )}
      <span className="hidden lg:inline">{t('addToCart')}</span>
    </button>
  );
}
