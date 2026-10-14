import type { Locale, OrderDto } from '@teran/contracts';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { OrderDetails, OrderProgress } from '@/components/orders/order-details';
import { Skeleton } from '@/components/ui/skeleton';
import { Link, getPathname } from '@/i18n/navigation';
import { ApiError } from '@/lib/api/errors';
import { apiFindAsVisitor } from '@/lib/api/server';

const ORDER_NUMBER = /^TRN-[0-9A-Z]{8}$/;

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/account/orders/[number]'>): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const { number } = await params;
  const t = await getTranslations({ locale, namespace: 'Checkout' });
  return {
    title: ORDER_NUMBER.test(number) ? t('orderTitle', { number }) : t('statusTitle'),
    robots: { index: false, follow: false },
  };
}

async function AccountOrder({
  params,
}: Pick<PageProps<'/[locale]/account/orders/[number]'>, 'params'>) {
  const [{ number }, locale] = await Promise.all([params, rootParams.locale() as Promise<Locale>]);
  const [t, ta] = await Promise.all([getTranslations('Checkout'), getTranslations('Account')]);
  if (!ORDER_NUMBER.test(number)) notFound();
  // A signed-out visitor (401) is sent to sign in and brought back here afterwards.
  const order = await apiFindAsVisitor<OrderDto>(`/account/orders/${number}`).catch(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) return 'signed-out' as const;
      throw error;
    },
  );
  if (order === 'signed-out') {
    redirect(
      getPathname({
        href: `/account/login?next=${encodeURIComponent(`/account/orders/${number}`)}`,
        locale,
      }),
    );
  }
  if (!order) notFound();

  return (
    <div className="space-y-8">
      <Link
        href="/account"
        className="inline-flex items-center gap-2 text-body-sm font-semibold text-forest-900 underline-offset-4 hover:underline"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        {ta('backToAccount')}
      </Link>
      <div>
        <p className="text-eyebrow text-accent-fg">{t('statusTitle')}</p>
        <h1 className="text-display-lg mt-2 text-forest-900">
          {t('orderTitle', { number: order.number })}
        </h1>
      </div>
      <section aria-label={t('statusTitle')} className="rounded-panel bg-surface p-5 sm:p-7">
        <p className="mb-4 text-body-sm text-fg-muted">
          {t('statusTitle')}:{' '}
          <strong className="text-forest-900">{t(`statuses.${order.status}`)}</strong>
        </p>
        <OrderProgress status={order.status} />
      </section>
      <OrderDetails order={order} locale={locale} />
    </div>
  );
}

export default function AccountOrderPage({
  params,
}: PageProps<'/[locale]/account/orders/[number]'>) {
  return (
    <div className="container-page pt-10 pb-24">
      <Suspense
        fallback={
          <div className="space-y-6" aria-hidden>
            <Skeleton className="h-14 w-1/2" />
            <Skeleton className="h-80 rounded-panel" />
          </div>
        }
      >
        <AccountOrder params={params} />
      </Suspense>
    </div>
  );
}
