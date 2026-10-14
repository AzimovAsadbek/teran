'use client';

import type { CartDto } from '@teran/contracts';
import { AlertCircle, Trash2, Truck } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { ProductImage } from '@/components/catalog/product-image';
import { Price } from '@/components/ui/price';
import { cartActions, useCart } from '@/features/cart/cart-store';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { formatMoney, packLabel } from '@/lib/format';
import { QuantityStepper } from './quantity-stepper';

export function CartLines({ cart, compact = false }: { cart: CartDto; compact?: boolean }) {
  const t = useTranslations('Cart');
  const tp = useTranslations('Product');
  const locale = useLocale();
  const { pendingKey } = useCart();

  return (
    <ul className="divide-y divide-line">
      {cart.lines.map((line) => {
        const pending = pendingKey === `line:${line.id}`;
        const pack = packLabel(line, line.format, locale, (key, values) =>
          tp(`units.${key}`, values),
        );
        return (
          <li
            key={line.id}
            aria-busy={pending || undefined}
            className={cn(
              'flex gap-4 py-4 transition-opacity duration-150 first:pt-0 last:pb-0 sm:gap-5',
              !compact && 'sm:py-6 sm:first:pt-0 sm:last:pb-0',
              pending && 'opacity-60',
            )}
          >
            <Link
              href={`/products/${line.productSlug}`}
              className={cn(
                'shrink-0 overflow-hidden rounded-control bg-surface-muted',
                compact ? 'h-20 w-20' : 'h-24 w-24 sm:h-28 sm:w-28',
              )}
              tabIndex={-1}
              aria-hidden
            >
              <ProductImage
                image={line.image}
                illustrationKey={line.illustrationKey}
                name={line.productName}
                sizes="112px"
              />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/products/${line.productSlug}`}
                    className="text-title-sm text-fg underline-offset-4 hover:underline sm:text-title"
                  >
                    {line.productName}
                  </Link>
                  <p className="mt-0.5 text-body-sm text-fg-subtle">{pack}</p>
                </div>
                <Price amount={line.lineTotal} className="shrink-0 text-body-sm sm:text-body" />
              </div>
              {line.issue ? (
                <p className="mt-2 flex items-start gap-1.5 text-body-sm text-danger" role="status">
                  <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                  {t(`issues.${line.issue}`)}
                </p>
              ) : null}
              <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                {line.issue === 'unavailable' || line.issue === 'out_of_stock' ? (
                  <span />
                ) : (
                  <QuantityStepper
                    size="sm"
                    value={line.quantity}
                    max={line.maxQuantity}
                    disabled={pending}
                    label={t('quantityFor', { name: line.productName })}
                    onChange={(quantity) => void cartActions.update(line.id, quantity, locale)}
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (!pending) void cartActions.remove(line.id, locale);
                  }}
                  aria-disabled={pending || undefined}
                  className="-mr-2 inline-flex h-9 items-center gap-1.5 rounded-control px-2 text-body-sm text-fg-muted transition-colors duration-150 hover:bg-danger-soft hover:text-danger aria-disabled:cursor-progress"
                  aria-label={t('removeItem', { name: line.productName })}
                >
                  <Trash2 aria-hidden className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('remove')}</span>
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Progress toward free delivery for the primary delivery method, when TERAN configured one. */
export function FreeDeliveryProgress({ cart, className }: { cart: CartDto; className?: string }) {
  const t = useTranslations('Cart');
  const locale = useLocale();
  const tc = useTranslations('Common');
  const hint = cart.deliveryHint;
  if (!hint) return null;

  const threshold = Number(hint.freeFromAmount);
  const remaining = Number(hint.remaining);
  const percent =
    threshold > 0 ? Math.min(100, Math.round(((threshold - remaining) / threshold) * 100)) : 100;
  const amount = formatMoney(hint.remaining, locale, tc('currency.UZS'));
  const reached = remaining <= 0;

  return (
    <div className={cn('rounded-card border border-line bg-surface px-4 py-3.5', className)}>
      <p className="flex items-start gap-2.5 text-body-sm text-fg">
        <Truck
          aria-hidden
          className={cn('mt-0.5 h-4 w-4 shrink-0', reached ? 'text-success' : 'text-accent-fg')}
        />
        {reached
          ? t('freeDeliveryReached', { method: hint.methodName })
          : t('freeDeliveryRemaining', { amount, method: hint.methodName })}
      </p>
      <div
        className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={hint.methodName}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500 ease-[var(--ease-soft)]',
            reached ? 'bg-success' : 'bg-accent',
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
