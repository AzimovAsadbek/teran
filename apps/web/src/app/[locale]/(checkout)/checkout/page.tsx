import type { CurrentUserDto, Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { DemoNotice } from '@/components/ui/demo-notice';
import { Notice } from '@/components/ui/notice';
import { Skeleton } from '@/components/ui/skeleton';
import { apiGetAsVisitor } from '@/lib/api/server';
import { getCheckoutOptions } from '@/lib/data/content';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Checkout' });
  return pageMetadata({ title: t('metaTitle'), href: '/checkout', locale, noIndex: true });
}

async function CheckoutLoader() {
  await connection();
  const locale = await getLocale();
  const t = await getTranslations('Checkout');
  const [options, user] = await Promise.all([
    getCheckoutOptions(locale).catch(() => null),
    // Prefill for signed-in customers only; a guest (or an API hiccup) simply gets empty fields.
    apiGetAsVisitor<CurrentUserDto>('/auth/me').catch(() => null),
  ]);

  if (!options) {
    return (
      <Notice tone="danger" role="alert" className="mt-8">
        {t('loadError')}
      </Notice>
    );
  }
  return <CheckoutForm options={options} user={user} />;
}

export default async function CheckoutPage() {
  const t = await getTranslations('Checkout');
  return (
    <div className="container-page pt-8 pb-section-sm sm:pt-10">
      <h1 className="text-display-lg text-forest-900">{t('title')}</h1>
      <DemoNotice className="mt-4 max-w-3xl" />
      <Suspense
        fallback={
          <div
            className="mt-6 grid grid-cols-1 gap-6 sm:mt-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_26rem] xl:gap-14"
            aria-hidden
          >
            <Skeleton className="h-96 rounded-panel" />
            <Skeleton className="hidden h-80 rounded-panel lg:block" />
          </div>
        }
      >
        <CheckoutLoader />
      </Suspense>
    </div>
  );
}
