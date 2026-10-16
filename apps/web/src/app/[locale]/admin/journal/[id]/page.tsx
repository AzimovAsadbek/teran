import type { AdminArticle, AdminMediaItem, Locale } from '@teran/contracts';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { ArticleEditor } from '@/components/admin/article-editor';
import { AdminPageHeader, ArticleStatusPill } from '@/components/admin/ui';
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
}: PageProps<'/[locale]/admin/journal/[id]'>) {
  const [{ id }, t] = await Promise.all([params, getTranslations('Admin')]);
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
        className="mb-4 inline-flex items-center gap-2 text-body-sm font-semibold text-forest-900 hover:underline"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        {t('journal.title')}
      </Link>
      <AdminPageHeader
        title={article.translations.uz.title}
        description={<ArticleStatusPill status={article.status} />}
      />
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
