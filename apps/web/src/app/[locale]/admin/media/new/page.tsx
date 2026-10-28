import type { Locale } from '@teran/contracts';
import { redirect } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { getPathname } from '@/i18n/navigation';

/**
 * The earlier form for a new photograph, film or short saved a draft before its files could be
 * added. They are now posted with their files in one go by the composer (ADR-063), which this
 * address leads to, on the same kind.
 */
export default async function NewMediaPage({
  searchParams,
}: PageProps<'/[locale]/admin/media/new'>) {
  const [params, locale] = await Promise.all([searchParams, rootParams.locale()]);
  const kind = params.kind === 'videos' || params.kind === 'shorts' ? params.kind : 'photos';
  redirect(getPathname({ href: `/admin/media/post?kind=${kind}`, locale: locale as Locale }));
}
