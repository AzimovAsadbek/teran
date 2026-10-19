'use client';

import type { PublicFilmDto } from '@teran/contracts';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useFilmsAllowed, useMatches, useMotionPaused } from '@/lib/motion';
import { filmPosition, filmSource } from '@/lib/visuals';

/** How long a film takes to appear over its poster (its own first frame) when it starts. */
const FADE_IN_MS = 800;

/**
 * A muted film looping over its poster, decorative (the words over it carry the meaning): a page
 * picture's film (set by the import script, ADR-037), the picture being its first frame. The film
 * is prepared as a loop (its end flows into its beginning), so it simply repeats, without a seam.
 *
 * It is fetched whole once the page has loaded and the place comes near the screen, then fades
 * in over the poster; it plays only while on screen, and never with reduced motion, on a
 * data-saving connection or while the visitor has paused the films (the footer's switch,
 * lib/motion). It has no button of its own (the owner's choice). Phones (under `phoneBelow`, as
 * the poster's taller crop) get their own film when there is one.
 *
 * The film lies at -z-20 in its frame (over a poster at -z-20 or below).
 */
export function LoopingFilm({
  film,
  phoneFilm = null,
  phoneBelow = 750,
}: {
  film: PublicFilmDto;
  phoneFilm?: PublicFilmDto | null;
  phoneBelow?: number;
}) {
  const phone = useMatches(`(max-width: ${phoneBelow - 1}px)`);
  const allowed = useFilmsAllowed();
  const paused = useMotionPaused();
  const source = phone === null ? null : phone && phoneFilm ? phoneFilm : film;
  if (!source || !allowed) return null;
  return <FilmPlayer key={source.src} film={source} stopped={paused} />;
}

/** One film: fetched when near, playing while on screen and not stopped. */
function FilmPlayer({ film, stopped }: { film: PublicFilmDto; stopped: boolean }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    // Fetched a screen ahead of the place; played only while some of it shows.
    const ahead = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setNear(true);
      },
      { rootMargin: '100% 0px' },
    );
    const visible = new IntersectionObserver(([entry]) =>
      setOnScreen(Boolean(entry?.isIntersecting)),
    );
    ahead.observe(frame);
    visible.observe(frame);
    return () => {
      ahead.disconnect();
      visible.disconnect();
    };
  }, []);

  // Fetched whole, after the page's own load, so the loop never waits for the network: the copy
  // whose width fills this frame on this screen (sharp on the largest, light on small ones).
  useEffect(() => {
    if (!near) return;
    const abort = new AbortController();
    let objectUrl: string | null = null;
    const fetchFilm = () => {
      const frame = frameRef.current?.getBoundingClientRect();
      const src = frame ? filmSource(film, frame, window.devicePixelRatio || 1) : film.src;
      fetch(src, { signal: abort.signal })
        .then((response) => (response.ok ? response.blob() : Promise.reject(response.status)))
        .then((blob) => {
          objectUrl = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: film.type }));
          setUrl(objectUrl);
        })
        .catch(() => {
          // A film the page may not read (another origin that does not allow it, a network
          // hiccup): the player streams it from its address instead.
          if (!abort.signal.aborted) setUrl(src);
        });
    };
    let timer = 0;
    if (document.readyState === 'complete') timer = window.setTimeout(fetchFilm, 200);
    else window.addEventListener('load', fetchFilm, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('load', fetchFilm);
      abort.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [near, film]);

  const playing = url !== null && onScreen && !stopped;
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;
    if (playing) {
      video.muted = true;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [playing, url]);

  return (
    <div ref={frameRef} aria-hidden className="absolute inset-0 -z-20">
      <video
        ref={videoRef}
        src={url ?? undefined}
        muted
        loop
        playsInline
        disablePictureInPicture
        preload="auto"
        tabIndex={-1}
        onPlaying={() => setShown(true)}
        style={{
          objectPosition: filmPosition(film),
          transitionDuration: `${FADE_IN_MS}ms`,
          // Only where it moves, when it has a mask: elsewhere its sharp poster shows through. The
          // mask is cropped as the film is (cover, at the same point), so the two stay aligned.
          ...(film.mask
            ? {
                maskImage: `url(${film.mask})`,
                WebkitMaskImage: `url(${film.mask})`,
                maskSize: 'cover',
                WebkitMaskSize: 'cover',
                maskPosition: filmPosition(film),
                WebkitMaskPosition: filmPosition(film),
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
              }
            : {}),
        }}
        className={cn(
          'h-full w-full object-cover transition-opacity ease-out',
          shown ? 'opacity-100' : 'opacity-0',
        )}
      />
    </div>
  );
}
