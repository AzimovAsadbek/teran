import type { AdminNewsletterSubscriber, Locale, Paginated } from '@teran/contracts';
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
  Pill,
  table,
} from '@/components/admin/ui';
import { adminGet, apiQuery, pageHref, param } from '@/lib/admin/server';
import { currentUser } from '@/lib/account';
import { formatDate } from '@/lib/format';
import { buttonClasses } from '@/components/ui/button';

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
    currentUser(),
  ]);
  if (!subscribers) return <AccessDenied />;
  const source = (value: string | null) =>
    value === 'footer' || value === 'demo' ? t(`newsletter.sources.${value}`) : (value ?? '—');

  return (
    <>
      <AdminPageHeader
        title={t('newsletter.title')}
        description={
          <>
            {t('newsletter.intro')}
            {user?.role === 'ADMIN' ? (
              <span className="mt-1 block text-body-sm text-fg-subtle">
                {t('newsletter.exportHint')}
              </span>
            ) : null}
          </>
        }
        actions={
          user?.role === 'ADMIN' ? (
            <a href="/api/v1/admin/newsletter/export.csv" className={buttonClasses('secondary')}>
              <Download aria-hidden className="h-4 w-4" />
              {t('common.export')}
            </a>
          ) : null
        }
      />
      <FilterForm
        action="/admin/newsletter"
        q={param(params, 'q')}
        active={Boolean(param(params, 'q'))}
      />
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
                  <Cell primary className="break-all">
                    {subscriber.email}
                  </Cell>
                  <Cell label={t('newsletter.language')}>{tl(`names.${subscriber.locale}`)}</Cell>
                  <Cell label={t('newsletter.source')}>{source(subscriber.source)}</Cell>
                  <Cell label={t('newsletter.subscribedAt')} className="whitespace-nowrap">
                    {formatDate(subscriber.subscribedAt, locale as Locale)}
                  </Cell>
                  <Cell label={t('common.status')}>
                    <Pill tone={subscriber.status === 'SUBSCRIBED' ? 'leaf' : 'muted'}>
                      {subscriber.status === 'SUBSCRIBED'
                        ? t('newsletter.subscribed')
                        : t('newsletter.unsubscribed')}
                    </Pill>
                  </Cell>
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
