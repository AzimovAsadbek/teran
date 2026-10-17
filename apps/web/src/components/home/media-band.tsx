'use client';

import type { MediaItemDto } from '@teran/contracts';
import { ArrowLeft, ArrowRight, Play } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { MediaLabels } from '@/components/media/media-gallery';
import { TileTitle } from '@/components/media/tile-title';
import { IconButton } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { imageSources } from '@/lib/navigation';

export interface MediaBandLabels {
  /** Spoken before the heading: "Gallery". */
  eyebrow: string;
  photosTitle: string;
  videosTitle: string;
  /** Name of the tab list ("Kind of media"). */
  tabList: string;
  previous: string;
  next: string;
  viewer: MediaLabels;
}

interface Group {
  id: 'videos' | 'photos';
  title: string;
  items: MediaItemDto[];
}

// The full-screen viewer's code is fetched when a card is pointed at or first opened.
const loadViewer = () => import('@/components/media/media-gallery');
const MediaViewer = dynamic(() => loadViewer().then((module) => module.MediaViewer), {
  ssr: false,
});

function duration(seconds: number | null): string | null {
  if (!seconds) return null;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * The reference's social band (section 15) with TERAN's own gallery: a centred heading — two tabs,
 * "Videos" and "Photos", when the gallery has both — a row of tall cards that snaps to the centre
 * (the card in the middle grows slightly where the browser supports scroll-driven animations) and
 * arrows centred under the row. A card opens the full-screen viewer at that item: films play there
 * with their controls (never by themselves), photographs are shown whole. Tabs follow the WAI-ARIA
 * pattern (arrow keys, Home, End).
 */
export function MediaBand({
  videos,
  photos,
  labels,
}: {
  videos: MediaItemDto[];
  photos: MediaItemDto[];
  labels: MediaBandLabels;
}) {
  const baseId = useId();
  const groups: Group[] = [
    { id: 'videos' as const, title: labels.videosTitle, items: videos },
    { id: 'photos' as const, title: labels.photosTitle, items: photos },
  ].filter((group) => group.items.length > 0);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const rowRef = useRef<HTMLUListElement>(null);
  const current = groups[Math.min(active, groups.length - 1)];

  // Start with a card in the middle (the third, or the middle one of a short row), so cards show
  // on both sides, as on the reference.
  useEffect(() => {
    const row = rowRef.current;
    const count = current?.items.length ?? 0;
    const target = row?.children[Math.min(2, Math.floor(count / 2))] as HTMLElement | undefined;
    if (!row || !target) return;
    row.scrollLeft = target.offsetLeft - (row.clientWidth - target.clientWidth) / 2;
  }, [current]);

  if (!current) return null;

  const select = (index: number, focus = false) => {
    setActive(index);
    if (focus) tabRefs.current[index]?.focus();
  };

  const onTabKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = groups.length - 1;
    const next =
      event.key === 'ArrowRight'
        ? (active + 1) % groups.length
        : event.key === 'ArrowLeft'
          ? (active + last) % groups.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    select(next, true);
  };

  const page = (direction: 1 | -1) => {
    const row = rowRef.current;
    const card = row?.querySelector('li');
    if (!row || !card) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    row.scrollBy({
      left: direction * (card.clientWidth + 16),
      behavior: reduce ? 'auto' : 'smooth',
    });
  };

  const single = groups.length === 1;
  const heading = 'font-heading text-[2rem] leading-[1.2] [--display-weight:600] sm:text-[2.25rem]';

  return (
    <section
      aria-labelledby={`${baseId}-${single ? 'title' : `tab-${current.id}`}`}
      className="bg-ivory-200 pt-12 pb-14"
    >
      <div className="container-page text-center">
        {single ? (
          <h2 id={`${baseId}-title`} className={cn(heading, 'text-fg')}>
            <span className="sr-only">{labels.eyebrow}: </span>
            {current.title}
          </h2>
        ) : (
          <div
            role="tablist"
            aria-label={labels.tabList}
            onKeyDown={onTabKey}
            className="flex flex-wrap items-end justify-center gap-x-6 gap-y-2 sm:gap-x-9"
          >
            {groups.map((group, index) => (
              <button
                key={group.id}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${group.id}`}
                aria-selected={index === active}
                aria-controls={`${baseId}-panel`}
                tabIndex={index === active ? 0 : -1}
                onClick={() => select(index)}
                className={cn(
                  heading,
                  'relative pb-2 transition-colors duration-150',
                  'after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-center after:bg-forest-900 after:transition-transform after:duration-200',
                  index === active
                    ? 'text-fg after:scale-x-100'
                    : 'text-fg-muted after:scale-x-0 hover:text-forest-800',
                )}
              >
                {group.title}
              </button>
            ))}
          </div>
        )}
      </div>
      <div
        role={single ? undefined : 'tabpanel'}
        id={`${baseId}-panel`}
        aria-labelledby={single ? undefined : `${baseId}-tab-${current.id}`}
        className="container-page mt-6 sm:mt-10"
      >
        <ul
          ref={rowRef}
          className="media-band relative flex snap-x snap-mandatory gap-4 overflow-x-auto px-[calc(50%-7.5rem)] py-6 [scrollbar-width:none] sm:px-[calc(50%-8.5rem)]"
        >
          {current.items.map((item, index) => {
            const sources = imageSources(item.image, 480);
            const time = duration(item.video?.durationSeconds ?? null);
            return (
              <li
                key={item.id}
                className="media-band-card w-[15rem] shrink-0 snap-center sm:w-[17rem]"
              >
                <button
                  type="button"
                  onPointerEnter={() => void loadViewer()}
                  onFocus={() => void loadViewer()}
                  onClick={(event) => {
                    opener.current = event.currentTarget;
                    setOpen(index);
                  }}
                  className="group relative block aspect-[9/14] w-full overflow-hidden rounded-tile bg-forest-900 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- API renditions (ADR-009) */}
                  <img
                    src={sources.src}
                    srcSet={sources.srcSet}
                    sizes="17rem"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 ease-[var(--ease-soft)] group-hover:scale-[1.04]"
                  />
                  {item.video ? (
                    <span
                      aria-hidden
                      className="absolute top-1/2 left-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-ivory-50/90 bg-forest-950/30 text-ivory-50 backdrop-blur-[2px] transition-transform duration-300 group-hover:scale-110"
                    >
                      <Play className="ml-0.5 h-6 w-6 fill-current" />
                    </span>
                  ) : null}
                  <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-forest-950/85 to-transparent px-4 pt-14 pb-4">
                    {time ? (
                      <span
                        aria-hidden
                        className="mb-1 inline-flex rounded-full bg-forest-950/70 px-2 py-0.5 text-[0.75rem] font-semibold text-ivory-50 lining-nums"
                      >
                        {time}
                      </span>
                    ) : null}
                    <TileTitle
                      item={item}
                      labels={labels.viewer}
                      className="line-clamp-2 block text-body-sm font-semibold text-ivory-50"
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="container-page mt-2 flex items-center justify-center gap-2">
        <IconButton
          label={labels.previous}
          icon={<ArrowLeft />}
          variant="ghost"
          onClick={() => page(-1)}
        />
        <IconButton
          label={labels.next}
          icon={<ArrowRight />}
          variant="ghost"
          onClick={() => page(1)}
        />
      </div>
      {open !== null ? (
        <MediaViewer
          items={current.items}
          index={open}
          labels={labels.viewer}
          onChange={setOpen}
          onClose={() => {
            setOpen(null);
            opener.current?.focus();
          }}
        />
      ) : null}
    </section>
  );
}
