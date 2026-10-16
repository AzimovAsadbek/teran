import type { CSSProperties } from 'react';
import { TeaTypeArt } from '@/components/brand/illustrations';
import { cn } from '@/lib/cn';
import { imageSources, type NavCategory } from '@/lib/navigation';

type Silhouette = {
  shape: 'far' | 'branch' | 'sprig';
  x: string;
  y: string;
  h: string;
  r: number;
  o: number;
  flip?: boolean;
  /** Drift over one half-cycle (seconds), its delay and how far it goes. */
  d: number;
  delay: number;
  dx: string;
  dy: string;
  dr: number;
  /** How far it leans on hover (the near layer further than the far one). */
  lean: [string, string];
};

/*
 * Four compositions, chosen by the card's position, so neighbouring cards never move alike: a
 * soft branch shadow far behind one edge and a crisp branch near another, never over the window.
 */
const COMPOSITIONS: [Silhouette, Silhouette][] = [
  [
    {
      shape: 'far',
      x: '-14%',
      y: '-10%',
      h: '92%',
      r: -16,
      o: 0.42,
      d: 47,
      delay: -11,
      dx: '3cqw',
      dy: '2cqh',
      dr: 2,
      lean: ['1.5cqw', '1cqh'],
    },
    {
      shape: 'branch',
      x: '80%',
      y: '30%',
      h: '70%',
      r: 162,
      o: 0.8,
      flip: true,
      d: 61,
      delay: -29,
      dx: '-2.5cqw',
      dy: '1.5cqh',
      dr: -3,
      lean: ['-4cqw', '2cqh'],
    },
  ],
  [
    {
      shape: 'far',
      x: '74%',
      y: '-14%',
      h: '96%',
      r: 18,
      o: 0.4,
      flip: true,
      d: 53,
      delay: -37,
      dx: '-3cqw',
      dy: '2.5cqh',
      dr: -2,
      lean: ['-1.5cqw', '1cqh'],
    },
    {
      shape: 'sprig',
      x: '-12%',
      y: '40%',
      h: '46%',
      r: 28,
      o: 0.75,
      d: 43,
      delay: -5,
      dx: '2cqw',
      dy: '-2cqh',
      dr: 3,
      lean: ['3.5cqw', '-1.5cqh'],
    },
  ],
  [
    {
      shape: 'far',
      x: '-20%',
      y: '28%',
      h: '84%',
      r: -38,
      o: 0.36,
      d: 66,
      delay: -21,
      dx: '3cqw',
      dy: '-1.5cqh',
      dr: 2.5,
      lean: ['1.5cqw', '-1cqh'],
    },
    {
      shape: 'branch',
      x: '76%',
      y: '-18%',
      h: '64%',
      r: -150,
      o: 0.7,
      d: 49,
      delay: -42,
      dx: '-2cqw',
      dy: '2cqh',
      dr: -2.5,
      lean: ['-3.5cqw', '2.5cqh'],
    },
  ],
  [
    {
      shape: 'far',
      x: '70%',
      y: '22%',
      h: '88%',
      r: 34,
      o: 0.38,
      flip: true,
      d: 58,
      delay: -3,
      dx: '-2.5cqw',
      dy: '-2cqh',
      dr: -2,
      lean: ['-1.5cqw', '-1cqh'],
    },
    {
      shape: 'sprig',
      x: '-8%',
      y: '-10%',
      h: '42%',
      r: 152,
      o: 0.7,
      flip: true,
      d: 44,
      delay: -33,
      dx: '2.5cqw',
      dy: '1.5cqh',
      dr: 2.5,
      lean: ['3.5cqw', '2cqh'],
    },
  ],
];

function SilhouetteLayer({ layer }: { layer: Silhouette }) {
  return (
    <span
      aria-hidden
      className={cn('cat-art-leaf', `cat-art-leaf--${layer.shape}`)}
      style={
        {
          '--x': layer.x,
          '--y': layer.y,
          '--h': layer.h,
          '--r': `${layer.r}deg`,
          '--flip': layer.flip ? -1 : 1,
          '--lean-x': layer.lean[0],
          '--lean-y': layer.lean[1],
        } as CSSProperties
      }
    >
      <span
        style={
          {
            '--o': layer.o,
            '--d': `${layer.d}s`,
            '--delay': `${layer.delay}s`,
            '--dx': layer.dx,
            '--dy': layer.dy,
            '--dr': `${layer.dr}deg`,
          } as CSSProperties
        }
      />
    </span>
  );
}

/**
 * The art of a category card or menu tile (decorative: the link around it names the category).
 * Fills its positioned parent. `variant` picks the composition (e.g. the card's index); `sizes`
 * describes the picture's displayed width for `srcset`.
 */
export function CategoryArt({
  category,
  variant = 0,
  sizes,
  className,
}: {
  category: Pick<NavCategory, 'image' | 'illustrationKey'>;
  variant?: number;
  sizes: string;
  className?: string;
}) {
  const [far, near] = COMPOSITIONS[variant % COMPOSITIONS.length]!;
  const image = category.image;
  const sources = image ? imageSources(image, 480) : null;
  return (
    <span aria-hidden className={cn('cat-art', className)}>
      <SilhouetteLayer layer={far} />
      <span className="cat-art-light" />
      <span className="cat-art-window">
        {image && sources && !image.transparent ? (
          // eslint-disable-next-line @next/next/no-img-element -- API renditions (ADR-009)
          <img
            className="cat-art-photo"
            src={sources.src}
            srcSet={sources.srcSet}
            sizes={sizes}
            width={image.width}
            height={image.height}
            alt=""
            loading="lazy"
            decoding="async"
          />
        ) : !image ? (
          <span className="cat-art-medallion">
            <TeaTypeArt kind={category.illustrationKey} />
          </span>
        ) : null}
      </span>
      {image && sources && image.transparent ? (
        // eslint-disable-next-line @next/next/no-img-element -- API renditions (ADR-009)
        <img
          className="cat-art-cutout"
          src={sources.src}
          srcSet={sources.srcSet}
          sizes={sizes}
          width={image.width}
          height={image.height}
          alt=""
          loading="lazy"
          decoding="async"
        />
      ) : null}
      <SilhouetteLayer layer={near} />
    </span>
  );
}
