import type { CartLineDto, OrderDto } from '@teran/contracts';
import { ChevronDown } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Emblem } from '@/components/brand/logo';
import { ProductImage } from '@/components/catalog/product-image';
import { Price } from '@/components/ui/price';
import { packLabel } from '@/lib/format';

export function ReceiptPanel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section
      aria-label={title}
      className="overflow-hidden rounded-card border border-line border-t-[3px] border-t-brand bg-surface shadow-soft"
    >
      <header className="flex items-center justify-between gap-4 border-b border-line bg-brand-soft/40 px-5 py-4 sm:px-7">
        <h2 className="font-heading text-[1.5rem] leading-tight text-fg">{title}</h2>
        <Emblem className="w-10" sizes="40px" />
      </header>
      <div className="px-5 py-3 sm:px-7 sm:py-4">{children}</div>
    </section>
  );
}

export function ReceiptLines({
  items,
}: {
  items: readonly (CartLineDto | OrderDto['items'][number])[];
}) {
  const t = useTranslations('Checkout');
  const product = useTranslations('Product');
  const cart = useTranslations('Cart');
  const locale = useLocale();
  return (
    <ul className="divide-y divide-line-subtle">
      {items.map((item) => (
        <li
          key={item.sku}
          className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-x-3 py-3.5"
        >
          <span className="relative row-span-2 size-14 overflow-hidden rounded-control bg-surface-muted">
            <ProductImage image={item.image} name={item.productName} decorative sizes="56px" />
          </span>
          <span className="break-words text-body-sm font-bold text-fg">{item.productName}</span>
          <span className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-helper text-fg-subtle">
            <span>
              {[
                packLabel(item, item.format, locale, (key, values) =>
                  product(`units.${key}`, values),
                ),
                t('quantityShort', { count: item.quantity }),
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
            <Price amount={item.lineTotal} className="text-body-sm" />
          </span>
          {'issue' in item && item.issue && (
            <span className="col-start-2 text-helper text-danger">
              {cart(`issues.${item.issue}`)}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ReceiptTotals({
  subtotal,
  delivery,
  deliveryLabel,
  discount,
  total,
}: {
  subtotal: string;
  delivery?: ReactNode;
  deliveryLabel?: string;
  discount?: string;
  total?: string;
}) {
  const t = useTranslations('Checkout');
  return (
    <dl className="space-y-2 border-t border-line pt-4 pb-2 text-body-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-fg-muted">{t('subtotal')}</dt>
        <dd>
          <Price amount={subtotal} />
        </dd>
      </div>
      {delivery != null && (
        <div className="flex justify-between gap-4">
          <dt className="text-fg-muted">{deliveryLabel ?? t('delivery')}</dt>
          <dd className="text-right">{delivery}</dd>
        </div>
      )}
      {discount && Number(discount) > 0 && (
        <div className="flex justify-between gap-4">
          <dt className="text-fg-muted">{t('discount')}</dt>
          <dd>
            −<Price amount={discount} />
          </dd>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-dashed border-line-strong/60 pt-4">
        <dt className="font-heading text-[1.25rem] text-fg">{t('total')}</dt>
        <dd aria-live="polite">
          {total != null ? (
            <Price amount={total} className="text-title-lg" />
          ) : (
            <span className="text-fg-subtle">{t('totalPending')}</span>
          )}
        </dd>
      </div>
    </dl>
  );
}

export function OrderReceipt({
  order,
  compactOnMobile = false,
}: {
  order: OrderDto;
  compactOnMobile?: boolean;
}) {
  const t = useTranslations('Checkout');
  const breakdown = (
    <>
      <ReceiptLines items={order.items} />
      <ReceiptTotals
        subtotal={order.subtotal}
        discount={order.discountTotal}
        total={order.total}
        delivery={
          order.deliveryMethodName ? (
            Number(order.deliveryFee) === 0 ? (
              t('free')
            ) : (
              <Price amount={order.deliveryFee} />
            )
          ) : undefined
        }
      />
    </>
  );
  const first = order.items[0];
  return (
    <ReceiptPanel title={t('summary')}>
      {compactOnMobile && first ? (
        <>
          <details className="group lg:hidden">
            <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 py-1 text-body-sm [&::-webkit-details-marker]:hidden">
              <span className="relative block size-10 shrink-0 overflow-hidden rounded-control bg-surface-muted">
                <ProductImage
                  image={first.image}
                  name={first.productName}
                  decorative
                  sizes="40px"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold break-words">
                  {first.productName}
                  {order.items.length > 1 && ` +${order.items.length - 1}`}
                </span>
                <span className="text-helper text-fg-muted">
                  {t('quantityShort', {
                    count: order.items.reduce((count, item) => count + item.quantity, 0),
                  })}
                </span>
              </span>
              <ChevronDown
                aria-hidden
                className="size-4 shrink-0 text-brand motion-safe:transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="mt-2 border-t border-line">{breakdown}</div>
          </details>
          <div className="hidden lg:block">{breakdown}</div>
        </>
      ) : (
        breakdown
      )}
    </ReceiptPanel>
  );
}
