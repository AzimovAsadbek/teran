import Image, { type StaticImageData } from 'next/image';
import type { ReactNode } from 'react';
import { Notice } from '@/components/ui/notice';
import { cn } from '@/lib/cn';

/**
 * Header of the information pages on the reference's templates.
 * - `light` (help and policy pages): a pale band, 260 px, with the title in the soft serif and
 *   the intro centred under it, as the reference's policy pages.
 * - `brand` (journal, business): a brand-coloured band, or with `image` a full-bleed picture under a
 *   green veil, with a large soft-serif title and a short line, as its blog header.
 */
export function PageHeader({
  eyebrow,
  title,
  intro,
  image,
  tone = 'light',
  children,
}: {
  /** A small line above the title (brand tone only). */
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  /** A full-bleed picture (TERAN's own artwork) behind the words (brand tone). */
  image?: StaticImageData;
  tone?: 'light' | 'brand';
  children?: ReactNode;
}) {
  if (tone === 'light') {
    return (
      <header className="bg-ivory-100">
        <div className="container-page flex min-h-[12rem] flex-col items-center justify-center py-12 text-center sm:min-h-[16.25rem]">
          <h1 className="font-heading text-[2rem] leading-[1.1] text-balance text-fg sm:text-[2.5rem]">
            {title}
          </h1>
          {intro ? (
            <div className="mt-4 max-w-[46rem] text-[1.125rem] leading-normal text-balance text-fg-muted">
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
          <p className="text-[0.9375rem] font-semibold tracking-[0.06em] text-gold-300 uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 font-heading text-[2.75rem] leading-none text-balance text-ivory-50 sm:text-[4rem]">
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
    <Notice tone="warning" role="note" className="mb-10 max-w-3xl">
      {children}
    </Notice>
  );
}
