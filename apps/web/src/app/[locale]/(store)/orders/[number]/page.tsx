import type { Locale, OrderDto } from '@teran/contracts';
import { CircleCheck, SearchX } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { OrderStatusView } from '@/components/orders/order-view';
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
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-fg">
          <SearchX aria-hidden className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-display-md text-fg">{t('orderNotFound')}</h1>
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
        <div className="on-dark relative isolate overflow-hidden rounded-panel bg-surface-inverse px-6 py-9 text-fg-inverse sm:px-10 sm:py-12">
          <span
            aria-hidden
            className="absolute -top-24 -right-24 -z-10 h-72 w-72 rounded-full border border-gold-300/20"
          />
          <span
            aria-hidden
            className="absolute -top-12 -right-12 -z-10 h-48 w-48 rounded-full border border-gold-300/15"
          />
          <CircleCheck aria-hidden className="h-10 w-10 text-accent-on-inverse" />
          <h1 className="mt-4 text-display-md">{t('thankYou')}</h1>
          <p className="mt-3 max-w-2xl text-body-lg text-ivory-50">{t('orderPlacedText')}</p>
          <div className="mt-7 inline-flex flex-col rounded-card border border-line-inverse bg-ivory-50/[0.05] px-5 py-3">
            <span className="text-caption text-ivory-50">{t('orderNumber')}</span>
            <span className="mt-0.5 text-title-lg tracking-wide text-ivory-50">{order.number}</span>
          </div>
          <p className="mt-6 max-w-2xl text-body-sm text-ivory-50">{t('saveLinkHint')}</p>
        </div>
      ) : (
        <div>
          <p className="text-eyebrow text-accent-fg">{t('statusTitle')}</p>
          <h1 className="mt-2 text-display-lg text-fg">
            {t('orderTitle', { number: order.number })}
          </h1>
        </div>
      )}

      <OrderStatusView order={order} locale={locale as Locale} token={token} account={false} />

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
    <div className="container-page pt-8 pb-section sm:pt-10">
      <Suspense
        fallback={
          <div className="space-y-6" aria-hidden>
            <Skeleton className="h-48 rounded-panel" />
            <Skeleton className="h-24 rounded-panel" />
            <Skeleton className="h-80 rounded-panel" />
          </div>
        }
      >
        <OrderView params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
