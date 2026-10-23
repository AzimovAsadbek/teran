'use client';

import type { MediaItemDto } from '@teran/contracts';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { useFilmsAllowed, useMatches, useMotionPaused, usePageLoaded } from '@/lib/motion';
import { imageSources } from '@/lib/navigation';

/**
 * The gallery header's picture (ADR-056): a photograph, or a film's poster with the film itself
 * fading in over it once the page has loaded, muted and looping. The film plays only from 768 px
 * (phones keep the sharp poster rather than a large file) and only where films are allowed (no
 * reduced motion or data saving, not paused with the footer's switch).
 */
export function MediaCover({ item }: { item: MediaItemDto }) {
  const [playing, setPlaying] = useState(false);
  const allowed = useFilmsAllowed();
  const paused = useMotionPaused();
  const loaded = usePageLoaded();
  const wide = useMatches('(min-width: 48rem)') === true;
  const poster = imageSources(item.image, 1920);
  const film = item.video && allowed && !paused && loaded && wide ? item.video : null;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- API renditions (ADR-009) */}
      <img
        src={poster.src}
        srcSet={poster.srcSet}
        sizes="100vw"
        width={item.image.width}
        height={item.image.height}
        alt=""
        loading="eager"
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      />
      {film ? (
        <video
          src={film.src}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          aria-hidden
          onPlaying={() => setPlaying(true)}
          className={cn(
            'absolute inset-0 -z-20 h-full w-full object-cover transition-opacity duration-1000',
            playing ? 'opacity-100' : 'opacity-0',
          )}
        />
      ) : null}
    </>
  );
}
