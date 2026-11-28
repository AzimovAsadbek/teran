import type { OrderDto, PaymentStatus } from '@teran/contracts';
import {
  Check,
  CirclePause,
  Clock3,
  Hourglass,
  RotateCcw,
  TimerOff,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Price } from '@/components/ui/price';
import { cn } from '@/lib/cn';
import { PaymentBadge, paymentStatusColors } from './payment-ui';

const statusIcons = {
  PENDING: Clock3,
  REQUIRES_ACTION: Clock3,
  PROCESSING: Hourglass,
  PAID: Check,
  FAILED: X,
  CANCELLED: CirclePause,
  EXPIRED: TimerOff,
  REFUNDED: RotateCcw,
  PARTIALLY_REFUNDED: RotateCcw,
  REFUND_PENDING: Hourglass,
} satisfies Record<PaymentStatus, LucideIcon>;

export function PaymentOutcome({
  order,
  heading = 'h1',
  children,
}: {
  order: OrderDto;
  heading?: 'h1' | 'h2';
  children?: ReactNode;
}) {
  const t = useTranslations('Checkout');
  const status = order.paymentStatus;
  const latest = order.payments.at(-1);
  const Icon = statusIcons[status];
  const Heading = heading;
  return (
    <section
      aria-label={t('payment')}
      className="min-w-0 rounded-card border border-line bg-surface px-5 py-6 sm:p-8"
    >
      <div className="flex items-center justify-between gap-4">
        <span
          aria-hidden
          className={cn(
            'inline-flex size-12 items-center justify-center rounded-full',
            paymentStatusColors[status],
          )}
        >
          <Icon
            className={cn(
              'size-6',
              (status === 'PROCESSING' || status === 'REFUND_PENDING') &&
                'motion-safe:animate-pulse',
            )}
            strokeWidth={1.7}
          />
        </span>
        <PaymentBadge status={status} label={t(`paymentStatuses.${status}`)} />
      </div>
      <div aria-live="polite" aria-atomic="true" className="mt-5">
        <Heading className="font-heading text-[clamp(1.65rem,3.2vw,2.75rem)] leading-tight tracking-tight text-balance text-fg">
          {t(`outcomeTitles.${status}`)}
        </Heading>
        <p className="mt-2 max-w-prose text-body text-fg-muted">{t(`outcomeNotes.${status}`)}</p>
      </div>
      {latest?.demo && (
        <p className="mt-3 text-helper font-semibold text-warning">{t('demoPaymentNote')}</p>
      )}
      <dl className="mt-5 grid gap-x-4 gap-y-4 border-y border-line py-4 min-[460px]:grid-cols-2">
        <div>
          <dt className="text-helper text-fg-subtle">{t('orderNumber')}</dt>
          <dd className="font-semibold tracking-wide text-fg">{order.number}</dd>
        </div>
        <div>
          <dt className="text-helper text-fg-subtle">{t('paymentSection')}</dt>
          <dd className="font-semibold text-fg">{t(`paymentMethods.${order.paymentMethod}`)}</dd>
        </div>
        <div>
          <dt className="text-helper text-fg-subtle">{t('orderAmount')}</dt>
          <dd>
            <Price amount={order.total} />
          </dd>
        </div>
        {latest?.receipts?.map((receipt) => (
          <div key={receipt.operation} className="self-end">
            <a
              href={receipt.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center font-semibold text-brand underline underline-offset-4"
            >
              {t(receipt.operation === 'PERFORM' ? 'fiscalReceipt' : 'refundReceipt')}
            </a>
          </div>
        ))}
      </dl>
      {children}
    </section>
  );
}
