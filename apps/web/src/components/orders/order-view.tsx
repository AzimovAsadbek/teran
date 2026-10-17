import { isOnlinePaymentMethod, type Locale, type OrderDto } from '@teran/contracts';
import { Clock } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Notice } from '@/components/ui/notice';
import { getCheckoutOptions } from '@/lib/data/content';
import { formatDateTime } from '@/lib/format';
import { OrderDetails, OrderProgress, OrderTimeline } from './order-details';
import { CheckAgain, PayOrder, ReorderButton } from './order-actions';

/**
 * Everything about one order, for its customer (account page) or the holder of the guest link:
 * what still needs doing (an online payment), progress, history, details and, for account orders,
 * putting the items back in the bag.
 */
export async function OrderStatusView({
  order,
  locale,
  token,
  account,
}: {
  order: OrderDto;
  locale: Locale;
  /** The guest link secret (needed to start a payment as a guest). */
  token: string | null;
  account: boolean;
}) {
  const t = await getTranslations('Checkout');
  const latest = order.payments.at(-1);
  const options = order.awaitingPayment
    ? ((await getCheckoutOptions(locale).catch(() => null))?.paymentOptions ?? []).filter(
        (option) => isOnlinePaymentMethod(option.method) && option.availability !== 'unavailable',
      )
    : [];
  const paidOnline = isOnlinePaymentMethod(order.paymentMethod) && order.paymentStatus === 'PAID';

  return (
    <div className="space-y-6">
      {order.awaitingPayment ? (
        <section
          aria-labelledby="awaiting-payment"
          className="rounded-panel border border-warning/30 bg-warning-soft/60 p-5 sm:p-7"
        >
          <h2 id="awaiting-payment" className="flex items-center gap-2 text-display-sm text-fg">
            <Clock aria-hidden className="h-5 w-5 text-warning" />
            {t('awaitingPaymentTitle')}
          </h2>
          {order.paymentDueAt ? (
            <p className="mt-2 text-body text-fg">
              {t('awaitingPaymentText', { time: formatDateTime(order.paymentDueAt, locale) })}
            </p>
          ) : null}
          {latest && (latest.status === 'FAILED' || latest.status === 'CANCELLED') ? (
            <Notice tone="warning" className="mt-4">
              {t('paymentFailedText')}
            </Notice>
          ) : null}
          {latest?.status === 'PROCESSING' ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-body-sm text-fg-muted">{t('paymentProcessingText')}</p>
              <CheckAgain />
            </div>
          ) : null}
          {latest?.demo ? (
            <p className="mt-3 text-body-sm text-fg-muted">{t('paymentDemoNote')}</p>
          ) : null}
          <div className="mt-5">
            <PayOrder
              number={order.number}
              token={account ? null : token}
              options={options}
              current={isOnlinePaymentMethod(order.paymentMethod) ? order.paymentMethod : null}
            />
          </div>
        </section>
      ) : null}

      {paidOnline ? (
        <Notice tone="success" role="status">
          <span className="block font-semibold">{t('paymentReceived')}</span>
          {latest?.demo ? <span className="block">{t('demoPaymentNote')}</span> : null}
        </Notice>
      ) : null}

      <section
        aria-label={t('statusTitle')}
        className="rounded-panel border border-line bg-surface p-5 sm:p-7"
      >
        <p className="mb-4 text-body-sm text-fg-muted">
          {t('statusTitle')}: <strong className="text-fg">{t(`statuses.${order.status}`)}</strong>
        </p>
        <OrderProgress status={order.status} cancelReason={order.cancelReason} />
      </section>

      <OrderDetails order={order} locale={locale} />
      <OrderTimeline order={order} locale={locale} />

      {account && order.items.length > 0 ? (
        <section className="rounded-panel border border-line bg-surface p-5 sm:p-7">
          <ReorderButton number={order.number} />
        </section>
      ) : null}
    </div>
  );
}
