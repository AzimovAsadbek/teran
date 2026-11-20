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
  filmPoster = false,
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
  filmPoster?: boolean;
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
  const deferred = filmPoster && Boolean(visual.image.preview);
  if (priority && !deferred) {
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
    <picture className="relative block h-full w-full" data-film-poster={deferred ? '' : undefined}>
      {phone ? (
        <source
          media={phoneMedia}
          srcSet={deferred ? (visual.mobile?.preview ?? visual.image.preview) : phone.srcSet}
          data-full={deferred ? phone.srcSet : undefined}
          data-small={deferred && visual.mobile ? imageSources(visual.mobile, 240).src : undefined}
          sizes={phoneSizes}
          suppressHydrationWarning={deferred}
        />
      ) : null}
      <img
        src={deferred ? visual.image.preview : wide.src}
        srcSet={deferred ? undefined : wide.srcSet}
        data-full={deferred ? wide.srcSet : undefined}
        data-small={deferred ? imageSources(visual.image, 240).src : undefined}
        {...(deferred ? { elementtiming: 'teran-poster-preview' } : {})}
        suppressHydrationWarning={deferred}
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
