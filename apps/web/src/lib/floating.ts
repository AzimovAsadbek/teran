import { useEffect, useSyncExternalStore, type RefObject } from 'react';

/*
 * What the floating contact disc (components/social/social-launcher.tsx) must make way for. A
 * primary action or a form that reaches the lower part of the screen, where the disc floats,
 * sends it aside (it fades out and lets clicks through), so it never covers "Order" or a field on
 * a phone; a sticky bar at the bottom (the product page's Order or purchase bar) lifts it above
 * the bar.
 */

const listeners = new Set<() => void>();
const covering = new Set<Element>();
let bars = 0;
let observer: IntersectionObserver | null = null;

function notify() {
  for (const listener of listeners) listener();
}

/** The lower quarter of the screen: where the disc floats. */
function watcher(): IntersectionObserver {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) covering.add(entry.target);
        else covering.delete(entry.target);
      }
      notify();
    },
    { rootMargin: '-75% 0px 0px 0px' },
  );
  return observer;
}

/** Marks an element (a primary button, a form) that the disc makes way for. */
export function usePrimaryAction(ref: RefObject<Element | null>) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const watch = watcher();
    watch.observe(element);
    return () => {
      watch.unobserve(element);
      covering.delete(element);
      notify();
    };
  }, [ref]);
}

/** While `up`, a sticky bar holds the bottom of the screen and the disc stands above it. */
export function useFloatingBar(up: boolean) {
  useEffect(() => {
    if (!up) return;
    bars += 1;
    notify();
    return () => {
      bars -= 1;
      notify();
    };
  }, [up]);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The disc's place: clear, out of the way of an action, or raised above a sticky bar. */
export function useFloatingPlace(): 'clear' | 'yield' | 'raised' {
  return useSyncExternalStore(
    subscribe,
    () => (covering.size > 0 ? 'yield' : bars > 0 ? 'raised' : 'clear'),
    () => 'clear',
  );
}
