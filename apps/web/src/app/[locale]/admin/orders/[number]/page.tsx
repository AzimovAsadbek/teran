import { formatUzPhone, regionName, type AdminOrderDetail, type Locale } from '@teran/contracts';
import { ArrowLeft, Mail, Phone } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { OrderActions } from '@/components/admin/order-actions';
import { RecordRefund } from '@/components/admin/order-payments';
import {
  AdminPageHeader,
  OrderStatusPill,
  Panel,
  PaymentStatusPill,
  table,
} from '@/components/admin/ui';
import { Link } from '@/i18n/navigation';
import { adminGet } from '@/lib/admin/server';
import { formatDateTime, formatMoney } from '@/lib/format';

const ORDER_NUMBER = /^TRN-[0-9A-Z]{8}$/;

/** Payment failure codes with a staff-facing explanation. */
const FAILURES = ['CUSTOMER_CANCELLED', 'DEMO_DECLINED', 'EXPIRED', 'ORDER_CANCELLED'] as const;
type Failure = (typeof FAILURES)[number];
const isFailure = (code: string): code is Failure => (FAILURES as readonly string[]).includes(code);

/** Payment event notes written by the API in English, and their message keys. */
const EVENT_DETAILS = {
  'Order placed': 'orderPlaced',
  'Payment started': 'started',
  'Payment restarted': 'restarted',
  'Payment window ended': 'windowEnded',
  'Cash payment recorded': 'cashRecorded',
  'Refund recorded': 'refundRecorded',
} as const;
const DEMO_OUTCOMES = ['success', 'failure', 'cancel', 'pending'] as const;

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/admin/orders/[number]'>): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const { number } = await params;
  const t = await getTranslations({ locale, namespace: 'Checkout' });
  return { title: ORDER_NUMBER.test(number) ? t('orderTitle', { number }) : t('statusTitle') };
}

export default async function AdminOrderPage({
  params,
}: PageProps<'/[locale]/admin/orders/[number]'>) {
  const [{ number }, locale] = await Promise.all([params, getLocale()]);
  if (!ORDER_NUMBER.test(number)) notFound();
  const [t, tco, tc] = await Promise.all([
    getTranslations('Admin'),
    getTranslations('Checkout'),
    getTranslations('Common'),
  ]);
  const order = await adminGet<AdminOrderDetail>(`/orders/${number}`).catch(() => null);
  if (!order) notFound();
  const money = (amount: string) => formatMoney(amount, locale, tc('currency.UZS'));
  const pack = (item: AdminOrderDetail['items'][number]) =>
    [
      item.weightGrams ? `${item.weightGrams} g` : null,
      item.unitCount ? `× ${item.unitCount}` : null,
    ]
      .filter(Boolean)
      .join(' ');
  const failure = (code: string) => (isFailure(code) ? t(`payments.failures.${code}`) : code);
  const eventDetail = (detail: string) => {
    if (detail in EVENT_DETAILS) {
      return t(`payments.details.${EVENT_DETAILS[detail as keyof typeof EVENT_DETAILS]}`);
    }
    const outcome = DEMO_OUTCOMES.find((value) => detail === `Simulated ${value}`);
    if (outcome) {
      return t('payments.details.simulated', { outcome: t(`payments.outcomes.${outcome}`) });
    }
    return failure(detail);
  };

  return (
    <>
      <Link
        href="/admin/orders"
        className="mb-4 inline-flex items-center gap-2 text-body-sm font-semibold text-fg hover:underline"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        {t('orders.title')}
      </Link>
      <AdminPageHeader
        title={order.number}
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>{formatDateTime(order.createdAt, locale)}</span>
            <span className="inline-flex items-center gap-1.5 text-body-sm">
              {t('orders.orderLabel')}:
              <OrderStatusPill status={order.status} />
            </span>
            <span className="inline-flex items-center gap-1.5 text-body-sm">
              {t('orders.paymentLabel')}:
              <PaymentStatusPill status={order.paymentStatus} />
            </span>
          </span>
        }
      />

      {/* What staff act on (actions, the customer) comes first on phones; on wide screens it is the right-hand column. */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <div className="space-y-6 xl:col-start-2 xl:row-start-1">
          <OrderActions order={order} />

          <Panel title={t('orders.customerSection')}>
            <dl className="space-y-2 text-body-sm">
              <div>
                <dt className="text-xs text-fg-subtle">{t('orders.customer')}</dt>
                <dd className="font-semibold">{order.customerName}</dd>
              </div>
              <div>
                <dt className="text-xs text-fg-subtle">{t('orders.phone')}</dt>
                <dd>
                  <a
                    href={`tel:${order.customerPhone}`}
                    className={`${table.link} inline-flex min-h-8 items-center gap-1.5`}
                  >
                    <Phone aria-hidden className="h-3.5 w-3.5" />
                    {formatUzPhone(order.customerPhone)}
                  </a>
                </dd>
              </div>
              {order.customerEmail ? (
                <div>
                  <dt className="text-xs text-fg-subtle">{t('orders.email')}</dt>
                  <dd className="break-all">
                    <a
                      href={`mailto:${order.customerEmail}`}
                      className={`${table.link} inline-flex items-center gap-1.5`}
                    >
                      <Mail aria-hidden className="h-3.5 w-3.5 shrink-0" />
                      {order.customerEmail}
                    </a>
                  </dd>
                </div>
              ) : null}
              {order.customerAccountEmail ? (
                <div>
                  <dt className="text-xs text-fg-subtle">{t('orders.accountEmail')}</dt>
                  <dd className="break-all">{order.customerAccountEmail}</dd>
                </div>
              ) : null}
            </dl>
          </Panel>

          <Panel title={t('orders.deliverySection')}>
            <dl className="space-y-2 text-body-sm">
              <div>
                <dt className="text-xs text-fg-subtle">{t('orders.delivery')}</dt>
                <dd className="font-semibold">{order.deliveryMethodName}</dd>
              </div>
              <div>
                <dt className="text-xs text-fg-subtle">{t('orders.address')}</dt>
                <dd>
                  {[regionName(order.regionCode, locale as Locale), order.city, order.addressLine]
                    .filter(Boolean)
                    .join(', ')}
                </dd>
              </div>
              {order.landmark ? (
                <div>
                  <dt className="text-xs text-fg-subtle">{t('orders.landmark')}</dt>
                  <dd>{order.landmark}</dd>
                </div>
              ) : null}
              {order.note ? (
                <div>
                  <dt className="text-xs text-fg-subtle">{t('orders.note')}</dt>
                  <dd className="whitespace-pre-line">{order.note}</dd>
                </div>
              ) : null}
              {order.cancelReason ? (
                <div>
                  <dt className="text-xs text-fg-subtle">{t('orders.cancelReason')}</dt>
                  <dd className="whitespace-pre-line">
                    {order.cancelReason === 'PAYMENT_NOT_COMPLETED'
                      ? tco('cancelReasons.payment_not_completed')
                      : order.cancelReason}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs text-fg-subtle">{t('orders.payment')}</dt>
                <dd>{tco(`paymentMethods.${order.paymentMethod}`)}</dd>
              </div>
            </dl>
          </Panel>
        </div>

        <div className="space-y-6 xl:col-start-1 xl:row-start-1">
          <Panel title={t('orders.itemsSection')}>
            <ul className="divide-y divide-line-subtle text-body-sm">
              {order.items.map((item) => (
                <li
                  key={item.sku}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5 py-3 first:pt-0"
                >
                  <span className="font-semibold text-fg">{item.productName}</span>
                  <span className="text-right font-semibold whitespace-nowrap tabular-nums">
                    {money(item.lineTotal)}
                  </span>
                  <span className="text-xs text-fg-subtle">
                    {[pack(item), item.sku].filter(Boolean).join(' · ')}
                  </span>
                  <span className="text-right text-xs whitespace-nowrap text-fg-muted tabular-nums">
                    {item.quantity} × {money(item.unitPrice)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-body-sm sm:ml-auto sm:max-w-xs">
              <div className="flex justify-between gap-4">
                <dt className="text-fg-muted">{t('orders.subtotal')}</dt>
                <dd className="tabular-nums">{money(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-fg-muted">{t('orders.delivery')}</dt>
                <dd className="tabular-nums">{money(order.deliveryFee)}</dd>
              </div>
              {Number(order.discountTotal) > 0 ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-muted">{t('orders.discount')}</dt>
                  <dd className="tabular-nums">−{money(order.discountTotal)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 border-t border-line pt-2 text-body font-semibold text-fg">
                <dt>{t('common.total')}</dt>
                <dd className="tabular-nums">{money(order.total)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title={t('payments.title')}>
            {order.payments.length === 0 ? (
              <p className="text-body-sm text-fg-muted">{t('payments.none')}</p>
            ) : (
              <ol className="space-y-4">
                {order.payments.map((payment) => (
                  <li key={payment.id} className="rounded-control border border-line-subtle p-4">
                    <div className="flex flex-wrap items-center gap-2 text-body-sm">
                      <span className="font-semibold text-fg">
                        {tco(`paymentMethods.${payment.method}`)}
                      </span>
                      <span className="text-fg-subtle">
                        · {t(`payments.providers.${payment.provider}`)}
                      </span>
                      <PaymentStatusPill status={payment.status} />
                      <span className="ml-auto font-semibold tabular-nums">
                        {money(payment.amount)}
                      </span>
                    </div>
                    {payment.provider === 'DEMO' ? (
                      <p className="mt-1 text-xs font-semibold text-warning">
                        {t('payments.demoNote')}
                      </p>
                    ) : null}
                    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                      {payment.providerReference ? (
                        <>
                          <dt className="text-fg-subtle">{t('payments.reference')}</dt>
                          <dd className="font-mono break-all">{payment.providerReference}</dd>
                        </>
                      ) : null}
                      {payment.expiresAt ? (
                        <>
                          <dt className="text-fg-subtle">{t('payments.expires')}</dt>
                          <dd>{formatDateTime(payment.expiresAt, locale)}</dd>
                        </>
                      ) : null}
                      {payment.failureCode ? (
                        <>
                          <dt className="text-fg-subtle">{t('payments.failure')}</dt>
                          <dd>{failure(payment.failureCode)}</dd>
                        </>
                      ) : null}
                    </dl>
                    {payment.events.length > 0 ? (
                      <details className="mt-2 text-xs">
                        <summary className="cursor-pointer font-semibold text-fg-muted">
                          {t('payments.history')}
                        </summary>
                        <ol className="mt-2 space-y-1.5 border-l-2 border-line pl-3">
                          {payment.events.map((event) => (
                            <li key={event.id}>
                              <span className="font-semibold">
                                {tco(`paymentStatuses.${event.toStatus}`)}
                              </span>{' '}
                              · {t(`payments.sources.${event.source as 'customer'}`)}
                              {event.detail ? ` · ${eventDetail(event.detail)}` : ''}
                              {event.actorName ? ` · ${event.actorName}` : ''}
                              <span className="block text-fg-subtle">
                                {formatDateTime(event.createdAt, locale)}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </details>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
            <RecordRefund order={order} />
          </Panel>

          <Panel title={t('orders.historySection')}>
            <ol className="space-y-3 border-l-2 border-line pl-5 text-body-sm">
              <li>
                <p className="font-semibold text-fg">{t('orders.historyCreated')}</p>
                <p className="text-xs text-fg-subtle">{formatDateTime(order.createdAt, locale)}</p>
              </li>
              {order.events
                .filter((event) => event.fromStatus !== null || event.paymentStatus !== null)
                .map((event) => (
                  <li key={event.id}>
                    <p className="font-semibold text-fg">
                      {event.fromStatus !== event.toStatus
                        ? t(`orderStatus.${event.toStatus}`)
                        : t('orders.historyPayment', {
                            status: tco(`paymentStatuses.${event.paymentStatus ?? 'PENDING'}`),
                          })}
                    </p>
                    {event.note ? <p className="text-fg-muted">{event.note}</p> : null}
                    <p className="text-xs text-fg-subtle">
                      {formatDateTime(event.createdAt, locale)} ·{' '}
                      {event.actorName ?? t('orders.system')}
                    </p>
                  </li>
                ))}
            </ol>
          </Panel>
        </div>
      </div>
    </>
  );
}
