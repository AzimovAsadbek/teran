import Image, { type StaticImageData } from 'next/image';
import type { ReactNode } from 'react';
import { Notice } from '@/components/ui/notice';
import { cn } from '@/lib/cn';

/**
 * The opening of an information page, in the home page's type (ADR-051): the title in the soft
 * serif in sentence case (never forced to lower case: in Russian and Uzbek that reads as a
 * typo), left-aligned at the page's margin, as the largest words on the page, with a short
 * standfirst at a reading measure under it.
 * - `light` (help and policy pages, the store locator): on the pale grey of quiet surfaces.
 *   `size="large"` gives the title more room.
 * - `teal`: the same on the brand's deep teal with white words.
 * - `brand` (journal): a brand-coloured band, or with `image` a full-bleed picture under a green
 *   veil, with a large title and a short line.
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
  /** A larger title (see above). */
  size?: 'default' | 'large';
  children?: ReactNode;
}) {
  if (tone === 'light' || tone === 'teal') {
    const teal = tone === 'teal';
    return (
      <header className={teal ? 'on-dark bg-teal-ink text-ivory-50' : 'bg-ivory-100'}>
        <div className="container-page pt-10 pb-10 sm:pt-14 sm:pb-12 lg:pt-16 lg:pb-14">
          <h1
            className={cn(
              'max-w-[24ch] font-heading leading-[1.05] text-balance hyphens-auto [overflow-wrap:anywhere]',
              size === 'large'
                ? 'text-[clamp(2.5rem,1.6rem+3.4vw,4.5rem)]'
                : 'text-[clamp(2.25rem,1.6rem+2.6vw,3.75rem)]',
              teal ? 'text-ivory-50' : 'text-fg',
            )}
          >
            {title}
          </h1>
          {intro ? (
            <div
              className={cn(
                'mt-4 max-w-[40rem] text-[1.125rem] leading-[1.6] text-pretty sm:text-[1.25rem]',
                teal ? 'text-ivory-50/90' : 'text-fg-muted',
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
