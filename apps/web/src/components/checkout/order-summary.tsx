'use client';

import type { CartDto, CheckoutQuoteDto } from '@teran/contracts';
import { useLocale, useTranslations } from 'next-intl';
import { ProductImage } from '@/components/catalog/product-image';
import { Price } from '@/components/ui/price';
import { Link } from '@/i18n/navigation';
import { packLabel } from '@/lib/format';

/**
 * Lines and totals as the server calculated them. Delivery and total come from the quote for the
 * chosen region and method; until then the delivery row says when it will be known.
 */
export function OrderSummary({
  cart,
  quote,
  quoteLoading,
}: {
  cart: CartDto;
  quote: CheckoutQuoteDto | null;
  quoteLoading: boolean;
}) {
  const t = useTranslations('Checkout');
  const tp = useTranslations('Product');
  const tcart = useTranslations('Cart');
  const locale = useLocale();

  return (
    <div>
      <ul className="divide-y divide-ivory-200">
        {cart.lines.map((line) => (
          <li key={line.id} className="flex gap-3 py-3">
            <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-ivory-100">
              <ProductImage
                image={line.image}
                illustrationKey={line.illustrationKey}
                name={line.productName}
                sizes="64px"
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-forest-900">
                {line.productName}
              </span>
              <span className="block text-sm text-ink-500">
                {packLabel(line, line.format, locale, (key, values) => tp(`units.${key}`, values))}{' '}
                · {t('quantityShort', { count: line.quantity })}
              </span>
              {line.issue ? (
                <span className="mt-0.5 block text-sm text-danger-700">
                  {tcart(`issues.${line.issue}`)}
                </span>
              ) : null}
            </span>
            <Price amount={line.lineTotal} className="shrink-0 text-sm" />
          </li>
        ))}
      </ul>
      <dl className="mt-3 space-y-2 border-t border-ivory-200 pt-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-700">{t('subtotal')}</dt>
          <dd>
            <Price amount={quote?.subtotal ?? cart.subtotal} />
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-700">{t('delivery')}</dt>
          <dd className="text-right">
            {quote ? (
              Number(quote.deliveryFee) === 0 ? (
                <span className="font-semibold text-leaf-600">{t('free')}</span>
              ) : (
                <Price amount={quote.deliveryFee} />
              )
            ) : (
              <span className="text-ink-500">{quoteLoading ? '…' : t('deliveryTbd')}</span>
            )}
          </dd>
        </div>
        {quote && Number(quote.discountTotal) > 0 ? (
          <div className="flex justify-between gap-4">
            <dt className="text-ink-700">{t('discount')}</dt>
            <dd>
              <Price amount={quote.discountTotal} />
            </dd>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between gap-4 border-t border-ivory-200 pt-3">
          <dt className="font-semibold text-forest-900">{t('total')}</dt>
          <dd aria-live="polite">
            {quote ? (
              <Price amount={quote.total} className="text-xl" />
            ) : (
              <span className="text-ink-500">—</span>
            )}
          </dd>
        </div>
      </dl>
      <Link
        href="/cart"
        className="mt-4 inline-block text-sm font-semibold text-forest-900 underline-offset-4 hover:underline"
      >
        {t('editCart')}
      </Link>
    </div>
  );
}
