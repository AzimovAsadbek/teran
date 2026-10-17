import { isStaffRole, type AccountSummaryDto, type Locale } from '@teran/contracts';
import { ArrowRight, CreditCard, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { AccountPanel, OrderRow } from '@/components/account/account-ui';
import { LogoutButton } from '@/components/account/logout';
import { ButtonLink } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { requireUser } from '@/lib/account';
import { apiGetAsVisitor } from '@/lib/api/server';
import { formatDate } from '@/lib/format';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Account' });
  return pageMetadata({ title: t('metaTitle'), href: '/account', locale, noIndex: true });
}

/** Overview: only what the API reports for this customer — counts, recent orders, orders to pay. */
async function Overview() {
  const locale = (await rootParams.locale()) as Locale;
  const [t, tc] = await Promise.all([getTranslations('Account'), getTranslations('Checkout')]);
  const user = await requireUser(locale, '/account');
  const summary = await apiGetAsVisitor<AccountSummaryDto>('/account/summary').catch(() => null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow text-accent-fg">{t('title')}</p>
          <h1 className="mt-2 text-display-lg text-fg">{t('welcome', { name: user.firstName })}</h1>
          {summary ? (
            <p className="mt-1 text-body-sm text-fg-subtle">
              {t('memberSince', { date: formatDate(summary.memberSince, locale) })}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {isStaffRole(user.role) ? (
            <ButtonLink href="/admin" variant="secondary">
              <ShieldCheck aria-hidden className="h-4 w-4" />
              {t('staffArea')}
            </ButtonLink>
          ) : null}
          <LogoutButton />
        </div>
      </div>

      {!summary ? (
        <Notice tone="danger" role="alert">
          {tc('loadError')}
        </Notice>
      ) : (
        <>
          <ul className="grid grid-cols-3 gap-3">
            {(
              [
                ['statOrders', summary.ordersCount, '/account/orders'],
                ['statActive', summary.activeOrdersCount, '/account/orders?status=active'],
                ['statAddresses', summary.addressesCount, '/account/addresses'],
              ] as const
            ).map(([key, value, href]) => (
              <li key={key}>
                <Link
                  href={href}
                  className="block h-full rounded-card border border-line bg-surface px-4 py-4 transition-colors hover:border-brand/50 sm:px-5"
                >
                  <span className="block text-caption text-fg-subtle sm:text-body-sm">
                    {t(key)}
                  </span>
                  <span className="mt-1 block text-display-sm text-fg figures">{value}</span>
                </Link>
              </li>
            ))}
          </ul>

          {summary.attentionOrders.length > 0 ? (
            <section
              aria-labelledby="attention-title"
              className="rounded-panel border border-warning/30 bg-warning-soft/60 p-5 sm:p-7"
            >
              <h2 id="attention-title" className="flex items-center gap-2 text-display-sm text-fg">
                <CreditCard aria-hidden className="h-5 w-5 text-warning" />
                {t('attentionTitle')}
              </h2>
              <ul className="mt-3 divide-y divide-warning/20">
                {summary.attentionOrders.map((order) => (
                  <li key={order.number}>
                    <OrderRow order={order} locale={locale} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <AccountPanel title={t('recentOrders')}>
            {summary.recentOrders.length === 0 ? (
              <div>
                <p className="text-body text-fg-muted">{t('noOrders')}</p>
                <ButtonLink href="/catalog" variant="secondary" className="mt-5">
                  {tc('continueShopping')}
                </ButtonLink>
              </div>
            ) : (
              <>
                <ul className="divide-y divide-line">
                  {summary.recentOrders.map((order) => (
                    <li key={order.number}>
                      <OrderRow order={order} locale={locale} />
                    </li>
                  ))}
                </ul>
                <Link
                  href="/account/orders"
                  className="mt-4 inline-flex items-center gap-2 text-button text-brand hover:underline hover:underline-offset-4"
                >
                  {t('allOrders')}
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
              </>
            )}
          </AccountPanel>
        </>
      )}
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6" aria-hidden>
          <Skeleton className="h-16 w-2/3" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-24 rounded-card" />
            <Skeleton className="h-24 rounded-card" />
            <Skeleton className="h-24 rounded-card" />
          </div>
          <Skeleton className="h-72 rounded-panel" />
        </div>
      }
    >
      <Overview />
    </Suspense>
  );
}
