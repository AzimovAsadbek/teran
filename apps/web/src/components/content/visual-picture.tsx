import type { PublicVisualDto } from '@teran/contracts';
import type { CSSProperties } from 'react';
import { preload } from 'react-dom';
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
 * Decorative: the text it sits behind carries the meaning. A `priority` picture (the first view's)
 * is also announced in the document's head, each crop for the widths that show it, so the browser
 * fetches it with the styles and fonts instead of once the page's markup reaches it.
 */
export function VisualPicture({
  visual,
  sizes,
  phoneSizes = '100vw',
  priority = false,
  phoneBelow = 750,
  position,
  phonePosition,
  className,
}: {
  visual: PublicVisualDto;
  sizes: string;
  /**
   * The width the taller crop is drawn at under `phoneBelow`: the whole screen unless its frame
   * sits inside the page's margins, where saying so lets a phone take a smaller file (ADR-067).
   */
  phoneSizes?: string;
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
  const phoneMedia = `(max-width: ${phoneBelow - 1}px)`;
  if (priority) {
    if (phone) {
      preload(phone.src, {
        as: 'image',
        imageSrcSet: phone.srcSet,
        imageSizes: phoneSizes,
        fetchPriority: 'high',
        media: phoneMedia,
      });
    }
    preload(wide.src, {
      as: 'image',
      imageSrcSet: wide.srcSet,
      imageSizes: sizes,
      fetchPriority: 'high',
      media: phone ? `not all and ${phoneMedia}` : undefined,
    });
  }
  const positions = {
    ...(position ? { '--position': position } : {}),
    ...(phonePosition ? { '--position-phone': phonePosition } : {}),
  } as CSSProperties;
  return (
    <picture>
      {phone ? <source media={phoneMedia} srcSet={phone.srcSet} sizes={phoneSizes} /> : null}
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
