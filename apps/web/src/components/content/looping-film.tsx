'use client';

import type { PublicFilmDto } from '@teran/contracts';
import { Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { cn } from '@/lib/cn';
import { filmPosition } from '@/lib/visuals';

/** How long a film takes to appear over its poster (its own first frame) when it starts. */
const FADE_IN_MS = 800;

export interface FilmLabels {
  pause: string;
  play: string;
}

function useMatches(query: string): boolean | null {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => null,
  );
}

const noSubscription = () => () => {};

/** A data-saving connection (Chrome on Android, mostly): films stay posters there. */
function useSaveData(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () =>
      Boolean(
        (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
      ),
    () => false,
  );
}

/**
 * A muted film looping over its poster, decorative (the words over it carry the meaning): a page
 * picture's film (set by the import script, ADR-037), the picture being its first frame. The film
 * is prepared as a loop (its end flows into its beginning), so it simply repeats, without a seam.
 *
 * It is fetched whole once the page has loaded and the place comes near the screen, then fades
 * in over the poster; it plays only while on screen, never with reduced motion or on a
 * data-saving connection, and its round button stops it (WCAG 2.2.2). Phones (under
 * `phoneBelow`, as the poster's taller crop) get their own film when there is one.
 *
 * The film lies at -z-20 in its frame (over a poster at -z-20 or below); `controlsClassName`
 * places the button's row (absolutely, in the frame).
 */
export function LoopingFilm({
  film,
  phoneFilm = null,
  phoneBelow = 750,
  labels,
  controlsClassName,
}: {
  film: PublicFilmDto;
  phoneFilm?: PublicFilmDto | null;
  phoneBelow?: number;
  labels: FilmLabels;
  controlsClassName: string;
}) {
  const phone = useMatches(`(max-width: ${phoneBelow - 1}px)`);
  const reducedMotion = useMatches('(prefers-reduced-motion: reduce)');
  const saveData = useSaveData();
  const [ready, setReady] = useState(false);
  const [stopped, setStopped] = useState(false);
  const allowed = reducedMotion === false && !saveData;
  const source = phone === null ? null : phone && phoneFilm ? phoneFilm : film;

  return (
    <>
      {source && allowed ? (
        <FilmPlayer key={source.src} film={source} stopped={stopped} onReady={setReady} />
      ) : null}
      {ready && allowed ? (
        <div className={cn('pointer-events-none absolute', controlsClassName)}>
          <button
            type="button"
            onClick={() => setStopped((value) => !value)}
            aria-label={stopped ? labels.play : labels.pause}
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-forest-950/45 text-ivory-50 backdrop-blur-sm transition-colors duration-200 hover:bg-forest-950/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ivory-50"
          >
            {stopped ? (
              <Play aria-hidden className="h-4 w-4 fill-current" />
            ) : (
              <Pause aria-hidden className="h-4 w-4 fill-current" />
            )}
          </button>
        </div>
      ) : null}
    </>
  );
}

/** One film: fetched when near, playing while on screen and not stopped. */
function FilmPlayer({
  film,
  stopped,
  onReady,
}: {
  film: PublicFilmDto;
  stopped: boolean;
  onReady: (ready: boolean) => void;
}) {
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

  // Fetched whole, after the page's own load, so the loop never waits for the network.
  useEffect(() => {
    if (!near) return;
    const abort = new AbortController();
    let objectUrl: string | null = null;
    const fetchFilm = () => {
      fetch(film.src, { signal: abort.signal })
        .then((response) => (response.ok ? response.blob() : Promise.reject(response.status)))
        .then((blob) => {
          objectUrl = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: film.type }));
          setUrl(objectUrl);
        })
        .catch(() => {});
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
  }, [near, film.src, film.type]);

  useEffect(() => {
    onReady(url !== null);
    return () => onReady(false);
  }, [url, onReady]);

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
        style={{ objectPosition: filmPosition(film), transitionDuration: `${FADE_IN_MS}ms` }}
        className={cn(
          'h-full w-full object-cover transition-opacity ease-out',
          shown ? 'opacity-100' : 'opacity-0',
        )}
      />
    </div>
  );
}
