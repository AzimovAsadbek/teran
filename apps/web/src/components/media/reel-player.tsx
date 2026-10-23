'use client';

import type { MediaItemDto } from '@teran/contracts';
import { ChevronDown, ChevronUp, Pause, Play, Volume1, Volume2, VolumeX, X } from 'lucide-react';
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { Emblem } from '@/components/brand/logo';
import { cn } from '@/lib/cn';
import { useFilmsAllowed, useMatches } from '@/lib/motion';
import { imageSources } from '@/lib/navigation';
import type { MediaLabels } from './media-gallery';
import { fillLabel } from './media-labels';

/** Keys that move through the feed, one film at a time (Home and End go to its ends). */
const STEPS: Record<string, number> = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1 };

const ROUND =
  'grid h-12 w-12 place-items-center rounded-full bg-ivory-50/10 text-ivory-50 transition-[background-color,scale,opacity] duration-200 hover:bg-ivory-50/20 active:scale-95 disabled:pointer-events-none disabled:opacity-30';

/** A click on an arrow leaves focus on the film, so Space still pauses it (Tab reaches the arrows). */
const keepFocus = (event: ReactMouseEvent) => event.preventDefault();

/** The feed's sound as the visitor left it: on (at full volume) until they turn it down or off. */
interface Sound {
  muted: boolean;
  /** 0 to 1. */
  volume: number;
}

const SOUND_KEY = 'teran.reel-sound';
const FULL_SOUND: Sound = { muted: false, volume: 1 };

/** Kept for the browser tab's session, so the next film (and the next opening) sounds the same. */
function readSound(): Sound {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(SOUND_KEY) ?? 'null') as unknown;
    if (saved && typeof saved === 'object' && 'muted' in saved && 'volume' in saved) {
      const { muted, volume } = saved as { muted: unknown; volume: unknown };
      if (typeof muted === 'boolean' && typeof volume === 'number' && Number.isFinite(volume)) {
        return { muted, volume: Math.min(1, Math.max(0, volume)) };
      }
    }
  } catch {
    // Storage refused (a private window): the sound starts on.
  }
  return FULL_SOUND;
}

function writeSound(sound: Sound) {
  try {
    window.sessionStorage.setItem(SOUND_KEY, JSON.stringify(sound));
  } catch {
    // The choice then lasts while the feed is open.
  }
}

interface ReelPlayerProps {
  items: MediaItemDto[];
  labels: MediaLabels;
  /** TERAN's account as people know it ("@TeranTrade"), under its name on every film. */
  handle?: string | null;
  /** Another film came into view (scrolled to, or reached with a key or an arrow). */
  onChange: (index: number) => void;
  /** The feed has closed (focus can go back to where the visitor was). */
  onClose: () => void;
}

/**
 * TERAN's upright films as a feed to scroll, as on Instagram's Reels or YouTube Shorts (ADR-057):
 * a full-screen modal dialog in which every film takes the screen's height and the list snaps one
 * film at a time. The film in view plays, looping, from its beginning, with a teal line along its
 * foot for its time; the one that left stops. A film with a sound track plays its sound, with a
 * speaker to mute it and, where a mouse hovers, a volume slider (ADR-058); silent films play
 * muted. A swipe, the wheel or a trackpad, the arrows at the side and ↑/↓ (PageUp/PageDown,
 * Home/End) move between films; a tap or Space pauses, M mutes; Esc or the cross closes. Only the
 * film in view and its neighbours are fetched.
 */
export function ReelPlayer({ index, ...props }: ReelPlayerProps & { index: number | null }) {
  return index === null ? null : <ReelFeed start={index} {...props} />;
}

function ReelFeed({
  items,
  start,
  labels,
  handle = null,
  onChange,
  onClose,
}: ReelPlayerProps & { start: number }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const opening = useRef(start);
  const frame = useRef(0);
  const currentVideo = useRef<HTMLVideoElement | null>(null);
  const [active, setActive] = useState(start);
  const [paused, setPaused] = useState(false);
  const [hint, setHint] = useState(false);
  const [sound, setSoundState] = useState(readSound);
  const filmsAllowed = useFilmsAllowed();
  const touch = useMatches('(pointer: coarse)') === true;
  const count = items.length;
  const film = items[active];
  const position = fillLabel(labels.position, { index: active + 1, total: count });

  // Opens at the chosen film, without scrolling past the ones before it.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const list = listRef.current;
    if (!dialog || !list) return;
    dialog.showModal();
    document.documentElement.style.overflow = 'hidden';
    list.scrollTop = opening.current * list.clientHeight;
    toggleRef.current?.focus({ preventScroll: true });
    return () => {
      if (dialog.open) dialog.close();
      document.documentElement.style.overflow = '';
    };
  }, []);

  // On a touch screen, a word on how to move on, gone at the first swipe or after a few seconds.
  useEffect(() => {
    if (!touch || count < 2) return;
    const show = window.setTimeout(() => setHint(true), 700);
    const hide = window.setTimeout(() => setHint(false), 4700);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [touch, count]);

  // Focus follows the film in view (the others are inert), unless it rests on the dialog's buttons.
  useEffect(() => {
    const focused = document.activeElement;
    if (focused && focused !== document.body && !listRef.current?.contains(focused)) return;
    toggleRef.current?.focus({ preventScroll: true });
  }, [active]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const close = () => {
    dialogRef.current?.close();
    document.documentElement.style.overflow = '';
    onClose();
  };

  const setSound = (next: Sound) => {
    writeSound(next);
    setSoundState(next);
    // Set on the film in view inside the visitor's own tap: browsers let sound start only then.
    const element = currentVideo.current;
    if (element && film?.video?.hasAudio) {
      element.volume = next.volume;
      element.muted = next.muted;
    }
  };
  const silent = sound.muted || sound.volume === 0;
  const toggleSound = () =>
    setSound(silent ? { muted: false, volume: sound.volume || 1 } : { ...sound, muted: true });

  /** The film filling most of the screen becomes the one in view. */
  const onScroll = () => {
    setHint(false);
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const list = listRef.current;
      if (!list?.clientHeight) return;
      const next = Math.min(count - 1, Math.max(0, Math.round(list.scrollTop / list.clientHeight)));
      if (next === active) return;
      setActive(next);
      setPaused(false);
      onChange(next);
    });
  };

  const goTo = (next: number) => {
    const list = listRef.current;
    if (!list || next < 0 || next >= count) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    list.scrollTo({ top: next * list.clientHeight, behavior: reduced ? 'auto' : 'smooth' });
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDialogElement>) => {
    const step = STEPS[event.key];
    if (step) {
      event.preventDefault();
      goTo(active + step);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      goTo(event.key === 'Home' ? 0 : count - 1);
    } else if (event.key === ' ' && !(event.target as HTMLElement).closest('button')) {
      // Space pauses wherever focus is (a focused button keeps Space for itself).
      event.preventDefault();
      setPaused((value) => !value);
    } else if (event.key.toLowerCase() === 'm' && film?.video?.hasAudio) {
      event.preventDefault();
      toggleSound();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label={film?.title}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onKeyDown={onKeyDown}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden bg-forest-950 p-0 text-ivory-50 backdrop:bg-forest-950 motion-safe:animate-fade-in"
    >
      {film ? (
        // The film's own colours, blurred, light the room around it on wider screens.
        // eslint-disable-next-line @next/next/no-img-element -- API renditions (ADR-009)
        <img
          key={film.id}
          src={`${film.image.src}/${film.image.widths[0]}.webp`}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden h-full w-full scale-125 object-cover opacity-45 blur-[80px] brightness-[0.6] saturate-150 motion-safe:animate-fade-in sm:block"
        />
      ) : null}

      <ol
        ref={listRef}
        onScroll={onScroll}
        aria-label={labels.reels}
        className="relative h-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain [scrollbar-width:none]"
      >
        {items.map((item, index) => (
          <ReelSlide
            key={item.id}
            film={item}
            current={index === active}
            near={Math.abs(index - active) <= 1}
            playing={index === active && !paused}
            preload={
              index === active || (index === active + 1 && filmsAllowed) ? 'auto' : 'metadata'
            }
            muted={!item.video?.hasAudio || silent}
            volume={sound.volume}
            handle={handle}
            labels={labels}
            toggleRef={index === active ? toggleRef : undefined}
            onToggle={() => setPaused((value) => !value)}
            onBlocked={() => setPaused(true)}
            onSoundBlocked={() => setSound({ ...sound, muted: true })}
            onElement={
              index === active
                ? (element) => {
                    currentVideo.current = element;
                  }
                : undefined
            }
          >
            {index === active && item.video?.hasAudio ? (
              <SoundControl
                sound={sound}
                silent={silent}
                labels={labels}
                onToggle={toggleSound}
                onVolume={(volume) => setSound({ muted: volume === 0, volume })}
              />
            ) : null}
          </ReelSlide>
        ))}
      </ol>

      <p aria-live="polite" className="sr-only">
        {position}
        {film ? ` — ${film.title}` : null}
      </p>
      <p
        aria-hidden
        className="pointer-events-none absolute top-5 left-6 hidden text-body-sm text-ivory-100/80 tabular-nums sm:block"
      >
        {position}
      </p>
      <button
        type="button"
        onClick={close}
        aria-label={labels.close}
        className="absolute top-3 right-3 z-30 grid h-11 w-11 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 sm:top-4 sm:right-5 sm:bg-ivory-50/10 sm:hover:bg-ivory-50/20"
      >
        <X aria-hidden className="h-5 w-5" />
      </button>
      {count > 1 ? (
        <div className="absolute top-1/2 right-5 z-30 hidden -translate-y-1/2 flex-col gap-3 sm:flex">
          <button
            type="button"
            onMouseDown={keepFocus}
            onClick={() => goTo(active - 1)}
            disabled={active === 0}
            aria-label={labels.previous}
            className={ROUND}
          >
            <ChevronUp aria-hidden className="h-6 w-6" />
          </button>
          <button
            type="button"
            onMouseDown={keepFocus}
            onClick={() => goTo(active + 1)}
            disabled={active === count - 1}
            aria-label={labels.next}
            className={ROUND}
          >
            <ChevronDown aria-hidden className="h-6 w-6" />
          </button>
        </div>
      ) : null}
      {hint && active < count - 1 ? (
        <p
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-[58%] z-30 flex justify-center px-6 motion-safe:animate-fade-in"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-black/55 px-4 py-2.5 text-body-sm font-semibold text-white backdrop-blur-sm">
            <ChevronUp className="h-4 w-4 motion-safe:animate-bounce" />
            {labels.swipeHint}
          </span>
        </p>
      ) : null}
    </dialog>
  );
}

/** One film of the feed: its poster at once, the film itself only near the one in view. */
function ReelSlide({
  film,
  current,
  near,
  playing,
  preload,
  muted,
  volume,
  handle,
  labels,
  toggleRef,
  onToggle,
  onBlocked,
  onSoundBlocked,
  onElement,
  children,
}: {
  film: MediaItemDto;
  current: boolean;
  near: boolean;
  playing: boolean;
  preload: 'auto' | 'metadata';
  muted: boolean;
  volume: number;
  handle: string | null;
  labels: MediaLabels;
  toggleRef?: Ref<HTMLButtonElement>;
  onToggle: () => void;
  onBlocked: () => void;
  onSoundBlocked: () => void;
  /** The film in view hands over its video element (sound is set on it inside a tap). */
  onElement?: (element: HTMLVideoElement | null) => void;
  /** Over the film, above its tap target: the sound control of the film in view. */
  children?: ReactNode;
}) {
  const poster = imageSources(film.image, 960);
  return (
    <li
      inert={!current}
      className="relative flex h-full snap-start snap-always items-center justify-center sm:py-4"
    >
      <div className="relative h-full w-full overflow-hidden bg-black sm:aspect-[9/16] sm:w-auto sm:max-w-[calc(100vw-10rem)] sm:rounded-[1.25rem] sm:shadow-[0_40px_90px_-30px_rgb(0_0_0_/_0.9)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- API renditions (ADR-009) */}
        <img
          src={poster.src}
          srcSet={poster.srcSet}
          sizes="(min-width: 640px) calc(56vh - 1rem), 100vw"
          width={film.image.width}
          height={film.image.height}
          alt=""
          loading={near ? 'eager' : 'lazy'}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {near && film.video ? (
          <ReelVideo
            video={film.video}
            current={current}
            playing={playing}
            preload={preload}
            muted={muted}
            volume={volume}
            labels={labels}
            onBlocked={onBlocked}
            onSoundBlocked={onSoundBlocked}
            onElement={onElement}
          />
        ) : null}
        <button
          ref={toggleRef}
          type="button"
          onClick={onToggle}
          aria-label={playing ? labels.pause : labels.resume}
          className="absolute inset-0 z-10 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-gold-300 sm:rounded-[1.25rem]"
        >
          <span
            aria-hidden
            className="absolute top-4 left-4 hidden h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm sm:grid"
          >
            {playing ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            )}
          </span>
          {current && !playing ? (
            <span
              aria-hidden
              className="absolute top-1/2 left-1/2 grid size-18 -translate-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm motion-safe:animate-pop-in"
            >
              <Play className="ml-1 h-8 w-8 fill-current" />
            </span>
          ) : null}
        </button>
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-linear-to-t from-black/75 via-black/25 to-transparent px-4 pt-28 pb-[calc(env(safe-area-inset-bottom)+1.75rem)] sm:px-6 sm:pb-7',
            film.video?.hasAudio && 'pr-17 sm:pr-19',
          )}
        >
          <p className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white p-1">
              <Emblem className="w-full" sizes="36px" />
            </span>
            <span className="min-w-0 text-[0.875rem] leading-tight text-white">
              <span className="block font-bold tracking-[0.04em]">TERAN</span>
              {handle ? <span className="block truncate text-white/80">{handle}</span> : null}
            </span>
          </p>
          <h2 className="mt-3 text-[1.125rem] leading-snug font-semibold text-balance text-white sm:text-[1.25rem]">
            {film.title}
          </h2>
          {film.caption ? (
            <p className="mt-1.5 line-clamp-3 max-w-[36ch] text-body-sm text-white/85">
              {film.caption}
            </p>
          ) : null}
        </div>
        {children}
      </div>
    </li>
  );
}

/**
 * The moving picture of a film in view or beside it: looping, it plays only in view, starts afresh
 * each time it comes back, and fades in over the poster at its first frame. It sounds as the feed
 * says (muted without a sound track); a browser that refuses sound without a tap gets it muted.
 */
function ReelVideo({
  video,
  current,
  playing,
  preload,
  muted,
  volume,
  labels,
  onBlocked,
  onSoundBlocked,
  onElement,
}: {
  video: NonNullable<MediaItemDto['video']>;
  current: boolean;
  playing: boolean;
  preload: 'auto' | 'metadata';
  muted: boolean;
  volume: number;
  labels: MediaLabels;
  /** The browser refused to start it (iOS in Low Power Mode): the play mark asks for a tap. */
  onBlocked: () => void;
  /** The browser refused its sound without a tap (Safari): it plays muted, the speaker shows off. */
  onSoundBlocked: () => void;
  onElement?: (element: HTMLVideoElement | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);

  const register = useEffectEvent((element: HTMLVideoElement | null) => onElement?.(element));
  useEffect(() => {
    if (!current) return;
    register(videoRef.current);
    return () => register(null);
  }, [current]);

  // Set before it plays: the effects run in this order.
  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    element.volume = volume;
    element.muted = muted;
  }, [muted, volume]);

  // Out of view, a film stops and goes back to its beginning.
  useEffect(() => {
    const element = videoRef.current;
    if (!element || current) return;
    element.pause();
    if (element.currentTime > 0) element.currentTime = 0;
  }, [current]);

  const blocked = useEffectEvent(onBlocked);
  const soundBlocked = useEffectEvent(onSoundBlocked);
  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    if (!playing) {
      element.pause();
      return;
    }
    element.play().catch((error: unknown) => {
      if (!(error instanceof DOMException) || error.name !== 'NotAllowedError') return;
      if (element.muted) {
        blocked();
        return;
      }
      soundBlocked();
      element.muted = true;
      element.play().catch(() => blocked());
    });
  }, [playing]);

  // The line along the foot follows the film's time, frame by frame.
  useEffect(() => {
    if (!current) return;
    let next = 0;
    const tick = () => {
      const element = videoRef.current;
      const bar = barRef.current;
      if (element && bar && element.duration > 0) {
        bar.style.transform = `scaleX(${element.currentTime / element.duration})`;
      }
      next = requestAnimationFrame(tick);
    };
    next = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(next);
  }, [current]);

  return (
    <>
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload={preload}
        aria-hidden
        onPlaying={() => setReady(true)}
        className={cn(
          'absolute inset-0 h-full w-full object-cover transition-opacity duration-300',
          ready ? 'opacity-100' : 'opacity-0',
        )}
      >
        <source src={video.src} type={video.type} />
        {video.captions ? (
          <track
            kind="captions"
            src={video.captions.src}
            srcLang={video.captions.srclang}
            label={labels.captions}
            default
          />
        ) : null}
      </video>
      {current ? (
        <span aria-hidden className="absolute inset-x-0 bottom-0 z-30 h-[3px] bg-white/25">
          <span
            ref={barRef}
            className="block h-full origin-left bg-gold-300 [transform:scaleX(0)]"
          />
        </span>
      ) : null}
    </>
  );
}

/**
 * The sound of the film in view, as on Instagram: a speaker that mutes and unmutes it and, where
 * a mouse can hover, a slider above it for the volume (phones keep their own volume buttons; iOS
 * does not let a page set it).
 */
function SoundControl({
  sound,
  silent,
  labels,
  onToggle,
  onVolume,
}: {
  sound: Sound;
  silent: boolean;
  labels: MediaLabels;
  onToggle: () => void;
  onVolume: (volume: number) => void;
}) {
  const hover = useMatches('(hover: hover) and (pointer: fine)') === true;
  const Icon = silent ? VolumeX : sound.volume < 0.5 ? Volume1 : Volume2;
  return (
    <div className="group/sound absolute right-3 bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] z-30 flex w-11 flex-col items-center rounded-full bg-black/45 text-white backdrop-blur-sm sm:right-4 sm:bottom-6">
      {hover ? (
        <div className="grid h-0 w-full place-items-center overflow-hidden opacity-0 transition-[height,opacity] duration-200 ease-[var(--ease-soft)] group-focus-within/sound:h-32 group-focus-within/sound:opacity-100 group-hover/sound:h-32 group-hover/sound:opacity-100 motion-reduce:transition-none">
          <VolumeSlider
            value={silent ? 0 : sound.volume}
            label={labels.volume}
            onChange={onVolume}
          />
        </div>
      ) : null}
      <button
        type="button"
        onMouseDown={keepFocus}
        onClick={onToggle}
        aria-label={silent ? labels.unmute : labels.mute}
        className="grid h-11 w-11 place-items-center rounded-full transition-colors hover:bg-white/10"
      >
        <Icon aria-hidden className="h-5 w-5" />
      </button>
    </div>
  );
}

/** Keys that move the volume: arrows by a tenth, PageUp/PageDown by a quarter. */
const VOLUME_STEPS: Record<string, number> = {
  ArrowUp: 0.1,
  ArrowRight: 0.1,
  ArrowDown: -0.1,
  ArrowLeft: -0.1,
  PageUp: 0.25,
  PageDown: -0.25,
};

/** A vertical slider from silent at the foot to full at the top: dragged, clicked or keyed. */
function VolumeSlider({
  value,
  label,
  onChange,
}: {
  value: number;
  label: string;
  onChange: (value: number) => void;
}) {
  const percent = Math.round(value * 100);
  const setFrom = (event: ReactPointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.height === 0) return;
    onChange(Math.min(1, Math.max(0, (box.bottom - event.clientY) / box.height)));
  };
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={`${percent}%`}
      onMouseDown={keepFocus}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setFrom(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) setFrom(event);
      }}
      onKeyDown={(event) => {
        const step = VOLUME_STEPS[event.key];
        const next =
          step !== undefined
            ? value + step
            : event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? 1
                : null;
        if (next === null) return;
        // The feed's own keys (↑/↓ move between films) stay out of it.
        event.preventDefault();
        event.stopPropagation();
        onChange(Math.round(Math.min(1, Math.max(0, next)) * 100) / 100);
      }}
      className="relative h-24 w-6 cursor-pointer touch-none rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300"
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 rounded-full bg-white/30"
      />
      <span
        aria-hidden
        className="absolute bottom-0 left-1/2 w-1 -translate-x-1/2 rounded-full bg-white"
        style={{ height: `${percent}%` }}
      />
      <span
        aria-hidden
        className="absolute left-1/2 h-3.5 w-3.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-white shadow-[0_1px_4px_rgb(0_0_0_/_0.45)]"
        style={{ bottom: `${percent}%` }}
      />
    </div>
  );
}
