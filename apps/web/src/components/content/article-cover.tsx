import type { ArticleSummaryDto, IllustrationKey } from '@teran/contracts';
import Image, { type StaticImageData } from 'next/image';
import { Emblem } from '@/components/brand/logo';
import { cn } from '@/lib/cn';
import black from '../../../public/brand/leaves/black.webp';
import green from '../../../public/brand/leaves/green.webp';
import oolong from '../../../public/brand/leaves/oolong.webp';
import puerh from '../../../public/brand/leaves/puerh.webp';
import white from '../../../public/brand/leaves/white.webp';
import { CoverImage } from './cover-image';

/** The owner's dry-leaf photographs for the kinds of tea an article can be about. */
const LEAF: Partial<Record<IllustrationKey, StaticImageData>> = {
  green,
  jasmine: green,
  black,
  'earl-grey': black,
  white,
  oolong,
  dark: puerh,
};

/**
 * An article's picture in its frame (the journal's cards and the article's opening, ADR-051): its
 * cover, or — for an article without one — the dry leaf of the tea it is about (the owner's
 * photograph) in a circle on deep teal, else TERAN's emblem: never an empty grey box. The frame
 * gives the size; `settle` lets the cover settle into it once (the article page): movement only,
 * so the picture is whole from its first frame.
 */
export function ArticleCover({
  article,
  sizes,
  priority = false,
  settle = false,
  className,
}: {
  article: Pick<ArticleSummaryDto, 'cover' | 'illustrationKey'>;
  sizes: string;
  priority?: boolean;
  settle?: boolean;
  className?: string;
}) {
  if (article.cover) {
    return (
      <span className={cn('absolute inset-0 block', settle && 'overflow-hidden', className)}>
        <CoverImage
          image={article.cover}
          sizes={sizes}
          priority={priority}
          className={settle ? 'arrive-settle' : undefined}
        />
      </span>
    );
  }
  const leaf = article.illustrationKey ? LEAF[article.illustrationKey] : undefined;
  return (
    <span
      aria-hidden
      className={cn(
        'absolute inset-0 flex items-center justify-center overflow-hidden bg-teal-ink',
        className,
      )}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgb(255_255_255_/_0.14),transparent_62%)]" />
      {leaf ? (
        <span className="relative block aspect-square w-[42%] max-w-[15rem] overflow-hidden rounded-full ring-4 ring-ivory-50/90">
          <Image
            src={leaf}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1024px) 15rem, 40vw"
            className="object-cover"
          />
        </span>
      ) : (
        <span className="relative flex aspect-square w-[30%] max-w-[9rem] items-center justify-center rounded-full bg-ivory-50">
          <Emblem className="w-[60%]" sizes="96px" />
        </span>
      )}
    </span>
  );
}
