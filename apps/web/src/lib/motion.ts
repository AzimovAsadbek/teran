import { useSyncExternalStore } from 'react';

/*
 * When the storefront's films may move: never with reduced motion or on a data-saving or very slow
 * connection, and not while the visitor has paused them with the footer's switch, which is
 * remembered on this device. That switch is the WCAG 2.2.2 mechanism for every film on the
 * storefront (none has a button of its own) and for the home page's moving ribbons
 * (components/home/marquee.tsx).
 */

const KEY = 'teran.motion';
const listeners = new Set<() => void>();
let paused: boolean | null = null;

function readPaused(): boolean {
  if (paused === null) {
    try {
      paused = window.localStorage.getItem(KEY) === 'paused';
    } catch {
      paused = false;
    }
  }
  return paused;
}

function subscribePaused(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    paused = event.newValue === 'paused';
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Pauses (or lets move again) every film on the storefront, here and on later visits. */
export function setMotionPaused(value: boolean) {
  paused = value;
  try {
    if (value) window.localStorage.setItem(KEY, 'paused');
    else window.localStorage.removeItem(KEY);
  } catch {
    // Private windows may refuse storage: the choice then lasts for this page only.
  }
  for (const listener of listeners) listener();
}

/** Whether the visitor has paused the films. */
export function useMotionPaused(): boolean {
  return useSyncExternalStore(subscribePaused, readPaused, () => false);
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

/** What the browser says of its connection (Chrome, mostly; absent elsewhere). */
type Connection = EventTarget & { saveData?: boolean; effectiveType?: string };

function connection(): Connection | undefined {
  return (navigator as Navigator & { connection?: Connection }).connection;
}

function subscribeToConnection(onChange: () => void) {
  const current = connection();
  current?.addEventListener('change', onChange);
  return () => current?.removeEventListener('change', onChange);
}

/**
 * A connection where films would cost more than they give: data saving on, or one the browser
 * rates 2G or slower. Films stay pictures there. A link rated 3G still plays them, in their
 * lightest copy (`isModestConnection`): Chrome rates many ordinary links in Uzbekistan 3G (a round
 * trip over about 270 ms), and the owner wants the films seen (2026-10-30).
 */
export function isLightConnection(current: Connection | undefined): boolean {
  if (!current) return false;
  return Boolean(current.saveData) || ['slow-2g', '2g'].includes(current.effectiveType ?? '');
}

/** A link the browser rates 3G: films play in their lightest copy (looping-film.tsx). */
export function isModestConnection(
  current: Connection | undefined = typeof navigator === 'undefined' ? undefined : connection(),
): boolean {
  return current?.effectiveType === '3g';
}

function useLightConnection(): boolean {
  return useSyncExternalStore(
    subscribeToConnection,
    () => isLightConnection(connection()),
    () => false,
  );
}

/** Whether films may load and play at all here (false on the server and before hydration). */
export function useFilmsAllowed(): boolean {
  const reducedMotion = useMatches('(prefers-reduced-motion: reduce)');
  const light = useLightConnection();
  return reducedMotion === false && !light;
}

/** Whether a media query matches (null on the server and before hydration). */
export { useMatches };

function subscribeToLoad(onChange: () => void) {
  window.addEventListener('load', onChange);
  return () => window.removeEventListener('load', onChange);
}

/** Whether the page has finished loading (false on the server): films never compete with it. */
export function usePageLoaded(): boolean {
  return useSyncExternalStore(
    subscribeToLoad,
    () => document.readyState === 'complete',
    () => false,
  );
}
