'use client';

import type { ImageDto } from '@teran/contracts';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { imageSources } from '@/lib/navigation';

/** The largest rendition the zoom needs: the full window on a wide screen. */
const ZOOM_WIDTH = 1920;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The reference's zoomed gallery: a white full-screen dialog with every picture of the product at
 * full width (1440 px at most), one under another, opened at the picture that was clicked; from 990 px its
 * thumbnails run down the left and scroll to their picture. The close button or Escape shuts it,
 * and focus goes back to the picture that opened it. Its pictures load only once it opens.
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
  const listRef = useRef<HTMLUListElement>(null);
  // Where focus was when the gallery opened (the picture's button), to return to on closing.
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    // The page behind stays put while the pictures scroll.
    root.style.overflow = 'hidden';
    if (!dialog.open) {
      if (document.activeElement instanceof HTMLElement) openerRef.current = document.activeElement;
      dialog.showModal();
    }
    listRef.current?.children[start]?.scrollIntoView({ block: 'start' });
    // Closing is the dialog's own (the button, Escape); a dialog removed from the page with it
    // (leaving the page) leaves the top layer by itself.
    return () => {
      root.style.overflow = overflow;
    };
  }, [start]);

  const scrollTo = (index: number) => {
    listRef.current?.children[index]?.scrollIntoView({
      block: 'start',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label={t('zoomTitle', { name })}
      onClose={() => {
        openerRef.current?.focus({ preventScroll: true });
        onClose();
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden bg-white p-0 text-fg backdrop:bg-black/40"
    >
      <button
        type="button"
        onClick={() => dialogRef.current?.close()}
        aria-label={t('closeZoom')}
        className="absolute top-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-fg shadow-[0_2px_10px_rgb(0_0_0_/_15%)] hover:bg-ivory-100"
      >
        <X aria-hidden className="h-5 w-5" />
      </button>
      <div className="flex h-full">
        {images.length > 1 ? (
          <ul className="hidden w-[6.5rem] shrink-0 flex-col gap-2 overflow-y-auto px-4 py-6 min-[61.875rem]:flex">
            {images.map((image, index) => (
              <li key={image.src}>
                <button
                  type="button"
                  onClick={() => scrollTo(index)}
                  aria-label={t('showImage', { index: index + 1 })}
                  className="block aspect-square w-full overflow-hidden rounded-[0.5rem] border border-line bg-white hover:border-line-strong"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- API renditions (ADR-009) */}
                  <img
                    src={imageSources(image, 160).src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain"
                  />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <ul ref={listRef} className="h-full min-w-0 flex-1 overflow-y-auto overscroll-contain">
          {images.map((image, index) => {
            const sources = imageSources(image, ZOOM_WIDTH);
            return (
              <li key={image.src} className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element -- API renditions (ADR-009) */}
                <img
                  src={sources.src}
                  srcSet={sources.srcSet}
                  sizes="(min-width: 96.5rem) 90rem, (min-width: 61.875rem) calc(100vw - 6.5rem), 100vw"
                  width={image.width}
                  height={image.height}
                  alt={image.alt || `${name} ${index + 1}`}
                  loading={index === start ? 'eager' : 'lazy'}
                  decoding="async"
                  className="block h-auto w-full max-w-[90rem]"
                />
              </li>
            );
          })}
        </ul>
      </div>
    </dialog>
  );
}
