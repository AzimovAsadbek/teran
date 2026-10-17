import Image, { type StaticImageData } from 'next/image';
import type { ReactNode } from 'react';
import { Notice } from '@/components/ui/notice';
import { cn } from '@/lib/cn';

/**
 * Header of the information pages on the reference's templates.
 * - `light` (help and policy pages): the reference's page banner: a warm pale band (320 px on
 *   phones, 260 px from 750 px) with the title in the soft serif, 40 px, in lower case; an intro,
 *   when a page has one, sits centred under it. `size="large"` is the store locator's taller band
 *   (400 px from 750 px) with its 18 px tagline, 600 px wide.
 * - `teal`: the same band in the brand's teal with white words (Tea 101); its tagline runs 1000 px
 *   wide.
 * - `brand` (journal, business): a brand-coloured band, or with `image` a full-bleed picture under a
 *   green veil, with a large soft-serif title and a short line, as its blog header.
 */
export function PageHeader({
  eyebrow,
  title,
  intro,
  image,
  tone = 'light',
  size = 'default',
  children,
}: {
  /** A small line above the title (brand tone only). */
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  /** A full-bleed picture (TERAN's own artwork) behind the words (brand tone). */
  image?: StaticImageData;
  tone?: 'light' | 'teal' | 'brand';
  /** The light band's height and intro (see above). */
  size?: 'default' | 'large';
  children?: ReactNode;
}) {
  if (tone === 'light' || tone === 'teal') {
    const teal = tone === 'teal';
    return (
      <header className={teal ? 'on-dark bg-[#107e84] text-white' : 'bg-[#f2f1e9]'}>
        <div
          className={cn(
            'flex min-h-[20rem] flex-col items-center justify-center px-4 py-10 text-center min-[46.875rem]:px-10',
            size === 'large' ? 'min-[46.875rem]:min-h-[25rem]' : 'min-[46.875rem]:min-h-[16.25rem]',
          )}
        >
          <h1
            className={cn(
              'font-heading text-[2.5rem] leading-10 text-balance lowercase hyphens-auto [overflow-wrap:anywhere]',
              teal ? 'text-white' : 'text-[#333]',
            )}
          >
            {title}
          </h1>
          {intro ? (
            <div
              className={cn(
                'text-balance',
                teal ? 'text-white' : 'text-[#333]',
                size === 'large'
                  ? 'mt-[0.7rem] text-[1.125rem] leading-[1.8rem] font-semibold'
                  : 'mt-4 max-w-[46rem] text-[1rem] leading-[1.6rem] font-medium',
                size === 'large' && (teal ? 'max-w-[62.5rem]' : 'max-w-[37.5rem]'),
              )}
            >
              {intro}
            </div>
          ) : null}
          {children}
        </div>
      </header>
    );
  }
  return (
    <header
      className={cn(
        'on-dark relative isolate overflow-hidden text-ivory-50',
        image ? 'bg-forest-950' : 'bg-forest-900',
      )}
    >
      {image ? (
        <>
          <Image
            src={image}
            alt=""
            fill
            loading="eager"
            fetchPriority="high"
            quality={60}
            sizes="(max-width: 767px) 75vw, 100vw"
            className="-z-20 object-cover"
          />
          <span aria-hidden className="absolute inset-0 -z-10 bg-forest-950/50" />
        </>
      ) : null}
      <div className="container-page flex min-h-[16.25rem] flex-col items-center justify-center py-12 text-center lg:min-h-[25rem]">
        {eyebrow ? (
          <p className="text-[0.9375rem] font-semibold tracking-[0.06em] text-ivory-50 uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 font-heading text-[2.75rem] leading-none text-balance text-ivory-50 hyphens-auto [overflow-wrap:anywhere] sm:text-[4rem]">
          {title}
        </h1>
        {intro ? (
          <div className="mt-4 max-w-[62.5rem] text-[1.125rem] leading-[1.6] font-semibold text-balance text-ivory-50">
            {intro}
          </div>
        ) : null}
        {children}
      </div>
    </header>
  );
}

/** Banner on documents that are still drafts awaiting TERAN's (and a lawyer's) review. */
export function DraftNotice({ children }: { children: ReactNode }) {
  return (
    <Notice tone="warning" role="note" className="mb-6">
      {children}
    </Notice>
  );
}
