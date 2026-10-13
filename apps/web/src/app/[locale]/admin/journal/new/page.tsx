import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { ArticleEditor } from '@/components/admin/article-editor';
import { AdminPageHeader } from '@/components/admin/ui';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('journal.newArticle') };
}

export default async function NewArticlePage() {
  const t = await getTranslations('Admin');
  return (
    <>
      <AdminPageHeader title={t('journal.newArticle')} />
      <ArticleEditor article={null} />
    </>
  );
}
