'use client';

import type { IllustrationKey, ImageDto } from '@teran/contracts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type KeyboardEvent } from 'react';
import { ProductImage } from '@/components/catalog/product-image';
import { cn } from '@/lib/cn';

const MAIN_SIZES = '(min-width: 1024px) 50vw, 100vw';

export function ProductGallery({
  images,
  illustrationKey,
  name,
}: {
  images: ImageDto[];
  illustrationKey: IllustrationKey | null;
  name: string;
}) {
  const t = useTranslations('Product');
  const [index, setIndex] = useState(0);
  const count = images.length;
  const current = images[index] ?? null;

  const go = (next: number) => setIndex((next + count) % count);
  const onKeyDown = (event: KeyboardEvent) => {
    if (count < 2) return;
    if (event.key === 'ArrowRight') go(index + 1);
    if (event.key === 'ArrowLeft') go(index - 1);
  };

  return (
    <section aria-label={t('gallery')} className="lg:sticky lg:top-28" onKeyDown={onKeyDown}>
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-panel)] bg-ivory-100">
        <ProductImage image={current} illustrationKey={illustrationKey} name={name} sizes={MAIN_SIZES} priority />
        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label={t('previousImage')}
              className="glass absolute top-1/2 left-3 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-forest-900"
            >
              <ChevronLeft aria-hidden className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label={t('nextImage')}
              className="glass absolute top-1/2 right-3 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-forest-900"
            >
              <ChevronRight aria-hidden className="h-5 w-5" />
            </button>
          </>
        ) : null}
      </div>
      {count > 1 ? (
        <ul className="mt-4 flex gap-3">
          {images.map((image, imageIndex) => (
            <li key={image.src}>
              <button
                type="button"
                onClick={() => setIndex(imageIndex)}
                aria-label={t('showImage', { index: imageIndex + 1 })}
                aria-current={imageIndex === index ? 'true' : undefined}
                className={cn(
                  'h-20 w-20 overflow-hidden rounded-xl border-2 bg-ivory-100 transition-colors',
                  imageIndex === index ? 'border-forest-900' : 'border-transparent hover:border-ivory-300',
                )}
              >
                <ProductImage image={image} illustrationKey={illustrationKey} name={name} sizes="80px" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
