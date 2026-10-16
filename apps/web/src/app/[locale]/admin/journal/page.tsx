import type { AdminArticle, Locale, Paginated } from '@teran/contracts';
import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Pagination } from '@/components/catalog/pagination';
import {
  AccessDenied,
  AdminPageHeader,
  Cell,
  ArticleStatusPill,
  EmptyState,
  FilterForm,
  table,
} from '@/components/admin/ui';
import { ButtonLink } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { adminGet, apiQuery, pageHref, param } from '@/lib/admin/server';
import { formatDate } from '@/lib/format';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('journal.title') };
}

export default async function AdminJournalPage({
  searchParams,
}: PageProps<'/[locale]/admin/journal'>) {
  const [params, locale, t] = await Promise.all([
    searchParams,
    getLocale(),
    getTranslations('Admin'),
  ]);
  const articles = await adminGet<Paginated<AdminArticle>>(
    `/articles${apiQuery(params, ['q', 'page'], { pageSize: '25' })}`,
  );
  if (!articles) return <AccessDenied />;

  return (
    <>
      <AdminPageHeader
        title={t('journal.title')}
        actions={
          <ButtonLink href="/admin/journal/new">
            <Plus aria-hidden className="h-4 w-4" />
            {t('journal.newArticle')}
          </ButtonLink>
        }
      />
      <FilterForm
        action="/admin/journal"
        q={param(params, 'q')}
        active={Boolean(param(params, 'q'))}
      />
      {articles.items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className={table.wrapper}>
          <table className={table.table}>
            <thead>
              <tr>
                <th scope="col" className={table.th}>
                  {t('journal.articleTitle')}
                </th>
                <th scope="col" className={table.th}>
                  {t('common.status')}
                </th>
                <th scope="col" className={table.th}>
                  {t('journal.published')}
                </th>
                <th scope="col" className={table.th}>
                  {t('common.updated')}
                </th>
              </tr>
            </thead>
            <tbody>
              {articles.items.map((article) => (
                <tr key={article.id} className={table.row}>
                  <Cell primary>
                    <Link href={`/admin/journal/${article.id}`} className={table.rowLink}>
                      {article.translations.uz.title}
                    </Link>
                  </Cell>
                  <Cell label={t('common.status')}>
                    <ArticleStatusPill status={article.status} />
                  </Cell>
                  <Cell label={t('journal.published')} className="whitespace-nowrap">
                    {article.publishedAt ? formatDate(article.publishedAt, locale as Locale) : '—'}
                  </Cell>
                  <Cell label={t('common.updated')} className="whitespace-nowrap text-fg-muted">
                    {formatDate(article.updatedAt, locale as Locale)}
                  </Cell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        page={articles.page}
        totalPages={articles.totalPages}
        hrefFor={(page) => pageHref('/admin/journal', params, ['q'], page)}
      />
    </>
  );
}
