'use client';

import type { PublicFilmDto } from '@teran/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAmbientPlayback } from '@/lib/ambient-playback';
import { cn } from '@/lib/cn';
import { useFilmWidthLimit, useFilmsAllowed, useMatches, useMotionPaused } from '@/lib/motion';
import { filmPosition, filmSource } from '@/lib/visuals';

/** How long a film takes to appear over its poster (its own first frame) when it starts. */
const FADE_IN_MS = 250;

/**
 * A muted film looping over its poster, decorative (the words over it carry the meaning): a page
 * picture's film (set by the import script, ADR-037), the picture being its first frame. The film
 * is prepared as a loop (its end flows into its beginning), so it simply repeats, without a seam.
 *
 * The browser streams byte ranges for the visible frame. The poster stays under it until
 * playback starts. Phones can use a separate crop and constrained links use the smallest copy.
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
  const limit = useFilmWidthLimit();
  const [onScreen, setOnScreen] = useState(false);
  const [frame, setFrame] = useState<{ width: number; height: number } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [shown, setShown] = useState<string | null>(null);
  const [stalled, setStalled] = useState(false);
  const preferSmaller = useCallback(() => setStalled(true), []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new IntersectionObserver(([entry]) => {
      const visible = Boolean(entry?.isIntersecting);
      setOnScreen(visible);
      if (visible) setFrame(frame.getBoundingClientRect());
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const smallest = film.sources[0];
  const selected = frame
    ? filmSource(film, frame, 1, stalled && smallest ? smallest.width : limit)
    : null;
  const source = selected && selected === failed ? film.src : selected;
  useAmbientPlayback(
    videoRef,
    source,
    onScreen && !stopped,
    !stalled && smallest && smallest.src !== source ? preferSmaller : undefined,
  );

  return (
    <div ref={frameRef} aria-hidden className="absolute inset-0 -z-20">
      <video
        ref={videoRef}
        src={source ?? undefined}
        muted
        loop
        playsInline
        disablePictureInPicture
        preload="none"
        tabIndex={-1}
        onPlaying={() => setShown(source)}
        onError={() => {
          setShown(null);
          setFailed(selected);
        }}
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
          shown && shown === source ? 'opacity-100' : 'opacity-0',
        )}
      />
    </div>
  );
}
