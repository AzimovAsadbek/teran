import type { Locale, PaymentReturnDto } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFindAsVisitor } from '@/lib/api/server';

const TOKEN = /^[A-Za-z0-9_-]{20,200}$/;

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Payment' });
  return {
    title: t('returnTitle'),
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  };
}

/**
 * Where the payment provider (or the demo page) sends the customer back. Arriving here proves
 * nothing about the payment: the customer is taken to the order, which shows the payment state
 * the API recorded from the provider's own confirmation.
 */
async function PaymentReturn({
  params,
}: Pick<PageProps<'/[locale]/payments/return/[token]'>, 'params'>) {
  const { token } = await params;
  const landing = TOKEN.test(token)
    ? await apiFindAsVisitor<PaymentReturnDto>(
        `/payments/return?token=${encodeURIComponent(token)}`,
      )
    : null;
  if (landing) redirect(landing.orderPath);

  const [t, tc] = await Promise.all([getTranslations('Payment'), getTranslations('Checkout')]);
  return (
    <div className="mx-auto max-w-xl py-10 text-center">
      <h1 className="text-display-md text-forest-900">{t('linkInvalid')}</h1>
      <ButtonLink href="/" variant="secondary" className="mt-6">
        {tc('continueShopping')}
      </ButtonLink>
    </div>
  );
}

export default function PaymentReturnPage({
  params,
}: PageProps<'/[locale]/payments/return/[token]'>) {
  return (
    <div className="container-page py-10 sm:py-14">
      <Suspense fallback={<Skeleton className="mx-auto h-48 max-w-xl rounded-panel" />}>
        <PaymentReturn params={params} />
      </Suspense>
    </div>
  );
}
