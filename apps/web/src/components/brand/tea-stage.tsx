import type { ImageDto } from '@teran/contracts';
import Image from 'next/image';
import type { CSSProperties } from 'react';
import { ProductFilm } from '@/components/catalog/product-film';
import { ProductImage } from '@/components/catalog/product-image';
import type { TeaCode } from '@/content/brand';
import { cn } from '@/lib/cn';
import { PACK_IMAGES } from './pack-images';

/** The stage's field: the pack's colour at 16 % over warm paper (as on the home page's stage). */
export function teaTint(colour: string): string {
  return `color-mix(in oklab, ${colour} 16%, var(--color-paper))`;
}

/**
 * One of TERAN's teas as a still life, the composition of the home page's five-tea stage: its
 * pouch standing on its own colour, its dry leaf poured in front and its brewed cup beside it,
 * steaming (the owner's film). On arrival (`entering`) the brewing language plays once (ADR-051):
 * the colour STEEPS into the field from the cup, the leaf UNFURLS into place, the cup fills from
 * below (POUR). The pouch, the picture the page paints first, never moves or fades. With reduced
 * motion the still life shows at once.
 */
export function TeaStage({
  code,
  colour,
  name,
  leaves,
  cup,
  entering = false,
  priority = false,
  packSizes,
}: {
  code: TeaCode;
  colour: string;
  name: string;
  leaves: ImageDto | null;
  cup: ImageDto | null;
  entering?: boolean;
  priority?: boolean;
  /** The pouch's drawn width (it stands at about half the stage's width). */
  packSizes: string;
}) {
  return (
    <div className="relative isolate h-full w-full overflow-hidden bg-paper">
      <span
        aria-hidden
        className={cn('absolute inset-0 -z-20', entering && 'steep-in')}
        style={{ backgroundColor: teaTint(colour), '--steep-at': '80% 80%' } as CSSProperties}
      />
      {/* Light falling on the field from the upper left. */}
      <span
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_60%_at_30%_20%,rgb(255_255_255_/_0.65),transparent_70%)]"
      />
      {leaves ? (
        <div
          aria-hidden
          className={cn(
            'absolute bottom-[-7%] left-[-6%] w-[66%] mix-blend-multiply [mask-image:radial-gradient(closest-side,#000_72%,transparent)]',
            entering && 'unfurl-in',
          )}
        >
          {/* The photograph's near-white ground lifted to white, so the multiply leaves no edge. */}
          <div className="aspect-square brightness-[1.05] contrast-[1.04]">
            <ProductImage
              image={leaves}
              name={name}
              sizes="(min-width: 750px) 30vw, 66vw"
              decorative
            />
          </div>
        </div>
      ) : null}
      <div className="absolute top-[9%] left-[30%] h-[74%] -rotate-3">
        <Image
          src={PACK_IMAGES[code]}
          alt={name}
          priority={priority}
          sizes={packSizes}
          className="h-full w-auto drop-shadow-[0_28px_26px_rgb(32_24_8_/_0.32)]"
        />
      </div>
      {cup ? (
        <div aria-hidden className="absolute right-[5%] bottom-[6%] w-[34%]">
          <div className="relative aspect-square overflow-hidden rounded-full shadow-[0_20px_40px_-18px_rgb(32_24_8_/_0.55)] ring-[6px] ring-white">
            <div className={cn('absolute inset-0', entering && 'pour-in')}>
              <ProductImage image={cup} name={name} sizes="16rem" decorative />
              {cup.film?.cardSrc ? <ProductFilm film={cup.film} size="card" /> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
