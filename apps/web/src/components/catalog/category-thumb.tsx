import type { IllustrationKey, ImageDto } from '@teran/contracts';
import { TeaTypeArt } from '@/components/brand/illustrations';
import { cn } from '@/lib/cn';
import { imageSources } from '@/lib/navigation';

/**
 * A category's or collection's small round mark in menus: its own cover when one is assigned,
 * otherwise its medallion (the neutral TERAN one without an illustration). Never a product's
 * picture. Decorative: the link around it names the category.
 */
export function CategoryThumb({
  image,
  illustrationKey,
  className,
  inset = 'p-1',
}: {
  image: ImageDto | null;
  illustrationKey: IllustrationKey | null;
  /** Size (and any transition) of the round frame. */
  className: string;
  /** Room around the medallion inside the frame. */
  inset?: string;
}) {
  if (image) {
    const { src, srcSet } = imageSources(image, 160);
    return (
      <span
        aria-hidden
        className={cn(
          'shrink-0 overflow-hidden rounded-full bg-ivory-50 ring-1 ring-line',
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- API renditions (ADR-009) */}
        <img
          src={src}
          srcSet={srcSet}
          sizes="48px"
          width={image.width}
          height={image.height}
          alt=""
          loading="lazy"
          decoding="async"
          className={cn(
            'h-full w-full',
            image.transparent ? 'object-contain p-0.5' : 'object-cover',
          )}
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-surface-muted',
        inset,
        className,
      )}
    >
      <TeaTypeArt kind={illustrationKey} />
    </span>
  );
}
