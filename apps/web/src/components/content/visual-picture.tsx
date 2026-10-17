import type { PublicVisualDto } from '@teran/contracts';
import { cn } from '@/lib/cn';
import { imageSources } from '@/lib/navigation';

/**
 * A page picture from Admin → Settings, filling its frame: the wide picture, and its taller crop
 * under 750 px when one was uploaded (as the reference's banners switch at that width).
 * Decorative: the text it sits behind carries the meaning.
 */
export function VisualPicture({
  visual,
  sizes,
  priority = false,
  className,
}: {
  visual: PublicVisualDto;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const wide = imageSources(visual.image, 1280);
  const phone = visual.mobile ? imageSources(visual.mobile, 960) : null;
  return (
    <picture>
      {phone ? <source media="(max-width: 749px)" srcSet={phone.srcSet} sizes="100vw" /> : null}
      <img
        src={wide.src}
        srcSet={wide.srcSet}
        sizes={sizes}
        width={visual.image.width}
        height={visual.image.height}
        alt=""
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : undefined}
        className={cn('h-full w-full object-cover', className)}
      />
    </picture>
  );
}
