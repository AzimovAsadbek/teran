import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { Pagination } from '@/components/catalog/pagination';
import { Link } from '@/i18n/navigation';
import { socialHandle } from '@/lib/contact';
import { getMedia, getPublicSettings } from '@/lib/data/content';
import { pageMetadata } from '@/lib/seo';
import {
  KIND_OF_PAGE,
  MEDIA_PATHS,
  MediaEmpty,
  MediaHeader,
  MediaListSkeleton,
  MediaTabs,
  mediaCover,
  mediaTotals,
  pageNumber,
} from './media-archive';
import { MediaGallery } from './media-gallery';
import { mediaLabels } from './media-labels';

type KindPage = keyof typeof KIND_OF_PAGE;
type RawSearchParams = Record<string, string | string[] | undefined>;

/** Photographs fill rows of a justified grid; films and shorts are fewer and larger. */
const PAGE_SIZE: Record<KindPage, number> = { photos: 24, videos: 24, shorts: 24 };

/** How each kind is laid out: rows of photographs, a grid of films, shorts side by side. */
const LAYOUT = { photos: 'justified', videos: 'films', shorts: 'reels' } as const;

function hrefFor(key: KindPage, page: number): string {
  return page > 1 ? `${MEDIA_PATHS[key]}?page=${page}` : MEDIA_PATHS[key];
}

export async function mediaKindMetadata(
  key: KindPage,
  locale: Locale,
  searchParams: Promise<RawSearchParams>,
): Promise<Metadata> {
  const page = pageNumber((await searchParams).page);
  const [t, tc, media] = await Promise.all([
    getTranslations({ locale, namespace: 'Media' }),
    getTranslations({ locale, namespace: 'Common' }),
    // The same cached page the list reads.
    getMedia(locale, { kind: KIND_OF_PAGE[key], page, pageSize: PAGE_SIZE[key] }).catch(() => null),
  ]);
  return pageMetadata({
    title: t(`${key}MetaTitle`),
    description: t(`${key}MetaDescription`),
    href: MEDIA_PATHS[key],
    locale,
    pagination: { page, label: tc('pageN', { page }) },
    // Nothing of this kind published yet, or a page past the last: not offered to search engines
    // (and out of the sitemap, app/sitemap.ts).
    noIndex: media !== null && media.items.length === 0,
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
  const [media, totals, settings] = await Promise.all([
    getMedia(locale, {
      kind: KIND_OF_PAGE[pageKey],
      page,
      pageSize: PAGE_SIZE[pageKey],
    }).catch(() => null),
    mediaTotals(locale),
    pageKey === 'shorts' ? getPublicSettings(locale).catch(() => null) : null,
  ]);
  const items = media?.items ?? [];
  const empty = {
    photos: { title: t('emptyPhotosTitle'), text: t('emptyPhotosText') },
    videos: { title: t('emptyVideosTitle'), text: t('emptyVideosText') },
    shorts: { title: t('emptyShortsTitle'), text: t('emptyShortsText') },
  }[pageKey];

  return (
    <>
      <MediaTabs current={pageKey} totals={totals} />
      {items.length > 0 ? (
        <>
          <MediaGallery
            items={items}
            labels={mediaLabels(t)}
            layout={LAYOUT[pageKey]}
            handle={pageKey === 'shorts' ? socialHandle(settings?.contact) : null}
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
          title={empty.title}
          text={empty.text}
          action={
            pageKey !== 'photos' && totals.photos > 0 ? (
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
 * "Rasmlar", "Videolar" or "Qisqa lavhalar" (shorts, ADR-059): every published item of one kind,
 * in the order set in the admin area, with its own address, tabs to the other kinds and to the
 * overview, and pagination. Shorts open the feed (reel-player.tsx).
 */
export async function MediaKindPage({
  pageKey,
  searchParams,
}: {
  pageKey: KindPage;
  searchParams: Promise<RawSearchParams>;
}) {
  const locale = (await rootParams.locale()) as Locale;
  const [t, cover] = await Promise.all([
    getTranslations('Media'),
    mediaCover(locale, pageKey === 'photos' ? 'photo' : 'film'),
  ]);
  return (
    <div className="on-dark bg-forest-950 text-ivory-50">
      <MediaHeader
        title={t(`${pageKey}Title`)}
        intro={t(`${pageKey}Intro`)}
        cover={cover}
        back={{ href: MEDIA_PATHS.all, label: t('title') }}
      />
      <div className="container-page pt-8 pb-section sm:pt-10">
        <Suspense fallback={<MediaListSkeleton films={pageKey !== 'photos'} />}>
          <KindList pageKey={pageKey} searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
