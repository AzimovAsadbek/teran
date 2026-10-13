import type { AdminDashboard, AdminInventoryRow, Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { SalesChart } from '@/components/admin/sales-chart';
import {
  AccessDenied,
  AdminPageHeader,
  OrderStatusPill,
  Panel,
  PaymentStatusPill,
  table,
} from '@/components/admin/ui';
import { Link } from '@/i18n/navigation';
import { adminGet } from '@/lib/admin/server';
import { formatDateTime, formatMoney } from '@/lib/format';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('dashboard.title') };
}

function packOf(row: AdminInventoryRow): string {
  return [
    row.weightGrams ? `${row.weightGrams} g` : null,
    row.unitCount ? `× ${row.unitCount}` : null,
  ]
    .filter(Boolean)
    .join(' ');
}

export default async function AdminDashboardPage() {
  const [locale, t, tc] = await Promise.all([
    getLocale(),
    getTranslations('Admin'),
    getTranslations('Common'),
  ]);
  const data = await adminGet<AdminDashboard>('/dashboard');
  if (!data) return <AccessDenied />;
  const money = (amount: string) => formatMoney(amount, locale, tc('currency.UZS'));

  const kpis = [
    { label: t('dashboard.ordersToday'), value: String(data.ordersToday), href: '/admin/orders' },
    {
      label: t('dashboard.awaitingAction'),
      value: String(data.ordersAwaitingAction),
      href: '/admin/orders?status=PENDING',
    },
    {
      label: t('dashboard.orderValue'),
      value: money(data.revenueLast30Days),
      note: t('dashboard.orderValueNote'),
    },
    { label: t('dashboard.orders30'), value: String(data.ordersLast30Days) },
    { label: t('dashboard.averageOrder'), value: money(data.averageOrderValue) },
    {
      label: t('dashboard.newInquiries'),
      value: String(data.newInquiries),
      href: '/admin/inquiries',
    },
  ];

  return (
    <>
      <AdminPageHeader title={t('dashboard.title')} />
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        {kpis.map((kpi) => (
          <li
            key={kpi.label}
            className="rounded-[var(--radius-card)] border border-ivory-200 bg-white p-5"
          >
            <p className="text-sm text-ink-500">{kpi.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold break-words text-forest-900 tabular-nums sm:text-3xl">
              {kpi.href ? (
                <Link href={kpi.href} className="underline-offset-4 hover:underline">
                  {kpi.value}
                </Link>
              ) : (
                kpi.value
              )}
            </p>
            {kpi.note ? <p className="mt-1 text-xs text-ink-500">{kpi.note}</p> : null}
          </li>
        ))}
      </ul>

      <Panel title={t('dashboard.salesChart')} className="mt-6">
        <SalesChart days={data.salesByDay} />
      </Panel>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel
          title={t('dashboard.recentOrders')}
          actions={
            <Link href="/admin/orders" className={table.link}>
              {t('nav.orders')} →
            </Link>
          }
        >
          {data.recentOrders.length === 0 ? (
            <p className="text-ink-500">{t('common.empty')}</p>
          ) : (
            <ul className="divide-y divide-ivory-200">
              {data.recentOrders.map((order) => (
                <li key={order.id} className="py-3 text-sm">
                  <div className="flex items-baseline justify-between gap-4">
                    <Link href={`/admin/orders/${order.number}`} className={table.link}>
                      {order.number}
                    </Link>
                    <span className="font-semibold tabular-nums">{money(order.total)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-ink-500">
                    <span>{formatDateTime(order.createdAt, locale)}</span>
                    <span aria-hidden>·</span>
                    <span className="min-w-0 truncate">{order.customerName}</span>
                    <span className="flex-1" />
                    <OrderStatusPill status={order.status} />
                    <PaymentStatusPill status={order.paymentStatus} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel
            title={t('dashboard.lowStock')}
            actions={
              <Link href="/admin/inventory?lowStockOnly=true" className={table.link}>
                {t('nav.inventory')} →
              </Link>
            }
          >
            {data.lowStock.length === 0 ? (
              <p className="text-ink-500">{t('dashboard.noLowStock')}</p>
            ) : (
              <ul className="divide-y divide-ivory-200 text-sm">
                {data.lowStock.map((row) => (
                  <li
                    key={row.variantId}
                    className="flex items-center justify-between gap-4 py-2.5"
                  >
                    <span className="min-w-0">
                      <Link href={`/admin/products/${row.productId}`} className={table.link}>
                        {row.productName}
                      </Link>
                      <span className="block text-xs text-ink-500">
                        {row.sku} · {packOf(row)}
                      </span>
                    </span>
                    <span
                      className={
                        row.stockQuantity === 0
                          ? 'font-semibold text-danger-700'
                          : 'font-semibold text-gold-800'
                      }
                    >
                      {row.stockQuantity}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={t('dashboard.topProducts')}>
            {data.topProducts.length === 0 ? (
              <p className="text-ink-500">{t('common.empty')}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink-500 uppercase">
                    <th scope="col" className="pb-2 font-semibold">
                      {t('products.name')}
                    </th>
                    <th scope="col" className="pb-2 text-right font-semibold">
                      {t('dashboard.quantity')}
                    </th>
                    <th scope="col" className="pb-2 text-right font-semibold">
                      {t('dashboard.revenue')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.topProducts.map((product) => (
                    <tr key={product.productName} className="border-t border-ivory-100">
                      <td className="py-2">{product.productName}</td>
                      <td className="py-2 text-right tabular-nums">{product.quantity}</td>
                      <td className="py-2 text-right tabular-nums">{money(product.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
