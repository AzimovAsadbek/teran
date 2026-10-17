import type {
  AccountOrderListItem,
  Locale,
  OrderDto,
  OrderStatus,
  PaymentStatus,
} from '@teran/contracts';
import { ChevronRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Price } from '@/components/ui/price';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';

export const ORDER_STATUS_TONE: Record<OrderStatus, string> = {
  PENDING: 'bg-warning-soft text-warning',
  CONFIRMED: 'bg-success-soft text-success',
  PROCESSING: 'bg-success-soft text-success',
  SHIPPED: 'bg-success-soft text-success',
  DELIVERED: 'bg-surface-inverse text-fg-inverse',
  CANCELLED: 'bg-surface-sunken text-fg-muted',
};

const PAYMENT_TONE: Partial<Record<PaymentStatus, string>> = {
  PAID: 'text-success',
  FAILED: 'text-danger',
  EXPIRED: 'text-danger',
  REQUIRES_ACTION: 'text-warning',
  PROCESSING: 'text-warning',
};

export function AccountPageHeader({
  title,
  text,
  actions,
}: {
  title: string;
  text?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-display-lg text-fg">{title}</h1>
        {text ? <p className="mt-2 max-w-2xl text-body text-fg-muted">{text}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function AccountPanel({
  title,
  text,
  children,
  className,
}: {
  title: string;
  text?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={title}
      className={cn('rounded-panel border border-line bg-surface p-5 sm:p-7', className)}
    >
      <h2 className="text-display-sm text-fg">{title}</h2>
      {text ? <p className="mt-1 text-body-sm text-fg-subtle">{text}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

type ListOrder = Pick<
  AccountOrderListItem,
  'number' | 'createdAt' | 'status' | 'paymentStatus' | 'total' | 'itemCount'
>;

/** One order as a row linking to its page (overview and order list). */
export async function OrderRow({ order, locale }: { order: ListOrder; locale: Locale }) {
  const [t, tc] = await Promise.all([getTranslations('Account'), getTranslations('Checkout')]);
  return (
    <Link
      href={`/account/orders/${order.number}`}
      className="group -mx-3 flex items-center gap-4 rounded-control px-3 py-4 transition-colors hover:bg-surface-muted/70"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-title-sm text-fg">{order.number}</span>
        <span className="block text-body-sm text-fg-subtle">
          {formatDate(order.createdAt, locale)} · {t('itemCount', { count: order.itemCount })}
        </span>
        <span className={cn('block text-caption font-semibold', PAYMENT_TONE[order.paymentStatus])}>
          {tc(`paymentStatuses.${order.paymentStatus}`)}
        </span>
      </span>
      <span
        className={cn(
          'rounded-full px-2.5 py-0.5 text-caption font-semibold whitespace-nowrap',
          ORDER_STATUS_TONE[order.status],
        )}
      >
        {tc(`statuses.${order.status}`)}
      </span>
      <Price amount={order.total} className="hidden text-body-sm sm:block" />
      <ChevronRight
        aria-hidden
        className="h-4 w-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5"
      />
      <span className="sr-only">{t('viewOrder')}</span>
    </Link>
  );
}

export function toListOrder(order: OrderDto): ListOrder {
  return {
    number: order.number,
    createdAt: order.createdAt,
    status: order.status,
    paymentStatus: order.paymentStatus,
    total: order.total,
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
  };
}
