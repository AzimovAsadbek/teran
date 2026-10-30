import type { DemoPaymentDto, Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { DemoPayment } from '@/components/payments/demo-payment';
import { ButtonLink } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFindAsVisitor } from '@/lib/api/server';
import { ClientMessages } from '@/i18n/client-messages';

const TOKEN = /^[A-Za-z0-9_-]{20,200}$/;

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Payment' });
  return {
    title: t('demoTitle'),
    robots: { index: false, follow: false },
    // The URL carries the payment secret: never send it to another site as a Referer.
    referrer: 'no-referrer',
  };
}

async function DemoPaymentLoader({
  params,
}: Pick<PageProps<'/[locale]/payments/demo/[token]'>, 'params'>) {
  const { token } = await params;
  const t = await getTranslations('Payment');
  const tc = await getTranslations('Checkout');
  const payment = TOKEN.test(token)
    ? await apiFindAsVisitor<DemoPaymentDto>(`/payments/demo?token=${encodeURIComponent(token)}`)
    : null;
  if (!payment) {
    return (
      <div className="mx-auto max-w-xl py-10 text-center">
        <h1 className="text-display-md text-fg">{t('linkInvalid')}</h1>
        <ButtonLink href="/" variant="secondary" className="mt-6">
          {tc('continueShopping')}
        </ButtonLink>
      </div>
    );
  }
  return (
    <ClientMessages pick={['Payment']}>
      <DemoPayment token={token} initial={payment} />
    </ClientMessages>
  );
}

/** The demonstration provider's payment page (demo mode only; no money moves). */
export default function DemoPaymentPage({ params }: PageProps<'/[locale]/payments/demo/[token]'>) {
  return (
    <div className="container-page py-10 sm:py-14">
      <Suspense fallback={<Skeleton className="mx-auto h-[30rem] max-w-xl rounded-panel" />}>
        <DemoPaymentLoader params={params} />
      </Suspense>
    </div>
  );
}
