import { Info } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import type { Block, Section } from '@/content/types';
import { cn } from '@/lib/cn';

/** Renders text with [placeholders] marked, so unconfirmed details are visible at a glance. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\])/);
  return (
    <>
      {parts.map((part, index) =>
        /^\[[^\]]+\]$/.test(part) ? (
          <mark key={index} className="rounded-xs bg-warning-soft px-1 text-warning">
            {part}
          </mark>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}

export function Blocks({ blocks }: { blocks: readonly Block[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        if (typeof block === 'string') {
          return (
            <p key={index}>
              <RichText text={block} />
            </p>
          );
        }
        if ('list' in block) {
          return (
            <ul key={index} className="list-disc space-y-1.5 pl-5 marker:text-accent">
              {block.list.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <RichText text={item} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p
            key={index}
            className="flex gap-3 rounded-control border border-line bg-surface-muted px-4 py-3 text-body text-fg"
          >
            <Info aria-hidden className="mt-1 h-4 w-4 shrink-0 text-accent-fg" />
            <span>
              <RichText text={block.note} />
            </span>
          </p>
        );
      })}
    </>
  );
}

/** Policy-style document: optional table of contents beside numbered sections. */
export function LongForm({
  sections,
  tocLabel,
  numbered = false,
  aside,
}: {
  sections: readonly Section[];
  tocLabel?: string;
  numbered?: boolean;
  aside?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-10',
        tocLabel && 'lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-16',
      )}
    >
      {tocLabel ? (
        <nav aria-label={tocLabel} className="hidden lg:block">
          <div className="sticky top-24">
            <p className="text-eyebrow text-accent-fg">{tocLabel}</p>
            <ol className="mt-4 space-y-1 border-l border-line text-body-sm">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="-ml-px block border-l-2 border-transparent py-1.5 pl-4 text-fg-muted transition-colors hover:border-accent hover:text-fg"
                  >
                    {numbered ? `${index + 1}. ` : null}
                    {section.heading}
                  </a>
                </li>
              ))}
            </ol>
            {aside}
          </div>
        </nav>
      ) : null}
      <div className="max-w-3xl space-y-12">
        {sections.map((section, index) => (
          <section
            key={section.id}
            id={section.id}
            aria-labelledby={`${section.id}-title`}
            className="scroll-mt-24"
          >
            <h2 id={`${section.id}-title`} className="text-display-md text-jade-700">
              {numbered ? <span>{index + 1}. </span> : null}
              {section.heading}
            </h2>
            <div className="mt-4 space-y-4 text-body text-fg-muted sm:text-body-lg">
              <Blocks blocks={section.blocks} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
