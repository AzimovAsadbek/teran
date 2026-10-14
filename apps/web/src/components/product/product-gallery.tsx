'use client';

import type { IllustrationKey, ImageDto } from '@teran/contracts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type KeyboardEvent } from 'react';
import { ProductImage } from '@/components/catalog/product-image';
import { IconButton } from '@/components/ui/button';
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
    <section aria-label={t('gallery')} className="lg:sticky lg:top-24" onKeyDown={onKeyDown}>
      <div className="relative aspect-square overflow-hidden rounded-panel bg-surface-muted">
        <ProductImage
          image={current}
          illustrationKey={illustrationKey}
          name={name}
          sizes={MAIN_SIZES}
          priority
        />
        {count > 1 ? (
          <>
            <IconButton
              label={t('previousImage')}
              icon={<ChevronLeft />}
              variant="surface"
              onClick={() => go(index - 1)}
              // IconButton nudges itself down when pressed, so centre with top rather than translate.
              className="absolute top-[calc(50%-1.375rem)] left-3 sm:left-4"
            />
            <IconButton
              label={t('nextImage')}
              icon={<ChevronRight />}
              variant="surface"
              onClick={() => go(index + 1)}
              className="absolute top-[calc(50%-1.375rem)] right-3 sm:right-4"
            />
            <p
              aria-hidden
              className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-surface/85 px-2.5 py-0.5 text-caption text-fg-muted figures backdrop-blur-sm sm:hidden"
            >
              {index + 1} / {count}
            </p>
          </>
        ) : null}
      </div>
      {count > 1 ? (
        <ul className="mt-3 flex gap-2.5 sm:mt-4 sm:gap-3">
          {images.map((image, imageIndex) => (
            <li key={image.src}>
              <button
                type="button"
                onClick={() => setIndex(imageIndex)}
                aria-label={t('showImage', { index: imageIndex + 1 })}
                aria-current={imageIndex === index ? 'true' : undefined}
                className={cn(
                  'block h-16 w-16 overflow-hidden rounded-control border bg-surface-muted transition-[border-color,box-shadow] duration-150 sm:h-20 sm:w-20',
                  imageIndex === index
                    ? 'border-brand ring-1 ring-brand'
                    : 'border-line hover:border-line-strong',
                )}
              >
                <ProductImage
                  image={image}
                  illustrationKey={illustrationKey}
                  name={name}
                  sizes="80px"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
