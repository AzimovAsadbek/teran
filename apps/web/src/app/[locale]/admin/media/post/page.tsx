import type { Locale } from '@teran/contracts';
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

/** "Joylash": a photograph or a film posted in one go (ADR-058); the chosen file decides which. */
export default async function PostMediaPage() {
  const t = await getTranslations('Admin');
  return (
    <>
      <Link
        href="/admin/media"
        className="mb-4 inline-flex items-center gap-2 text-body-sm font-semibold text-fg hover:underline"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        {t('media.title')}
      </Link>
      <AdminPageHeader title={t('compose.title')} description={t('compose.intro')} />
      <MediaComposer />
    </>
  );
}
