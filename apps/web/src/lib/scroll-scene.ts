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

/**
 * A scroll-linked scene (docs/design/design-system.md, Motion): GSAP and ScrollTrigger are loaded
 * with the first scene of a page, after it has rendered, so no other page carries them. Scenes
 * only follow the visitor's own scrolling (scrubbed timelines, no pinning, no smooth-scroll
 * hijacking). With reduced motion nothing is set up; when that preference changes or the
 * component unmounts, every tween, trigger and inline style the scene made is reverted, so the
 * markup's resting state is always the static design.
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
    return () => {
      cancelled = true;
      revert?.();
    };
    // The scene is rebuilt only when its own inputs change (`deps`), not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
