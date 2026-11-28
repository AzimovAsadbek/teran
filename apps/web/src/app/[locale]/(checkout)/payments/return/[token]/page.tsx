import type { Locale, PaymentReturnDto } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { PaymentResult } from '@/components/payments/payment-result';
import { PaymentShell } from '@/components/payments/payment-ui';
import { PaymentLinkState } from '@/components/payments/payment-link-state';
import { buyerOrderPath, readBuyerOrder, paymentToken } from '@/lib/payment-order';
import { apiFindAsVisitor } from '@/lib/api/server';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Payment' });
  return {
    title: t('returnTitle'),
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  };
}

/** Only the authenticated return lookup and the latest authorised order determine this view. */
async function PaymentReturn({
  params,
}: Pick<PageProps<'/[locale]/payments/return/[token]'>, 'params'>) {
  const { token, locale } = await params;
  const landing = paymentToken.test(token)
    ? await apiFindAsVisitor<PaymentReturnDto>(
        `/payments/return?token=${encodeURIComponent(token)}`,
      )
    : null;
  if (!landing) return <PaymentLinkState />;
  // Legacy guest links carry their own order token, distinct from the provider return token.
  const guestToken = new URLSearchParams(landing.orderPath.split('?')[1]).get('token');
  const order = await readBuyerOrder(
    landing.orderNumber,
    guestToken,
    locale as Locale,
    buyerOrderPath(landing.orderNumber, guestToken),
  );
  return order ? <PaymentResult order={order} token={guestToken} /> : <PaymentLinkState />;
}

export default function PaymentReturnPage({
  params,
}: PageProps<'/[locale]/payments/return/[token]'>) {
  return (
    <PaymentShell>
      <Suspense fallback={<PaymentLinkState loading />}>
        <PaymentReturn params={params} />
      </Suspense>
    </PaymentShell>
  );
}
