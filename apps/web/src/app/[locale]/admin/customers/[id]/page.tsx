import { formatUzPhone } from '@teran/contracts';
import type { AdminCustomer, AdminOrderListItem, Locale } from '@teran/contracts';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import {
  AdminPageHeader,
  OrderStatusPill,
  Panel,
  PaymentStatusPill,
  table,
} from '@/components/admin/ui';
import { Link } from '@/i18n/navigation';
import { adminGet } from '@/lib/admin/server';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('customers.title') };
}

export default async function AdminCustomerPage({
  params,
}: PageProps<'/[locale]/admin/customers/[id]'>) {
  const [{ id }, locale, t, tc] = await Promise.all([
    params,
    getLocale(),
    getTranslations('Admin'),
    getTranslations('Common'),
  ]);
  if (!UUID.test(id)) notFound();
  const data = await adminGet<{ customer: AdminCustomer; orders: AdminOrderListItem[] }>(
    `/customers/${id}`,
  ).catch(() => null);
  if (!data) notFound();
  const { customer, orders } = data;

  return (
    <>
      <Link
        href="/admin/customers"
        className="mb-4 inline-flex items-center gap-2 text-body-sm font-semibold text-forest-900 hover:underline"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        {t('customers.title')}
      </Link>
      <AdminPageHeader
        title={[customer.firstName, customer.lastName].filter(Boolean).join(' ')}
        description={`${customer.email}${customer.phone ? ` · ${formatUzPhone(customer.phone)}` : ''} · ${t('customers.registered')}: ${formatDate(customer.createdAt, locale as Locale)}`}
      />
      <Panel title={`${t('customers.orders')} (${customer.orderCount})`}>
        {orders.length === 0 ? (
          <p className="text-fg-subtle">{t('common.empty')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {orders.map((order) => (
              <li
                key={order.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-body-sm"
              >
                <Link href={`/admin/orders/${order.number}`} className={table.link}>
                  {order.number}
                </Link>
                <span className="text-fg-subtle">
                  {formatDateTime(order.createdAt, locale as Locale)}
                </span>
                <span className="flex-1" />
                <span className="font-semibold tabular-nums">
                  {formatMoney(order.total, locale, tc('currency.UZS'))}
                </span>
                <OrderStatusPill status={order.status} />
                <PaymentStatusPill status={order.paymentStatus} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
