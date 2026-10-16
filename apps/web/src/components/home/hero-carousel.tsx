'use client';

import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

export interface HeroSlide {
  id: string;
  href: string;
  name: string;
  /** Category and default pack, e.g. "Yashil choy · 400 g". */
  kicker: string;
  description: string | null;
  /** Formatted price, "from …" when the product has several packs. */
  price: string;
  image: {
    src: string;
    srcSet: string;
    sizes: string;
    width: number;
    height: number;
    alt: string;
  };
  /** `cutout`: the product stands free in front of the gate; `photo`: shown whole inside it. */
  mode: 'cutout' | 'photo';
}

interface Labels {
  region: string;
  /** "{index} / {total}" */
  slide: string;
  previous: string;
  next: string;
  pause: string;
  play: string;
  /** "{index}-mahsulot: {name}" */
  goTo: string;
  details: string;
}

/** Seconds each product stays before the next one comes (also the indicator's fill time). */
const INTERVAL_SECONDS = 6.5;
const SWIPE_DISTANCE = 48;

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));

/**
 * The hero's products, one at a time. The first product is server-rendered in place, so it shows
 * without waiting for script; the others' images load once the page has loaded.
 *
 * - Advances every 6.5 s. The active indicator fills over that time and its animation's end moves
 *   the stage on, so the indicator and the change always agree. It holds while the pointer rests
 *   on the stage, while keyboard focus is inside it, in a hidden tab and while the stage is
 *   scrolled away, and goes on by itself afterwards; a click on a control (no keyboard focus ring)
 *   does not hold it. There is no visible pause button: for keyboard and screen-reader users a
 *   pause control appears when it receives focus (WCAG 2.2.2).
 * - A change is a crossfade with a short movement in depth (the product leaves away from the
 *   viewer, the next one arrives from the other side); the painting in the gate shifts a little
 *   and the light brightens, nearer layers moving more than far ones.
 * - Previous/next buttons, indicators, ←/→ on any control, and swiping. With reduced motion
 *   nothing advances by itself and changes are immediate.
 */
export function HeroCarousel({ slides, labels }: { slides: HeroSlide[]; labels: Labels }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const productRefs = useRef<(HTMLDivElement | null)[]>([]);
  const captionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  /** Running animations, cancelled before the next change so none outlives its change. */
  const running = useRef<Animation[]>([]);
  const previousActive = useRef(0);
  const [view, setView] = useState<{ active: number; leaving: number | null; direction: 1 | -1 }>({
    active: 0,
    leaving: null,
    direction: 1,
  });
  const [loadAll, setLoadAll] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const [reduced, setReduced] = useState(false);
  const count = slides.length;
  const rotating = count > 1 && !stopped && !reduced;
  const held = hovered || focused || !onScreen;

  const go = useCallback(
    (target: number, direction: 1 | -1) => {
      setLoadAll(true);
      setView((current) => {
        const next = (target + count) % count;
        // With reduced motion the change is immediate: nothing stays behind to leave.
        return next === current.active
          ? current
          : { active: next, leaving: reduced ? null : current.active, direction };
      });
    },
    [count, reduced],
  );

  // Reduced motion, page visibility and whether the stage is on screen.
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    const root = rootRef.current;
    const stage = root?.closest<HTMLElement>('[data-hero-stage]');
    let inView = true;
    const sync = () => {
      const visible = inView && document.visibilityState === 'visible';
      setOnScreen(visible);
      // The stage's own motion (leaves, mist) rests while nobody can see it.
      stage?.toggleAttribute('data-offscreen', !visible);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry?.isIntersecting ?? true;
        sync();
      },
      { threshold: 0.3 },
    );
    if (root) observer.observe(root);
    document.addEventListener('visibilitychange', sync);
    return () => {
      query.removeEventListener('change', update);
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  // The other products' images wait until the page has loaded, then load when the browser is idle.
  useEffect(() => {
    if (count < 2) return;
    let idle = 0;
    const start = () => {
      idle = window.requestIdleCallback
        ? window.requestIdleCallback(() => setLoadAll(true), { timeout: 2500 })
        : window.setTimeout(() => setLoadAll(true), 1200);
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => {
      window.removeEventListener('load', start);
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, [count]);

  // The change itself: product, caption and the stage around them.
  useLayoutEffect(() => {
    const from = previousActive.current;
    const to = view.active;
    previousActive.current = to;
    if (from === to) return;
    const stage = rootRef.current?.closest<HTMLElement>('[data-hero-stage]');
    stage?.style.setProperty('--frame-x', `${((to % 3) - 1) * 1.6}%`);
    if (reduced) return;
    stage?.setAttribute('data-moving', '');
    const settle = window.setTimeout(() => stage?.removeAttribute('data-moving'), 1400);
    const d = view.direction;
    const leave = { duration: 640, easing: 'cubic-bezier(0.55, 0, 0.75, 0.4)' };
    const arrive = {
      duration: 1100,
      delay: 340,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'backwards' as const,
    };
    const away = `translate3d(${-d * 9}%, 2%, 0) scale(0.9)`;
    const approach = `translate3d(${d * 9}%, 2%, 0) scale(0.92)`;
    for (const animation of running.current) animation.cancel();
    // The leaving product holds its last frame until its layer is hidden (fill: forwards).
    const outgoing = productRefs.current[from]?.animate(
      [
        { opacity: 1, transform: 'none' },
        { opacity: 0, transform: away },
      ],
      { ...leave, fill: 'forwards' },
    );
    const animations = [
      outgoing,
      productRefs.current[to]?.animate(
        [
          { opacity: 0, transform: approach },
          { opacity: 1, transform: 'none' },
        ],
        arrive,
      ),
      captionRefs.current[from]?.animate(
        [
          { opacity: 1, transform: 'none' },
          { opacity: 0, transform: 'translateY(-0.5rem)' },
        ],
        { duration: 420, easing: 'ease-in', fill: 'forwards' },
      ),
      captionRefs.current[to]?.animate(
        [
          { opacity: 0, transform: 'translateY(0.75rem)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 700, delay: 380, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' },
      ),
    ].filter((animation): animation is Animation => animation !== undefined);
    running.current = animations;
    const finish = () =>
      setView((current) => (current.leaving === from ? { ...current, leaving: null } : current));
    if (outgoing) outgoing.onfinish = finish;
    else finish();
    return () => window.clearTimeout(settle);
  }, [view.active, view.direction, reduced]);

  const onPointerDown = (event: ReactPointerEvent) => {
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: ReactPointerEvent) => {
    const start = pointer.current;
    pointer.current = null;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    go(view.active + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  };

  return (
    <div
      ref={rootRef}
      role="region"
      aria-roledescription="carousel"
      aria-label={labels.region}
      data-autoplay={rotating ? '' : undefined}
      data-held={held ? '' : undefined}
      className="hero-carousel absolute inset-0"
      style={{ '--interval': `${INTERVAL_SECONDS}s` } as CSSProperties}
      onPointerEnter={(event) => event.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={(event) => event.pointerType === 'mouse' && setHovered(false)}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (pointer.current = null)}
      // Only keyboard focus holds the stage: a mouse click leaves focus on a button, but no ring.
      onFocus={(event) => setFocused(event.target.matches(':focus-visible'))}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      onKeyDown={(event) => {
        if (count < 2) return;
        if (event.key === 'ArrowRight') go(view.active + 1, 1);
        else if (event.key === 'ArrowLeft') go(view.active - 1, -1);
      }}
    >
      {slides.map((slide, index) => {
        const state =
          index === view.active ? 'active' : index === view.leaving ? 'leaving' : 'idle';
        const showImage = index === 0 || loadAll || state !== 'idle';
        return (
          <div key={slide.id} aria-hidden className="hero-slide" data-state={state}>
            <div
              ref={(element) => {
                productRefs.current[index] = element;
              }}
              className={slide.mode === 'cutout' ? 'hero-product' : 'hero-photo'}
            >
              {showImage ? (
                <Link href={slide.href} tabIndex={-1} className="block h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized renditions from the API (ADR-009) */}
                  <img
                    src={slide.image.src}
                    srcSet={slide.image.srcSet}
                    sizes={slide.image.sizes}
                    width={slide.image.width}
                    height={slide.image.height}
                    alt={slide.image.alt}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    fetchPriority={index === 0 ? 'high' : 'low'}
                    decoding="async"
                    draggable={false}
                  />
                </Link>
              ) : null}
            </div>
          </div>
        );
      })}

      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 lg:flex-row lg:items-end lg:justify-between lg:gap-4">
        <div
          aria-live={rotating && !held ? 'off' : 'polite'}
          className="relative h-[6.25rem] w-full lg:h-auto lg:min-h-[8.5rem] lg:flex-1"
        >
          {slides.map((slide, index) => {
            const active = index === view.active;
            return (
              <div
                key={slide.id}
                ref={(element) => {
                  captionRefs.current[index] = element;
                }}
                role="group"
                aria-roledescription="slide"
                aria-label={fill(labels.slide, { index: index + 1, total: count })}
                inert={!active}
                className={cn(
                  'hero-caption text-center lg:text-left',
                  active || index === view.leaving ? 'visible' : 'invisible',
                  active ? 'opacity-100' : 'opacity-0',
                )}
              >
                <p className="text-micro tracking-[0.14em] text-gold-300 uppercase">
                  {slide.kicker}
                </p>
                <p className="mt-1.5 text-display-sm text-ivory-50">
                  <Link
                    href={slide.href}
                    className="decoration-gold-300/60 decoration-1 underline-offset-[0.18em] hover:underline"
                  >
                    {slide.name}
                  </Link>
                </p>
                {slide.description ? (
                  <p className="mt-1 hidden text-body-sm text-ivory-100/70 lg:line-clamp-2">
                    {slide.description}
                  </p>
                ) : null}
                <p className="mt-2 flex items-baseline justify-center gap-3 text-body-sm text-ivory-100/85 lg:justify-start">
                  <span className="font-semibold text-ivory-50 lining-nums">{slide.price}</span>
                  <Link
                    href={slide.href}
                    tabIndex={-1}
                    aria-hidden
                    className="inline-flex items-center gap-1 text-gold-300 hover:text-gold-100"
                  >
                    {labels.details} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </p>
              </div>
            );
          })}
        </div>

        {count > 1 ? (
          <div className="relative flex shrink-0 items-center gap-2.5 pb-1 sm:gap-3">
            <button
              type="button"
              onClick={() => go(view.active - 1, -1)}
              aria-label={labels.previous}
              className="grid h-10 w-10 place-items-center rounded-full border border-ivory-50/35 text-ivory-50 transition-colors duration-150 hover:border-ivory-50 hover:bg-ivory-50/10 sm:h-11 sm:w-11"
            >
              <ArrowLeft aria-hidden className="h-4 w-4" />
            </button>
            <ol className="flex items-center gap-1.5">
              {slides.map((slide, index) => {
                const active = index === view.active;
                return (
                  <li key={slide.id} className="flex">
                    <button
                      type="button"
                      onClick={() => go(index, index > view.active ? 1 : -1)}
                      aria-label={fill(labels.goTo, { index: index + 1, name: slide.name })}
                      aria-current={active ? 'true' : undefined}
                      className="py-3"
                    >
                      <span className="hero-dot" data-active={active ? '' : undefined}>
                        {active ? (
                          <span
                            key={view.active}
                            className="hero-dot-fill"
                            onAnimationEnd={() => go(view.active + 1, 1)}
                          />
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <button
              type="button"
              onClick={() => go(view.active + 1, 1)}
              aria-label={labels.next}
              className="grid h-10 w-10 place-items-center rounded-full border border-ivory-50/35 text-ivory-50 transition-colors duration-150 hover:border-ivory-50 hover:bg-ivory-50/10 sm:h-11 sm:w-11"
            >
              <ArrowRight aria-hidden className="h-4 w-4" />
            </button>
            {!reduced ? (
              <button
                type="button"
                onClick={() => setStopped((value) => !value)}
                aria-label={stopped ? labels.play : labels.pause}
                className="pointer-events-none absolute right-0 bottom-full mb-2 grid h-9 w-9 place-items-center rounded-full bg-forest-950/70 text-ivory-50 opacity-0 transition-opacity duration-150 focus-visible:pointer-events-auto focus-visible:opacity-100"
              >
                {stopped ? (
                  <Play aria-hidden className="h-3.5 w-3.5" />
                ) : (
                  <Pause aria-hidden className="h-3.5 w-3.5" />
                )}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
