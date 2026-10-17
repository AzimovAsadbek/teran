'use client';

import type { ImageDto } from '@teran/contracts';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState, type KeyboardEvent } from 'react';
import { ProductImage } from '@/components/catalog/product-image';
import { IconButton } from '@/components/ui/button';
import { cn } from '@/lib/cn';

/**
 * The picture's real width in the page column (gutters 1.5 rem up to 4.45 vw, two columns 48 px
 * apart from 1024 px), so a phone loads the 960 px file rather than the 1280 px one.
 */
const MAIN_SIZES =
  '(min-width: 1440px) 632px, (min-width: 1024px) calc(45.5vw - 1.5rem), (min-width: 640px) 91vw, calc(100vw - 3rem)';

/**
 * Product images as a row of slides that scroll sideways with snap points: a swipe on touch
 * screens, the arrow buttons, the thumbnails or ←/→ elsewhere. The browser does the movement
 * (smooth scrolling, or an instant jump with reduced motion). Only the first image is part of the
 * first load (it is the page's largest paint); the others are fetched once the shopper reaches for
 * the gallery (pointer over it, a touch, keyboard focus), so a visit that never browses the
 * images costs no extra bytes.
 */
export function ProductGallery({ images, name }: { images: ImageDto[]; name: string }) {
  const t = useTranslations('Product');
  const [index, setIndex] = useState(0);
  const [primed, setPrimed] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const count = images.length;

  if (count < 2) {
    return (
      <section aria-label={t('gallery')} className="lg:sticky lg:top-40">
        <div className="relative aspect-square overflow-hidden bg-surface">
          <ProductImage image={images[0] ?? null} name={name} sizes={MAIN_SIZES} priority />
        </div>
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
    if (!primed) setPrimed(true);
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
      {/* The reference: the picture on white, plain arrows at its sides, thumbnails centred below. */}
      <div className="relative aspect-square overflow-hidden bg-surface">
        <div
          ref={trackRef}
          onScroll={onScroll}
          // Focusable so the slides can be scrolled from the keyboard as well.
          tabIndex={0}
          role="group"
          aria-label={`${index + 1} / ${count}`}
          className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] focus-visible:outline-offset-[-3px] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((image, imageIndex) => (
            <div
              key={image.src}
              aria-hidden={imageIndex === index ? undefined : true}
              className="h-full w-full shrink-0 snap-center snap-always"
            >
              {imageIndex === 0 || primed ? (
                <ProductImage
                  image={image}
                  name={name}
                  sizes={MAIN_SIZES}
                  priority={imageIndex === 0}
                />
              ) : null}
            </div>
          ))}
        </div>
        <IconButton
          label={t('previousImage')}
          icon={<ArrowLeft />}
          variant="ghost"
          onClick={() => show(index - 1)}
          // IconButton nudges itself down when pressed, so centre with top rather than translate.
          className="absolute top-[calc(50%-1.375rem)] left-1"
        />
        <IconButton
          label={t('nextImage')}
          icon={<ArrowRight />}
          variant="ghost"
          onClick={() => show(index + 1)}
          className="absolute top-[calc(50%-1.375rem)] right-1"
        />
        <p
          aria-hidden
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-surface/85 px-2.5 py-0.5 text-caption text-fg-muted figures backdrop-blur-sm sm:hidden"
        >
          {index + 1} / {count}
        </p>
      </div>
      <ul className="mt-3 flex justify-center gap-2 sm:mt-4">
        {images.map((image, imageIndex) => (
          <li key={image.src}>
            <button
              type="button"
              onClick={() => show(imageIndex)}
              aria-label={t('showImage', { index: imageIndex + 1 })}
              aria-current={imageIndex === index ? 'true' : undefined}
              className={cn(
                'block h-16 w-16 overflow-hidden rounded-[0.5rem] border bg-surface transition-[border-color,box-shadow] duration-150 sm:h-[5.25rem] sm:w-[5.25rem]',
                imageIndex === index
                  ? 'border-forest-900 ring-1 ring-forest-900'
                  : 'border-line hover:border-line-strong',
              )}
            >
              <ProductImage image={image} name={name} sizes="80px" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
