import {
  ACCOUNT_ORDER_FILTERS,
  type AccountOrderFilter,
  type Locale,
  type OrderDto,
  type Paginated,
} from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { AccountPageHeader, OrderRow, toListOrder } from '@/components/account/account-ui';
import { Pagination } from '@/components/catalog/pagination';
import { Notice } from '@/components/ui/notice';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { requireUser } from '@/lib/account';
import { apiGetAsVisitor } from '@/lib/api/server';
import { cn } from '@/lib/cn';
import { pageMetadata } from '@/lib/seo';

const PAGE_SIZE = 10;

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Account' });
  return pageMetadata({ title: t('orders'), href: '/account/orders', locale, noIndex: true });
}

function filterFrom(value: string | string[] | undefined): AccountOrderFilter {
  return typeof value === 'string' && (ACCOUNT_ORDER_FILTERS as readonly string[]).includes(value)
    ? (value as AccountOrderFilter)
    : 'all';
}

async function Orders({
  searchParams,
}: Pick<PageProps<'/[locale]/account/orders'>, 'searchParams'>) {
  const [query, locale] = await Promise.all([searchParams, rootParams.locale() as Promise<Locale>]);
  const [t, tc] = await Promise.all([getTranslations('Account'), getTranslations('Checkout')]);
  const status = filterFrom(query.status);
  const pageNumber = Number(query.page);
  const page = Number.isInteger(pageNumber) && pageNumber > 1 ? pageNumber : 1;
  const search = new URLSearchParams({ status, page: String(page), pageSize: String(PAGE_SIZE) });
  await requireUser(locale, `/account/orders?${search.toString()}`);
  const orders = await apiGetAsVisitor<Paginated<OrderDto>>(
    `/account/orders?${search.toString()}`,
  ).catch(() => null);

  const hrefFor = (filter: AccountOrderFilter, target = 1) => {
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('status', filter);
    if (target > 1) params.set('page', String(target));
    const text = params.toString();
    return text ? `/account/orders?${text}` : '/account/orders';
  };

  return (
    <div className="space-y-6">
      <AccountPageHeader title={t('orders')} />
      <nav aria-label={t('orderFilterLabel')}>
        <ul className="flex flex-wrap gap-2">
          {ACCOUNT_ORDER_FILTERS.map((filter) => (
            <li key={filter}>
              <Link
                href={hrefFor(filter)}
                aria-current={filter === status ? 'page' : undefined}
                className={cn(
                  'inline-flex h-9 items-center rounded-full border px-3.5 text-body-sm font-medium transition-colors',
                  filter === status
                    ? 'border-brand bg-brand text-fg-inverse'
                    : 'border-line-strong/45 bg-surface text-fg hover:border-brand/60',
                )}
              >
                {t(`orderFilters.${filter}`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {!orders ? (
        <Notice tone="danger" role="alert">
          {tc('loadError')}
        </Notice>
      ) : orders.items.length === 0 ? (
        <p className="rounded-panel border border-line bg-surface p-7 text-body text-fg-muted">
          {status === 'all' ? t('noOrders') : t('noOrdersInFilter')}
        </p>
      ) : (
        <div className="rounded-panel border border-line bg-surface px-5 sm:px-7">
          <ul className="divide-y divide-line">
            {orders.items.map((order) => (
              <li key={order.number}>
                <OrderRow order={toListOrder(order)} locale={locale} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {orders ? (
        <Pagination
          page={orders.page}
          totalPages={orders.totalPages}
          hrefFor={(target) => hrefFor(status, target)}
        />
      ) : null}
    </div>
  );
}

export default function AccountOrdersPage({ searchParams }: PageProps<'/[locale]/account/orders'>) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6" aria-hidden>
          <Skeleton className="h-12 w-1/2" />
          <Skeleton className="h-9 w-80" />
          <Skeleton className="h-96 rounded-panel" />
        </div>
      }
    >
      <Orders searchParams={searchParams} />
    </Suspense>
  );
}
