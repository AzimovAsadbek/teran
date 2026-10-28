import type { AdminMediaItem, Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { ArticleEditor } from '@/components/admin/article-editor';
import { FreshEachVisit } from '@/components/admin/fresh-each-visit';
import { AdminPageHeader } from '@/components/admin/ui';
import { adminGet, getTelegramSettings } from '@/lib/admin/server';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('journal.newArticle') };
}

export default async function NewArticlePage() {
  const [t, telegram, gallery] = await Promise.all([
    getTranslations('Admin'),
    getTelegramSettings(),
    adminGet<AdminMediaItem[]>('/media').catch(() => null),
  ]);
  return (
    <>
      <AdminPageHeader title={t('journal.newArticle')} />
      <FreshEachVisit>
        <ArticleEditor article={null} telegram={telegram} gallery={gallery ?? []} />
      </FreshEachVisit>
    </>
  );
}
