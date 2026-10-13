import type { IllustrationKey, ImageDto } from '@teran/contracts';
import { useTranslations } from 'next-intl';
import { TeaTypeArt } from '@/components/brand/illustrations';
import { cn } from '@/lib/cn';
import { isDemoContent } from '@/lib/site';

interface ProductImageProps {
  image: ImageDto | null;
  illustrationKey: IllustrationKey | null;
  name: string;
  /** Responsive `sizes` hint, e.g. "(min-width: 1024px) 25vw, 50vw". */
  sizes: string;
  priority?: boolean;
  className?: string;
}

/**
 * Product photos are re-encoded by the API into fixed WebP widths at upload time, so the browser
 * can pick one through srcset without a second optimisation pass. Without a photo, the tea-type
 * illustration stands in (and carries the accessible name).
 */
export function ProductImage({
  image,
  illustrationKey,
  name,
  sizes,
  priority = false,
  className,
}: ProductImageProps) {
  const t = useTranslations('Product');

  if (!image) {
    return (
      <div className={cn('flex items-center justify-center bg-ivory-100 p-[12%]', className)}>
        <TeaTypeArt kind={illustrationKey} label={name} />
      </div>
    );
  }

  const url = (width: number) => `${image.src}/${width}.webp`;
  const fallbackWidth =
    image.widths.find((width) => width >= 640) ??
    image.widths[image.widths.length - 1] ??
    image.width;
  const alt = isDemoContent ? `${image.alt} (${t('demoImage')})` : image.alt;

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
      className={cn('h-full w-full object-cover', className)}
    />
  );
}
