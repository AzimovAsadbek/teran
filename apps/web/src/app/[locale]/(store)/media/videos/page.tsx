import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import * as rootParams from 'next/root-params';
import { MediaKindPage, mediaKindMetadata } from '@/components/media/media-kind-page';

export async function generateMetadata({
  searchParams,
}: PageProps<'/[locale]/media/videos'>): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  return mediaKindMetadata('videos', locale, searchParams);
}

/** "Videolar": the published films (each plays only when the visitor starts it). */
export default function MediaVideosPage({ searchParams }: PageProps<'/[locale]/media/videos'>) {
  return <MediaKindPage pageKey="videos" searchParams={searchParams} />;
}
