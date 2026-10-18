import { useSyncExternalStore } from 'react';

/*
 * When the storefront's films may move: never with reduced motion or on a data-saving connection,
 * and not while the visitor has paused them with the footer's switch, which is remembered on this
 * device. That switch is the WCAG 2.2.2 mechanism for every film on the storefront: none has a
 * button of its own.
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

const noSubscription = () => () => {};

/** A data-saving connection (Chrome on Android, mostly): films stay pictures there. */
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

/** Whether films may load and play at all here (false on the server and before hydration). */
export function useFilmsAllowed(): boolean {
  const reducedMotion = useMatches('(prefers-reduced-motion: reduce)');
  const saveData = useSaveData();
  return reducedMotion === false && !saveData;
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
