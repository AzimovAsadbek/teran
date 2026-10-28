import type { AdminArticle, AdminMediaItem, Locale } from '@teran/contracts';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { SuccessMessage } from '@/components/account/auth-forms';
import { ArticleEditor } from '@/components/admin/article-editor';
import { AdminPageHeader, ArticleStatusPill } from '@/components/admin/ui';
import { Notice } from '@/components/ui/notice';
import { Link } from '@/i18n/navigation';
import { adminGet, getTelegramSettings } from '@/lib/admin/server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('journal.editArticle') };
}

export default async function EditArticlePage({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/journal/[id]'>) {
  const [{ id }, query, t] = await Promise.all([params, searchParams, getTranslations('Admin')]);
  if (!UUID.test(id)) notFound();
  const [article, telegram, gallery] = await Promise.all([
    adminGet<AdminArticle>(`/articles/${id}`).catch(() => null),
    getTelegramSettings(),
    adminGet<AdminMediaItem[]>('/media').catch(() => null),
  ]);
  if (!article) notFound();
  return (
    <>
      <Link
        href="/admin/journal"
        className="mb-4 inline-flex items-center gap-2 text-body-sm font-semibold text-fg hover:underline"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        {t('journal.title')}
      </Link>
      <AdminPageHeader
        title={article.translations.uz.title}
        description={<ArticleStatusPill status={article.status} />}
      />
      {query.created === '1' ? (
        <div className="mb-6 space-y-3">
          <SuccessMessage>
            {t('journal.created')}{' '}
            {article.status === 'PUBLISHED'
              ? t('journal.createdPublished')
              : t('journal.createdDraft')}
          </SuccessMessage>
          {/* What creating it in one go could not finish (ADR-063): the draft waits here. */}
          {query.coverFailed === '1' ? (
            <Notice tone="warning" role="alert">
              {t('journal.createdCoverFailed')}
            </Notice>
          ) : null}
          {query.notPublished === '1' && article.status !== 'PUBLISHED' ? (
            <Notice tone="warning">{t('journal.createdNotPublished')}</Notice>
          ) : null}
        </div>
      ) : null}
      {/* Keyed by article, not by version: uploading the cover refreshes the page without wiping edits. */}
      <ArticleEditor
        key={article.id}
        article={article}
        telegram={telegram}
        gallery={gallery ?? []}
      />
    </>
  );
}
