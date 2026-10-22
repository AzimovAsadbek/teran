import { Suspense, type ReactNode } from 'react';
import { Emblem } from '@/components/brand/logo';
import { cn } from '@/lib/cn';

const CARD =
  'mx-auto w-full max-w-[34rem] self-center rounded-[1.5rem] shadow-[0_1px_2px_rgb(0_0_0_/_0.04),0_24px_48px_-28px_rgb(0_0_0_/_0.3)] ring-1 ring-black/[0.06]';

/** The two columns from 1024 px: the tea a little wider than the card, which fills its column. */
const COLUMNS = 'lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start lg:gap-10';

/**
 * One of TERAN's teas beside the card: a band above it on smaller screens; from 1024 px a
 * column as tall as the screen allows, held in view (under the stuck header) beside a long form.
 */
const ASIDE =
  'relative mb-6 aspect-[16/7] overflow-hidden rounded-[1.25rem] bg-surface-muted lg:sticky lg:top-[10.5rem] lg:mb-0 lg:aspect-auto lg:h-[min(calc(100svh-12.5rem),46rem)] lg:min-h-[32rem] lg:rounded-[1.5rem]';

/**
 * The sign-in, registration and password pages (and the newsletter's unsubscribe page): a white
 * card on TERAN's warm paper with the emblem, the title in the headings' serif, a line under it,
 * the form, and the way to the other page under a rule. With `aside` (AuthTeaPanel), one of
 * TERAN's own teas stands beside the card as a living picture (ADR-053); it streams in on its
 * own, so the form is never kept waiting for it.
 */
export function AuthCard({
  title,
  intro,
  children,
  footer,
  aside,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="bg-paper">
      <div className={cn('container-frame py-6 min-[46.875rem]:py-10 lg:py-14', aside && COLUMNS)}>
        {aside ? (
          <div className={ASIDE}>
            <Suspense fallback={null}>{aside}</Suspense>
          </div>
        ) : null}
        <div
          className={cn(
            CARD,
            'bg-surface px-6 py-8 min-[35.5rem]:px-10 min-[35.5rem]:py-11 xl:px-14 xl:py-14',
            aside && 'lg:max-w-none',
          )}
        >
          <Emblem className="w-11" sizes="44px" />
          <h1 className="mt-6 font-heading text-[2.25rem] leading-[1.1] text-balance text-fg min-[35.5rem]:text-[2.75rem]">
            {title}
          </h1>
          {intro ? (
            <div className="mt-3 text-[1.0625rem] leading-relaxed text-fg-muted">{intro}</div>
          ) : null}
          <div className="mt-8">{children}</div>
          {footer ? (
            <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 text-body text-fg-muted">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AuthCardSkeleton({ aside = false }: { aside?: boolean }) {
  return (
    <div className="bg-paper" aria-hidden>
      <div className={cn('container-frame py-6 min-[46.875rem]:py-10 lg:py-14', aside && COLUMNS)}>
        {aside ? <div className={ASIDE} /> : null}
        <div
          className={cn(
            CARD,
            'h-[30rem] animate-pulse bg-surface/70 motion-reduce:animate-none',
            aside && 'lg:max-w-none',
          )}
        />
      </div>
    </div>
  );
}
