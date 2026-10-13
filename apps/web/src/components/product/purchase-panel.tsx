'use client';

import type { ProductFormat, VariantDto } from '@teran/contracts';
import { Check, Loader2, ShoppingBag } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { QuantityStepper } from '@/components/cart/quantity-stepper';
import { Price } from '@/components/ui/price';
import { cartActions, useCart } from '@/features/cart/cart-store';
import { cn } from '@/lib/cn';
import { formatMoney, multiplyMoney, packLabel } from '@/lib/format';
import { useApiErrorMessage } from '@/lib/use-api-error-message';

/**
 * Pack size, quantity and add-to-bag. Everything shown (price, stock, button total) and the cart
 * request derive from the one selected variant, so they cannot disagree. The server still
 * re-prices and re-checks stock when the item is added.
 */
export function PurchasePanel({
  productName,
  format,
  variants,
  initialVariantId,
}: {
  productName: string;
  format: ProductFormat;
  variants: VariantDto[];
  initialVariantId: string;
}) {
  const t = useTranslations('Product');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const { pendingKey, error } = useCart();
  const errorMessage = useApiErrorMessage(error);
  const [variantId, setVariantId] = useState(initialVariantId);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [buttonVisible, setButtonVisible] = useState(true);

  const variant = variants.find((candidate) => candidate.id === variantId) ?? variants[0];

  // Keep the selected pack in the URL so it can be shared (no server round-trip).
  useEffect(() => {
    if (!variant) return;
    const url = new URL(window.location.href);
    url.searchParams.set('variant', variant.sku);
    window.history.replaceState(window.history.state, '', url);
  }, [variant]);

  // Show the sticky mobile bar once the main button has scrolled away.
  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    const observer = new IntersectionObserver(([entry]) => setButtonVisible(entry?.isIntersecting ?? true));
    observer.observe(button);
    return () => observer.disconnect();
  }, []);

  if (!variant) return null;
  const soldOut = variant.stockLevel === 'out_of_stock';
  const pending = pendingKey === `add:${variant.id}`;
  const lineTotalMoney = multiplyMoney(variant.price, quantity);
  const units = (key: 'TEA_BAGS' | 'PYRAMIDS' | 'default', values: { count: number }) => t(`units.${key}`, values);

  async function add() {
    if (!variant) return;
    const added = await cartActions.add(variant.id, quantity, locale);
    if (added) {
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 2500);
    }
  }

  const addLabel = soldOut
    ? t('outOfStock')
    : t('addToCartPrice', { price: formatMoney(lineTotalMoney, locale, tc('currency.UZS')) });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Price amount={variant.price} compareAt={variant.compareAtPrice} className="text-2xl" />
        <span className="text-ink-500">· {packLabel(variant, format, locale, units)}</span>
      </div>

      {variants.length > 1 ? (
        <fieldset>
          <legend className="text-sm font-semibold text-forest-900">{t('size')}</legend>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {variants.map((option) => {
              const selected = option.id === variant.id;
              const optionSoldOut = option.stockLevel === 'out_of_stock';
              return (
                <label
                  key={option.id}
                  className={cn(
                    'relative flex cursor-pointer flex-col rounded-2xl border-2 px-4 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-forest-700',
                    selected ? 'border-forest-900 bg-white' : 'border-ivory-300 bg-white/60 hover:border-forest-900/40',
                    optionSoldOut && 'opacity-60',
                  )}
                >
                  <input
                    type="radio"
                    name="variant"
                    value={option.id}
                    checked={selected}
                    onChange={() => {
                      setVariantId(option.id);
                      setQuantity(1);
                    }}
                    className="sr-only"
                  />
                  <span className="font-semibold text-forest-900">{packLabel(option, format, locale, units)}</span>
                  <Price amount={option.price} compareAt={option.compareAtPrice} className="text-sm" />
                  {optionSoldOut ? <span className="mt-0.5 text-xs text-ink-500">{t('outOfStock')}</span> : null}
                  {selected ? <Check aria-hidden className="absolute top-3 right-3 h-4 w-4 text-forest-900" /> : null}
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <StockStatus level={variant.stockLevel} maxQuantity={variant.maxQuantity} />

      <div className="flex flex-col gap-3 sm:flex-row">
        {!soldOut ? (
          <QuantityStepper
            value={quantity}
            max={Math.max(1, variant.maxQuantity)}
            onChange={setQuantity}
            label={`${t('quantity')} — ${productName}`}
          />
        ) : null}
        <button
          ref={buttonRef}
          type="button"
          onClick={() => void add()}
          disabled={soldOut || pending}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-forest-900 px-6 text-sm font-semibold text-ivory-50 shadow-soft transition-colors hover:bg-forest-800 disabled:opacity-60"
        >
          {pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <ShoppingBag aria-hidden className="h-4 w-4" />}
          {pending ? t('adding') : addLabel}
        </button>
      </div>
      <p aria-live="polite" className="min-h-5 text-sm">
        {justAdded ? <span className="font-semibold text-leaf-600">{t('added')}</span> : null}
        {errorMessage && !justAdded ? <span className="text-danger-700">{errorMessage}</span> : null}
      </p>

      {/* Sticky mobile purchase bar (the reference has none). */}
      {!soldOut && !buttonVisible ? (
        <div className="glass fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-x-0 border-b-0 px-4 py-3 lg:hidden">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-forest-900">{productName}</p>
            <Price amount={variant.price} className="text-sm" />
          </div>
          <button
            type="button"
            onClick={() => void add()}
            disabled={pending}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-forest-900 px-5 text-sm font-semibold text-ivory-50"
          >
            <ShoppingBag aria-hidden className="h-4 w-4" />
            {t('addToCart')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function StockStatus({ level, maxQuantity }: { level: VariantDto['stockLevel']; maxQuantity: number }) {
  const t = useTranslations('Product');
  const styles = {
    in_stock: 'bg-leaf-100 text-leaf-600',
    low_stock: 'bg-gold-100 text-gold-800',
    out_of_stock: 'bg-sage-200 text-ink-700',
  } as const;
  const label =
    level === 'in_stock' ? t('inStock') : level === 'low_stock' ? t('lowStockCount', { count: maxQuantity }) : t('outOfStock');
  return (
    <p className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold', styles[level])}>
      <span aria-hidden className="h-2 w-2 rounded-full bg-current" />
      {label}
    </p>
  );
}
