import type { AdminCustomer, Locale, Paginated } from '@teran/contracts';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Pagination } from '@/components/catalog/pagination';
import {
  AccessDenied,
  AdminPageHeader,
  EmptyState,
  FilterForm,
  table,
} from '@/components/admin/ui';
import { Link } from '@/i18n/navigation';
import { adminGet, apiQuery, pageHref, param } from '@/lib/admin/server';
import { formatDate } from '@/lib/format';

const FILTERS = ['q'] as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('customers.title') };
}

export default async function AdminCustomersPage({
  searchParams,
}: PageProps<'/[locale]/admin/customers'>) {
  const [params, locale, t] = await Promise.all([
    searchParams,
    getLocale(),
    getTranslations('Admin'),
  ]);
  const customers = await adminGet<Paginated<AdminCustomer>>(
    `/customers${apiQuery(params, ['q', 'page'], { pageSize: '25' })}`,
  );
  if (!customers) return <AccessDenied />;

  return (
    <>
      <AdminPageHeader title={t('customers.title')} />
      <FilterForm
        action="/admin/customers"
        q={param(params, 'q')}
        placeholder={t('customers.searchPlaceholder')}
      />
      {customers.items.length === 0 ? (
        <EmptyState>{t('common.noResults')}</EmptyState>
      ) : (
        <div className={table.wrapper}>
          <table className={table.table}>
            <thead>
              <tr>
                <th scope="col" className={table.th}>
                  {t('customers.name')}
                </th>
                <th scope="col" className={table.th}>
                  {t('customers.email')}
                </th>
                <th scope="col" className={table.th}>
                  {t('customers.phone')}
                </th>
                <th scope="col" className={`${table.th} text-right`}>
                  {t('customers.orders')}
                </th>
                <th scope="col" className={table.th}>
                  {t('customers.registered')}
                </th>
              </tr>
            </thead>
            <tbody>
              {customers.items.map((customer) => (
                <tr key={customer.id}>
                  <td className={table.td}>
                    <Link href={`/admin/customers/${customer.id}`} className={table.link}>
                      {[customer.firstName, customer.lastName].filter(Boolean).join(' ')}
                    </Link>
                    {!customer.isActive ? (
                      <span className="ml-2 text-xs text-fg-subtle">({t('common.inactive')})</span>
                    ) : null}
                  </td>
                  <td className={`${table.td} break-all`}>{customer.email}</td>
                  <td className={table.td}>{customer.phone ?? '—'}</td>
                  <td className={`${table.td} text-right tabular-nums`}>{customer.orderCount}</td>
                  <td className={`${table.td} whitespace-nowrap text-fg-muted`}>
                    {formatDate(customer.createdAt, locale as Locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        page={customers.page}
        totalPages={customers.totalPages}
        hrefFor={(page) => pageHref('/admin/customers', params, FILTERS, page)}
      />
    </>
  );
}
