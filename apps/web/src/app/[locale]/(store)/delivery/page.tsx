import { regionName, type Locale } from '@teran/contracts';
import { Banknote, Clock, MapPin, Truck } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { HelpFooter } from '@/components/content/help-footer';
import { PageHeader } from '@/components/content/page-header';
import { Notice } from '@/components/ui/notice';
import { Skeleton } from '@/components/ui/skeleton';
import { deliveryPage } from '@/content/pages/delivery';
import { getCheckoutOptions } from '@/lib/data/content';
import { formatMoney } from '@/lib/format';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const page = deliveryPage[locale];
  return pageMetadata({
    title: page.title,
    description: page.description,
    href: '/delivery',
    locale,
  });
}

/** Methods, fees, estimates, coverage and payment methods exactly as checkout offers them. */
async function ConfiguredOptions() {
  await connection();
  const locale = await getLocale();
  const page = deliveryPage[locale];
  const [t, tc, tp, tpages] = await Promise.all([
    getTranslations('Checkout'),
    getTranslations('Common'),
    getTranslations('Product'),
    getTranslations('Pages'),
  ]);
  const options = await getCheckoutOptions(locale).catch(() => null);
  if (!options) {
    return (
      <Notice tone="danger" role="alert">
        {t('loadError')}
      </Notice>
    );
  }
  const currency = tc('currency.UZS');

  return (
    <div className="space-y-16">
      <section aria-labelledby="methods-title">
        <h2 id="methods-title" className="text-display-md text-forest-900">
          {page.methodsTitle}
        </h2>
        {options.deliveryMethods.length === 0 ? (
          <p className="mt-4 text-body-lg text-fg-muted">{tp('deliveryText')}</p>
        ) : (
          <ul className="mt-6 grid gap-5 md:grid-cols-2">
            {options.deliveryMethods.map((method) => (
              <li
                key={method.code}
                className="rounded-panel border border-line bg-surface p-6 sm:p-8"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="flex items-center gap-3 text-display-sm text-forest-900">
                    <Truck aria-hidden className="h-6 w-6 text-accent-fg" />
                    {method.name}
                  </h3>
                  <p className="text-right text-title-lg text-fg">
                    {Number(method.price) === 0
                      ? t('free')
                      : formatMoney(method.price, locale, currency)}
                  </p>
                </div>
                {method.description ? (
                  <p className="mt-3 text-body text-fg-muted">{method.description}</p>
                ) : null}
                <dl className="mt-5 space-y-2 border-t border-line pt-4 text-body-sm">
                  {method.estimate ? (
                    <div className="flex items-start gap-3">
                      <dt className="sr-only">{tpages('estimate')}</dt>
                      <Clock aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-fg" />
                      <dd>{method.estimate}</dd>
                    </div>
                  ) : null}
                  {method.freeFromAmount ? (
                    <div className="flex items-start gap-3 text-success">
                      <dt className="sr-only">{tpages('freeDelivery')}</dt>
                      <Banknote aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                      <dd>
                        {t('freeFrom', {
                          amount: formatMoney(method.freeFromAmount, locale, currency),
                        })}
                      </dd>
                    </div>
                  ) : null}
                  <div className="flex items-start gap-3">
                    <dt className="sr-only">{tpages('coverage')}</dt>
                    <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-fg" />
                    <dd>
                      {method.regionCodes.length === 0
                        ? page.regionsAll
                        : method.regionCodes.map((code) => regionName(code, locale)).join(', ')}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="steps-title">
        <h2 id="steps-title" className="text-display-md text-forest-900">
          {page.stepsTitle}
        </h2>
        <ol className="mt-6 grid gap-5 sm:grid-cols-3">
          {page.steps.map((step, index) => (
            <li key={step.title} className="rounded-card border border-line bg-surface p-6">
              <span
                aria-hidden
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-body-sm font-semibold text-fg-inverse"
              >
                {index + 1}
              </span>
              <h3 className="mt-4 text-title text-fg">{step.title}</h3>
              <p className="mt-1.5 text-body text-fg-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {options.paymentMethods.length > 0 ? (
        <section aria-labelledby="payment-title">
          <h2 id="payment-title" className="text-display-md text-forest-900">
            {page.paymentTitle}
          </h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {options.paymentMethods.map((method) => (
              <li key={method} className="rounded-card border border-line bg-surface p-6">
                <p className="text-title text-fg">{t(`paymentMethods.${method}`)}</p>
                <p className="mt-1.5 text-body text-fg-muted">
                  {t(`paymentDescriptions.${method}`)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export default async function DeliveryPage() {
  const locale = (await rootParams.locale()) as Locale;
  const page = deliveryPage[locale];
  const t = await getTranslations('Pages');

  return (
    <>
      <PageHeader
        eyebrow={t('helpEyebrow')}
        title={page.title}
        intro={page.intro}
        illustration="herbal"
      />
      <div className="container-page space-y-14 py-12 sm:py-16">
        <Suspense
          fallback={
            <div className="grid gap-5 md:grid-cols-2" aria-hidden>
              <Skeleton className="h-56 rounded-panel" />
              <Skeleton className="h-56 rounded-panel" />
            </div>
          }
        >
          <ConfiguredOptions />
        </Suspense>
        <section aria-labelledby="notes-title" className="max-w-3xl">
          <h2 id="notes-title" className="text-display-md text-forest-900">
            {page.notesTitle}
          </h2>
          <ul className="mt-5 list-disc space-y-2 pl-5 text-body text-fg-muted marker:text-accent sm:text-body-lg">
            {page.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      </div>
      <HelpFooter />
    </>
  );
}
