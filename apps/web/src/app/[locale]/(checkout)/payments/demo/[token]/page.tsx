import type { Locale } from '@teran/contracts';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { PaymentShell } from '@/components/payments/payment-ui';
import { PaymentLinkState } from '@/components/payments/payment-link-state';
import { getPathname } from '@/i18n/navigation';
import { paymentToken } from '@/lib/payment-order';

export const metadata = {
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
} as const;

async function PreviousPayment({ params }: PageProps<'/[locale]/payments/demo/[token]'>) {
  const { token, locale } = await params;
  if (!paymentToken.test(token)) return <PaymentLinkState />;
  redirect(getPathname({ locale: locale as Locale, href: `/payments/return/${token}` }));
}

/** Previously issued bookmarks now open the order's verified payment status. */
export default function PreviousPaymentPage(props: PageProps<'/[locale]/payments/demo/[token]'>) {
  return (
    <PaymentShell>
      <Suspense fallback={<PaymentLinkState loading />}>
        <PreviousPayment {...props} />
      </Suspense>
    </PaymentShell>
  );
}
