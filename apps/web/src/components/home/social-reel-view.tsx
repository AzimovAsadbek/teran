'use client';

import type { MediaItemDto } from '@teran/contracts';
import { ArrowLeft, ArrowRight, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Emblem } from '@/components/brand/logo';
import { MediaViewer, type MediaLabels } from '@/components/media/media-gallery';
import { NETWORK_NAMES, SocialIcon } from '@/components/social/social-icon';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import type { SocialLink } from '@/lib/contact';
import { useFilmsAllowed, useMotionPaused, usePageLoaded } from '@/lib/motion';
import { imageSources } from '@/lib/navigation';

export interface SocialReelLabels {
  title: string;
  intro: string;
  follow: string;
  gallery: string;
  /** "{index} / {total}" */
  position: string;
  media: MediaLabels;
}

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));

const ROUND =
  'grid h-12 w-12 place-items-center rounded-full border border-forest-900/15 bg-white text-fg shadow-[0_2px_8px_-2px_rgb(0_0_0_/_0.18)] transition-[background-color,scale,opacity] duration-200 hover:bg-ivory-100 active:scale-95 disabled:pointer-events-none disabled:opacity-35';

/**
 * TERAN's films as a feed (the reference's "sip & scroll on social", ADR-056): upright cards in a
 * row that snaps to the middle, the one in the middle larger and playing, muted, the others still
 * on their posters. Arrows below move it, a swipe or the wheel scroll it, and a card opens the
 * full-screen viewer at its film. TERAN's networks follow, then the way to the gallery. The film
 * plays only while the band is in view, the page has loaded and films are allowed (no reduced
 * motion or data saving, not paused with the footer's switch); otherwise every card is a poster.
 */
export function SocialReelView({
  films,
  socials,
  labels,
}: {
  films: MediaItemDto[];
  socials: SocialLink[];
  labels: SocialReelLabels;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const frame = useRef(0);
  const [active, setActive] = useState(Math.min(1, films.length - 1));
  const [open, setOpen] = useState<number | null>(null);
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState<string | null>(null);
  const filmsAllowed = useFilmsAllowed();
  const paused = useMotionPaused();
  const loaded = usePageLoaded();
  const playing = inView && loaded && filmsAllowed && !paused && open === null;
  const handle = socials.find((link) => link.handle)?.handle ?? null;

  // The second card starts in the middle, so the row reads as a row on either side.
  useEffect(() => {
    const track = trackRef.current;
    const card = track?.children[Math.min(1, films.length - 1)] as HTMLElement | undefined;
    if (!track || !card) return;
    track.scrollLeft = card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2;
  }, [films.length]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      {
        threshold: 0.35,
      },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  /** The card nearest the middle of the row becomes the active one. */
  const onScroll = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const track = trackRef.current;
      if (!track) return;
      const middle = track.scrollLeft + track.clientWidth / 2;
      let nearest = 0;
      let distance = Infinity;
      Array.from(track.children).forEach((child, index) => {
        const card = child as HTMLElement;
        const gap = Math.abs(card.offsetLeft + card.offsetWidth / 2 - middle);
        if (gap < distance) {
          distance = gap;
          nearest = index;
        }
      });
      setActive(nearest);
    });
  };

  const goTo = (index: number) => {
    const track = trackRef.current;
    const card = track?.children[index] as HTMLElement | undefined;
    if (!track || !card) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollTo({
      left: card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2,
      behavior: reduced ? 'auto' : 'smooth',
    });
  };

  return (
    <section
      ref={sectionRef}
      aria-labelledby="social-reel-title"
      className="overflow-hidden bg-surface-muted pt-14 pb-16 sm:pt-20 sm:pb-20"
    >
      <div className="container-page text-center">
        <h2
          id="social-reel-title"
          className="font-heading text-[2.25rem] leading-[1.1] text-balance text-fg min-[46.875rem]:text-[2.75rem]"
        >
          {labels.title}
        </h2>
        <p className="mx-auto mt-3 max-w-[34rem] text-body text-pretty text-fg-muted">
          {labels.intro}
        </p>
      </div>

      <ul
        ref={trackRef}
        role="list"
        onScroll={onScroll}
        className="relative mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-[calc(50%-var(--card)/2)] py-6 [--card:min(64vw,16.5rem)] [scrollbar-width:none] sm:mt-10 sm:gap-5 sm:[--card:18rem] lg:[--card:19.5rem]"
      >
        {films.map((film, index) => {
          const current = index === active;
          const poster = imageSources(film.image, 640);
          return (
            <li key={film.id} className="w-(--card) shrink-0 snap-center">
              <button
                type="button"
                onClick={(event) => {
                  opener.current = event.currentTarget;
                  setOpen(index);
                }}
                aria-label={fill(labels.media.play, { title: film.title })}
                className={cn(
                  'group relative block aspect-[9/16] w-full overflow-hidden rounded-[1.25rem] bg-forest-900 text-left transition-[scale,filter,box-shadow] duration-500 ease-[var(--ease-soft)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest-900 motion-reduce:transition-none',
                  current
                    ? 'scale-100 shadow-[0_28px_50px_-28px_rgb(0_0_0_/_0.6)]'
                    : 'scale-[0.88] brightness-[0.8] hover:brightness-95',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- API renditions (ADR-009) */}
                <img
                  src={poster.src}
                  srcSet={poster.srcSet}
                  sizes="(min-width: 1024px) 19.5rem, (min-width: 640px) 18rem, 64vw"
                  width={film.image.width}
                  height={film.image.height}
                  alt=""
                  loading={index < 3 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {current && playing && film.video ? (
                  <video
                    key={film.id}
                    src={film.video.src}
                    muted
                    loop
                    playsInline
                    autoPlay
                    preload="auto"
                    aria-hidden
                    onPlaying={() => setReady(film.id)}
                    className={cn(
                      'absolute inset-0 h-full w-full object-cover transition-opacity duration-500',
                      ready === film.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                ) : null}
                <span
                  aria-hidden
                  className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 via-35% to-transparent"
                />
                {!(current && playing) ? (
                  <span
                    aria-hidden
                    className="absolute top-1/2 left-1/2 grid h-14 w-14 -translate-1/2 place-items-center rounded-full bg-white/90 text-forest-900 shadow-[0_6px_18px_-6px_rgb(0_0_0_/_0.5)] transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none"
                  >
                    <Play className="ml-0.5 h-5 w-5 fill-current" />
                  </span>
                ) : null}
                <span className="absolute inset-x-0 bottom-0 flex flex-col gap-2.5 p-4 sm:p-5">
                  <span aria-hidden className="flex items-center gap-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white p-1">
                      <Emblem className="w-full" sizes="32px" />
                    </span>
                    <span className="min-w-0 text-[0.8125rem] leading-tight text-white">
                      <span className="block font-bold tracking-[0.04em]">TERAN</span>
                      {handle ? (
                        <span className="block truncate text-white/80">{handle}</span>
                      ) : null}
                    </span>
                  </span>
                  <span className="text-[1rem] leading-snug font-semibold text-balance text-white sm:text-[1.0625rem]">
                    {film.title}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-2 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => goTo(active - 1)}
          disabled={active === 0}
          aria-label={labels.media.previous}
          className={ROUND}
        >
          <ArrowLeft aria-hidden className="h-5 w-5" />
        </button>
        <p
          aria-live="polite"
          className="min-w-14 text-center text-body-sm font-semibold text-fg-muted tabular-nums"
        >
          {fill(labels.position, { index: active + 1, total: films.length })}
        </p>
        <button
          type="button"
          onClick={() => goTo(active + 1)}
          disabled={active === films.length - 1}
          aria-label={labels.media.next}
          className={ROUND}
        >
          <ArrowRight aria-hidden className="h-5 w-5" />
        </button>
      </div>

      <div className="container-page mt-10 flex flex-col items-center gap-5">
        {socials.length > 0 ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-body-sm font-semibold text-fg">{labels.follow}</p>
            <ul role="list" className="flex flex-wrap justify-center gap-2.5">
              {socials.map((link) => (
                <li key={link.network}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.label}
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-white pr-5 pl-2 text-[0.9375rem] font-semibold text-fg shadow-[0_1px_3px_rgb(0_0_0_/_0.1)] transition-[box-shadow,translate] duration-200 hover:-translate-y-px hover:shadow-[0_6px_14px_-6px_rgb(0_0_0_/_0.3)]"
                  >
                    <SocialIcon network={link.network} className="h-7 w-7" />
                    {link.handle ?? NETWORK_NAMES[link.network]}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <Link
          href="/media"
          className="inline-flex min-h-11 items-center gap-2 text-[1rem] font-semibold text-forest-800 underline decoration-forest-800/30 underline-offset-[6px] hover:decoration-forest-800"
        >
          {labels.gallery}
          <ArrowRight aria-hidden className="h-4 w-4" />
        </Link>
      </div>

      <MediaViewer
        items={films}
        index={open}
        labels={labels.media}
        autoPlayFilms
        onChange={(index) => {
          setOpen(index);
          setActive(index);
          goTo(index);
        }}
        onClose={() => {
          setOpen(null);
          opener.current?.focus();
        }}
      />
    </section>
  );
}
