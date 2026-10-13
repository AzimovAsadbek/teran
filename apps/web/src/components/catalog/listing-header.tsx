import type { IllustrationKey } from '@teran/contracts';
import { TeaTypeArt } from '@/components/brand/illustrations';
import { DemoNotice } from '@/components/ui/demo-notice';

/** Rounded listing banner (the reference's category banner, in TERAN's palette). */
export function ListingHeader({
  eyebrow,
  title,
  description,
  illustrationKey,
}: {
  eyebrow?: string;
  title: string;
  description?: string | null;
  illustrationKey?: IllustrationKey | null;
}) {
  return (
    <>
      <header className="relative mt-5 mb-8 overflow-hidden rounded-[var(--radius-panel)] bg-ivory-100 px-6 py-10 sm:px-10 sm:py-12">
        <div className="relative z-10 max-w-2xl">
          {eyebrow ? <p className="text-eyebrow text-gold-700">{eyebrow}</p> : null}
          <h1 className="text-display-lg mt-2 text-forest-900">{title}</h1>
          {description ? <p className="mt-3 text-lg text-ink-700">{description}</p> : null}
        </div>
        <span
          aria-hidden
          className="absolute -top-6 -right-6 hidden h-52 w-52 opacity-90 sm:block lg:right-10"
        >
          <TeaTypeArt kind={illustrationKey ?? 'green'} />
        </span>
      </header>
      <DemoNotice className="-mt-4 mb-8" />
    </>
  );
}

export function ListingHeaderSkeleton() {
  return (
    <div
      aria-hidden
      className="mt-5 mb-8 h-44 animate-pulse rounded-[var(--radius-panel)] bg-ivory-100 motion-reduce:animate-none"
    />
  );
}
