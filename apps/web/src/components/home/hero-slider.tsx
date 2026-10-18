'use client';

import type { ImageDto, PublicVisualDto } from '@teran/contracts';
import { Pause, Play } from 'lucide-react';
import Image, { type StaticImageData } from 'next/image';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { VisualPicture } from '@/components/content/visual-picture';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { imageSources } from '@/lib/navigation';
import { Sparkles, type SparklePoint } from './sparkles';

/** Sparkles to the right of the pill, clear of the words. */
const HERO_SPARKLES: SparklePoint[] = [
  { x: '20%', y: '76%', size: 30 },
  { x: '23.5%', y: '86%', size: 18 },
  { x: '17.5%', y: '91%', size: 22 },
];

/** A slide's colours: TERAN's palette in the roles the reference's slides give theirs. */
export type HeroTone = 'art' | 'jade' | 'gold' | 'sage' | 'forest' | 'photo';

/** Which part of a painting a slide shows (it is cropped to fill the slide). */
export type ArtFocus = 'left' | 'centre' | 'right';

export interface HeroSlideData {
  key: string;
  tone: HeroTone;
  eyebrow?: string;
  /** The headline, one entry per line (the reference breaks its headlines by hand). */
  lines: string[];
  text?: string | null;
  cta: { href: string; label: string };
  /** A painting filling the slide, under a veil of the slide's colour where the words are. */
  art?: StaticImageData;
  artFocus?: ArtFocus;
  /** A product cut-out standing on the right (below the words on phones). */
  product?: ImageDto | null;
  /**
   * A campaign photograph from Admin → Settings filling the slide, with its own phone crop, as the
   * reference's slides are; no veil (the photograph leaves room for the words).
   */
  photo?: PublicVisualDto | null;
}

const ART_FOCUS: Record<ArtFocus, string> = {
  left: 'object-[30%_45%] lg:object-[30%_22%]',
  centre: 'object-[60%_100%] lg:object-center',
  right: 'object-[78%_55%] lg:object-[70%_60%]',
};

export interface HeroLabels {
  /** The page's heading, kept outside the slides so it never leaves the accessibility tree. */
  heading: string;
  region: string;
  /** "{index} / {total}" */
  slide: string;
  pause: string;
  play: string;
}

const TONES: Record<
  HeroTone,
  {
    slide: string;
    /** Over a painting: the slide's colour behind the words, clearing towards the picture. */
    veil: string;
    eyebrow: string;
    title: string;
    text: string;
    button: string;
    spark: string;
    /** The dots' colour over this slide (dark on the pale ones). */
    dots: string;
  }
> = {
  art: {
    slide: 'bg-forest-950',
    veil: 'from-forest-950/85 via-forest-950/45 to-forest-950/0 lg:from-forest-950/80 lg:via-forest-950/35 lg:to-forest-950/0',
    eyebrow: 'text-ivory-50',
    // The reference's warm yellow headline (3:1 and more on the dark veil and on the teal).
    title: 'text-sun',
    text: 'text-ivory-100',
    button: 'bg-ivory-50 text-fg',
    spark: 'text-ivory-50',
    dots: 'bg-ivory-50',
  },
  jade: {
    slide: 'bg-jade-700',
    veil: 'from-jade-700 from-35% via-jade-700/80 via-55% to-jade-700/0 to-80% lg:from-jade-700 lg:from-25% lg:via-jade-700/75 lg:via-45% lg:to-jade-700/0 lg:to-70%',
    eyebrow: 'text-ivory-50',
    title: 'text-sun',
    text: 'text-ivory-50',
    button: 'bg-ivory-50 text-jade-700',
    spark: 'text-ivory-50',
    dots: 'bg-ivory-50',
  },
  gold: {
    slide: 'bg-gold-100',
    veil: 'from-gold-100 from-35% via-gold-100/85 via-55% to-gold-100/0 to-80% lg:from-gold-100 lg:from-25% lg:via-gold-100/80 lg:via-45% lg:to-gold-100/0 lg:to-70%',
    eyebrow: 'text-fg',
    title: 'text-fg',
    text: 'text-fg',
    button: 'bg-forest-900 text-ivory-50',
    spark: 'text-gold-500',
    dots: 'bg-forest-900',
  },
  sage: {
    slide: 'bg-sage-200',
    veil: 'from-sage-200 from-35% via-sage-200/85 via-55% to-sage-200/0 to-80% lg:from-sage-200 lg:from-25% lg:via-sage-200/80 lg:via-45% lg:to-sage-200/0 lg:to-70%',
    eyebrow: 'text-fg',
    title: 'text-jade-700',
    text: 'text-fg',
    button: 'bg-jade-700 text-ivory-50',
    spark: 'text-jade-600',
    dots: 'bg-forest-900',
  },
  photo: {
    slide: 'bg-forest-950',
    veil: '',
    eyebrow: 'text-ivory-50',
    title: 'text-sun',
    text: 'text-ivory-50',
    button: 'bg-cream text-fg',
    spark: 'text-ivory-50',
    dots: 'bg-ivory-50',
  },
  forest: {
    slide: 'bg-forest-900',
    veil: 'from-forest-900 from-35% via-forest-900/80 via-55% to-forest-900/0 to-80% lg:from-forest-900 lg:from-25% lg:via-forest-900/75 lg:via-45% lg:to-forest-900/0 lg:to-70%',
    eyebrow: 'text-ivory-50',
    title: 'text-sun',
    text: 'text-ivory-50',
    button: 'bg-ivory-50 text-fg',
    spark: 'text-ivory-50',
    dots: 'bg-ivory-50',
  },
};

/** A slide stays four seconds (the owner asked for quicker changes than the reference's five). */
const AUTOPLAY_MS = 4000;

/**
 * The pack's width follows from its height — 40 % of the 33.75 rem slide on phones, 86 % of 35 rem
 * from 1024 px (at most 42 % of the slide) — so `sizes` comes from the picture's proportions and a
 * phone fetches a 320 px file, not a 960 px one.
 */
function packSizes(image: ImageDto): string {
  const aspect = image.width / image.height;
  const phone = Math.round(Math.min(0.4 * 540 * aspect, 300));
  const wide = Math.round(Math.min(0.86 * 560 * aspect, 430));
  return `(min-width: 1024px) ${wide}px, ${phone}px`;
}
const SWIPE_DISTANCE = 48;

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));

/** The first campaign photograph's proportions (desktop and phone crops), for the slide height. */
function heroRatios(slides: HeroSlideData[]): CSSProperties | undefined {
  const photo = slides.find((slide) => slide.photo)?.photo;
  if (!photo) return undefined;
  const mobile = photo.mobile ?? photo.image;
  return {
    '--hero-ratio': (photo.image.width / photo.image.height).toFixed(4),
    '--hero-ratio-mobile': (mobile.width / mobile.height).toFixed(4),
  } as CSSProperties;
}

/**
 * Headline size, so a long name still fits: the reference's 72 px (phones) and 100 px (desktop)
 * capitals for short words, smaller for long ones. On phones a slide with a product keeps its
 * headline on one line where it can (the product stands below it), so there the whole line counts;
 * over a photograph the words keep to its free left side, so on wide screens the line counts too
 * (up to the 16 characters the block holds before it wraps).
 */
function headlineSize(lines: string[], withProduct: boolean, overPhoto: boolean): string {
  const longestWord = Math.max(
    ...lines.flatMap((line) => line.split(/\s+/)).map((word) => word.length),
  );
  const longestLine = Math.max(...lines.map((line) => line.length));
  const phone = withProduct ? longestLine : longestWord;
  const phoneSize =
    phone <= 10
      ? 'text-[clamp(3.5rem,1rem+12vw,4.5rem)]'
      : phone <= 14
        ? 'text-[clamp(2.5rem,0.25rem+10.5vw,3.5rem)]'
        : 'text-[clamp(2.25rem,0.5rem+7.5vw,2.75rem)]';
  const desktop = overPhoto ? Math.max(longestWord, Math.min(longestLine, 16)) : longestWord;
  const desktopSize =
    desktop <= 9
      ? 'lg:text-[6.25rem]'
      : desktop <= 13
        ? 'lg:text-[5rem]'
        : desktop <= 16
          ? 'lg:text-[4.25rem]'
          : 'lg:text-[4rem]';
  return `${phoneSize} ${desktopSize}`;
}

/**
 * The reference's feature banner under the promo strip: full-width slides, 540 px high on phones
 * and 560 px from 1024 px. Each has a capital line, a condensed headline, a line of text and a
 * pill — centred over the top on phones, on the left from 1024 px — on a painting or on a colour
 * with a product standing on the right. Small dots centred at the foot choose a slide.
 *
 * Slides glide sideways (300 ms ease-out) and follow a finger or the mouse when dragged. They
 * advance every four seconds and, as the reference's, keep going under the pointer; they wait
 * while keyboard focus is inside, while scrolled away, with reduced motion or after the pause
 * control is used; that control shows when it receives keyboard focus (WCAG 2.2.2), the
 * reference's banner having none. With a campaign photograph the slide is as tall as the picture
 * at the window's width (at least 560 px; 540 px on phones), as the reference's.
 */
export function HeroSlider({ slides, labels }: { slides: HeroSlideData[]; labels: HeroLabels }) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    dx: number;
    axis: 'x' | 'y' | null;
  } | null>(null);
  const dragged = useRef(false);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  // The other slides' pictures are fetched once the page has loaded, so they never delay it.
  const [warm, setWarm] = useState(false);
  const count = slides.length;

  useEffect(() => {
    const start = () => setWarm(true);
    if (document.readyState === 'complete') {
      const timer = window.setTimeout(start, 300);
      return () => window.clearTimeout(timer);
    }
    window.addEventListener('load', start, { once: true });
    return () => window.removeEventListener('load', start);
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(Boolean(entry?.isIntersecting)),
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const running = count > 1 && !paused && !held && visible && !reduced;
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(
      () => setIndex((current) => (current + 1) % count),
      AUTOPLAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [running, index, count]);

  const position = useCallback((target: number, offset = 0) => {
    const track = trackRef.current;
    if (track) track.style.transform = `translate3d(calc(${-target * 100}% + ${offset}px), 0, 0)`;
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (count < 2 || event.button !== 0) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, axis: null };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      current.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (current.axis === 'x') event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (current.axis !== 'x') return;
    // Past the first and last slides the track gives way slowly, as if pulled against a spring.
    const edge = (index === 0 && dx > 0) || (index === count - 1 && dx < 0);
    current.dx = edge ? dx / 3 : dx;
    trackRef.current?.setAttribute('data-dragging', '');
    position(index, current.dx);
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    drag.current = null;
    if (current.axis !== 'x') return;
    dragged.current = Math.abs(current.dx) > 8;
    trackRef.current?.removeAttribute('data-dragging');
    const step = current.dx < -SWIPE_DISTANCE ? 1 : current.dx > SWIPE_DISTANCE ? -1 : 0;
    const target = Math.min(count - 1, Math.max(0, index + step));
    position(target);
    setIndex(target);
  };

  const onDotKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const target = (index + step + count) % count;
    setIndex(target);
    dotRefs.current[target]?.focus();
  };

  return (
    <section
      ref={sectionRef}
      aria-roledescription="carousel"
      aria-label={labels.region}
      className="relative overflow-hidden bg-forest-950"
      style={heroRatios(slides)}
      onFocus={(event) => event.target.matches(':focus-visible') && setHeld(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeld(false);
      }}
    >
      <h1 className="sr-only">{labels.heading}</h1>
      <div
        ref={trackRef}
        className="flex touch-pan-y transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] select-none data-dragging:transition-none motion-reduce:transition-none"
        style={{ transform: `translate3d(${-index * 100}%, 0, 0)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={(event) => {
          // A drag that ends over a link is not a click on it.
          if (!dragged.current) return;
          dragged.current = false;
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        {slides.map((slide, slideIndex) => (
          <Slide
            key={slide.key}
            slide={slide}
            first={slideIndex === 0}
            current={slideIndex === index}
            load={slideIndex === 0 || slideIndex === index || warm}
            label={`${fill(labels.slide, { index: slideIndex + 1, total: count })}: ${slide.lines.join(' ')}`}
          />
        ))}
      </div>

      {count > 1 ? (
        <div className="absolute inset-x-0 bottom-[1.0625rem] flex items-center justify-center gap-1">
          {/* Arrow keys move between the dots, as between tabs; pointing at them holds the
              slides, as on the reference. */}
          <div
            className="flex items-center"
            onKeyDown={onDotKey}
            onPointerEnter={(event) => event.pointerType === 'mouse' && setHeld(true)}
            onPointerLeave={(event) => event.pointerType === 'mouse' && setHeld(false)}
          >
            {slides.map((slide, slideIndex) => (
              <button
                key={slide.key}
                ref={(element) => {
                  dotRefs.current[slideIndex] = element;
                }}
                type="button"
                onClick={() => setIndex(slideIndex)}
                aria-label={`${fill(labels.slide, { index: slideIndex + 1, total: count })}: ${slide.lines.join(' ')}`}
                aria-current={slideIndex === index ? 'true' : undefined}
                tabIndex={slideIndex === index ? 0 : -1}
                className="flex h-6 w-5 items-center justify-center rounded-full"
              >
                {/* The reference's 10 px dots: half-clear, the current one solid. */}
                <span
                  aria-hidden
                  className={cn(
                    'h-2.5 w-2.5 rounded-full transition-[opacity,background-color] duration-200 ease-[ease]',
                    TONES[slides[index]?.tone ?? 'art'].dots,
                    slideIndex === index ? 'opacity-100' : 'opacity-50',
                  )}
                />
              </button>
            ))}
          </div>
          {reduced ? null : (
            <button
              type="button"
              onClick={() => setPaused((value) => !value)}
              aria-label={paused ? labels.play : labels.pause}
              className="sr-only flex h-6 w-6 items-center justify-center rounded-full bg-forest-950/60 text-ivory-50 focus-visible:not-sr-only"
            >
              {paused ? (
                <Play aria-hidden className="h-3 w-3 fill-current" />
              ) : (
                <Pause aria-hidden className="h-3 w-3 fill-current" />
              )}
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}

function Slide({
  slide,
  first,
  current,
  load,
  label,
}: {
  slide: HeroSlideData;
  first: boolean;
  current: boolean;
  /** Whether the slide's pictures may be fetched yet. */
  load: boolean;
  label: string;
}) {
  const tone = TONES[slide.tone];
  const product = slide.product ? imageSources(slide.product, 960) : null;
  const productSizes = slide.product ? packSizes(slide.product) : undefined;
  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={label}
      aria-hidden={current ? undefined : true}
      inert={!current}
      className={cn(
        'relative isolate h-[max(33.75rem,calc(100vw/var(--hero-ratio-mobile,100)))] w-full shrink-0 overflow-hidden min-[56.25rem]:h-[max(35rem,calc(100vw/var(--hero-ratio,100)))]',
        tone.slide,
      )}
    >
      {slide.art && load ? (
        <Image
          src={slide.art}
          alt=""
          fill
          // The first slide is the page's largest paint: fetched first, ahead of fonts and scripts.
          loading="eager"
          fetchPriority={first ? 'high' : 'low'}
          // Under a veil: a lighter file, and three quarters of the width on phones.
          quality={60}
          sizes="(max-width: 767px) 75vw, 100vw"
          draggable={false}
          className={cn('-z-20 object-cover', ART_FOCUS[slide.artFocus ?? 'centre'])}
        />
      ) : null}
      {slide.photo && load ? (
        // The slide keeps the phone crop's proportions under 900 px (its height above), so the
        // phone crop shows there too, not the wide picture enlarged to fill a tall slide.
        <div aria-hidden className="absolute inset-0 -z-20">
          <VisualPicture visual={slide.photo} sizes="100vw" priority={first} phoneBelow={900} />
        </div>
      ) : null}
      {slide.art ? (
        <span
          aria-hidden
          className={cn('absolute inset-0 -z-10 bg-linear-to-b lg:bg-linear-to-r', tone.veil)}
        />
      ) : slide.photo ? null : (
        // A pool of light behind the product, as the reference's photographs are lit.
        <span
          aria-hidden
          className="absolute bottom-[-30%] left-1/2 -z-10 aspect-square w-[130%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255_/_0.35),transparent)] lg:right-[-8%] lg:bottom-[-40%] lg:left-auto lg:w-[60%] lg:translate-x-0"
        />
      )}
      {product && load ? (
        // eslint-disable-next-line @next/next/no-img-element -- API renditions (ADR-009)
        <img
          src={product.src}
          srcSet={product.srcSet}
          sizes={productSizes}
          alt=""
          loading="eager"
          fetchPriority={first ? 'high' : 'low'}
          decoding="async"
          draggable={false}
          // Phones: above the dots at the foot of the slide.
          className="absolute bottom-11 left-1/2 -z-10 h-[40%] w-auto max-w-[85%] -translate-x-1/2 object-contain object-bottom drop-shadow-[0_24px_24px_rgb(0_0_0_/_0.35)] lg:right-[10%] lg:bottom-[6%] lg:left-auto lg:h-[86%] lg:max-w-[42%] lg:translate-x-0"
        />
      ) : null}
      <Sparkles points={HERO_SPARKLES} className={cn('-z-10 hidden lg:block', tone.spark)} />
      {/* The picture leads where the pill does, for a pointer (the pill is the keyboard's way);
          a drag that changes the slide is not a click (see the track's onClickCapture). */}
      <Link
        href={slide.cta.href}
        tabIndex={-1}
        aria-hidden
        draggable={false}
        className="absolute inset-0 -z-[5]"
      />
      <div className="pointer-events-none container-page flex h-full flex-col items-center pt-8 text-center lg:items-start lg:justify-center lg:pt-0 lg:text-left">
        <div
          className={cn(
            'pointer-events-auto flex max-w-[45rem] flex-col items-center lg:items-start',
            // A photograph's subject stands right of its first 40 %.
            slide.photo && 'lg:max-w-[min(36rem,40vw)]',
          )}
        >
          {slide.eyebrow ? (
            <p className={cn('text-[1.25rem] leading-[1.1] font-bold uppercase', tone.eyebrow)}>
              {slide.eyebrow}
            </p>
          ) : null}
          <h2
            className={cn(
              'mt-3 font-headline [overflow-wrap:anywhere] lg:mt-4',
              headlineSize(slide.lines, Boolean(slide.product), Boolean(slide.photo)),
              tone.title,
            )}
          >
            {slide.lines.map((line, lineIndex) => (
              <span key={line} className="block">
                {lineIndex > 0 ? ' ' : null}
                {line}
              </span>
            ))}
          </h2>
          {slide.text ? (
            <p
              className={cn(
                'mt-4 line-clamp-2 max-w-[30rem] text-[0.8125rem] leading-normal lg:mt-6 lg:text-[1rem]',
                tone.text,
                // A phone crop's subject fills its lower half: there the words would sit on it.
                slide.photo && 'max-lg:hidden',
              )}
            >
              {slide.text}
            </p>
          ) : null}
          <Link
            href={slide.cta.href}
            draggable={false}
            className={cn(
              'pill-hover mt-5 inline-flex h-[3.125rem] items-center rounded-full px-8 text-[1rem] font-medium lg:mt-8',
              tone.button,
            )}
          >
            {slide.cta.label}
          </Link>
        </div>
      </div>
    </div>
  );
}
