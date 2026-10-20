import type { AdminMediaItem, Locale } from '@teran/contracts';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { MediaEditor } from '@/components/admin/media-editor';
import { AdminPageHeader, ArticleStatusPill } from '@/components/admin/ui';
import { Link } from '@/i18n/navigation';
import { adminGet } from '@/lib/admin/server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('media.editItem') };
}

export default async function EditMediaPage({ params }: PageProps<'/[locale]/admin/media/[id]'>) {
  const [{ id }, t] = await Promise.all([params, getTranslations('Admin')]);
  if (!UUID.test(id)) notFound();
  const item = await adminGet<AdminMediaItem>(`/media/${id}`).catch(() => null);
  if (!item) notFound();
  const video = item.kind === 'VIDEO';
  return (
    <>
      <Link
        href={video ? '/admin/media?kind=videos' : '/admin/media'}
        className="mb-4 inline-flex items-center gap-2 text-body-sm font-semibold text-fg hover:underline"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        {video ? t('media.kinds.VIDEO_PLURAL') : t('media.kinds.PHOTO_PLURAL')}
      </Link>
      <AdminPageHeader
        title={item.translations.uz.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <ArticleStatusPill status={item.status} />
            <span>{t(`media.kinds.${item.kind}`)}</span>
          </span>
        }
      />
      {/* Keyed by item, not by version: uploading a file refreshes the page without wiping edits. */}
      <MediaEditor key={item.id} item={item} kind={item.kind} />
    </>
  );
}
