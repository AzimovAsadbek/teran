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
  mediaCover,
} from '@/components/media/media-archive';
import { MediaGallery } from '@/components/media/media-gallery';
import { mediaLabels } from '@/components/media/media-labels';
import { socialHandle } from '@/lib/contact';
import { getMedia, getPublicSettings } from '@/lib/data/content';
import { pageMetadata } from '@/lib/seo';

/** The overview shows the latest of each kind; the kind pages hold everything. */
const PHOTOS_SHOWN = 12;
const FILMS_SHOWN = 6;
const SHORTS_SHOWN = 8;

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
  const [photos, videos, shorts, settings] = await Promise.all([
    getMedia(locale, { kind: 'PHOTO', pageSize: PHOTOS_SHOWN }).catch(() => null),
    getMedia(locale, { kind: 'VIDEO', pageSize: FILMS_SHOWN }).catch(() => null),
    getMedia(locale, { kind: 'SHORT', pageSize: SHORTS_SHOWN }).catch(() => null),
    getPublicSettings(locale).catch(() => null),
  ]);
  const totals = {
    photos: photos?.total ?? 0,
    videos: videos?.total ?? 0,
    shorts: shorts?.total ?? 0,
  };
  const films = videos?.items ?? [];
  const reels = shorts?.items ?? [];
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
          <MediaGallery items={photos.items} labels={labels} layout="justified" className="mt-6" />
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
      {/* No "coming soon" for films: their parts show once one is published. */}
      {films.length > 0 ? (
        <section aria-labelledby="media-videos" className="mt-16 sm:mt-24">
          <MediaGroupHeading
            id="media-videos"
            kind="VIDEO"
            title={t('videosTitle')}
            text={t('videosIntro')}
            href={MEDIA_PATHS.videos}
            linkLabel={t('allVideos')}
          />
          <MediaGallery items={films} labels={labels} layout="films" className="mt-6" />
        </section>
      ) : null}
      {reels.length > 0 ? (
        <section aria-labelledby="media-reels" className="mt-16 sm:mt-24">
          <MediaGroupHeading
            id="media-reels"
            kind="SHORT"
            title={t('reelsTitle')}
            text={t('reelsIntro')}
            href={MEDIA_PATHS.shorts}
            linkLabel={t('allShorts')}
          />
          <MediaGallery
            items={reels}
            labels={labels}
            layout="reels"
            handle={socialHandle(settings?.contact)}
            className="mt-6"
          />
        </section>
      ) : null}
    </>
  );
}

/**
 * The gallery (ADR-056): TERAN's photographs, films and shorts, opening on one of its films. The
 * overview shows the latest of each kind (shorts are also the home page's feed, ADR-059); each
 * kind has its own page (/media/photos, /media/videos, /media/shorts) for the whole archive. Old
 * ?kind= links are redirected to those pages before rendering (see lib/media-redirect.ts).
 */
export default async function MediaPage() {
  const locale = (await rootParams.locale()) as Locale;
  const [t, cover] = await Promise.all([getTranslations('Media'), mediaCover(locale)]);
  return (
    <div className="on-dark bg-forest-950 text-ivory-50">
      <MediaHeader title={t('title')} intro={t('intro')} cover={cover} />
      <div className="container-page pt-8 pb-section sm:pt-10">
        <Suspense fallback={<MediaListSkeleton />}>
          <Overview />
        </Suspense>
      </div>
    </div>
  );
}
