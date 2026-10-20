'use client';

import { useEffect, type DependencyList, type RefObject } from 'react';

type Gsap = (typeof import('gsap'))['gsap'];
type ScrollTriggerPlugin = (typeof import('gsap/ScrollTrigger'))['ScrollTrigger'];

export interface SceneTools<T extends HTMLElement> {
  gsap: Gsap;
  ScrollTrigger: ScrollTriggerPlugin;
  /** The scene's own element: query inside it with `gsap.utils.selector(root)`. */
  root: T;
}

/** What starts the scenes: the visitor's first scroll, wheel, touch or key. */
const FIRST_MOVES = ['scroll', 'wheel', 'touchstart', 'keydown'] as const;

/**
 * Calls `start` once the visitor first moves the page (at once when it is already scrolled, as
 * after going back), so the first view never waits for the animation library: the scenes only
 * follow scrolling, and until then everything stands at its resting state. Returns a cancel.
 */
function onFirstMove(start: () => void): () => void {
  let started = false;
  const stop = () => {
    for (const type of FIRST_MOVES) window.removeEventListener(type, go);
  };
  function go() {
    if (started) return;
    started = true;
    stop();
    start();
  }
  for (const type of FIRST_MOVES) window.addEventListener(type, go, { passive: true });
  if (window.scrollY > 0) go();
  return stop;
}

/**
 * Calls `start` once the visitor allows motion (at once when no reduced-motion preference is set),
 * so a visitor who asked for less motion never downloads the animation library. Returns a cancel.
 */
function whenMotionAllowed(start: () => void): () => void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!reduced.matches) {
    start();
    return () => {};
  }
  const onChange = () => {
    if (reduced.matches) return;
    reduced.removeEventListener('change', onChange);
    start();
  };
  reduced.addEventListener('change', onChange);
  return () => reduced.removeEventListener('change', onChange);
}

/**
 * A scroll-linked scene (docs/design/design-system.md, Motion): GSAP and ScrollTrigger are loaded
 * when the visitor first scrolls a page that has a scene, so no other page carries them and no
 * first view waits for them. Scenes only follow the visitor's own scrolling (scrubbed timelines,
 * no pinning, no smooth-scroll hijacking). With reduced motion nothing is loaded or set up; when
 * that preference changes or the component unmounts, every tween, trigger and inline style the
 * scene made is reverted, so the markup's resting state is always the static design.
 */
export function useScrollScene<T extends HTMLElement>(
  ref: RefObject<T | null>,
  build: (tools: SceneTools<T>) => void | (() => void),
  deps: DependencyList = [],
): void {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let cancelled = false;
    let revert: (() => void) | undefined;
    let stopWaitingForMotion: (() => void) | undefined;
    const stopWaiting = onFirstMove(() => {
      stopWaitingForMotion = whenMotionAllowed(() => {
        void Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
          ([{ gsap }, { ScrollTrigger }]) => {
            if (cancelled) return;
            gsap.registerPlugin(ScrollTrigger);
            const media = gsap.matchMedia();
            media.add('(prefers-reduced-motion: no-preference)', () =>
              build({ gsap, ScrollTrigger, root }),
            );
            revert = () => media.revert();
          },
        );
      });
    });
    return () => {
      cancelled = true;
      stopWaiting();
      stopWaitingForMotion?.();
      revert?.();
    };
    // The scene is rebuilt only when its own inputs change (`deps`), not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
