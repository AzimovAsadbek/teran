import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense } from 'react';
import {
  MEDIA_PATHS,
  MediaEmpty,
  MediaGroupHeading,
  MediaHeader,
  MediaListSkeleton,
  MediaTabs,
} from '@/components/media/media-archive';
import { MediaGallery } from '@/components/media/media-gallery';
import { mediaLabels } from '@/components/media/media-labels';
import { getMedia } from '@/lib/data/content';
import { pageMetadata } from '@/lib/seo';

/** The overview shows the latest of each kind; the kind pages hold everything. */
const PHOTOS_SHOWN = 10;
const VIDEOS_SHOWN = 3;

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Media' });
  return pageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    href: '/media',
    locale,
  });
}

async function Overview() {
  await connection();
  const [locale, t] = await Promise.all([getLocale() as Promise<Locale>, getTranslations('Media')]);
  const [photos, videos] = await Promise.all([
    getMedia(locale, { kind: 'PHOTO', pageSize: PHOTOS_SHOWN }).catch(() => null),
    getMedia(locale, { kind: 'VIDEO', pageSize: VIDEOS_SHOWN }).catch(() => null),
  ]);
  const totals = { photos: photos?.total ?? 0, videos: videos?.total ?? 0 };
  const labels = mediaLabels(t);

  return (
    <>
      <MediaTabs current="all" totals={totals} />
      <section aria-labelledby="media-photos" className="mt-10 sm:mt-12">
        <MediaGroupHeading
          id="media-photos"
          kind="PHOTO"
          title={t('photosTitle')}
          text={t('photosIntro')}
          href={totals.photos > 0 ? MEDIA_PATHS.photos : undefined}
          linkLabel={t('allPhotos')}
        />
        {photos && photos.items.length > 0 ? (
          <MediaGallery
            items={photos.items}
            labels={labels}
            layout="justified"
            priorityFirst
            className="mt-6"
          />
        ) : (
          <div className="mt-6">
            <MediaEmpty
              kind="PHOTO"
              title={t('emptyPhotosTitle')}
              text={t('emptyPhotosText')}
              compact
            />
          </div>
        )}
      </section>
      <section aria-labelledby="media-videos" className="mt-16 sm:mt-20">
        <MediaGroupHeading
          id="media-videos"
          kind="VIDEO"
          title={t('videosTitle')}
          text={t('videosIntro')}
          href={totals.videos > 0 ? MEDIA_PATHS.videos : undefined}
          linkLabel={t('allVideos')}
        />
        {videos && videos.items.length > 0 ? (
          <MediaGallery items={videos.items} labels={labels} layout="films" className="mt-6" />
        ) : (
          <div className="mt-6">
            <MediaEmpty
              kind="VIDEO"
              title={t('emptyVideosTitle')}
              text={t('emptyVideosText')}
              compact
            />
          </div>
        )}
      </section>
    </>
  );
}

/**
 * "Lavhalar": the overview of the brand's pictures and films as two separate groups, "Rasmlar"
 * and "Videolar", each with its own page (/media/photos, /media/videos) for the whole archive.
 * Old ?kind= links are redirected to those pages before rendering (see lib/media-redirect.ts).
 */
export default async function MediaPage() {
  const t = await getTranslations('Media');
  return (
    <div className="on-dark bg-forest-950 text-ivory-50">
      <MediaHeader eyebrow={t('eyebrow')} title={t('title')} intro={t('intro')} />
      <div className="container-page pt-8 pb-section sm:pt-10">
        <Suspense fallback={<MediaListSkeleton />}>
          <Overview />
        </Suspense>
      </div>
    </div>
  );
}
