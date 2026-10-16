import {
  formatUzPhone,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  type AdminOrderListItem,
  type Locale,
  type OrderStatus,
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
  Cell,
  EmptyState,
  FilterForm,
  FilterSelect,
  OrderStatusPill,
  PaymentStatusPill,
  StatusTabs,
  table,
} from '@/components/admin/ui';
import { buttonClasses } from '@/components/ui/button';
import { inputClasses } from '@/components/ui/controls';
import { Link } from '@/i18n/navigation';
import { currentUser } from '@/lib/account';
import { adminGet, apiQuery, getAdminBadges, pageHref, param } from '@/lib/admin/server';
import { formatDateTime, formatMoney } from '@/lib/format';

const FILTERS = ['q', 'status', 'paymentStatus', 'from', 'to'] as const;
/** Statuses that are work in progress: their tabs show how many orders wait in them. */
const QUEUE: readonly OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'];

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
  const [orders, user, badges] = await Promise.all([
    adminGet<Paginated<AdminOrderListItem>>(
      `/orders${apiQuery(params, [...FILTERS, 'page'], { pageSize: '25' })}`,
    ),
    currentUser(),
    getAdminBadges(),
  ]);
  if (!orders) return <AccessDenied />;
  const isAdmin = user?.role === 'ADMIN';
  const exportQuery = apiQuery(params, ['status', 'from', 'to']);
  const status = param(params, 'status');
  /** The list URL with one filter changed (the page always starts again from 1). */
  const withStatus = (value: OrderStatus | undefined) => {
    const query = new URLSearchParams();
    for (const key of ['q', 'paymentStatus', 'from', 'to'] as const) {
      const current = param(params, key);
      if (current) query.set(key, current);
    }
    if (value) query.set('status', value);
    const text = query.toString();
    return text ? `/admin/orders?${text}` : '/admin/orders';
  };
  const filtered = FILTERS.some((key) => param(params, key));

  return (
    <>
      <AdminPageHeader
        title={t('orders.title')}
        actions={
          isAdmin ? (
            <a
              href={`/api/v1/admin/reports/orders.csv${exportQuery}`}
              className={buttonClasses('secondary')}
              title={t('orders.exportHint')}
            >
              <Download aria-hidden className="h-4 w-4" />
              {t('common.export')}
            </a>
          ) : null
        }
      />
      <StatusTabs
        label={t('orders.status')}
        tabs={[
          { href: withStatus(undefined), label: t('orders.allStatuses'), current: !status },
          ...ORDER_STATUSES.map((value) => ({
            href: withStatus(value),
            label: t(`orderStatus.${value}`),
            count: QUEUE.includes(value) ? badges?.ordersByStatus[value] : undefined,
            current: status === value,
          })),
        ]}
      />
      <FilterForm
        action="/admin/orders"
        q={param(params, 'q')}
        placeholder={t('orders.searchPlaceholder')}
        active={filtered}
      >
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <FilterSelect
          name="paymentStatus"
          label={t('orders.payment')}
          value={param(params, 'paymentStatus')}
          options={[
            { value: '', label: t('common.all') },
            ...PAYMENT_STATUSES.map((value) => ({
              value,
              label: tco(`paymentStatuses.${value}`),
            })),
          ]}
        />
        <label className="flex flex-col gap-1.5 text-label text-fg-muted">
          {t('orders.from')}
          <input
            type="date"
            name="from"
            defaultValue={param(params, 'from')}
            className={inputClasses({ size: 'sm', fullWidth: false, className: 'font-normal' })}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-label text-fg-muted">
          {t('orders.to')}
          <input
            type="date"
            name="to"
            defaultValue={param(params, 'to')}
            className={inputClasses({ size: 'sm', fullWidth: false, className: 'font-normal' })}
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
                <tr key={order.id} className={table.row}>
                  <Cell primary className="whitespace-nowrap">
                    <Link href={`/admin/orders/${order.number}`} className={table.rowLink}>
                      {order.number}
                    </Link>
                  </Cell>
                  <Cell label={t('orders.date')} className="whitespace-nowrap text-fg-muted">
                    {formatDateTime(order.createdAt, locale)}
                  </Cell>
                  <Cell label={t('orders.customer')}>
                    {order.customerName}
                    <span className="block text-xs whitespace-nowrap text-fg-subtle">
                      {formatUzPhone(order.customerPhone)}
                    </span>
                  </Cell>
                  <Cell label={t('orders.items')} className="text-right tabular-nums">
                    {order.itemCount}
                  </Cell>
                  <Cell
                    label={t('orders.total')}
                    className="text-right font-semibold whitespace-nowrap tabular-nums"
                  >
                    {formatMoney(order.total, locale, tc('currency.UZS'))}
                  </Cell>
                  <Cell label={t('orders.status')}>
                    <OrderStatusPill status={order.status} />
                  </Cell>
                  <Cell label={t('orders.payment')}>
                    <PaymentStatusPill status={order.paymentStatus} />
                  </Cell>
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
