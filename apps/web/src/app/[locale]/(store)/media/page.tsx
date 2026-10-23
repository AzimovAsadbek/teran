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
  isLandscape,
  isUpright,
  mediaCover,
} from '@/components/media/media-archive';
import { MediaGallery } from '@/components/media/media-gallery';
import { mediaLabels } from '@/components/media/media-labels';
import { getMedia } from '@/lib/data/content';
import { pageMetadata } from '@/lib/seo';

/** The overview shows the latest of each kind; the kind pages hold everything. */
const PHOTOS_SHOWN = 12;
const FILMS_SHOWN = 6;
const REELS_SHOWN = 8;
/** Films are read together and shown by their shape: landscape in a grid, upright side by side. */
const VIDEOS_READ = 24;

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
    getMedia(locale, { kind: 'VIDEO', pageSize: VIDEOS_READ }).catch(() => null),
  ]);
  const totals = { photos: photos?.total ?? 0, videos: videos?.total ?? 0 };
  const films = (videos?.items ?? []).filter(isLandscape).slice(0, FILMS_SHOWN);
  const reels = (videos?.items ?? []).filter(isUpright).slice(0, REELS_SHOWN);
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
            kind="VIDEO"
            title={t('reelsTitle')}
            text={t('reelsIntro')}
          />
          <MediaGallery items={reels} labels={labels} layout="reels" className="mt-6" />
        </section>
      ) : null}
    </>
  );
}

/**
 * The gallery (ADR-056): TERAN's photographs and films, opening on one of its films. The overview
 * shows the latest photographs, the landscape films and the upright ones (the home page's feed);
 * each kind has its own page (/media/photos, /media/videos) for the whole archive. Old ?kind=
 * links are redirected to those pages before rendering (see lib/media-redirect.ts).
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
