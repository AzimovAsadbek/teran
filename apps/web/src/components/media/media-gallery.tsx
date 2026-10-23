'use client';

import type { MediaItemDto } from '@teran/contracts';
import { ArrowLeft, ArrowRight, Film, ImageIcon, Play, X } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { cn } from '@/lib/cn';
import { imageSources } from '@/lib/navigation';
import { TileTitle } from './tile-title';

export interface MediaLabels {
  photo: string;
  video: string;
  /** "{title} — kattalashtirish" */
  open: string;
  /** "Filmni koʻrish: {title}" */
  play: string;
  close: string;
  previous: string;
  next: string;
  /** "{index} / {total}" */
  position: string;
  /** Name of the viewer's strip of thumbnails. */
  thumbnails: string;
  /** Label of a film's subtitle track. */
  captions: string;
}

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));

function duration(seconds: number | null): string | null {
  if (!seconds) return null;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

const ratio = (item: MediaItemDto) => item.image.width / item.image.height;

/**
 * A justified tile is as wide as its row is tall (9.5, 14, 17 rem) times its proportions, a little
 * wider as rows stretch to fill; on phones at most the page's width.
 */
const justifiedSizes = (item: MediaItemDto) => {
  const r = ratio(item);
  const rem = (row: number) => `${(row * r * 1.25).toFixed(1)}rem`;
  // A phone's rows hold two or three pictures, which grow up to nearly twice their 9.5rem height
  // to fill the row (measured 2026-10-18), hence the larger allowance there.
  return `(min-width: 1024px) ${rem(17)}, (min-width: 640px) ${rem(14)}, ${Math.min(92, Math.round(70 * r))}vw`;
};

/** Films: one column on phones, two from 640 px, three from 1024 px when there are three or more. */
const filmSizes = (count: number) =>
  count >= 3
    ? '(min-width: 1440px) 26.5rem, (min-width: 1024px) 30vw, (min-width: 640px) 46vw, calc(100vw - 3rem)'
    : count === 2
      ? '(min-width: 1440px) 40rem, (min-width: 640px) 46vw, calc(100vw - 3rem)'
      : '(min-width: 816px) 48rem, calc(100vw - 3rem)';

/**
 * The home page's order: a wide picture leads (the feature), a tall one stands beside it, the rest
 * follow; with no wide or tall picture the order is kept.
 */
function editorialOrder(items: MediaItemDto[]): MediaItemDto[] {
  const queue = [...items];
  const take = (prefer: (item: MediaItemDto) => boolean) => {
    const found = queue.findIndex(prefer);
    return queue.splice(found >= 0 ? found : 0, 1)[0];
  };
  const feature = take((item) => ratio(item) >= 1.2);
  const tall = take((item) => ratio(item) <= 0.85);
  return [feature, tall, ...queue].filter((item): item is MediaItemDto => Boolean(item));
}

/** "Surat" or "Film · 1:35", with its icon: photographs and films are told apart at a glance. */
function KindLabel({
  item,
  labels,
  className,
}: {
  item: MediaItemDto;
  labels: MediaLabels;
  className?: string;
}) {
  const time = duration(item.video?.durationSeconds ?? null);
  const Icon = item.video ? Film : ImageIcon;
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex items-center gap-1.5 text-micro tracking-[0.16em] text-gold-300 uppercase',
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
      {item.video ? labels.video : labels.photo}
      {time ? ` · ${time}` : null}
    </span>
  );
}

/** The picture of a tile: lazy, responsive, slowly drawn closer on hover. */
function TileImage({
  item,
  sizes,
  priority = false,
  className,
}: {
  item: MediaItemDto;
  sizes: string;
  /** The page's main picture (its largest paint): fetched first, the others when bandwidth allows. */
  priority?: boolean;
  className?: string;
}) {
  const { src, srcSet } = imageSources(item.image, 960);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- pre-sized renditions from the API (ADR-009)
    <img
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      width={item.image.width}
      height={item.image.height}
      alt=""
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'low'}
      decoding="async"
      className={cn(
        'h-full w-full object-cover transition-transform duration-[1400ms] ease-[var(--ease-soft)] group-hover:scale-[1.035] group-focus-visible:scale-[1.035] motion-reduce:transition-none',
        className,
      )}
    />
  );
}

/** A film's tile shows its poster with a play mark; nothing plays until the viewer opens. */
function PlayMark({ large = false }: { large?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'absolute top-1/2 left-1/2 grid -translate-1/2 place-items-center rounded-full border border-ivory-50/70 bg-forest-950/40 text-gold-300 backdrop-blur-[2px] transition-transform duration-500 ease-[var(--ease-soft)] group-hover:scale-110 motion-reduce:transition-none',
        large ? 'h-20 w-20' : 'h-14 w-14',
      )}
    >
      <Play className={cn('ml-0.5 fill-current', large ? 'h-7 w-7' : 'h-5 w-5')} />
    </span>
  );
}

const TILE_BUTTON =
  'group relative block w-full overflow-hidden bg-forest-900 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-300';

/**
 * "Lavhalar": photographs or films that open a full-screen viewer. Photographs and films are kept
 * apart (their own pages and home-page groups); each list holds one kind. Three arrangements:
 * - `editorial` (home page photographs): a wide feature with its caption over it, a tall picture
 *   beside it and a row of pictures with captions beneath, on a dark band. Phones show the
 *   feature, then scroll the rest sideways.
 * - `justified` (the photographs page): rows of equal height in which every picture keeps its
 *   proportions (each takes room in proportion to its width), so nothing is cut or left ragged.
 * - `films` (films, home page and films page): posters in a 16:9 grid with the running time, the
 *   title and the description beneath.
 * - `reels` (upright films, ADR-056): tall posters side by side, the title over each, as a feed's
 *   cards (two across on phones, four, then all eight in one row on wide screens).
 * Films never play by themselves: a tile shows the poster, and the film starts in the viewer when
 * the visitor presses play (browser controls, sound and subtitles under their control).
 */
export function MediaGallery({
  items,
  labels,
  layout = 'justified',
  priorityFirst = false,
  className,
}: {
  items: MediaItemDto[];
  labels: MediaLabels;
  layout?: 'editorial' | 'justified' | 'films' | 'reels';
  /** The first picture is the page's largest paint (a media page): fetch it before the others. */
  priorityFirst?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const shown = layout === 'editorial' ? editorialOrder(items).slice(0, 6) : items;
  const openAt = (index: number) => (element: HTMLElement) => {
    opener.current = element;
    setOpen(index);
  };

  return (
    <>
      {layout === 'editorial' ? (
        <EditorialLayout items={shown} labels={labels} onOpen={openAt} className={className} />
      ) : layout === 'reels' ? (
        <ReelsLayout items={shown} labels={labels} onOpen={openAt} className={className} />
      ) : layout === 'films' ? (
        <FilmsLayout
          items={shown}
          labels={labels}
          onOpen={openAt}
          priorityFirst={priorityFirst}
          className={className}
        />
      ) : (
        <ul
          role="list"
          className={cn(
            "flex flex-wrap gap-2 [--row:9.5rem] after:flex-[999_1_0%] after:content-[''] sm:gap-3 sm:[--row:14rem] lg:[--row:17rem]",
            className,
          )}
        >
          {shown.map((item, index) => (
            <li
              key={item.id}
              className="relative min-w-0"
              style={
                {
                  flexGrow: ratio(item),
                  flexBasis: `calc(var(--row) * ${ratio(item).toFixed(4)})`,
                } as CSSProperties
              }
            >
              <button
                type="button"
                onClick={(event) => openAt(index)(event.currentTarget)}
                className={cn(TILE_BUTTON, 'rounded-[0.375rem]')}
                style={{ aspectRatio: `${item.image.width} / ${item.image.height}` }}
              >
                <TileImage
                  item={item}
                  sizes={justifiedSizes(item)}
                  priority={priorityFirst && index === 0}
                />
                <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-forest-950/85 via-forest-950/30 to-transparent px-3 pt-10 pb-2.5 transition-opacity duration-300 sm:px-4 sm:pb-3.5 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-visible:opacity-100">
                  <KindLabel item={item} labels={labels} />
                  <TileTitle
                    item={item}
                    labels={labels}
                    className="mt-1 line-clamp-2 block text-body-sm font-medium text-ivory-50 sm:text-title-sm"
                  />
                </span>
                {item.video ? <PlayMark /> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
      <MediaViewer
        items={shown}
        index={open}
        labels={labels}
        onChange={setOpen}
        onClose={() => {
          setOpen(null);
          opener.current?.focus();
        }}
      />
    </>
  );
}

/** Upright posters side by side, each with its title over its foot. */
function ReelsLayout({
  items,
  labels,
  onOpen,
  className,
}: {
  items: MediaItemDto[];
  labels: MediaLabels;
  onOpen: (index: number) => (element: HTMLElement) => void;
  className?: string;
}) {
  return (
    <ul
      role="list"
      className={cn('grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 xl:grid-cols-8', className)}
    >
      {items.map((item, index) => {
        const time = duration(item.video?.durationSeconds ?? null);
        return (
          <li key={item.id} className="min-w-0">
            <button
              type="button"
              onClick={(event) => onOpen(index)(event.currentTarget)}
              aria-label={fill(labels.play, { title: item.title })}
              className={cn(TILE_BUTTON, 'aspect-[9/16] rounded-[0.875rem]')}
            >
              <TileImage
                item={item}
                sizes="(min-width: 1280px) 10rem, (min-width: 640px) 23vw, 46vw"
              />
              <span
                aria-hidden
                className="absolute inset-0 bg-linear-to-t from-forest-950/85 via-forest-950/10 via-40% to-transparent"
              />
              <PlayMark />
              {time ? (
                <span
                  aria-hidden
                  className="absolute top-2.5 right-2.5 rounded-full bg-forest-950/70 px-2 py-0.5 text-caption font-semibold text-ivory-50 tabular-nums"
                >
                  {time}
                </span>
              ) : null}
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 p-3 text-body-sm leading-snug font-semibold text-balance text-ivory-50"
              >
                {item.title}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Posters in a grid (one column on phones), as many columns as films up to three. */
function FilmsLayout({
  items,
  labels,
  onOpen,
  priorityFirst,
  className,
}: {
  items: MediaItemDto[];
  labels: MediaLabels;
  onOpen: (index: number) => (element: HTMLElement) => void;
  priorityFirst: boolean;
  className?: string;
}) {
  return (
    <ul
      role="list"
      className={cn(
        'grid gap-x-6 gap-y-10',
        items.length >= 3
          ? 'sm:grid-cols-2 lg:grid-cols-3'
          : items.length === 2
            ? 'sm:grid-cols-2'
            : 'max-w-3xl',
        className,
      )}
    >
      {items.map((item, index) => {
        const time = duration(item.video?.durationSeconds ?? null);
        return (
          <li key={item.id} className="min-w-0">
            <button
              type="button"
              onClick={(event) => onOpen(index)(event.currentTarget)}
              className="group block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-300"
            >
              <span className="relative block aspect-video overflow-hidden rounded-[0.25rem] bg-forest-900">
                <TileImage
                  item={item}
                  sizes={filmSizes(items.length)}
                  priority={priorityFirst && index === 0}
                />
                <span
                  aria-hidden
                  className="absolute inset-0 bg-linear-to-t from-forest-950/55 to-transparent to-45%"
                />
                <PlayMark large={items.length < 3} />
                {time ? (
                  <span
                    aria-hidden
                    className="absolute right-3 bottom-3 rounded-full bg-forest-950/80 px-2.5 py-0.5 text-caption font-semibold text-ivory-50 tabular-nums"
                  >
                    {time}
                  </span>
                ) : null}
              </span>
              <span className="mt-3.5 block">
                <KindLabel item={item} labels={labels} />
                <TileTitle
                  item={item}
                  labels={labels}
                  className="mt-1.5 block text-title-sm text-ivory-50 decoration-gold-300/50 underline-offset-4 group-hover:underline sm:text-display-xs"
                />
                {item.caption ? (
                  <span
                    aria-hidden
                    className="mt-1.5 line-clamp-2 block text-body-sm text-ivory-100/70"
                  >
                    {item.caption}
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function EditorialLayout({
  items,
  labels,
  onOpen,
  className,
}: {
  items: MediaItemDto[];
  labels: MediaLabels;
  onOpen: (index: number) => (element: HTMLElement) => void;
  className?: string;
}) {
  const [feature, ...rest] = items;
  if (!feature) return null;
  const tall = rest[0];
  const small = rest.slice(1, 5);
  // The second row is always full: four squares, three wider tiles or two wide ones.
  const second = small.length;
  const secondShape =
    second >= 4
      ? { cell: 'lg:col-span-3', image: 'aspect-square' }
      : second === 3
        ? { cell: 'lg:col-span-4', image: 'aspect-square lg:aspect-[4/3]' }
        : { cell: 'lg:col-span-6', image: 'aspect-square lg:aspect-[3/2]' };
  return (
    <div className={cn('lg:grid lg:grid-cols-12 lg:gap-x-6 lg:gap-y-10', className)}>
      {/* The feature: the caption sits on the picture. */}
      <button
        type="button"
        onClick={(event) => onOpen(0)(event.currentTarget)}
        className={cn(
          TILE_BUTTON,
          'aspect-[4/5] rounded-[0.25rem] sm:aspect-[16/10] lg:aspect-auto lg:h-[34rem]',
          tall ? 'lg:col-span-7' : 'lg:col-span-12',
        )}
      >
        <TileImage
          item={feature}
          sizes={tall ? '(min-width: 1024px) 56vw, calc(100vw - 3rem)' : 'calc(100vw - 3rem)'}
        />
        <span
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-forest-950/90 via-forest-950/15 to-transparent"
        />
        <span className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
          <KindLabel item={feature} labels={labels} />
          <TileTitle
            item={feature}
            labels={labels}
            className="mt-2 block max-w-xl text-display-sm text-ivory-50 sm:text-display-md"
          />
          {feature.caption ? (
            <span
              aria-hidden
              className="mt-2 line-clamp-2 block max-w-lg text-body-sm text-ivory-100/80 sm:text-body"
            >
              {feature.caption}
            </span>
          ) : null}
        </span>
        {feature.video ? <PlayMark large /> : null}
      </button>

      {/* The rest: captions beneath the pictures. Phones scroll them sideways. */}
      <ul
        role="list"
        className="-mx-gutter mt-6 flex snap-x snap-mandatory scroll-px-gutter gap-4 overflow-x-auto px-gutter pb-2 [scrollbar-width:thin] lg:contents"
      >
        {tall ? (
          <li className="w-[72%] max-w-[20rem] shrink-0 snap-start lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:w-auto lg:max-w-none">
            <EditorialTile
              item={tall}
              labels={labels}
              onOpen={onOpen(1)}
              imageClass="aspect-[4/5] lg:aspect-auto lg:h-[27.5rem]"
              sizes="(min-width: 1024px) 40vw, 72vw"
              withCaption
            />
          </li>
        ) : null}
        {small.map((item, index) => (
          <li
            key={item.id}
            className={cn(
              'w-[60%] max-w-[16rem] shrink-0 snap-start lg:w-auto lg:max-w-none',
              secondShape.cell,
            )}
          >
            <EditorialTile
              item={item}
              labels={labels}
              onOpen={onOpen(index + 2)}
              imageClass={secondShape.image}
              sizes="(min-width: 1024px) 34vw, 60vw"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function EditorialTile({
  item,
  labels,
  onOpen,
  imageClass,
  sizes,
  withCaption = false,
}: {
  item: MediaItemDto;
  labels: MediaLabels;
  onOpen: (element: HTMLElement) => void;
  imageClass: string;
  sizes: string;
  /** Show the caption under the title too. */
  withCaption?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(event) => onOpen(event.currentTarget)}
      className="group block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-300"
    >
      <span
        className={cn('relative block overflow-hidden rounded-[0.25rem] bg-forest-900', imageClass)}
      >
        <TileImage item={item} sizes={sizes} />
        {/* A hairline frame that draws in on hover. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-2.5 border border-gold-300/0 transition-colors duration-500 group-hover:border-gold-300/45 group-focus-visible:border-gold-300/45"
        />
        {item.video ? <PlayMark /> : null}
      </span>
      <span className="mt-3.5 block">
        <KindLabel item={item} labels={labels} />
        <TileTitle
          item={item}
          labels={labels}
          className="mt-1.5 block text-title-sm text-ivory-50 decoration-gold-300/50 underline-offset-4 group-hover:underline sm:text-display-xs"
        />
        {withCaption && item.caption ? (
          <span aria-hidden className="mt-1.5 line-clamp-2 block text-body-sm text-ivory-100/70">
            {item.caption}
          </span>
        ) : null}
      </span>
    </button>
  );
}

/** A swipe across the viewer moves to the next or previous picture (phones). */
const SWIPE_DISTANCE = 56;

/**
 * Full-screen viewer (a native modal dialog: focus moves in, Esc closes, focus returns to the tile
 * that opened it). ←/→ move, Home/End jump to the ends, a swipe moves on phones; a strip of
 * thumbnails below shows where one is. The neighbouring pictures are fetched ahead. A film plays
 * only when its controls are used; moving on stops it.
 */
export function MediaViewer({
  items,
  index,
  labels,
  autoPlayFilms = false,
  onChange,
  onClose,
}: {
  items: MediaItemDto[];
  index: number | null;
  labels: MediaLabels;
  /**
   * A film starts at once, muted and looping (the home page's feed of TERAN's silent films: the
   * visitor opened it to watch); otherwise it waits for its controls.
   */
  autoPlayFilms?: boolean;
  onChange: (index: number) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stripRef = useRef<HTMLOListElement>(null);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const item = index === null ? null : items[index];
  const count = items.length;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (item && !dialog.open) {
      dialog.showModal();
      document.documentElement.style.overflow = 'hidden';
    } else if (!item && dialog.open) {
      dialog.close();
    }
    if (!item) document.documentElement.style.overflow = '';
  }, [item]);

  useEffect(() => () => void (document.documentElement.style.overflow = ''), []);

  // Keep the current thumbnail in view.
  useEffect(() => {
    if (index === null) return;
    stripRef.current
      ?.querySelector<HTMLElement>(`[data-index="${index}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [index]);

  const move = (step: number) => {
    if (index === null || count < 2) return;
    onChange((index + step + count) % count);
  };

  const onPointerDown = (event: ReactPointerEvent) => {
    // Mice use the buttons; a drag on a film's controls (seeking) is not a swipe.
    if (event.pointerType === 'mouse') return;
    if ((event.target as HTMLElement).closest('video, button')) return;
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: ReactPointerEvent) => {
    const start = pointer.current;
    pointer.current = null;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    move(dx < 0 ? 1 : -1);
  };

  const image = item ? imageSources(item.image, 1280) : null;
  const neighbours =
    index === null || count < 2
      ? []
      : [items[(index + 1) % count], items[(index - 1 + count) % count]].filter(
          (neighbour): neighbour is MediaItemDto => Boolean(neighbour) && neighbour !== item,
        );

  return (
    <dialog
      ref={dialogRef}
      aria-label={item?.title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') move(1);
        else if (event.key === 'ArrowLeft') move(-1);
        else if (event.key === 'Home' && index !== null) onChange(0);
        else if (event.key === 'End' && index !== null) onChange(count - 1);
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-forest-950 p-0 text-ivory-50 backdrop:bg-forest-950/80"
    >
      {item && image ? (
        <div
          className="flex h-full flex-col"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          <div className="flex items-center justify-between gap-4 px-4 pt-3 sm:px-6 sm:pt-4">
            <p className="text-body-sm text-ivory-100/70 lining-nums">
              {fill(labels.position, { index: (index ?? 0) + 1, total: count })}
            </p>
            <button
              type="button"
              onClick={onClose}
              aria-label={labels.close}
              className="grid h-11 w-11 place-items-center rounded-full border border-ivory-50/20 text-ivory-50 transition-colors hover:bg-ivory-50/10"
            >
              <X aria-hidden className="h-5 w-5" />
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 py-3 sm:px-24">
            {item.video ? (
              <video
                key={item.id}
                controls
                playsInline
                autoPlay={autoPlayFilms}
                muted={autoPlayFilms}
                loop={autoPlayFilms}
                preload={autoPlayFilms ? 'auto' : 'metadata'}
                poster={image.src}
                className="max-h-full max-w-full rounded-[0.25rem] bg-black"
              >
                <source src={item.video.src} type={item.video.type} />
                {item.video.captions ? (
                  <track
                    kind="captions"
                    src={item.video.captions.src}
                    srcLang={item.video.captions.srclang}
                    label={labels.captions}
                    default
                  />
                ) : null}
              </video>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- pre-sized renditions from the API (ADR-009)
              <img
                key={item.id}
                src={image.src}
                srcSet={image.srcSet}
                sizes="(min-width: 640px) 85vw, 100vw"
                width={item.image.width}
                height={item.image.height}
                alt={item.image.alt || item.title}
                className="max-h-full max-w-full rounded-[0.25rem] object-contain motion-safe:animate-fade-in"
              />
            )}
            {count > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => move(-1)}
                  aria-label={labels.previous}
                  className="absolute top-1/2 left-3 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-ivory-50/30 text-ivory-50 transition-colors hover:bg-ivory-50/10 sm:left-6 sm:grid"
                >
                  <ArrowLeft aria-hidden className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(1)}
                  aria-label={labels.next}
                  className="absolute top-1/2 right-3 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-ivory-50/30 text-ivory-50 transition-colors hover:bg-ivory-50/10 sm:right-6 sm:grid"
                >
                  <ArrowRight aria-hidden className="h-5 w-5" />
                </button>
              </>
            ) : null}
          </div>
          <div className="mx-auto w-full max-w-3xl px-4 pt-2 text-center">
            <KindLabel item={item} labels={labels} className="justify-center" />
            <h2 className="mt-1.5 text-display-sm text-ivory-50">{item.title}</h2>
            {item.caption ? (
              <p className="mt-2 text-body-sm text-ivory-100/75">{item.caption}</p>
            ) : null}
          </div>
          {count > 1 ? (
            <div className="flex items-center justify-center gap-3 px-4 pt-4 pb-5 sm:pb-6">
              <button
                type="button"
                onClick={() => move(-1)}
                aria-label={labels.previous}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-ivory-50/30 text-ivory-50 sm:hidden"
              >
                <ArrowLeft aria-hidden className="h-5 w-5" />
              </button>
              <ol
                ref={stripRef}
                aria-label={labels.thumbnails}
                className="flex max-w-full gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none]"
              >
                {items.map((thumb, thumbIndex) => (
                  <li key={thumb.id} data-index={thumbIndex} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => onChange(thumbIndex)}
                      aria-label={fill(labels.position, { index: thumbIndex + 1, total: count })}
                      aria-current={thumbIndex === index ? 'true' : undefined}
                      className={cn(
                        'relative block h-12 w-12 overflow-hidden rounded-[0.25rem] opacity-55 ring-1 ring-ivory-50/10 transition-[opacity,box-shadow] hover:opacity-90 aria-current:opacity-100 aria-current:ring-2 aria-current:ring-gold-300 sm:h-14 sm:w-14',
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized renditions from the API (ADR-009) */}
                      <img
                        src={`${thumb.image.src}/${thumb.image.widths[0]}.webp`}
                        alt=""
                        width={thumb.image.width}
                        height={thumb.image.height}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                      {thumb.video ? (
                        <Play
                          aria-hidden
                          className="absolute top-1/2 left-1/2 h-4 w-4 -translate-1/2 fill-current text-ivory-50"
                        />
                      ) : null}
                    </button>
                  </li>
                ))}
              </ol>
              <button
                type="button"
                onClick={() => move(1)}
                aria-label={labels.next}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-ivory-50/30 text-ivory-50 sm:hidden"
              >
                <ArrowRight aria-hidden className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="pb-6" />
          )}
          {/* The neighbours load ahead, so moving on shows them at once. */}
          <div aria-hidden className="hidden">
            {neighbours.map((neighbour) => {
              const ahead = imageSources(neighbour.image, 1280);
              return (
                // eslint-disable-next-line @next/next/no-img-element -- prefetch of API renditions
                <img
                  key={neighbour.id}
                  src={ahead.src}
                  srcSet={ahead.srcSet}
                  sizes="(min-width: 640px) 85vw, 100vw"
                  alt=""
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
