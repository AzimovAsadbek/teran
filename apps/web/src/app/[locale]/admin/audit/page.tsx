import type { AdminAuditEntry, Locale, Paginated } from '@teran/contracts';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Pagination } from '@/components/catalog/pagination';
import { AccessDenied, AdminPageHeader, EmptyState, table } from '@/components/admin/ui';
import { adminGet, apiQuery, pageHref } from '@/lib/admin/server';
import { formatDateTime } from '@/lib/format';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('audit.title') };
}

export default async function AdminAuditPage({ searchParams }: PageProps<'/[locale]/admin/audit'>) {
  const [params, locale, t] = await Promise.all([
    searchParams,
    getLocale(),
    getTranslations('Admin'),
  ]);
  const entries = await adminGet<Paginated<AdminAuditEntry>>(
    `/audit${apiQuery(params, ['page'], { pageSize: '50' })}`,
  );
  if (!entries) return <AccessDenied adminOnly />;

  return (
    <>
      <AdminPageHeader title={t('audit.title')} />
      {entries.items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className={table.wrapper}>
          <table className={table.table}>
            <thead>
              <tr>
                <th scope="col" className={table.th}>
                  {t('audit.when')}
                </th>
                <th scope="col" className={table.th}>
                  {t('audit.who')}
                </th>
                <th scope="col" className={table.th}>
                  {t('audit.action')}
                </th>
                <th scope="col" className={table.th}>
                  {t('audit.entity')}
                </th>
                <th scope="col" className={table.th}>
                  {t('audit.ip')}
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.items.map((entry) => (
                <tr key={entry.id}>
                  <td className={`${table.td} whitespace-nowrap`}>
                    {formatDateTime(entry.createdAt, locale as Locale)}
                  </td>
                  <td className={table.td}>{entry.actorName ?? t('orders.system')}</td>
                  <td className={`${table.td} font-mono text-xs`}>{entry.action}</td>
                  <td className={`${table.td} text-xs`}>
                    {entry.entityType}
                    {entry.entityId ? (
                      <span className="block font-mono text-fg-subtle">{entry.entityId}</span>
                    ) : null}
                  </td>
                  <td className={`${table.td} font-mono text-xs text-fg-subtle`}>
                    {entry.ipAddress ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        page={entries.page}
        totalPages={entries.totalPages}
        hrefFor={(page) => pageHref('/admin/audit', params, [], page)}
      />
    </>
  );
}
