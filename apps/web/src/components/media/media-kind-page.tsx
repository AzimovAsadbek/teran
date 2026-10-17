import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { Pagination } from '@/components/catalog/pagination';
import { Link } from '@/i18n/navigation';
import { getMedia } from '@/lib/data/content';
import { pageMetadata } from '@/lib/seo';
import { showGallery } from '@/lib/site';
import {
  KIND_OF_PAGE,
  MEDIA_PATHS,
  MediaEmpty,
  MediaHeader,
  MediaListSkeleton,
  MediaTabs,
  mediaTotals,
  pageNumber,
} from './media-archive';
import { MediaGallery } from './media-gallery';
import { mediaLabels } from './media-labels';

type KindPage = keyof typeof KIND_OF_PAGE;
type RawSearchParams = Record<string, string | string[] | undefined>;

/** Photographs fill rows of a justified grid; films are fewer and larger. */
const PAGE_SIZE: Record<KindPage, number> = { photos: 24, videos: 12 };

function hrefFor(key: KindPage, page: number): string {
  return page > 1 ? `${MEDIA_PATHS[key]}?page=${page}` : MEDIA_PATHS[key];
}

export async function mediaKindMetadata(
  key: KindPage,
  locale: Locale,
  searchParams: Promise<RawSearchParams>,
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'Media' });
  const page = pageNumber((await searchParams).page);
  return pageMetadata({
    title: t(`${key}MetaTitle`),
    description: t(`${key}MetaDescription`),
    href: MEDIA_PATHS[key],
    locale,
    query: page > 1 ? `page=${page}` : '',
    // Unlisted while the storefront does not link to the gallery (lib/site showGallery).
    noIndex: !showGallery,
  });
}

async function KindList({
  pageKey,
  searchParams,
}: {
  pageKey: KindPage;
  searchParams: Promise<RawSearchParams>;
}) {
  await connection();
  const [locale, t, params] = await Promise.all([
    getLocale() as Promise<Locale>,
    getTranslations('Media'),
    searchParams,
  ]);
  const page = pageNumber(params.page);
  const [media, totals] = await Promise.all([
    getMedia(locale, {
      kind: KIND_OF_PAGE[pageKey],
      page,
      pageSize: PAGE_SIZE[pageKey],
    }).catch(() => null),
    mediaTotals(locale),
  ]);
  const items = media?.items ?? [];
  const videos = pageKey === 'videos';

  return (
    <>
      <MediaTabs current={pageKey} totals={totals} />
      {items.length > 0 ? (
        <>
          <MediaGallery
            items={items}
            labels={mediaLabels(t)}
            layout={videos ? 'films' : 'justified'}
            priorityFirst
            className="mt-8"
          />
          <Pagination
            page={media?.page ?? 1}
            totalPages={media?.totalPages ?? 1}
            hrefFor={(target) => hrefFor(pageKey, target)}
            tone="dark"
          />
        </>
      ) : (
        <MediaEmpty
          kind={KIND_OF_PAGE[pageKey]}
          title={videos ? t('emptyVideosTitle') : t('emptyPhotosTitle')}
          text={videos ? t('emptyVideosText') : t('emptyPhotosText')}
          action={
            videos && totals.photos > 0 ? (
              <Link
                href={MEDIA_PATHS.photos}
                className="mt-5 text-body-sm font-semibold text-gold-300 underline underline-offset-4"
              >
                {t('showPhotos')}
              </Link>
            ) : null
          }
        />
      )}
    </>
  );
}

/**
 * "Rasmlar" or "Videolar": every published item of one kind, in the order set in the admin area,
 * with its own address, tabs to the other kind and to the overview, and pagination.
 */
export async function MediaKindPage({
  pageKey,
  searchParams,
}: {
  pageKey: KindPage;
  searchParams: Promise<RawSearchParams>;
}) {
  const t = await getTranslations('Media');
  return (
    <div className="on-dark bg-forest-950 text-ivory-50">
      <MediaHeader eyebrow={t('title')} title={t(`${pageKey}Title`)} intro={t(`${pageKey}Intro`)} />
      <div className="container-page pt-8 pb-section sm:pt-10">
        <Suspense fallback={<MediaListSkeleton films={pageKey === 'videos'} />}>
          <KindList pageKey={pageKey} searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
