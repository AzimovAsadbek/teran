'use client';

import type { MediaItemDto } from '@teran/contracts';
import { useEffect, useRef, useState } from 'react';
import { useAmbientPlayback } from '@/lib/ambient-playback';
import { cn } from '@/lib/cn';
import { useFilmsAllowed, useMotionPaused } from '@/lib/motion';
import { imageSources } from '@/lib/navigation';

/** The eager poster fills the gallery header until its visible film plays, on phones and desktop. */
export function MediaCover({ item }: { item: MediaItemDto }) {
  const video = useRef<HTMLVideoElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const allowed = useFilmsAllowed();
  const paused = useMotionPaused();
  const poster = imageSources(item.image, 1920);
  const film = item.video && allowed ? item.video : null;
  useEffect(() => {
    const image = posterRef.current;
    if (!image) return;
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(Boolean(entry?.isIntersecting)),
    );
    observer.observe(image);
    return () => observer.disconnect();
  }, []);
  useAmbientPlayback(video, film?.src ?? null, visible && !paused);
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- API renditions (ADR-009) */}
      <img
        ref={posterRef}
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
          ref={video}
          src={film.src}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden
          onPlaying={() => setPlaying(film.src)}
          onError={() => setPlaying(null)}
          className={cn(
            'absolute inset-0 -z-20 h-full w-full object-cover transition-opacity duration-1000',
            playing === film.src ? 'opacity-100' : 'opacity-0',
          )}
        />
      ) : null}
    </>
  );
}
