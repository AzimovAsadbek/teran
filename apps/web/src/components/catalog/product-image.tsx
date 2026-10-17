import type { ImageDto } from '@teran/contracts';
import { Emblem } from '@/components/brand/logo';
import { cn } from '@/lib/cn';

/** The margin a cut-out keeps inside its frame (`p-[6%]` on each side). */
const CUTOUT_FILL = 0.88;

/**
 * How much narrower than the drawn picture a file may be and still be chosen. Browsers take the
 * first file at least as wide as the drawn width times the screen's density, so a pouch drawn
 * 640.4 device pixels wide (a 412 px phone at 2.625×) skipped the 640 px file for the 960 px one:
 * 60 % more bytes for a difference no eye can see. Five per cent is well below what shows.
 */
const SHARPNESS_SLACK = 0.95;

/**
 * A cut-out stands whole inside its square frame and margins, so a pouch taller than wide is
 * drawn at only part of the frame's width (a 2:3 pouch at about 59 %). Its `sizes` are scaled to
 * match, or the browser would fetch a file sized for the whole frame: on a 412 px phone the
 * product page's first picture is the 640 px file (108 KB), not the 960 px one (175 KB).
 */
export function containedSizes(sizes: string, image: ImageDto): string {
  const factor = CUTOUT_FILL * Math.min(1, image.width / image.height) * SHARPNESS_SLACK;
  const scale = factor.toFixed(3);
  return sizes
    .split(',')
    .map((part) => {
      const entry = part.trim();
      // "(media) length" or "length"; media conditions here hold no nested parentheses.
      const media = entry.startsWith('(') ? entry.slice(0, entry.indexOf(')') + 1) : '';
      const length = entry.slice(media.length).trim();
      return `${media ? `${media} ` : ''}calc(${length} * ${scale})`;
    })
    .join(', ');
}

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
  // The pouches are photographed, so no image is labelled as a demonstration any more.
  const alt = decorative ? '' : image.alt;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- pre-sized renditions from the API (see docs/architecture/decisions.md, ADR-009)
    <img
      src={url(fallbackWidth)}
      srcSet={image.widths.map((width) => `${url(width)} ${width}w`).join(', ')}
      sizes={image.transparent ? containedSizes(sizes, image) : sizes}
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
