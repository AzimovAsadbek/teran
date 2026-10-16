import type { IllustrationKey } from '@teran/contracts';
import type { ReactNode } from 'react';
import { BotanicalLayer, type BotanicalScene } from '@/components/brand/botanical';
import { TeaTypeArt } from '@/components/brand/illustrations';
import { WavePattern } from '@/components/brand/ornaments';
import { Notice } from '@/components/ui/notice';

/**
 * Header for information pages: eyebrow, serif title and intro under the pack's seigaiha waves,
 * with the tea-type medallion in gold rings on wide screens (always whole, never cropped).
 */
export function PageHeader({
  eyebrow,
  title,
  intro,
  illustration = 'green',
  atmosphere,
  children,
}: {
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  illustration?: IllustrationKey;
  /** Botanical scene behind editorial pages (About, Journal); forms and legal pages stay plain. */
  atmosphere?: BotanicalScene;
  children?: ReactNode;
}) {
  return (
    <header className="relative isolate border-b border-line-subtle">
      <WavePattern className="inset-x-0 top-0 -z-10 h-28 opacity-25" />
      {atmosphere ? <BotanicalLayer scene={atmosphere} className="-z-10" /> : null}
      <div className="container-page grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {eyebrow ? <p className="text-eyebrow text-accent-fg">{eyebrow}</p> : null}
          <h1 className="mt-3 text-display-lg text-forest-900">{title}</h1>
          {intro ? <div className="mt-5 max-w-2xl text-body-lg text-fg-muted">{intro}</div> : null}
          {children}
        </div>
        <div
          aria-hidden
          className="relative hidden aspect-square w-full max-w-[14rem] justify-self-end lg:col-span-4 lg:block"
        >
          <span className="absolute inset-0 rounded-full border border-gold-500/30" />
          <span className="absolute inset-[8%] rounded-full border border-gold-500/20" />
          <span className="absolute inset-[17%]">
            <TeaTypeArt kind={illustration} />
          </span>
        </div>
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
