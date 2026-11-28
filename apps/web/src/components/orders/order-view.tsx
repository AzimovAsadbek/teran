import { isOnlinePaymentMethod, type Locale, type OrderDto } from '@teran/contracts';
import { getTranslations } from 'next-intl/server';
import { ButtonLink } from '@/components/ui/button';
import { PaymentOutcome } from '@/components/payments/payment-outcome';
import { Link } from '@/i18n/navigation';
import { getCheckoutOptions } from '@/lib/data/content';
import { formatDateTime } from '@/lib/format';
import { showPrices } from '@/lib/site';
import { OrderDetails, OrderProgress, OrderTimeline } from './order-details';
import { CheckAgain, ReorderButton } from './order-actions';

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
  const cart = await getTranslations('Cart');
  const latest = order.payments.at(-1);
  const online = isOnlinePaymentMethod(order.paymentMethod);
  const status = order.paymentStatus;
  const polling =
    online &&
    (status === 'PROCESSING' ||
      status === 'REFUND_PENDING' ||
      (status === 'REQUIRES_ACTION' && !latest?.demo) ||
      status === 'PENDING');
  const canReview = order.awaitingPayment && !(status === 'PROCESSING' && !latest?.demo);
  const available =
    canReview &&
    (await getCheckoutOptions(locale).catch(() => null))?.paymentOptions.some(
      (option) => isOnlinePaymentMethod(option.method) && option.availability !== 'unavailable',
    );
  const reviewHref = `/checkout/confirm/${order.number}${token ? `?token=${encodeURIComponent(token)}` : ''}`;

  return (
    <div className="space-y-6">
      {online && (
        <PaymentOutcome order={order} heading="h2">
          {order.paymentDueAt && canReview && (
            <p className="mt-3 text-helper text-fg-muted">
              {t('reservedUntil', { time: formatDateTime(order.paymentDueAt, locale) })}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            {polling && <CheckAgain />}
            {available && (
              <ButtonLink href={reviewHref} variant={polling ? 'secondary' : 'primary'}>
                {t(
                  status === 'FAILED' || status === 'CANCELLED' || status === 'EXPIRED'
                    ? 'retryPayment'
                    : 'reviewOrder',
                )}
              </ButtonLink>
            )}
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center text-body-sm font-semibold text-brand underline underline-offset-4"
            >
              {t('support')}
            </Link>
          </div>
        </PaymentOutcome>
      )}

      <section
        aria-label={t('statusTitle')}
        className="rounded-panel border border-line bg-surface p-5 sm:p-7"
      >
        <p className="mb-4 text-body-sm text-fg-muted">
          {t('statusTitle')}: <strong className="text-fg">{t(`statuses.${order.status}`)}</strong>
        </p>
        <OrderProgress
          hasDelivery={order.deliveryMethodName !== null}
          status={order.status}
          cancelReason={order.cancelReason}
        />
      </section>

      <OrderDetails order={order} locale={locale} />
      <OrderTimeline order={order} locale={locale} />

      {showPrices && account && order.items.length > 0 ? (
        <section className="flex flex-wrap items-center gap-3 rounded-panel border border-line bg-surface p-5 sm:p-7">
          <ReorderButton number={order.number} />
          <ButtonLink href="/cart" variant="secondary">
            {cart('viewCart')}
          </ButtonLink>
        </section>
      ) : null}
    </div>
  );
}
