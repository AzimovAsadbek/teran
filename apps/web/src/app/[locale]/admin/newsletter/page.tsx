import type {
  AdminNewsletterSubscriber,
  CurrentUserDto,
  Locale,
  Paginated,
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
  Pill,
  table,
} from '@/components/admin/ui';
import { adminGet, apiQuery, pageHref, param } from '@/lib/admin/server';
import { apiGetAsVisitor } from '@/lib/api/server';
import { formatDate } from '@/lib/format';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('newsletter.title') };
}

export default async function AdminNewsletterPage({
  searchParams,
}: PageProps<'/[locale]/admin/newsletter'>) {
  const [params, locale, t, tl] = await Promise.all([
    searchParams,
    getLocale(),
    getTranslations('Admin'),
    getTranslations('Language'),
  ]);
  const [subscribers, user] = await Promise.all([
    adminGet<Paginated<AdminNewsletterSubscriber>>(
      `/newsletter${apiQuery(params, ['q', 'page'], { pageSize: '50' })}`,
    ),
    apiGetAsVisitor<CurrentUserDto>('/auth/me'),
  ]);
  if (!subscribers) return <AccessDenied />;

  return (
    <>
      <AdminPageHeader
        title={t('newsletter.title')}
        description={user?.role === 'ADMIN' ? t('newsletter.exportHint') : undefined}
        actions={
          user?.role === 'ADMIN' ? (
            <a
              href="/api/v1/admin/newsletter/export.csv"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-forest-900/25 px-5 text-sm font-semibold text-forest-900 hover:bg-forest-900/[0.04]"
            >
              <Download aria-hidden className="h-4 w-4" />
              {t('common.export')}
            </a>
          ) : null
        }
      />
      <FilterForm action="/admin/newsletter" q={param(params, 'q')} />
      {subscribers.items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className={table.wrapper}>
          <table className={table.table}>
            <thead>
              <tr>
                <th scope="col" className={table.th}>
                  {t('newsletter.email')}
                </th>
                <th scope="col" className={table.th}>
                  {t('newsletter.language')}
                </th>
                <th scope="col" className={table.th}>
                  {t('newsletter.source')}
                </th>
                <th scope="col" className={table.th}>
                  {t('newsletter.subscribedAt')}
                </th>
                <th scope="col" className={table.th}>
                  {t('common.status')}
                </th>
              </tr>
            </thead>
            <tbody>
              {subscribers.items.map((subscriber) => (
                <tr key={subscriber.id}>
                  <td className={`${table.td} break-all`}>{subscriber.email}</td>
                  <td className={table.td}>{tl(`names.${subscriber.locale}`)}</td>
                  <td className={table.td}>{subscriber.source ?? '—'}</td>
                  <td className={`${table.td} whitespace-nowrap`}>
                    {formatDate(subscriber.subscribedAt, locale as Locale)}
                  </td>
                  <td className={table.td}>
                    <Pill tone={subscriber.status === 'SUBSCRIBED' ? 'leaf' : 'muted'}>
                      {subscriber.status === 'SUBSCRIBED'
                        ? t('newsletter.subscribed')
                        : t('newsletter.unsubscribed')}
                    </Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        page={subscribers.page}
        totalPages={subscribers.totalPages}
        hrefFor={(page) => pageHref('/admin/newsletter', params, ['q'], page)}
      />
    </>
  );
}
