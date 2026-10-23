import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import * as rootParams from 'next/root-params';
import { MediaKindPage, mediaKindMetadata } from '@/components/media/media-kind-page';

export async function generateMetadata({
  searchParams,
}: PageProps<'/[locale]/media/shorts'>): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  return mediaKindMetadata('shorts', locale, searchParams);
}

/** "Qisqa lavhalar": the published shorts, opening the feed scrolled like Reels (ADR-059). */
export default function MediaShortsPage({ searchParams }: PageProps<'/[locale]/media/shorts'>) {
  return <MediaKindPage pageKey="shorts" searchParams={searchParams} />;
}
