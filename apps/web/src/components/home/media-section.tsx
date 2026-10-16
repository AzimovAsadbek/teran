import type { Locale } from '@teran/contracts';
import { ArrowRight } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { BotanicalLayer } from '@/components/brand/botanical';
import { MEDIA_PATHS, MediaEmpty, MediaGroupHeading } from '@/components/media/media-archive';
import { MediaGallery } from '@/components/media/media-gallery';
import { mediaLabels } from '@/components/media/media-labels';
import { Link } from '@/i18n/navigation';
import { getMedia } from '@/lib/data/content';

/** Photographs on the home page: the feature, a tall picture beside it and a row beneath. */
const HOME_PHOTOS = 6;
const HOME_VIDEOS = 3;

/**
 * "TERAN olamidan lavhalar": the photographs and films chosen for the home page in the admin area,
 * on a dark band between the light sections around it, as two groups kept apart — "Rasmlar"
 * (an editorial spread) and "Videolar" (posters that play only when pressed), each leading to its
 * own page. While there is no film, the films group says plainly that films are coming (nothing
 * is invented). Without any published item the section is left out altogether.
 */
export async function MediaSection() {
  await connection();
  const [locale, t] = await Promise.all([getLocale() as Promise<Locale>, getTranslations('Media')]);
  const [photos, videos] = await Promise.all([
    getMedia(locale, { featured: true, kind: 'PHOTO', pageSize: HOME_PHOTOS }).catch(() => null),
    getMedia(locale, { featured: true, kind: 'VIDEO', pageSize: HOME_VIDEOS }).catch(() => null),
  ]);
  const photoItems = photos?.items ?? [];
  const videoItems = videos?.items ?? [];
  if (photoItems.length === 0 && videoItems.length === 0) return null;
  const labels = mediaLabels(t);

  return (
    <section
      aria-labelledby="media-title"
      className="on-dark relative isolate overflow-hidden bg-forest-950 py-section text-ivory-50"
    >
      <BotanicalLayer scene="gallery" className="-z-10" />
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
          <div className="max-w-2xl">
            <p className="text-eyebrow text-gold-300">{t('sectionEyebrow')}</p>
            <h2 id="media-title" className="mt-3 text-display-md text-ivory-50">
              {t('sectionTitle')}
            </h2>
            <p className="mt-3 text-body text-ivory-100/75">{t('intro')}</p>
          </div>
          <Link
            href={MEDIA_PATHS.all}
            className="group inline-flex min-h-10 items-center gap-2 text-body-sm font-semibold text-gold-300 underline-offset-4 hover:underline"
          >
            {t('viewAll')}
            <ArrowRight
              aria-hidden
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        {photoItems.length > 0 ? (
          <div className="mt-10 lg:mt-12">
            <MediaGroupHeading
              id="home-media-photos"
              as="h3"
              kind="PHOTO"
              title={t('photosTitle')}
              href={MEDIA_PATHS.photos}
              linkLabel={t('allPhotos')}
            />
            <MediaGallery items={photoItems} labels={labels} layout="editorial" className="mt-6" />
          </div>
        ) : null}

        <div className="mt-14 border-t border-ivory-50/10 pt-10 lg:mt-16">
          <MediaGroupHeading
            id="home-media-videos"
            as="h3"
            kind="VIDEO"
            title={t('videosTitle')}
            href={videoItems.length > 0 ? MEDIA_PATHS.videos : undefined}
            linkLabel={t('allVideos')}
          />
          {videoItems.length > 0 ? (
            <MediaGallery items={videoItems} labels={labels} layout="films" className="mt-6" />
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
        </div>
      </div>
    </section>
  );
}
