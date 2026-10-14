'use client';

import type { VariantDto } from '@teran/contracts';
import { Loader2, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { cartActions, useCart } from '@/features/cart/cart-store';
import { cn } from '@/lib/cn';

/**
 * One-click add of the default pack size from a product card. Always visible on touch screens;
 * with a mouse it appears when the card is hovered or focused (it is always reachable by Tab).
 */
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
      aria-disabled={pending || undefined}
      aria-busy={pending || undefined}
      onClick={() => {
        // Not `disabled` while pending, so keyboard focus stays on the button.
        if (!pending) void cartActions.add(variant.id, 1, locale);
      }}
      aria-label={t('quickAdd', { name: productName })}
      className={cn(
        'absolute right-2.5 bottom-2.5 z-10 inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full px-2.5 sm:right-3 sm:bottom-3',
        'bg-surface/95 text-body-sm font-semibold text-brand shadow-soft ring-1 ring-forest-900/10',
        'transition-[opacity,translate,background-color,color] duration-200 ease-[var(--ease-standard)]',
        'hover:bg-brand hover:text-fg-inverse aria-busy:cursor-progress',
        'pointer-fine:translate-y-1 pointer-fine:opacity-0 pointer-fine:group-focus-within:translate-y-0 pointer-fine:group-focus-within:opacity-100 pointer-fine:group-hover:translate-y-0 pointer-fine:group-hover:opacity-100',
        pending && 'pointer-fine:translate-y-0 pointer-fine:opacity-100',
      )}
    >
      {pending ? (
        <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
      ) : (
        <Plus aria-hidden className="h-4 w-4" />
      )}
      <span className="hidden pr-1 lg:inline">{t('addToCart')}</span>
    </button>
  );
}
