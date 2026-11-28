import { isOnlinePaymentMethod, type Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { PayOrder } from '@/components/orders/order-actions';
import { PaymentLinkState } from '@/components/payments/payment-link-state';
import { PaymentResult } from '@/components/payments/payment-result';
import { CheckoutSteps, PaymentShell } from '@/components/payments/payment-ui';
import { OrderReceipt } from '@/components/payments/receipt';
import { Price } from '@/components/ui/price';
import { Link } from '@/i18n/navigation';
import { getCheckoutOptions } from '@/lib/data/content';
import { formatDateTime } from '@/lib/format';
import { buyerOrderPath, readBuyerOrder } from '@/lib/payment-order';

type Props = PageProps<'/[locale]/checkout/confirm/[number]'>;

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Checkout' });
  return {
    title: t('reviewTitle'),
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  };
}

async function Review({ params, searchParams }: Props) {
  const [{ number, locale }, query] = await Promise.all([params, searchParams]);
  const token = typeof query.token === 'string' ? query.token : null;
  const order = await readBuyerOrder(
    number,
    token,
    locale as Locale,
    `/checkout/confirm/${number}`,
  );
  if (!order) return <PaymentLinkState />;
  const latest = order.payments.at(-1);
  if (
    !order.awaitingPayment ||
    !isOnlinePaymentMethod(order.paymentMethod) ||
    (latest?.status === 'PROCESSING' && !latest.demo)
  )
    return <PaymentResult order={order} token={token} />;

  const [t, options] = await Promise.all([
    getTranslations('Checkout'),
    getCheckoutOptions(locale as Locale),
  ]);
  const methods = options.paymentOptions.filter(
    (option) => isOnlinePaymentMethod(option.method) && option.availability !== 'unavailable',
  );
  return (
    <>
      <CheckoutSteps current="confirm" />
      <h1 className="mt-4 font-heading text-[clamp(2.2rem,4vw,3.6rem)] leading-tight tracking-tight text-fg">
        {t('reviewTitle')}
      </h1>
      <p className="mt-2 max-w-prose text-body text-fg-muted">{t('reviewNote')}</p>
      <div className="mt-6 grid items-start gap-5 sm:mt-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-12">
        <aside className="min-w-0 lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1">
          <OrderReceipt order={order} compactOnMobile />
        </aside>
        <section
          aria-label={t('payment')}
          className="min-w-0 rounded-card border border-line bg-surface p-5 sm:p-8 lg:col-start-1 lg:row-start-1"
        >
          <dl className="space-y-4 border-b border-line pb-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <dt className="text-body-sm text-fg-muted">{t('orderNumber')}</dt>
              <dd className="font-semibold tracking-wide">{order.number}</dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <dt className="text-body text-fg">{t('amountDue')}</dt>
              <dd>
                <Price amount={order.total} className="text-title-lg" />
              </dd>
            </div>
          </dl>
          <div className="my-5">
            <PayOrder
              number={order.number}
              token={token}
              amount={order.total}
              current={order.paymentMethod}
              options={methods}
            />
          </div>
          {order.paymentDueAt && (
            <p className="text-helper text-fg-muted">
              {t('reservedUntil', { time: formatDateTime(order.paymentDueAt, locale as Locale) })}
            </p>
          )}
          <Link
            href={buyerOrderPath(number, token)}
            className="mt-1 inline-flex min-h-11 items-center text-body-sm font-semibold text-brand underline underline-offset-4"
          >
            {t('orderDetails')}
          </Link>
        </section>
      </div>
    </>
  );
}

export default function ConfirmPage(props: Props) {
  return (
    <PaymentShell>
      <Suspense fallback={<PaymentLinkState loading />}>
        <Review {...props} />
      </Suspense>
    </PaymentShell>
  );
}
