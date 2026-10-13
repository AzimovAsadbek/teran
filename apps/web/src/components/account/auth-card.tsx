import type { ReactNode } from 'react';
import { Emblem } from '@/components/brand/logo';

/** Centered card used by the sign-in, registration and password pages. */
export function AuthCard({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="bg-ivory-100 px-4 py-14 sm:py-20">
      <div className="mx-auto max-w-lg rounded-[var(--radius-panel)] bg-white p-6 shadow-soft sm:p-10">
        <span aria-hidden className="mx-auto block h-14 w-14">
          <Emblem className="w-full" />
        </span>
        <h1 className="text-display-md mt-4 text-center text-forest-900">{title}</h1>
        {intro ? <div className="mt-3 text-center text-ink-700">{intro}</div> : null}
        <div className="mt-8">{children}</div>
        {footer ? (
          <div className="mt-8 space-y-2 border-t border-ivory-200 pt-6 text-center text-sm text-ink-700">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AuthCardSkeleton() {
  return (
    <div className="bg-ivory-100 px-4 py-14 sm:py-20" aria-hidden>
      <div className="mx-auto h-[28rem] max-w-lg animate-pulse rounded-[var(--radius-panel)] bg-white/70 motion-reduce:animate-none" />
    </div>
  );
}
