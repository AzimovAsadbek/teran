import type { Locale, OrderDto } from '@teran/contracts';
import { CircleCheck, SearchX } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { OrderDetails, OrderProgress } from '@/components/orders/order-details';
import { ButtonLink } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFindAsVisitor } from '@/lib/api/server';

const ORDER_NUMBER = /^TRN-[0-9A-Z]{8}$/;

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/orders/[number]'>): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const { number } = await params;
  const t = await getTranslations({ locale, namespace: 'Checkout' });
  return {
    title: ORDER_NUMBER.test(number) ? t('orderTitle', { number }) : t('statusTitle'),
    robots: { index: false, follow: false },
    // The URL carries the secret access token: never send it to another site as a Referer.
    referrer: 'no-referrer',
  };
}

async function OrderView({
  params,
  searchParams,
}: Pick<PageProps<'/[locale]/orders/[number]'>, 'params' | 'searchParams'>) {
  const [{ number }, query, locale] = await Promise.all([params, searchParams, getLocale()]);
  const t = await getTranslations('Checkout');
  const token = typeof query.token === 'string' ? query.token : null;
  const order =
    token && ORDER_NUMBER.test(number)
      ? await apiFindAsVisitor<OrderDto>(`/orders/${number}?token=${encodeURIComponent(token)}`)
      : null;

  if (!order) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ivory-100 text-forest-900">
          <SearchX aria-hidden className="h-7 w-7" />
        </span>
        <h1 className="text-display-md mt-5 text-forest-900">{t('orderNotFound')}</h1>
        <ButtonLink href="/catalog" variant="secondary" className="mt-8">
          {t('continueShopping')}
        </ButtonLink>
      </div>
    );
  }

  const justPlaced = query.placed === '1';
  return (
    <div className="space-y-8">
      {justPlaced ? (
        <div className="rounded-[var(--radius-panel)] bg-forest-900 px-6 py-8 text-ivory-50 sm:px-10">
          <CircleCheck aria-hidden className="h-10 w-10 text-gold-300" />
          <h1 className="text-display-md mt-4">{t('thankYou')}</h1>
          <p className="mt-3 max-w-2xl text-ivory-100/90">{t('orderPlacedText')}</p>
          <p className="mt-6 text-sm text-ivory-100/80">{t('orderNumber')}</p>
          <p className="font-display text-3xl font-semibold tracking-wide text-gold-300">
            {order.number}
          </p>
          <p className="mt-6 max-w-2xl text-sm text-ivory-100/80">{t('saveLinkHint')}</p>
        </div>
      ) : (
        <div>
          <p className="text-eyebrow text-gold-700">{t('statusTitle')}</p>
          <h1 className="text-display-lg mt-2 text-forest-900">
            {t('orderTitle', { number: order.number })}
          </h1>
        </div>
      )}

      <section
        aria-label={t('statusTitle')}
        className="rounded-[var(--radius-panel)] bg-white p-5 sm:p-7"
      >
        <p className="mb-4 text-sm text-ink-700">
          {t('statusTitle')}:{' '}
          <strong className="text-forest-900">{t(`statuses.${order.status}`)}</strong>
        </p>
        <OrderProgress status={order.status} />
      </section>

      <OrderDetails order={order} locale={locale as Locale} />

      <ButtonLink href="/catalog" variant="secondary">
        {t('continueShopping')}
      </ButtonLink>
    </div>
  );
}

/** Guest order status, authorised by the secret token from the confirmation link. */
export default function OrderPage({
  params,
  searchParams,
}: PageProps<'/[locale]/orders/[number]'>) {
  return (
    <div className="container-page pt-10 pb-24">
      <Suspense
        fallback={
          <div className="space-y-6" aria-hidden>
            <Skeleton className="h-48 rounded-[var(--radius-panel)]" />
            <Skeleton className="h-24 rounded-[var(--radius-panel)]" />
            <Skeleton className="h-80 rounded-[var(--radius-panel)]" />
          </div>
        }
      >
        <OrderView params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
