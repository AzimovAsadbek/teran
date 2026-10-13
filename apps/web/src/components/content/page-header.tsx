import type { IllustrationKey } from '@teran/contracts';
import type { ReactNode } from 'react';
import { TeaTypeArt } from '@/components/brand/illustrations';

/** Header for information pages: eyebrow, serif title, intro and a quiet botanical accent. */
export function PageHeader({
  eyebrow,
  title,
  intro,
  illustration = 'green',
  children,
}: {
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  illustration?: IllustrationKey;
  children?: ReactNode;
}) {
  return (
    <header className="relative overflow-hidden bg-ivory-100">
      <div className="container-page relative z-10 py-14 sm:py-20">
        <div className="max-w-3xl">
          {eyebrow ? <p className="text-eyebrow text-gold-700">{eyebrow}</p> : null}
          <h1 className="text-display-xl mt-3 text-forest-900">{title}</h1>
          {intro ? (
            <div className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-700 sm:text-xl">
              {intro}
            </div>
          ) : null}
          {children}
        </div>
      </div>
      <span
        aria-hidden
        className="absolute top-1/2 -right-16 hidden h-80 w-80 -translate-y-1/2 opacity-80 md:block lg:right-8"
      >
        <TeaTypeArt kind={illustration} />
      </span>
      <div aria-hidden className="rule-gold absolute inset-x-0 bottom-0" />
    </header>
  );
}

/** Banner on documents that are still drafts awaiting TERAN's (and a lawyer's) review. */
export function DraftNotice({ children }: { children: ReactNode }) {
  return (
    <p
      role="note"
      className="mb-10 rounded-[var(--radius-card)] border border-gold-300 bg-gold-100 px-5 py-4 text-sm leading-relaxed text-gold-800"
    >
      {children}
    </p>
  );
}
