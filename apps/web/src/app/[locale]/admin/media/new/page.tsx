import type { Locale } from '@teran/contracts';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { MediaEditor } from '@/components/admin/media-editor';
import { AdminPageHeader } from '@/components/admin/ui';
import { Link } from '@/i18n/navigation';
import { getMediaUploadLimits } from '@/lib/admin/server';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('media.newItem') };
}

/** A new photograph (?kind=photos, the default) or film (?kind=videos); the kind stays fixed. */
export default async function NewMediaPage({
  searchParams,
}: PageProps<'/[locale]/admin/media/new'>) {
  const [params, t, limits] = await Promise.all([
    searchParams,
    getTranslations('Admin'),
    getMediaUploadLimits(),
  ]);
  const video = params.kind === 'videos';
  return (
    <>
      <Link
        href={video ? '/admin/media?kind=videos' : '/admin/media'}
        className="mb-4 inline-flex items-center gap-2 text-body-sm font-semibold text-fg hover:underline"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        {video ? t('media.kinds.VIDEO_PLURAL') : t('media.kinds.PHOTO_PLURAL')}
      </Link>
      <AdminPageHeader title={video ? t('media.newVideo') : t('media.newPhoto')} />
      <MediaEditor item={null} kind={video ? 'VIDEO' : 'PHOTO'} uploadLimits={limits} />
    </>
  );
}
