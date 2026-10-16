import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import * as rootParams from 'next/root-params';
import { MediaKindPage, mediaKindMetadata } from '@/components/media/media-kind-page';

export async function generateMetadata({
  searchParams,
}: PageProps<'/[locale]/media/photos'>): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  return mediaKindMetadata('photos', locale, searchParams);
}

/** "Rasmlar": the published photographs. */
export default function MediaPhotosPage({ searchParams }: PageProps<'/[locale]/media/photos'>) {
  return <MediaKindPage pageKey="photos" searchParams={searchParams} />;
}
