import { useSyncExternalStore } from 'react';

/** Storefront motion preferences. Connection quality controls rendition size. */
const KEY = 'teran.motion';
const listeners = new Set<() => void>();
let choice: 'playing' | 'paused' | null | undefined;

function readChoice() {
  try {
    const saved = window.localStorage.getItem(KEY);
    return saved === 'paused' || saved === 'playing' ? saved : null;
  } catch {
    return choice ?? null;
  }
}

function subscribePaused(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    choice = undefined;
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
  choice = value ? 'paused' : 'playing';
  try {
    window.localStorage.setItem(KEY, choice);
  } catch {
    // Private windows may refuse storage: the choice then lasts for this page only.
  }
  window.dispatchEvent(new CustomEvent('teran-motion-change', { detail: choice }));
  for (const listener of listeners) listener();
}

/** Whether the visitor has paused the films. */
export function useMotionPaused(): boolean {
  return useSyncExternalStore(subscribePaused, readChoice, () => null) === 'paused';
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

export function filmWidthLimit(
  current = typeof navigator === 'undefined' ? undefined : connection(),
): number | null {
  if (current?.saveData || ['slow-2g', '2g'].includes(current?.effectiveType ?? '')) return 320;
  return current?.effectiveType === '3g' ? 640 : null;
}

export function useFilmWidthLimit(): number | null {
  return useSyncExternalStore(
    subscribeToConnection,
    () => filmWidthLimit(),
    () => null,
  );
}

/** Ask for a smaller rendition on metered or slow links, including Save-Data on fast Wi-Fi. */
export function isModestConnection(
  current: Connection | undefined = typeof navigator === 'undefined' ? undefined : connection(),
): boolean {
  return filmWidthLimit(current) !== null;
}

export function useModestConnection(): boolean {
  return useSyncExternalStore(
    subscribeToConnection,
    () => isModestConnection(),
    () => false,
  );
}

/** Respect the system motion preference until the visitor explicitly enables films. */
export function useFilmsAllowed(): boolean {
  const reduced = useMatches('(prefers-reduced-motion: reduce)');
  const preference = useSyncExternalStore(subscribePaused, readChoice, () => null);
  return reduced !== null && (!reduced || preference === 'playing');
}

/** Whether a media query matches (null on the server and before hydration). */
export { useMatches };
