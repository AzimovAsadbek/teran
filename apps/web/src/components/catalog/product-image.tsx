import type { ImageDto } from '@teran/contracts';
import { useTranslations } from 'next-intl';
import { Emblem } from '@/components/brand/logo';
import { cn } from '@/lib/cn';
import { isDemoContent } from '@/lib/site';

interface ProductImageProps {
  image: ImageDto | null;
  name: string;
  /** Responsive `sizes` hint, e.g. "(min-width: 1024px) 25vw, 50vw". */
  sizes: string;
  priority?: boolean;
  /** A second view that repeats the first (the card's hover picture): no alternative text. */
  decorative?: boolean;
  className?: string;
}

/**
 * Product photos are re-encoded by the API into fixed WebP widths at upload time, so the browser
 * can pick one through srcset without a second optimisation pass. Packaging cut-outs stand whole
 * on their background (contain); photographs fill the frame (cover). Without a photo (a draft, or
 * an older product published before a main picture was required) a neutral TERAN placeholder
 * stands in: never a tea illustration or another product's picture, which would misrepresent it.
 */
export function ProductImage({
  image,
  name,
  sizes,
  priority = false,
  decorative = false,
  className,
}: ProductImageProps) {
  const t = useTranslations('Product');

  if (!image) {
    return (
      <div
        role="img"
        aria-label={name}
        className={cn(
          'flex h-full w-full items-center justify-center bg-ivory-100 bg-[radial-gradient(circle_at_50%_42%,var(--color-ivory-50),transparent_70%)]',
          className,
        )}
      >
        <Emblem className="w-[34%] max-w-32 opacity-55 grayscale-[35%]" sizes="128px" />
      </div>
    );
  }

  const url = (width: number) => `${image.src}/${width}.webp`;
  const fallbackWidth =
    image.widths.find((width) => width >= 640) ??
    image.widths[image.widths.length - 1] ??
    image.width;
  const alt = decorative ? '' : isDemoContent ? `${image.alt} (${t('demoImage')})` : image.alt;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- pre-sized renditions from the API (see docs/architecture/decisions.md, ADR-009)
    <img
      src={url(fallbackWidth)}
      srcSet={image.widths.map((width) => `${url(width)} ${width}w`).join(', ')}
      sizes={sizes}
      width={image.width}
      height={image.height}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={cn(
        'h-full w-full',
        image.transparent ? 'object-contain p-[6%]' : 'object-cover',
        className,
      )}
    />
  );
}
