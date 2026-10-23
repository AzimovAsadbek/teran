import type { Locale, MediaKind } from '@teran/contracts';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { MediaComposer } from '@/components/admin/media-composer';
import { AdminPageHeader } from '@/components/admin/ui';
import { Link } from '@/i18n/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('compose.title') };
}

/** The kind a list's "Post" opens on (?kind=photos, videos or shorts; shorts by default). */
const KIND_OF_PARAM: Record<string, MediaKind> = { photos: 'PHOTO', videos: 'VIDEO' };

/**
 * "Joylash": a photograph, a film or a short posted in one go (ADR-058, ADR-059), opened on the
 * kind of the list it was reached from; the composer can switch kinds.
 */
export default async function PostMediaPage({
  searchParams,
}: PageProps<'/[locale]/admin/media/post'>) {
  const [params, t] = await Promise.all([searchParams, getTranslations('Admin')]);
  const param = Array.isArray(params.kind) ? params.kind[0] : params.kind;
  const kind: MediaKind = (param ? KIND_OF_PARAM[param] : undefined) ?? 'SHORT';
  const list =
    kind === 'PHOTO'
      ? '/admin/media'
      : `/admin/media?kind=${kind === 'VIDEO' ? 'videos' : 'shorts'}`;
  return (
    <>
      <Link
        href={list}
        className="mb-4 inline-flex items-center gap-2 text-body-sm font-semibold text-fg hover:underline"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        {t('media.title')}
      </Link>
      <AdminPageHeader title={t('compose.title')} description={t('compose.intro')} />
      <MediaComposer key={kind} initialKind={kind} />
    </>
  );
}
