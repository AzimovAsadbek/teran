'use client';

import type { CartDto } from '@teran/contracts';
import { AlertCircle, Trash2 } from 'lucide-react';
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
    <ul className="divide-y divide-ivory-200">
      {cart.lines.map((line) => {
        const pending = pendingKey === `line:${line.id}`;
        const pack = packLabel(line, line.format, locale, (key, values) =>
          tp(`units.${key}`, values),
        );
        return (
          <li key={line.id} className={cn('flex gap-4 py-4', pending && 'opacity-60')}>
            <Link
              href={`/products/${line.productSlug}`}
              className={cn(
                'shrink-0 overflow-hidden rounded-xl bg-ivory-100',
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
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/products/${line.productSlug}`}
                    className="font-semibold text-forest-900 hover:underline"
                  >
                    {line.productName}
                  </Link>
                  <p className="text-sm text-ink-500">{pack}</p>
                </div>
                <Price amount={line.lineTotal} className="shrink-0 text-sm" />
              </div>
              {line.issue ? (
                <p className="flex items-start gap-1.5 text-sm text-danger-700" role="status">
                  <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                  {t(`issues.${line.issue}`)}
                </p>
              ) : null}
              <div className="mt-auto flex items-center justify-between gap-3">
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
                  onClick={() => void cartActions.remove(line.id, locale)}
                  disabled={pending}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-ink-700 transition-colors hover:bg-danger-100 hover:text-danger-700"
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
export function FreeDeliveryProgress({ cart }: { cart: CartDto }) {
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

  return (
    <div className="rounded-2xl bg-leaf-100/70 px-4 py-3">
      <p className="text-sm text-forest-900">
        {remaining > 0
          ? t('freeDeliveryRemaining', { amount, method: hint.methodName })
          : t('freeDeliveryReached', { method: hint.methodName })}
      </p>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-white"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={hint.methodName}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-leaf-600 to-gold-500 transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
