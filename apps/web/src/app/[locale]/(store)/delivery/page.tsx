import { regionName, type Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { POLICY_PROSE } from '@/components/content/legal-page';
import { PageHeader } from '@/components/content/page-header';
import { SupportRow } from '@/components/content/support-row';
import { Notice } from '@/components/ui/notice';
import { Skeleton } from '@/components/ui/skeleton';
import { deliveryPage } from '@/content/pages/delivery';
import { getCheckoutOptions } from '@/lib/data/content';
import { formatMoney } from '@/lib/format';
import { pageMetadata } from '@/lib/seo';
import { showPrices } from '@/lib/site';

/**
 * The page's copy. While the shop shows no prices it takes orders by phone and messengers, so the
 * parts about placing an order say that instead of describing checkout.
 */
function copyFor(locale: Locale) {
  const page = deliveryPage[locale];
  return showPrices ? page : { ...page, ...page.byContact };
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const page = copyFor(locale);
  return pageMetadata({
    title: page.title,
    description: page.description,
    href: '/delivery',
    locale,
  });
}

/** The policy pages' section heading (components/content/long-form.tsx). */
const HEADING = 'font-heading text-[1.375rem] leading-snug text-balance text-fg sm:text-[1.5rem]';
/** A table cell of the delivery-times table: 11 by 13 px of room, rules between rows. */
const CELL = 'px-[0.8rem] py-[0.7rem] text-left align-middle';

/**
 * Methods, fees, estimates and coverage exactly as checkout offers them (only while the shop
 * shows prices: while orders go by phone, delivery is agreed then and the intro says so).
 */
async function ConfiguredOptions() {
  await connection();
  const locale = (await getLocale()) as Locale;
  const page = copyFor(locale);
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
    <>
      {options.deliveryMethods.length === 0 ? (
        <p>{tp('deliveryText')}</p>
      ) : (
        // Wider than a phone: the table scrolls sideways, and keyboards can reach it to scroll.
        <div
          role="region"
          aria-labelledby="methods-title"
          tabIndex={0}
          className="-mx-4 overflow-x-auto px-4"
        >
          <table className="w-full min-w-[34rem] border-collapse">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className={`${CELL} w-[30%] font-bold`}>
                  {t('deliveryMethod')}
                </th>
                <th scope="col" className={`${CELL} font-bold`}>
                  {tpages('coverage')}
                </th>
                <th scope="col" className={`${CELL} w-[22%] font-bold`}>
                  {tpages('estimate')}
                </th>
                {showPrices ? (
                  <th scope="col" className={`${CELL} font-bold`}>
                    {tpages('deliveryFee')}
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {options.deliveryMethods.map((method) => (
                <tr key={method.code} className="border-b border-line">
                  <th scope="row" className={`${CELL} font-medium`}>
                    {method.name}
                    {method.description ? (
                      <span className="block text-[0.875rem] leading-[1.4rem] text-fg-muted">
                        {method.description}
                      </span>
                    ) : null}
                  </th>
                  <td className={CELL}>
                    {method.regionCodes.length === 0
                      ? page.regionsAll
                      : method.regionCodes.map((code) => regionName(code, locale)).join(', ')}
                  </td>
                  <td className={CELL}>{method.estimate ?? '—'}</td>
                  {showPrices ? (
                    <td className={CELL}>
                      {Number(method.price) === 0
                        ? t('free')
                        : formatMoney(method.price, locale, currency)}
                      {method.freeFromAmount ? (
                        <span className="block text-[0.875rem] leading-[1.4rem] text-fg-muted">
                          {t('freeFrom', {
                            amount: formatMoney(method.freeFromAmount, locale, currency),
                          })}
                        </span>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showPrices && options.paymentMethods.length > 0 ? (
        <section aria-labelledby="payment-title" className="pt-8">
          <h2 id="payment-title" className={HEADING}>
            {page.paymentTitle}
          </h2>
          <ul className="mt-3 list-disc pl-6 marker:text-forest-900">
            {options.paymentMethods.map((method) => (
              <li key={method}>
                <strong className="font-bold">{t(`paymentMethods.${method}`)}.</strong>{' '}
                {t(`paymentDescriptions.${method}`)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

/**
 * Delivery on the policy pages' reading template (ADR-051): the opening, then the methods (while
 * the shop shows prices, the table of methods, regions and times checkout offers), how an order
 * goes and what is good to know, and at the end the row for writing or calling — the steps say
 * "call us or write on Telegram", and that row is where it can be done.
 */
export default async function DeliveryPage() {
  const locale = (await rootParams.locale()) as Locale;
  const page = copyFor(locale);

  return (
    <>
      <PageHeader title={page.title} />
      <div className="container-page pt-8 pb-14 sm:pt-10 lg:pt-14 lg:pb-20">
        <div className={`${POLICY_PROSE} space-y-10`}>
          <section aria-labelledby="methods-title">
            <h2 id="methods-title" className={HEADING}>
              {page.methodsTitle}
            </h2>
            <div className="mt-3 space-y-4">
              <p>{page.intro}</p>
              {showPrices ? (
                <Suspense fallback={<Skeleton className="h-40 rounded-[0.5rem]" />}>
                  <ConfiguredOptions />
                </Suspense>
              ) : null}
            </div>
          </section>
          <section aria-labelledby="steps-title">
            <h2 id="steps-title" className={HEADING}>
              {page.stepsTitle}
            </h2>
            <ol className="mt-3 list-decimal space-y-3 pl-6 marker:font-semibold marker:text-forest-900">
              {page.steps.map((step) => (
                <li key={step.title}>
                  <strong className="font-bold">{step.title}.</strong> {step.text}
                </li>
              ))}
            </ol>
          </section>
          <section aria-labelledby="notes-title">
            <h2 id="notes-title" className={HEADING}>
              {page.notesTitle}
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 marker:text-forest-900">
              {page.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      <Suspense fallback={null}>
        <SupportRow />
      </Suspense>
    </>
  );
}
