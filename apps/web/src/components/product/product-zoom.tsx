'use client';

import type { ImageDto } from '@teran/contracts';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { ProductFilm } from '@/components/catalog/product-film';
import { cn } from '@/lib/cn';
import { imageSources } from '@/lib/navigation';

/** The largest rendition the viewer needs: a picture as tall as a large screen allows. */
const VIEW_WIDTH = 1920;
/** How far a finger travels sideways before the next picture comes (px). */
const SWIPE = 48;

const ROUND =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-fg shadow-[0_2px_10px_rgb(0_0_0_/_25%)] transition-[background-color,scale] duration-150 hover:bg-ivory-100 active:scale-95 sm:h-12 sm:w-12';

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The product's pictures over the dimmed page, as a marketplace shows them (the owner's model of
 * 2026-10-22): one picture at a time, whole and in its own proportions, as large as the screen
 * allows above a row of every picture small; where a picture has a film, the film plays over it.
 * Arrows at the sides, the arrow keys and a swipe turn to the previous or next picture (round the
 * end), and a thumbnail jumps to its picture. The close button, Escape or a click beside the
 * picture shuts it, and focus goes back to the picture that opened it. The pictures on either
 * side of the one shown load ahead, so turning is instant.
 */
export function ProductZoom({
  images,
  name,
  start,
  onClose,
}: {
  images: ImageDto[];
  name: string;
  /** The picture to open at. */
  start: number;
  onClose: () => void;
}) {
  const t = useTranslations('Product');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const thumbsRef = useRef<HTMLUListElement>(null);
  // Where focus was when the viewer opened (the picture's button), to return to on closing.
  const openerRef = useRef<HTMLElement | null>(null);
  const swipeFrom = useRef<number | null>(null);
  const [current, setCurrent] = useState(start);
  const count = images.length;
  const image = images[current] ?? images[0];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    // The page behind stays put.
    root.style.overflow = 'hidden';
    if (!dialog.open) {
      if (document.activeElement instanceof HTMLElement) openerRef.current = document.activeElement;
      dialog.showModal();
    }
    // Closing is the dialog's own (the button, Escape); a dialog removed from the page with it
    // (leaving the page) leaves the top layer by itself.
    return () => {
      root.style.overflow = overflow;
    };
  }, []);

  useEffect(() => {
    thumbsRef.current?.children[current]?.scrollIntoView({
      block: 'nearest',
      inline: 'center',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
    if (count < 2) return;
    for (const step of [-1, 1]) {
      const neighbour = images[(current + step + count) % count];
      if (neighbour) new window.Image().src = imageSources(neighbour, VIEW_WIDTH).src;
    }
  }, [current, count, images]);

  if (!image) return null;
  const go = (step: number) => setCurrent((index) => (index + step + count) % count);
  const close = () => dialogRef.current?.close();
  const sources = imageSources(image, VIEW_WIDTH);

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (count < 2 || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    event.preventDefault();
    go(event.key === 'ArrowLeft' ? -1 : 1);
  };
  // A click on the dimmed space around the picture closes, as it does on a marketplace.
  const onClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target instanceof HTMLElement && event.target.dataset.beside !== undefined) close();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label={t('zoomTitle', { name })}
      onClose={() => {
        openerRef.current?.focus({ preventScroll: true });
        onClose();
      }}
      onKeyDown={onKeyDown}
      onClick={onClick}
      className="m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden bg-transparent p-0 text-white backdrop:bg-[rgb(8_14_13_/_0.86)]"
    >
      <div data-beside className="flex h-full flex-col">
        <div data-beside className="flex items-center justify-between px-4 pt-4 sm:px-6 sm:pt-5">
          <p aria-live="polite" className="figures text-[0.9375rem] font-semibold text-white/85">
            {count > 1 ? `${current + 1} / ${count}` : null}
          </p>
          <button type="button" onClick={close} aria-label={t('closeZoom')} className={ROUND}>
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>

        <div
          data-beside
          className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-24"
        >
          {count > 1 ? (
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={t('previousImage')}
              className={cn(ROUND, 'absolute top-1/2 left-3 z-10 -translate-y-1/2 sm:left-6')}
            >
              <ChevronLeft aria-hidden className="h-6 w-6" strokeWidth={2.25} />
            </button>
          ) : null}
          {/* One box per picture: turning replaces the picture and its film together. */}
          <div
            key={image.src}
            className="relative overflow-hidden rounded-[1rem] bg-white shadow-[0_24px_60px_rgb(0_0_0_/_45%)]"
            onPointerDown={(event) => {
              swipeFrom.current = event.clientX;
            }}
            onPointerUp={(event) => {
              const from = swipeFrom.current;
              swipeFrom.current = null;
              if (from === null || count < 2) return;
              const distance = event.clientX - from;
              if (Math.abs(distance) >= SWIPE) go(distance < 0 ? 1 : -1);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- API renditions (ADR-009) */}
            <img
              src={sources.src}
              srcSet={sources.srcSet}
              sizes="(min-width: 640px) min(calc(100vw - 12rem), calc(100vh - 12rem)), 100vw"
              width={image.width}
              height={image.height}
              alt={image.alt || `${name} ${current + 1}`}
              decoding="async"
              draggable={false}
              className="block h-auto max-h-[calc(100dvh-12rem)] w-auto max-w-[calc(100vw-2rem)] object-contain select-none sm:max-w-[calc(100vw-12rem)]"
            />
            {image.film?.cardSrc ? <ProductFilm film={image.film} size="full" /> : null}
          </div>
          {count > 1 ? (
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={t('nextImage')}
              className={cn(ROUND, 'absolute top-1/2 right-3 z-10 -translate-y-1/2 sm:right-6')}
            >
              <ChevronRight aria-hidden className="h-6 w-6" strokeWidth={2.25} />
            </button>
          ) : null}
        </div>

        {count > 1 ? (
          <ul
            ref={thumbsRef}
            className="mx-auto flex max-w-full gap-2 overflow-x-auto overscroll-contain px-4 pt-4 pb-5 [scrollbar-width:none] sm:gap-2.5 sm:pt-5 sm:pb-6"
          >
            {images.map((thumbnail, index) => (
              <li key={thumbnail.src} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrent(index)}
                  aria-label={t('showImage', { index: index + 1 })}
                  aria-current={index === current ? 'true' : undefined}
                  className={cn(
                    'block h-14 w-14 overflow-hidden rounded-[0.625rem] bg-white transition-[opacity,box-shadow] duration-150 sm:h-16 sm:w-16',
                    index === current
                      ? 'opacity-100 shadow-[0_0_0_2px_rgb(8_14_13),0_0_0_4px_white]'
                      : 'opacity-55 hover:opacity-90',
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- API renditions (ADR-009) */}
                  <img
                    src={imageSources(thumbnail, 160).src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className={cn(
                      'h-full w-full',
                      thumbnail.transparent ? 'object-contain p-1' : 'object-cover',
                    )}
                  />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div data-beside className="h-6" />
        )}
      </div>
    </dialog>
  );
}
