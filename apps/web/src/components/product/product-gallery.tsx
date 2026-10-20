'use client';

import type { ImageDto } from '@teran/contracts';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react';
import { ProductFilm } from '@/components/catalog/product-film';
import { ProductImage } from '@/components/catalog/product-image';
import { IconButton } from '@/components/ui/button';
import { cn } from '@/lib/cn';

/** The zoomed gallery's code arrives when the shopper reaches for the pictures, not with the page. */
const loadZoom = () => import('./product-zoom');
const ProductZoom = dynamic(() => loadZoom().then((module) => module.ProductZoom), {
  ssr: false,
});

/**
 * The picture's real width in the reference's 1440 px frame: edge to edge on phones, then one of
 * two columns 40 px apart between 40 px margins (700 px at most), so each screen loads the file it
 * needs.
 */
const MAIN_SIZES = '(min-width: 95rem) 700px, (min-width: 46.875rem) calc(50vw - 3.75rem), 100vw';

/** Whether the page has finished loading, its first picture included (never on the server). */
function subscribeToLoad(onChange: () => void) {
  window.addEventListener('load', onChange);
  return () => window.removeEventListener('load', onChange);
}
const pageLoaded = () => document.readyState === 'complete';
const loadedOnServer = () => false;

/** One pass of light across the picture, played once (styles/globals.css, `.light-pass`). */
function LightPass({ gold }: { gold: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'light-pass pointer-events-none absolute inset-0 z-[1]',
        gold && 'light-pass-gold',
      )}
    />
  );
}

/**
 * Product images as a row of slides that scroll sideways with snap points: a swipe on touch
 * screens, the arrow buttons, the thumbnails or ←/→ elsewhere. The browser does the movement
 * (smooth scrolling, or an instant jump with reduced motion). Only the first image is part of the
 * first load (it is the page's largest paint), and its thumbnail shows the same file; the other
 * thumbnails follow once the page has loaded, and the other images once the shopper reaches for
 * the gallery (pointer over it, a touch, keyboard focus), so a visit that never browses the
 * images costs only their thumbnails.
 */
export function ProductGallery({
  images,
  name,
  stage,
  arrival = null,
}: {
  images: ImageDto[];
  name: string;
  /**
   * A composed first slide before the photographs (TERAN's teas: their stage, components/brand/
   * tea-stage.tsx) and its thumbnail; it opens the zoom at the first photograph.
   */
  stage?: { slide: ReactNode; thumb: ReactNode } | null;
  /**
   * The first picture's arrival (ADR-051): one pass of light across glass (`clear`) or a gift box
   * (`gold`) once the page has loaded; none for the rest.
   */
  arrival?: 'clear' | 'gold' | null;
}) {
  const t = useTranslations('Product');
  const [index, setIndex] = useState(0);
  const [primed, setPrimed] = useState(false);
  // The picture the zoomed gallery opened at, while it is open.
  const [zoomAt, setZoomAt] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  // On a slow connection the thumbnails would share the first picture's bandwidth.
  const loaded = useSyncExternalStore(subscribeToLoad, pageLoaded, loadedOnServer);
  // The slides: the stage, when there is one, then every photograph.
  const offset = stage ? 1 : 0;
  const count = images.length + offset;

  const zoom =
    zoomAt === null ? null : (
      <ProductZoom images={images} name={name} start={zoomAt} onClose={() => setZoomAt(null)} />
    );
  /** The picture opens the zoomed gallery, as the reference's does. */
  const zoomButton = (imageIndex: number, focusable: boolean) => (
    <button
      type="button"
      tabIndex={focusable ? 0 : -1}
      onClick={() => setZoomAt(imageIndex)}
      aria-label={t('zoomImage', { index: imageIndex + 1 })}
      className="absolute inset-0 cursor-zoom-in focus-visible:outline-offset-[-3px]"
    />
  );

  if (count < 2 && !stage) {
    return (
      <section aria-label={t('gallery')} className="lg:sticky lg:top-40">
        <div className="relative aspect-square overflow-hidden bg-surface min-[46.875rem]:rounded-[1.5rem]">
          <ProductImage image={images[0] ?? null} name={name} sizes={MAIN_SIZES} priority />
          {images[0]?.film ? <ProductFilm film={images[0].film} size="full" /> : null}
          {arrival && loaded ? <LightPass gold={arrival === 'gold'} /> : null}
          {images[0] ? zoomButton(0, true) : null}
        </div>
        {zoom}
      </section>
    );
  }

  const show = (next: number) => {
    const track = trackRef.current;
    if (!track) return;
    const target = (next + count) % count;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollTo({ left: target * track.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
  };

  // The visible slide is the one under the middle of the track; state only changes when it does.
  const onScroll = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const visible = Math.min(
      count - 1,
      Math.max(0, Math.round(track.scrollLeft / track.clientWidth)),
    );
    setIndex((current) => (current === visible ? current : visible));
  };

  const prime = () => {
    if (primed) return;
    setPrimed(true);
    // The zoom's code, so a click on a picture opens it at once.
    void loadZoom();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    show(index + (event.key === 'ArrowRight' ? 1 : -1));
  };

  return (
    <section
      aria-label={t('gallery')}
      className="lg:sticky lg:top-40"
      onKeyDown={onKeyDown}
      onPointerEnter={prime}
      onTouchStart={prime}
      onFocus={prime}
    >
      {/* The picture on white in a rounded frame (edge to edge on phones), plain arrows at its
          sides, thumbnails centred below. */}
      <div className="relative aspect-square overflow-hidden bg-surface min-[46.875rem]:rounded-[1.5rem]">
        <div
          ref={trackRef}
          onScroll={onScroll}
          // Focusable so the slides can be scrolled from the keyboard as well.
          tabIndex={0}
          role="group"
          aria-label={`${index + 1} / ${count}`}
          className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] focus-visible:outline-offset-[-3px] [&::-webkit-scrollbar]:hidden"
        >
          {stage ? (
            <div
              aria-hidden={index === 0 ? undefined : true}
              className="relative h-full w-full shrink-0 snap-center snap-always"
            >
              {stage.slide}
              {images.length > 0 ? zoomButton(0, index === 0) : null}
            </div>
          ) : null}
          {images.map((image, imageIndex) => {
            const slide = imageIndex + offset;
            return (
              <div
                key={image.src}
                aria-hidden={slide === index ? undefined : true}
                className="relative h-full w-full shrink-0 snap-center snap-always"
              >
                {slide === 0 || primed ? (
                  <ProductImage
                    image={image}
                    name={name}
                    sizes={MAIN_SIZES}
                    priority={slide === 0}
                  />
                ) : null}
                {image.film && (slide === 0 || primed) ? (
                  <ProductFilm film={image.film} size="full" active={slide === index} />
                ) : null}
                {slide === 0 && arrival && loaded ? <LightPass gold={arrival === 'gold'} /> : null}
                {zoomButton(imageIndex, slide === index)}
              </div>
            );
          })}
        </div>
        {/* The reference's teal arrows, 22 px with a heavy stroke, on a soft light disc so they
            read on dark photographs too (the steaming cups). */}
        <IconButton
          label={t('previousImage')}
          icon={<ArrowLeft strokeWidth={2.5} className="h-[1.375rem]! w-[1.375rem]!" />}
          variant="plain"
          onClick={() => show(index - 1)}
          // IconButton nudges itself down when pressed, so centre with top rather than translate.
          className="absolute top-[calc(50%-1.375rem)] left-2 bg-surface/85 text-[#107e84]! shadow-[0_2px_8px_rgb(0_0_0_/_0.18)] backdrop-blur-sm"
        />
        <IconButton
          label={t('nextImage')}
          icon={<ArrowRight strokeWidth={2.5} className="h-[1.375rem]! w-[1.375rem]!" />}
          variant="plain"
          onClick={() => show(index + 1)}
          className="absolute top-[calc(50%-1.375rem)] right-2 bg-surface/85 text-[#107e84]! shadow-[0_2px_8px_rgb(0_0_0_/_0.18)] backdrop-blur-sm"
        />
        <p
          aria-hidden
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-surface/85 px-2.5 py-0.5 text-caption text-fg-muted figures backdrop-blur-sm sm:hidden"
        >
          {index + 1} / {count}
        </p>
      </div>
      {/* Under the picture: one row that scrolls on phones (from the gutter), centred and wrapping
          in a wider column. */}
      <ul className="mt-3 flex gap-2 overflow-x-auto px-4 py-0.5 [scrollbar-width:none] sm:mt-4 min-[46.875rem]:flex-wrap min-[46.875rem]:justify-center min-[46.875rem]:overflow-visible min-[46.875rem]:px-0 [&::-webkit-scrollbar]:hidden">
        {stage ? (
          <li>
            <button
              type="button"
              onClick={() => show(0)}
              aria-label={t('showImage', { index: 1 })}
              aria-current={index === 0 ? 'true' : undefined}
              className={cn(
                'relative block h-14 w-14 shrink-0 overflow-hidden rounded-[0.5rem] border bg-surface transition-[border-color,box-shadow] duration-150 sm:h-[5.25rem] sm:w-[5.25rem]',
                index === 0
                  ? 'border-forest-900 ring-1 ring-forest-900'
                  : 'border-line hover:border-line-strong',
              )}
            >
              {stage.thumb}
            </button>
          </li>
        ) : null}
        {images.map((image, imageIndex) => {
          const slide = imageIndex + offset;
          return (
            <li key={image.src}>
              <button
                type="button"
                onClick={() => show(slide)}
                aria-label={t('showImage', { index: slide + 1 })}
                aria-current={slide === index ? 'true' : undefined}
                className={cn(
                  'block h-14 w-14 shrink-0 overflow-hidden rounded-[0.5rem] border bg-surface transition-[border-color,box-shadow] duration-150 sm:h-[5.25rem] sm:w-[5.25rem]',
                  slide === index
                    ? 'border-forest-900 ring-1 ring-forest-900'
                    : 'border-line hover:border-line-strong',
                )}
              >
                {slide === 0 ? (
                  // The first picture's own file (the same `sizes` choose the same one): no download.
                  <ProductImage image={image} name={name} sizes={MAIN_SIZES} />
                ) : loaded || primed ? (
                  <ProductImage image={image} name={name} sizes="80px" />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      {zoom}
    </section>
  );
}
