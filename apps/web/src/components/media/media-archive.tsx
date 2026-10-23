import type { Locale, MediaItemDto, MediaKind } from '@teran/contracts';
import { ArrowRight, Film, Images, Smartphone, type LucideIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { getMedia, getPrerenderMedia } from '@/lib/data/content';
import lake from '../../../public/brand/art/lake.webp';
import { MediaCover } from './media-cover';

/** The media pages: an overview and one page per kind, photographs, films and shorts apart. */
export type MediaPageKey = 'all' | 'photos' | 'videos' | 'shorts';

export const MEDIA_PATHS = {
  all: '/media',
  photos: '/media/photos',
  videos: '/media/videos',
  shorts: '/media/shorts',
} as const satisfies Record<MediaPageKey, string>;

export const KIND_OF_PAGE = {
  photos: 'PHOTO',
  videos: 'VIDEO',
  shorts: 'SHORT',
} as const satisfies Record<Exclude<MediaPageKey, 'all'>, MediaKind>;

/** Each kind's mark: photographs, films, and shorts as a phone's upright screen. */
export const KIND_ICONS: Record<MediaKind, LucideIcon> = {
  PHOTO: Images,
  VIDEO: Film,
  SHORT: Smartphone,
};

export interface MediaTotals {
  photos: number;
  videos: number;
  shorts: number;
}

/** How many photographs, films and shorts are published (cached with the rest of the content). */
export async function mediaTotals(locale: Locale): Promise<MediaTotals> {
  const [photos, videos, shorts] = await Promise.all([
    getMedia(locale, { kind: 'PHOTO', pageSize: 1 }).catch(() => null),
    getMedia(locale, { kind: 'VIDEO', pageSize: 1 }).catch(() => null),
    getMedia(locale, { kind: 'SHORT', pageSize: 1 }).catch(() => null),
  ]);
  return { photos: photos?.total ?? 0, videos: videos?.total ?? 0, shorts: shorts?.total ?? 0 };
}

export function pageNumber(value: string | string[] | undefined): number {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 1 && parsed <= 1000 ? parsed : 1;
}

/** A film shot wider than tall: the kind the gallery's header opens on. */
export const isLandscape = (item: MediaItemDto) => item.image.width > item.image.height;

/**
 * The picture a media page opens on: the first landscape film in the gallery's order, else (or on
 * the photographs' page) the first photograph; null while the gallery is empty. Read for the
 * prerendered shell, so a build without the API gets the painting rather than an error.
 */
export async function mediaCover(locale: Locale, prefer: 'film' | 'photo' = 'film') {
  const [videos, photos] = await Promise.all([
    prefer === 'film'
      ? getPrerenderMedia(locale, { kind: 'VIDEO', pageSize: 24 })
      : Promise.resolve(null),
    getPrerenderMedia(locale, { kind: 'PHOTO', pageSize: 1 }),
  ]);
  return videos?.items.find(isLandscape) ?? photos?.items[0] ?? null;
}

/**
 * The header of the media pages (ADR-056): the gallery's own picture full-bleed (a landscape film
 * playing over its poster, or a photograph) under a veil that deepens towards the words, the title
 * in TERAN's capitals and the intro at the lower left, a way back to the gallery on its inner
 * pages. Before anything is published, the landscape painted on the packs stands in.
 */
export function MediaHeader({
  title,
  intro,
  cover,
  back,
}: {
  title: string;
  intro: string;
  cover: MediaItemDto | null;
  /** The way back to the gallery's overview (its inner pages). */
  back?: { href: string; label: string };
}) {
  return (
    <header className="relative isolate flex min-h-[27rem] items-end overflow-hidden border-b border-ivory-50/10 sm:min-h-[min(74svh,46rem)]">
      {cover ? (
        <MediaCover item={cover} />
      ) : (
        <Image
          src={lake}
          alt=""
          fill
          loading="eager"
          fetchPriority="high"
          quality={60}
          sizes="(max-width: 767px) 75vw, 100vw"
          className="-z-20 object-cover"
        />
      )}
      <span
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-t from-forest-950 via-forest-950/50 via-35% to-forest-950/10"
      />
      <div className="container-page w-full pt-28 pb-10 sm:pb-16">
        {back ? (
          <Link
            href={back.href}
            className="group mb-4 inline-flex min-h-10 items-center gap-2 text-body-sm font-semibold text-ivory-100/85 underline-offset-4 hover:text-ivory-50 hover:underline"
          >
            <ArrowRight
              aria-hidden
              className="h-4 w-4 rotate-180 transition-transform duration-200 group-hover:-translate-x-0.5"
            />
            {back.label}
          </Link>
        ) : null}
        <h1 className="font-headline text-[3.25rem] leading-[0.95] break-words text-ivory-50 sm:text-[5.25rem] lg:text-[6rem]">
          {title}
        </h1>
        <p className="mt-4 max-w-xl text-body-lg text-pretty text-ivory-100/90">{intro}</p>
      </div>
    </header>
  );
}

const TAB_ICONS: Record<MediaPageKey, LucideIcon | null> = {
  all: null,
  photos: KIND_ICONS.PHOTO,
  videos: KIND_ICONS.VIDEO,
  shorts: KIND_ICONS.SHORT,
};

/** "Hammasi · Rasmlar · Videolar · Qisqa lavhalar" with counts: links between the media pages. */
export async function MediaTabs({
  current,
  totals,
}: {
  current: MediaPageKey;
  totals: MediaTotals;
}) {
  const t = await getTranslations('Media');
  // A kind with nothing published yet has no tab (but its own page keeps it).
  const tabs: { key: MediaPageKey; count: number }[] = [
    { key: 'all' as const, count: totals.photos + totals.videos + totals.shorts },
    { key: 'photos' as const, count: totals.photos },
    { key: 'videos' as const, count: totals.videos },
    { key: 'shorts' as const, count: totals.shorts },
  ].filter((tab) => tab.key === 'all' || tab.count > 0 || tab.key === current);
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-b border-ivory-50/10 pb-6">
      <nav aria-label={t('filter')} className="max-w-full overflow-x-auto [scrollbar-width:none]">
        <ul className="inline-flex rounded-full border border-ivory-50/15 bg-ivory-50/[0.04] p-1">
          {tabs.map((tab) => {
            const active = tab.key === current;
            const Icon = TAB_ICONS[tab.key];
            return (
              <li key={tab.key}>
                <Link
                  href={MEDIA_PATHS[tab.key]}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex h-10 items-center gap-2 rounded-full px-4 text-body-sm font-semibold whitespace-nowrap transition-colors duration-150 sm:px-5',
                    active
                      ? 'bg-gold-300 text-fg'
                      : 'text-ivory-100/80 hover:bg-ivory-50/10 hover:text-ivory-50',
                  )}
                >
                  {Icon ? <Icon aria-hidden className="h-4 w-4" strokeWidth={1.75} /> : null}
                  {t(tab.key)}
                  <span
                    className={cn(
                      'text-caption tabular-nums',
                      active ? 'text-fg' : 'text-ivory-100/75',
                    )}
                  >
                    {tab.count}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <p className="text-body-sm text-ivory-100/65">
        {t('archiveCount', {
          photos: totals.photos,
          videos: totals.videos,
          shorts: totals.shorts,
        })}
      </p>
    </div>
  );
}

/** A group's heading on the overview and the home page: icon, title, count and "all" link. */
export function MediaGroupHeading({
  id,
  kind,
  title,
  text,
  href,
  linkLabel,
  as: Heading = 'h2',
}: {
  id: string;
  kind: MediaKind;
  title: string;
  text?: string;
  href?: string;
  linkLabel?: string;
  as?: 'h2' | 'h3';
}) {
  const Icon = KIND_ICONS[kind];
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
      <div className="min-w-0">
        <Heading id={id} className="flex items-center gap-3 text-display-sm text-ivory-50">
          <span
            aria-hidden
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-gold-300/40 text-gold-300"
          >
            <Icon className="h-5 w-5" strokeWidth={1.5} />
          </span>
          {title}
        </Heading>
        {text ? <p className="mt-2 max-w-xl text-body-sm text-ivory-100/70">{text}</p> : null}
      </div>
      {href && linkLabel ? (
        <Link
          href={href}
          className="group inline-flex min-h-10 items-center gap-2 text-body-sm font-semibold text-gold-300 underline-offset-4 hover:underline"
        >
          {linkLabel}
          <ArrowRight
            aria-hidden
            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
      ) : null}
    </div>
  );
}

/** Nothing of this kind is published yet: says so plainly (no footage or picture is invented). */
export function MediaEmpty({
  kind,
  title,
  text,
  action,
  compact = false,
}: {
  kind: MediaKind;
  title: string;
  text: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  const Icon = KIND_ICONS[kind];
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-[0.5rem] border border-dashed border-gold-300/30 text-center',
        compact ? 'px-6 py-10' : 'mt-10 px-6 py-16',
      )}
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-full border border-gold-300/40 text-gold-300">
        <Icon aria-hidden className="h-7 w-7" strokeWidth={1.5} />
      </span>
      <p className="mt-5 text-display-sm text-ivory-50">{title}</p>
      <p className="mt-2 max-w-md text-body text-ivory-100/75">{text}</p>
      {action}
    </div>
  );
}

/** The loading state of a media list (a row of placeholder tiles). */
export function MediaListSkeleton({ films = false }: { films?: boolean }) {
  return (
    <div aria-hidden>
      <div className="h-12 w-80 max-w-full rounded-full bg-ivory-50/[0.06]" />
      {films ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="aspect-video rounded-[0.25rem] bg-ivory-50/[0.05]" />
          ))}
        </div>
      ) : (
        <div className="mt-8 flex flex-wrap gap-3">
          {[1.5, 0.8, 1.2, 0.7, 1.4].map((ratio, index) => (
            <div
              key={index}
              className="h-[9.5rem] rounded-[0.375rem] bg-ivory-50/[0.05] sm:h-[14rem] lg:h-[17rem]"
              style={{ flexGrow: ratio, flexBasis: `${ratio * 12}rem` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
