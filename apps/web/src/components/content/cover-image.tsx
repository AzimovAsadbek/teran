import type { ImageDto } from '@teran/contracts';
import { cn } from '@/lib/cn';
import { imageSources } from '@/lib/navigation';

/**
 * A cover picture (articles, categories, collections) from the API's WebP renditions: srcset and
 * sizes, intrinsic dimensions against layout shift, lazy below the fold. Photographs fill their
 * frame (cover); a cut-out stands whole on its background (contain).
 */
export function CoverImage({
  image,
  sizes,
  priority = false,
  cutoutInset = 'p-4',
  className,
}: {
  image: ImageDto;
  sizes: string;
  priority?: boolean;
  /** Room around a cut-out inside its frame (small frames need less). */
  cutoutInset?: string;
  className?: string;
}) {
  const { src, srcSet } = imageSources(image, 960);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- API renditions, see ADR-009
    <img
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      width={image.width}
      height={image.height}
      alt={image.alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : undefined}
      className={cn(
        'h-full w-full',
        image.transparent ? cn('object-contain', cutoutInset) : 'object-cover',
        className,
      )}
    />
  );
}
