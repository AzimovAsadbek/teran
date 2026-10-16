import type { AdminDashboard, Locale } from '@teran/contracts';
import { ChevronRight, ClipboardCheck, Inbox, PackageOpen, Truck } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import type { ReactNode } from 'react';
import { SalesChart } from '@/components/admin/sales-chart';
import {
  AccessDenied,
  AdminPageHeader,
  OrderStatusPill,
  Panel,
  PaymentStatusPill,
  Pill,
  table,
} from '@/components/admin/ui';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { packLabel } from '@/lib/admin/pack';
import { adminGet, getAdminBadges } from '@/lib/admin/server';
import { formatDateTime, formatMoney } from '@/lib/format';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('dashboard.title') };
}

/** One line of the to-do list: what to do, how many, and a link straight to it. */
function Task({
  href,
  icon,
  count,
  children,
}: {
  href: string;
  icon: ReactNode;
  count: number;
  children: ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          'group flex min-h-14 items-center gap-3 rounded-control border px-4 py-3 text-body-sm font-semibold transition-colors',
          count > 0
            ? 'border-gold-600/30 bg-gold-100/60 text-forest-900 hover:bg-gold-100'
            : 'border-line bg-surface text-fg-subtle hover:bg-surface-muted',
        )}
      >
        <span
          aria-hidden
          className={cn('[&_svg]:h-5 [&_svg]:w-5', count > 0 ? 'text-gold-800' : 'text-fg-subtle')}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">{children}</span>
        <ChevronRight
          aria-hidden
          className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
        />
      </Link>
    </li>
  );
}

export default async function AdminDashboardPage() {
  const [locale, t, tc] = await Promise.all([
    getLocale(),
    getTranslations('Admin'),
    getTranslations('Common'),
  ]);
  const [data, badges] = await Promise.all([
    adminGet<AdminDashboard>('/dashboard'),
    getAdminBadges(),
  ]);
  if (!data) return <AccessDenied />;
  const money = (amount: string) => formatMoney(amount, locale, tc('currency.UZS'));

  const toConfirm = badges?.ordersByStatus.PENDING ?? data.ordersAwaitingAction;
  const confirmed = badges?.ordersByStatus.CONFIRMED ?? 0;
  const toShip = confirmed + (badges?.ordersByStatus.PROCESSING ?? 0);
  const lowStock = badges?.lowStock ?? data.lowStock.length;
  const inquiries = badges
    ? badges.newInquiries.contact + badges.newInquiries.wholesale
    : data.newInquiries;

  const kpis: { label: string; value: string; note?: string; href?: string }[] = [
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

      <section aria-labelledby="dashboard-tasks" className="mb-6">
        <h2 id="dashboard-tasks" className="mb-3 text-title-lg text-fg">
          {t('dashboard.tasks')}
        </h2>
        {toConfirm + toShip + lowStock + inquiries === 0 ? (
          <p className="rounded-card border border-line bg-surface px-5 py-4 text-body-sm text-fg-muted">
            {t('dashboard.allDone')}
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            <Task href="/admin/orders?status=PENDING" icon={<ClipboardCheck />} count={toConfirm}>
              {t('dashboard.tasksConfirm', { count: toConfirm })}
            </Task>
            <Task
              href={`/admin/orders?status=${confirmed > 0 ? 'CONFIRMED' : 'PROCESSING'}`}
              icon={<Truck />}
              count={toShip}
            >
              {t('dashboard.tasksShip', { count: toShip })}
            </Task>
            <Task href="/admin/inventory?lowStockOnly=true" icon={<PackageOpen />} count={lowStock}>
              {t('dashboard.tasksStock', { count: lowStock })}
            </Task>
            <Task
              href={
                badges && badges.newInquiries.contact === 0 && badges.newInquiries.wholesale > 0
                  ? '/admin/inquiries?type=wholesale&status=NEW'
                  : '/admin/inquiries?status=NEW'
              }
              icon={<Inbox />}
              count={inquiries}
            >
              {t('dashboard.tasksInquiries', { count: inquiries })}
            </Task>
          </ul>
        )}
      </section>

      <ul className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        {kpis.map((kpi) => {
          const body = (
            <>
              <span className="flex items-center justify-between gap-2 text-body-sm text-fg-subtle">
                {kpi.label}
                {kpi.href ? (
                  <ChevronRight
                    aria-hidden
                    className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                  />
                ) : null}
              </span>
              <span className="mt-1.5 block text-metric break-words text-fg">{kpi.value}</span>
              {kpi.note ? (
                <span className="mt-1 block text-helper text-fg-subtle">{kpi.note}</span>
              ) : null}
            </>
          );
          return (
            <li key={kpi.label}>
              {kpi.href ? (
                <Link
                  href={kpi.href}
                  className="group block h-full rounded-card border border-line bg-surface p-5 transition-colors hover:border-forest-700/40 hover:bg-surface-muted/50"
                >
                  {body}
                </Link>
              ) : (
                <div className="h-full rounded-card border border-line bg-surface p-5">{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      <Panel title={t('dashboard.salesChart')} className="mt-6">
        <SalesChart days={data.salesByDay} />
      </Panel>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel
          title={t('dashboard.recentOrders')}
          actions={
            <Link href="/admin/orders" className={table.link}>
              {t('common.viewAll')}
            </Link>
          }
        >
          {data.recentOrders.length === 0 ? (
            <p className="text-fg-subtle">{t('common.empty')}</p>
          ) : (
            <ul className="divide-y divide-line">
              {data.recentOrders.map((order) => (
                <li key={order.id} className="relative py-3 text-body-sm">
                  <div className="flex items-baseline justify-between gap-4">
                    <Link href={`/admin/orders/${order.number}`} className={table.rowLink}>
                      {order.number}
                    </Link>
                    <span className="font-semibold tabular-nums">{money(order.total)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3 text-fg-subtle">
                    <span className="min-w-0 truncate">
                      {formatDateTime(order.createdAt, locale)} · {order.customerName}
                    </span>
                    <span className="flex shrink-0 gap-1.5">
                      <OrderStatusPill status={order.status} />
                      <PaymentStatusPill status={order.paymentStatus} />
                    </span>
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
                {t('common.viewAll')}
              </Link>
            }
          >
            {data.lowStock.length === 0 ? (
              <p className="text-fg-subtle">{t('dashboard.noLowStock')}</p>
            ) : (
              <ul className="divide-y divide-line text-body-sm">
                {data.lowStock.map((row) => (
                  <li
                    key={row.variantId}
                    className="relative flex items-center justify-between gap-4 py-2.5"
                  >
                    <span className="min-w-0">
                      <Link
                        href={`/admin/inventory?q=${encodeURIComponent(row.sku)}`}
                        className={table.rowLink}
                      >
                        {row.productName}
                      </Link>
                      <span className="block text-xs text-fg-subtle">
                        {[packLabel(row), row.sku].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    {row.stockQuantity === 0 ? (
                      <Pill tone="danger">{t('dashboard.outOfStock')}</Pill>
                    ) : (
                      <Pill tone="gold">{t('dashboard.left', { count: row.stockQuantity })}</Pill>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={t('dashboard.topProducts')}>
            {data.topProducts.length === 0 ? (
              <p className="text-fg-subtle">{t('common.empty')}</p>
            ) : (
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="text-left text-xs text-fg-subtle uppercase">
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
                    <tr key={product.productName} className="border-t border-line-subtle">
                      <td className="py-2">{product.productName}</td>
                      <td className="py-2 text-right tabular-nums">{product.quantity}</td>
                      <td className="py-2 text-right whitespace-nowrap tabular-nums">
                        {money(product.revenue)}
                      </td>
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
