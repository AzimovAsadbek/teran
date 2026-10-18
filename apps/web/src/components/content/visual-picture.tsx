import type { PublicVisualDto } from '@teran/contracts';
import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';
import { imageSources } from '@/lib/navigation';

/** The phone position's rule at each width the taller crop can switch at (static, for Tailwind). */
const PHONE_POSITION: Record<number, string> = {
  750: 'max-[750px]:object-(--position-phone)',
  990: 'max-[990px]:object-(--position-phone)',
};

/**
 * A page picture from Admin → Settings, filling its frame: the wide picture, and its taller crop
 * under 750 px when one was uploaded (as the reference's banners switch at that width).
 * Decorative: the text it sits behind carries the meaning.
 */
export function VisualPicture({
  visual,
  sizes,
  priority = false,
  phoneBelow = 750,
  position,
  phonePosition,
  className,
}: {
  visual: PublicVisualDto;
  sizes: string;
  priority?: boolean;
  /** The width under which the taller crop is shown, where the frame keeps its proportions. */
  phoneBelow?: number;
  /**
   * Where the frame crops the picture (CSS object-position), on wide screens and under
   * `phoneBelow`: a film's poster keeps the film's own focus point, so the film starts exactly
   * over it.
   */
  position?: string;
  phonePosition?: string;
  className?: string;
}) {
  const wide = imageSources(visual.image, 1280);
  const phone = visual.mobile ? imageSources(visual.mobile, 960) : null;
  const positions = {
    ...(position ? { '--position': position } : {}),
    ...(phonePosition ? { '--position-phone': phonePosition } : {}),
  } as CSSProperties;
  return (
    <picture>
      {phone ? (
        <source media={`(max-width: ${phoneBelow - 1}px)`} srcSet={phone.srcSet} sizes="100vw" />
      ) : null}
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
        style={positions}
        className={cn(
          'h-full w-full object-cover',
          position && 'object-(--position)',
          phonePosition && PHONE_POSITION[phoneBelow],
          className,
        )}
      />
    </picture>
  );
}
