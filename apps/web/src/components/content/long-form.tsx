import { Info } from 'lucide-react';
import { Fragment } from 'react';
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
 * A policy document on the reference's page template: 16 px text in one column, each section
 * under either a bold line (`bold`: privacy and terms) or a large teal condensed heading (`teal`:
 * as the reference's shipping and returns page).
 */
export function LongForm({
  sections,
  headings = 'bold',
}: {
  sections: readonly Section[];
  headings?: 'bold' | 'teal';
}) {
  return (
    <div className={cn(headings === 'teal' ? 'space-y-10' : 'space-y-4')}>
      {sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          aria-labelledby={`${section.id}-title`}
          className="scroll-mt-24"
        >
          <h2
            id={`${section.id}-title`}
            className={
              headings === 'teal'
                ? 'mb-2 font-headline text-[2rem] leading-8 text-[#00a6a5] [--heading-case:none]'
                : 'font-bold'
            }
          >
            {section.heading}
          </h2>
          <div className={cn('space-y-4', headings === 'teal' ? 'mt-10' : 'mt-4')}>
            <Blocks blocks={section.blocks} />
          </div>
        </section>
      ))}
    </div>
  );
}
