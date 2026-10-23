import type { Locale, MediaKind } from '@teran/contracts';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { MediaEditor } from '@/components/admin/media-editor';
import { AdminPageHeader } from '@/components/admin/ui';
import { Link } from '@/i18n/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('media.newItem') };
}

const NEW = {
  PHOTO: { list: '/admin/media', title: 'newPhoto' },
  VIDEO: { list: '/admin/media?kind=videos', title: 'newVideo' },
  SHORT: { list: '/admin/media?kind=shorts', title: 'newShort' },
} as const satisfies Record<MediaKind, object>;

/**
 * A new photograph (?kind=photos, the default), film (?kind=videos) or short (?kind=shorts, the
 * home page's feed); the kind stays fixed.
 */
export default async function NewMediaPage({
  searchParams,
}: PageProps<'/[locale]/admin/media/new'>) {
  const [params, t] = await Promise.all([searchParams, getTranslations('Admin')]);
  const kind: MediaKind =
    params.kind === 'videos' ? 'VIDEO' : params.kind === 'shorts' ? 'SHORT' : 'PHOTO';
  return (
    <>
      <Link
        href={NEW[kind].list}
        className="mb-4 inline-flex items-center gap-2 text-body-sm font-semibold text-fg hover:underline"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        {t(`media.kinds.${kind}_PLURAL`)}
      </Link>
      <AdminPageHeader title={t(`media.${NEW[kind].title}`)} />
      <MediaEditor item={null} kind={kind} />
    </>
  );
}
