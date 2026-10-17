'use client';

import type { ImageDto, ProductFormat, VariantDto } from '@teran/contracts';
import { Check, ShoppingBag } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { QuantityStepper } from '@/components/cart/quantity-stepper';
import { Button } from '@/components/ui/button';
import { radioDotClasses } from '@/components/ui/field';
import { Price } from '@/components/ui/price';
import { cartActions, useCart } from '@/features/cart/cart-store';
import { cn } from '@/lib/cn';
import { formatMoney, multiplyMoney, packLabel } from '@/lib/format';
import { imageSources } from '@/lib/navigation';
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
  image = null,
  details,
}: {
  productName: string;
  format: ProductFormat;
  variants: VariantDto[];
  initialVariantId: string;
  /** The product's first picture, for the floating bar. */
  image?: ImageDto | null;
  /** Shown between the price and the pack sizes (the reference's tabs and attribute rows). */
  details?: ReactNode;
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
  const thumb = image ? imageSources(image, 160) : null;
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
      {/* The reference's price line: 18 px bold price, then • pack size. */}
      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-[1.125rem] leading-[1.6]">
        <Price
          amount={variant.price}
          compareAt={variant.compareAtPrice}
          className="[&>span:first-child]:font-bold"
        />
        <span className="text-[1rem] text-fg">• {packLabel(variant, format, locale, units)}</span>
      </div>
      <StockStatus level={variant.stockLevel} maxQuantity={variant.maxQuantity} />
      {details}

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

      {/* The reference's pair of equal pills: quantity, then add to bag with the line total. */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {!soldOut ? (
          <QuantityStepper
            value={quantity}
            max={Math.max(1, variant.maxQuantity)}
            onChange={setQuantity}
            label={`${t('quantity')} — ${productName}`}
            size="lg"
          />
        ) : null}
        <Button
          ref={buttonRef}
          size="lg"
          onClick={() => void add()}
          disabled={soldOut}
          loading={pending}
          className={cn('w-full', soldOut && 'sm:col-span-2')}
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
       * The reference's floating bar once the main button has scrolled away: a pill centred at the
       * bottom with the picture, name, price and add to bag. It is rendered into <body> (only ever
       * on the client, after scrolling), so no stacking context on the page can cover it.
       */}
      {!soldOut && scrolledPast
        ? createPortal(
            <div className="fixed inset-x-0 bottom-3 z-30 flex justify-center px-3 pb-[env(safe-area-inset-bottom)] motion-safe:animate-slide-up">
              <div className="flex w-full max-w-[37.5rem] items-center gap-3 rounded-full border border-line bg-surface py-2 pr-2 pl-2 shadow-overlay">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element -- API renditions (ADR-009)
                  <img
                    src={thumb.src}
                    alt=""
                    width={48}
                    height={48}
                    className="h-12 w-12 shrink-0 rounded-full bg-surface-muted object-cover"
                  />
                ) : null}
                <p className="min-w-0 flex-1 truncate text-body-sm text-fg sm:text-body">
                  {productName}
                </p>
                <Price
                  amount={variant.price}
                  compareAt={variant.compareAtPrice}
                  className="hidden shrink-0 text-body-sm sm:inline"
                />
                <Button onClick={() => void add()} loading={pending} className="shrink-0">
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
