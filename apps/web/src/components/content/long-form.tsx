import { Info } from 'lucide-react';
import { Fragment } from 'react';
import type { Block, Section } from '@/content/types';

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
            <ul key={index} className="list-disc pl-6">
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

/**
 * A policy document's sections (ADR-051): each under a heading in TERAN's serif, well clear of
 * the section before and close to its own text, so the headings can be scanned; lists keep the
 * brand's teal marks.
 */
export function LongForm({ sections }: { sections: readonly Section[] }) {
  return (
    <div>
      {sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          aria-labelledby={`${section.id}-title`}
          className="mt-10 scroll-mt-28 first:mt-6"
        >
          <h2
            id={`${section.id}-title`}
            className="font-heading text-[1.375rem] leading-snug text-balance text-fg sm:text-[1.5rem]"
          >
            {section.heading}
          </h2>
          <div className="mt-3 space-y-4 [&_ul]:marker:text-forest-900">
            <Blocks blocks={section.blocks} />
          </div>
        </section>
      ))}
    </div>
  );
}
