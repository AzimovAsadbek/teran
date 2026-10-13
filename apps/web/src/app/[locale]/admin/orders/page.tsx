import {
  formatUzPhone,
  ORDER_STATUSES,
  type AdminOrderListItem,
  type CurrentUserDto,
  type Locale,
  type Paginated,
} from '@teran/contracts';
import { Download } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Pagination } from '@/components/catalog/pagination';
import {
  AccessDenied,
  AdminPageHeader,
  EmptyState,
  FilterForm,
  FilterSelect,
  OrderStatusPill,
  PaymentStatusPill,
  table,
} from '@/components/admin/ui';
import { Link } from '@/i18n/navigation';
import { adminGet, apiQuery, pageHref, param } from '@/lib/admin/server';
import { apiGetAsVisitor } from '@/lib/api/server';
import { formatDateTime, formatMoney } from '@/lib/format';

const FILTERS = ['q', 'status', 'from', 'to'] as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('orders.title') };
}

export default async function AdminOrdersPage({
  searchParams,
}: PageProps<'/[locale]/admin/orders'>) {
  const [params, locale, t, tco, tc] = await Promise.all([
    searchParams,
    getLocale(),
    getTranslations('Admin'),
    getTranslations('Checkout'),
    getTranslations('Common'),
  ]);
  const [orders, user] = await Promise.all([
    adminGet<Paginated<AdminOrderListItem>>(
      `/orders${apiQuery(params, [...FILTERS, 'page'], { pageSize: '25' })}`,
    ),
    apiGetAsVisitor<CurrentUserDto>('/auth/me'),
  ]);
  if (!orders) return <AccessDenied />;
  const isAdmin = user?.role === 'ADMIN';
  const exportQuery = apiQuery(params, ['status', 'from', 'to']);

  return (
    <>
      <AdminPageHeader
        title={t('orders.title')}
        actions={
          isAdmin ? (
            <a
              href={`/api/v1/admin/reports/orders.csv${exportQuery}`}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-forest-900/25 px-5 text-sm font-semibold text-forest-900 hover:bg-forest-900/[0.04]"
              title={t('orders.exportHint')}
            >
              <Download aria-hidden className="h-4 w-4" />
              {t('common.export')}
            </a>
          ) : null
        }
      />
      <FilterForm
        action="/admin/orders"
        q={param(params, 'q')}
        placeholder={t('orders.searchPlaceholder')}
      >
        <FilterSelect
          name="status"
          label={t('orders.status')}
          value={param(params, 'status')}
          options={[
            { value: '', label: t('common.all') },
            ...ORDER_STATUSES.map((status) => ({
              value: status,
              label: tco(`statuses.${status}`),
            })),
          ]}
        />
        <label className="flex flex-col gap-1 text-xs font-semibold text-ink-500">
          {t('orders.from')}
          <input
            type="date"
            name="from"
            defaultValue={param(params, 'from')}
            className="h-11 rounded-full border border-sage-500 bg-white px-4 text-sm font-normal text-ink-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-ink-500">
          {t('orders.to')}
          <input
            type="date"
            name="to"
            defaultValue={param(params, 'to')}
            className="h-11 rounded-full border border-sage-500 bg-white px-4 text-sm font-normal text-ink-900"
          />
        </label>
      </FilterForm>

      {orders.items.length === 0 ? (
        <EmptyState>{t('common.noResults')}</EmptyState>
      ) : (
        <div className={table.wrapper}>
          <table className={table.table}>
            <thead>
              <tr>
                <th scope="col" className={table.th}>
                  {t('orders.number')}
                </th>
                <th scope="col" className={table.th}>
                  {t('orders.date')}
                </th>
                <th scope="col" className={table.th}>
                  {t('orders.customer')}
                </th>
                <th scope="col" className={`${table.th} text-right`}>
                  {t('orders.items')}
                </th>
                <th scope="col" className={`${table.th} text-right`}>
                  {t('orders.total')}
                </th>
                <th scope="col" className={table.th}>
                  {t('orders.status')}
                </th>
                <th scope="col" className={table.th}>
                  {t('orders.payment')}
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.items.map((order) => (
                <tr key={order.id} className="hover:bg-ivory-50">
                  <td className={table.td}>
                    <Link href={`/admin/orders/${order.number}`} className={table.link}>
                      {order.number}
                    </Link>
                  </td>
                  <td className={`${table.td} whitespace-nowrap text-ink-700`}>
                    {formatDateTime(order.createdAt, locale)}
                  </td>
                  <td className={table.td}>
                    {order.customerName}
                    <span className="block text-xs text-ink-500">
                      {formatUzPhone(order.customerPhone)}
                    </span>
                  </td>
                  <td className={`${table.td} text-right tabular-nums`}>{order.itemCount}</td>
                  <td
                    className={`${table.td} text-right font-semibold whitespace-nowrap tabular-nums`}
                  >
                    {formatMoney(order.total, locale, tc('currency.UZS'))}
                  </td>
                  <td className={table.td}>
                    <OrderStatusPill status={order.status} />
                  </td>
                  <td className={table.td}>
                    <PaymentStatusPill status={order.paymentStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        page={orders.page}
        totalPages={orders.totalPages}
        hrefFor={(page) => pageHref('/admin/orders', params, FILTERS, page)}
      />
    </>
  );
}
