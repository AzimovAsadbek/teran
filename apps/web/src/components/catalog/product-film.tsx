'use client';

import type { ProductFilmDto } from '@teran/contracts';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { cn } from '@/lib/cn';
import { useFilmsAllowed, useMotionPaused, usePageLoaded } from '@/lib/motion';

/**
 * The width of the cards' copy (storage/tea-films-3: 720 px, a four-column card on a 2× display).
 * A card drawn wider than that on the screen plays the film itself, so it is as sharp as the
 * picture under it.
 */
const CARD_COPY_WIDTH = 720;
/**
 * How long a card stays on screen before its film is fetched. A card's film is most of a megabyte:
 * cards only scrolled past, or a screen ahead that is never reached, cost nothing.
 */
const CARD_DWELL_MS = 500;

/**
 * A product picture's living film over the picture itself (its first frame): tea poured, a
 * gaiwan's lid lifted, leaves drifting. With a mask the film shows only where it moves (elsewhere
 * the picture underneath, so the still parts stay sharp and never flicker as the loop starts
 * over); without one it covers the whole picture, its loop seamless by itself (ADR-053). It loads
 * once the page has and the picture comes near (a card's, once the card has stayed on screen a
 * moment), plays while on screen (and, in a gallery, while its slide is the one shown), fades in
 * over the picture, and keeps still with reduced motion, on a data-saving or slow connection or
 * while the visitor has paused the films (lib/motion). Decorative: the picture's own text
 * alternative describes it.
 */
export function ProductFilm({
  film,
  size,
  active = true,
  className,
}: {
  film: ProductFilmDto;
  /**
   * `card`: the smaller copy (product cards; the film itself where a card is drawn wider than the
   * copy); `full`: the film itself (the product's gallery).
   */
  size: 'card' | 'full';
  active?: boolean;
  className?: string;
}) {
  const allowed = useFilmsAllowed();
  const paused = useMotionPaused();
  const loaded = usePageLoaded();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  // Measured as the card comes near: whether it is drawn wider than its copy.
  const [wide, setWide] = useState(false);
  const src = size === 'card' ? film.cardSrc && (wide ? film.src : film.cardSrc) : film.src;
  const [onScreen, setOnScreen] = useState(false);
  const [dwelled, setDwelled] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !allowed) return;
    const ahead = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        const drawn = entry.boundingClientRect.width * (window.devicePixelRatio || 1);
        setWide(drawn > CARD_COPY_WIDTH * 1.1);
        setNear(true);
      },
      { rootMargin: '50% 0px' },
    );
    // Played while at least half of it shows: a row of cards half off the screen (or a gallery
    // slide scrolled away) does not keep several films decoding at once.
    const visible = new IntersectionObserver(
      ([entry]) =>
        setOnScreen(Boolean(entry?.isIntersecting) && (entry?.intersectionRatio ?? 0) >= 0.5),
      { threshold: [0, 0.5, 1] },
    );
    ahead.observe(video);
    visible.observe(video);
    return () => {
      ahead.disconnect();
      visible.disconnect();
    };
  }, [allowed]);

  // A card's film waits until the card has stayed on screen a moment; a gallery's comes when near.
  useEffect(() => {
    if (size !== 'card' || !onScreen || dwelled) return;
    const timer = window.setTimeout(() => setDwelled(true), CARD_DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [size, onScreen, dwelled]);

  const ready = allowed && loaded && (size === 'card' ? dwelled : near) && src !== null;
  const playing = ready && onScreen && active && !paused;
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !ready) return;
    if (playing) {
      video.muted = true;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [playing, ready]);

  if (!allowed || src === null) return null;
  // The mask is cropped as the film is (cover, centred), so the two stay aligned.
  const mask: CSSProperties | undefined = film.mask
    ? {
        maskImage: `url(${film.mask})`,
        WebkitMaskImage: `url(${film.mask})`,
        maskSize: 'cover',
        WebkitMaskSize: 'cover',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
      }
    : undefined;
  return (
    <video
      ref={videoRef}
      src={ready ? src : undefined}
      muted
      loop
      playsInline
      disablePictureInPicture
      preload={ready ? 'auto' : 'none'}
      aria-hidden
      tabIndex={-1}
      onPlaying={() => setShown(true)}
      style={mask}
      className={cn(
        'pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out',
        shown ? 'opacity-100' : 'opacity-0',
        className,
      )}
    />
  );
}
