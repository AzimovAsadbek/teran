import type { AdminArticle, Locale } from '@teran/contracts';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { SuccessMessage } from '@/components/account/auth-forms';
import { ArticleEditor } from '@/components/admin/article-editor';
import { AdminPageHeader, ArticleStatusPill } from '@/components/admin/ui';
import { Link } from '@/i18n/navigation';
import { adminGet } from '@/lib/admin/server';

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
  const article = await adminGet<AdminArticle>(`/articles/${id}`).catch(() => null);
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
      {query.saved === '1' ? (
        <div className="mb-6">
          <SuccessMessage>{t('common.saved')}</SuccessMessage>
        </div>
      ) : null}
      <ArticleEditor key={article.updatedAt} article={article} />
    </>
  );
}
