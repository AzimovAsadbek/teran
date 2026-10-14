import {
  formatUzPhone,
  regionName,
  type Locale,
  type OrderDto,
  type OrderStatus,
} from '@teran/contracts';
import { Check, CircleX } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { ProductImage } from '@/components/catalog/product-image';
import { Price } from '@/components/ui/price';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { formatDateTime, packLabel } from '@/lib/format';

const PROGRESS: readonly OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
];

/** Where the order is in its lifecycle; a cancelled order says so instead of showing steps. */
export async function OrderProgress({ status }: { status: OrderStatus }) {
  const t = await getTranslations('Checkout');
  if (status === 'CANCELLED') {
    return (
      <p className="flex items-start gap-3 rounded-control border border-danger/25 bg-danger-soft px-5 py-4 text-danger">
        <CircleX aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
        <span>
          <strong className="block">{t('statuses.CANCELLED')}</strong>
          {t('cancelledText')}
        </span>
      </p>
    );
  }
  const current = PROGRESS.indexOf(status);
  return (
    <ol aria-label={t('progressLabel')} className="grid grid-cols-5 gap-2">
      {PROGRESS.map((step, index) => {
        const done = index <= current;
        return (
          <li key={step} aria-current={index === current ? 'step' : undefined} className="min-w-0">
            <span
              aria-hidden
              className={cn('block h-1.5 rounded-full', done ? 'bg-brand' : 'bg-surface-sunken')}
            />
            <span
              className={cn(
                'mt-2 flex items-center gap-1 text-caption sm:text-body-sm',
                index === current
                  ? 'font-semibold text-fg'
                  : done
                    ? 'text-fg-muted'
                    : 'text-fg-subtle',
              )}
            >
              {done ? <Check aria-hidden className="hidden h-3.5 w-3.5 shrink-0 sm:block" /> : null}
              <span className="truncate">{t(`statuses.${step}`)}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Items, totals, delivery and payment of one order, exactly as recorded at placement. */
export async function OrderDetails({ order, locale }: { order: OrderDto; locale: Locale }) {
  const t = await getTranslations('Checkout');
  const tp = await getTranslations('Product');
  const address = [regionName(order.regionCode, locale), order.city, order.addressLine]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <section
        aria-labelledby="order-items"
        className="rounded-panel border border-line bg-surface p-5 sm:p-7"
      >
        <h2 id="order-items" className="text-display-sm text-forest-900">
          {t('orderDetails')}
        </h2>
        <ul className="mt-3 divide-y divide-line">
          {order.items.map((item) => (
            <li key={item.sku} className="flex gap-4 py-4">
              <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-control bg-surface-muted">
                <ProductImage
                  image={item.image}
                  illustrationKey={item.illustrationKey}
                  name={item.productName}
                  sizes="80px"
                />
              </span>
              <span className="min-w-0 flex-1">
                <Link
                  href={`/products/${item.productSlug}`}
                  className="text-title-sm text-fg underline-offset-4 hover:underline"
                >
                  {item.productName}
                </Link>
                <span className="block text-body-sm text-fg-subtle">
                  {packLabel(item, item.format, locale, (key, values) =>
                    tp(`units.${key}`, values),
                  )}
                </span>
                <span className="mt-1 block text-body-sm text-fg-muted">
                  {t('quantityShort', { count: item.quantity })} ×{' '}
                  <Price amount={item.unitPrice} className="inline text-body-sm" />
                </span>
              </span>
              <Price amount={item.lineTotal} className="shrink-0 text-body-sm" />
            </li>
          ))}
        </ul>
        <dl className="mt-2 space-y-2 border-t border-line pt-4 text-body-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-fg-muted">{t('subtotal')}</dt>
            <dd>
              <Price amount={order.subtotal} />
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-fg-muted">
              {t('delivery')} · {order.deliveryMethodName}
            </dt>
            <dd>
              {Number(order.deliveryFee) === 0 ? (
                <span className="font-semibold text-success">{t('free')}</span>
              ) : (
                <Price amount={order.deliveryFee} />
              )}
            </dd>
          </div>
          {Number(order.discountTotal) > 0 ? (
            <div className="flex justify-between gap-4">
              <dt className="text-fg-muted">{t('discount')}</dt>
              <dd>
                <Price amount={order.discountTotal} />
              </dd>
            </div>
          ) : null}
          <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
            <dt className="text-title text-fg">{t('total')}</dt>
            <dd>
              <Price amount={order.total} className="text-title-lg" />
            </dd>
          </div>
        </dl>
      </section>

      <aside className="space-y-4">
        <InfoCard title={t('placedAt')}>{formatDateTime(order.createdAt, locale)}</InfoCard>
        <InfoCard title={t('deliveryTo')}>
          {address}
          {order.landmark ? <span className="block text-fg-subtle">{order.landmark}</span> : null}
        </InfoCard>
        <InfoCard title={t('contactSummary')}>
          {order.customerName}
          <span className="block">{formatUzPhone(order.customerPhone)}</span>
          {order.customerEmail ? (
            <span className="block break-all">{order.customerEmail}</span>
          ) : null}
        </InfoCard>
        <InfoCard title={t('payment')}>
          {t(`paymentMethods.${order.paymentMethod}`)}
          <span className="block text-fg-subtle">
            {t(`paymentStatuses.${order.paymentStatus}`)}
          </span>
        </InfoCard>
        {order.note ? <InfoCard title={t('note')}>{order.note}</InfoCard> : null}
      </aside>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-surface px-5 py-4">
      <h3 className="text-eyebrow text-accent-fg">{title}</h3>
      <p className="mt-1.5 text-body-sm text-fg">{children}</p>
    </div>
  );
}
