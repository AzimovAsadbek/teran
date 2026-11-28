import { isOnlinePaymentMethod, type OrderDto } from '@teran/contracts';
import { useTranslations } from 'next-intl';
import { CheckAgain } from '@/components/orders/order-actions';
import { ButtonLink } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { buyerOrderPath } from '@/lib/payment-order';
import { PaymentOutcome } from './payment-outcome';
import { CheckoutSteps } from './payment-ui';
import { OrderReceipt } from './receipt';

export function PaymentResult({ order, token }: { order: OrderDto; token: string | null }) {
  const t = useTranslations('Checkout');
  const status = order.paymentStatus;
  const open =
    status === 'REQUIRES_ACTION' ||
    status === 'PENDING' ||
    status === 'PROCESSING' ||
    status === 'REFUND_PENDING';
  const retry =
    order.awaitingPayment &&
    isOnlinePaymentMethod(order.paymentMethod) &&
    (status === 'FAILED' || status === 'CANCELLED' || status === 'EXPIRED');
  const details = buyerOrderPath(order.number, token);
  const confirm = `/checkout/confirm/${order.number}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  return (
    <>
      <CheckoutSteps current="result" />
      <div className="mt-5 grid items-start gap-5 md:mt-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-10">
        <PaymentOutcome order={order}>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {open && <CheckAgain />}
            {retry && <ButtonLink href={confirm}>{t('retryPayment')}</ButtonLink>}
            <ButtonLink href={details} variant={open || retry ? 'secondary' : 'primary'}>
              {t('orderDetails')}
            </ButtonLink>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5">
            <Link
              href="/catalog"
              className="inline-flex min-h-11 items-center text-body-sm font-semibold text-brand underline underline-offset-4"
            >
              {t('continueShopping')}
            </Link>
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center text-body-sm font-semibold text-brand underline underline-offset-4"
            >
              {t('support')}
            </Link>
          </div>
        </PaymentOutcome>
        <OrderReceipt order={order} />
      </div>
    </>
  );
}
