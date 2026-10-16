'use client';

import type { ProductFormat, VariantDto } from '@teran/contracts';
import { Check, ShoppingBag } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { QuantityStepper } from '@/components/cart/quantity-stepper';
import { Button } from '@/components/ui/button';
import { radioDotClasses } from '@/components/ui/field';
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
  const [scrolledPast, setScrolledPast] = useState(false);

  const variant = variants.find((candidate) => candidate.id === variantId) ?? variants[0];

  // Keep the selected pack in the URL so it can be shared (no server round-trip).
  useEffect(() => {
    if (!variant) return;
    const url = new URL(window.location.href);
    url.searchParams.set('variant', variant.sku);
    window.history.replaceState(window.history.state, '', url);
  }, [variant]);

  // Show the sticky bar only once the main button has scrolled up out of view (not while the
  // shopper has yet to reach it).
  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setScrolledPast(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      // The root reaches far below the screen, so the button only stops intersecting once it
      // leaves past the top edge. That change is reported even when the page jumps past the button
      // in one go (End key, a fast fling), which a viewport-sized root would miss.
      { rootMargin: '0px 0px 100000px 0px' },
    );
    observer.observe(button);
    return () => observer.disconnect();
  }, []);

  if (!variant) return null;
  const soldOut = variant.stockLevel === 'out_of_stock';
  const pending = pendingKey === `add:${variant.id}`;
  const lineTotalMoney = multiplyMoney(variant.price, quantity);
  const units = (key: 'TEA_BAGS' | 'PYRAMIDS' | 'default', values: { count: number }) =>
    t(`units.${key}`, values);

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
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <Price amount={variant.price} compareAt={variant.compareAtPrice} className="text-metric" />
        <span className="text-body text-fg-subtle">
          · {packLabel(variant, format, locale, units)}
        </span>
      </div>
      <StockStatus level={variant.stockLevel} maxQuantity={variant.maxQuantity} />

      {variants.length > 1 ? (
        <fieldset className="mt-6">
          <legend className="text-label text-fg">{t('size')}</legend>
          <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {variants.map((option) => {
              const selected = option.id === variant.id;
              const optionSoldOut = option.stockLevel === 'out_of_stock';
              return (
                <label
                  key={option.id}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-control border bg-surface p-3.5 transition-[border-color,box-shadow] duration-150',
                    selected
                      ? 'border-brand shadow-[inset_0_0_0_1px_var(--color-brand)]'
                      : 'border-line-strong/45 hover:border-brand/50',
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
                    className={cn(radioDotClasses, 'mt-0.5')}
                  />
                  <span className={cn('min-w-0', optionSoldOut && 'opacity-60')}>
                    <span className="block text-title-sm text-fg">
                      {packLabel(option, format, locale, units)}
                    </span>
                    <Price
                      amount={option.price}
                      compareAt={option.compareAtPrice}
                      className="mt-0.5 text-body-sm"
                    />
                    {optionSoldOut ? (
                      <span className="mt-0.5 block text-helper text-fg-subtle">
                        {t('outOfStock')}
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {/* Side by side when the column is wide enough for the priced label, stacked otherwise. */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
        {!soldOut ? (
          <QuantityStepper
            value={quantity}
            max={Math.max(1, variant.maxQuantity)}
            onChange={setQuantity}
            label={`${t('quantity')} — ${productName}`}
          />
        ) : null}
        <Button
          ref={buttonRef}
          size="lg"
          onClick={() => void add()}
          disabled={soldOut}
          loading={pending}
          // grow, not flex-1: a 0% basis would collapse the button's height in the column layout.
          className="grow"
        >
          {pending ? null : <ShoppingBag aria-hidden className="h-[1.125rem] w-[1.125rem]" />}
          {pending ? t('adding') : addLabel}
        </Button>
      </div>
      <p aria-live="polite" className="mt-2 min-h-5 text-body-sm">
        {justAdded ? (
          <span className="inline-flex items-center gap-1.5 font-semibold text-success motion-safe:animate-pop-in">
            <Check aria-hidden className="h-4 w-4" />
            {t('added')}
          </span>
        ) : null}
        {errorMessage && !justAdded ? <span className="text-danger">{errorMessage}</span> : null}
      </p>

      {/*
       * Sticky purchase bar on phones and tablets once the main button has scrolled away. It is
       * rendered into <body> (only ever on the client, after scrolling), so the product grid's own
       * stacking context (isolate, for its botanical layer) cannot put later content over it.
       */}
      {!soldOut && scrolledPast
        ? createPortal(
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 shadow-overlay backdrop-blur-md motion-safe:animate-slide-up lg:hidden">
              <div className="container-page flex items-center gap-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-title-sm text-fg">{productName}</p>
                  <p className="flex items-baseline gap-1.5 text-body-sm">
                    <Price amount={variant.price} compareAt={variant.compareAtPrice} />
                    <span className="truncate text-fg-subtle">
                      · {packLabel(variant, format, locale, units)}
                    </span>
                  </p>
                </div>
                <Button onClick={() => void add()} loading={pending}>
                  {pending ? null : <ShoppingBag aria-hidden className="h-4 w-4" />}
                  {t('addToCart')}
                </Button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function StockStatus({
  level,
  maxQuantity,
}: {
  level: VariantDto['stockLevel'];
  maxQuantity: number;
}) {
  const t = useTranslations('Product');
  const styles = {
    in_stock: 'text-success',
    low_stock: 'text-warning',
    out_of_stock: 'text-fg-muted',
  } as const;
  const label =
    level === 'in_stock'
      ? t('inStock')
      : level === 'low_stock'
        ? t('lowStockCount', { count: maxQuantity })
        : t('outOfStock');
  return (
    <p
      className={cn('mt-2 inline-flex items-center gap-2 text-body-sm font-medium', styles[level])}
    >
      <span aria-hidden className="h-2 w-2 rounded-full bg-current" />
      {label}
    </p>
  );
}
