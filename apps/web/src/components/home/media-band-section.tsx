import type { Locale } from '@teran/contracts';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { mediaLabels } from '@/components/media/media-labels';
import { getMedia } from '@/lib/data/content';
import { MediaBand } from './media-band';

const BAND_ITEMS = 10;

/**
 * Reference section 15 with the gallery's published items: films and photographs as two tabs
 * (films first, as the reference's band is a video band); one heading when only one kind exists.
 * Left out when the gallery is empty.
 */
export async function MediaBandSection() {
  await connection();
  const [locale, t] = await Promise.all([getLocale() as Promise<Locale>, getTranslations('Media')]);
  const [videos, photos] = await Promise.all([
    getMedia(locale, { kind: 'VIDEO', pageSize: BAND_ITEMS })
      .then((page) => page.items)
      .catch(() => []),
    getMedia(locale, { kind: 'PHOTO', pageSize: BAND_ITEMS })
      .then((page) => page.items)
      .catch(() => []),
  ]);
  if (videos.length === 0 && photos.length === 0) return null;
  return (
    <MediaBand
      videos={videos}
      photos={photos}
      labels={{
        eyebrow: t('sectionEyebrow'),
        photosTitle: t('photosTitle'),
        videosTitle: t('videosTitle'),
        tabList: t('filter'),
        previous: t('previous'),
        next: t('next'),
        viewer: mediaLabels(t),
      }}
    />
  );
}
