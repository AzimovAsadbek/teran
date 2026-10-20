import Image from 'next/image';
import type { CSSProperties } from 'react';
import { MeasureDrawing } from '@/components/brand/brewing-gauge';
import { PACK_IMAGES } from '@/components/brand/pack-images';
import { PACK_COLOURS, type TeaCode } from '@/content/brand';
import { Link } from '@/i18n/navigation';
import type { BrewingMeasure } from '@/lib/brewing';

export interface RulerTea {
  code: TeaCode;
  href: string;
  measures: BrewingMeasure[];
}

/** The order a cup is made in, as the gauge's. */
const ORDER: BrewingMeasure['key'][] = ['amount', 'temperature', 'time'];

/**
 * TERAN's teas read against the same rulers (ADR-051, "five teas, one ruler"): a row a tea — its
 * pouch and its code in the pack's colour, linking to its page — and its amount, water and time
 * drawn in that colour, so the differences the packs state show at a glance. The words are the
 * content (a `dl` a tea, its labels on phones); the column heads with the rulers' ends, shown
 * once from 768 px, repeat the labels for the eye only.
 */
export function TeaRulers({ teas, title, id }: { teas: RulerTea[]; title: string; id: string }) {
  // Each column on the widest scale any tea needs, so every row is read against the same ruler.
  const columns = ORDER.flatMap((key) => {
    const found = teas.flatMap((tea) => tea.measures.filter((measure) => measure.key === key));
    const widest = found.reduce<BrewingMeasure | null>(
      (wide, measure) => (!wide || measure.scale.to > wide.scale.to ? measure : wide),
      null,
    );
    return widest ? [widest] : [];
  });
  if (columns.length === 0 || teas.length === 0) return null;
  // The amount's words are the longest ("3–5 g / 250 ml"): its column is a little wider.
  const template = {
    gridTemplateColumns: columns
      .map((column) => (column.key === 'amount' ? 'minmax(0,1.35fr)' : 'minmax(0,1fr)'))
      .join(' '),
  };

  return (
    <section aria-labelledby={id}>
      <h3 id={id} className="font-heading text-[1.5rem] leading-tight text-fg sm:text-[1.75rem]">
        {title}
      </h3>
      <div
        aria-hidden
        className="mt-5 hidden border-b border-line pb-3 md:grid md:grid-cols-[9.5rem_minmax(0,1fr)] md:gap-x-8"
      >
        <span />
        <span className="grid gap-x-6" style={template}>
          {columns.map((column) => (
            <span key={column.key} className="min-w-0">
              <span className="block text-[0.75rem] font-semibold tracking-[0.08em] text-fg-subtle uppercase">
                {column.label}
              </span>
              {column.ends ? (
                <span className="mt-1.5 flex justify-between text-[0.6875rem] leading-none text-fg-muted">
                  <span>{column.ends[0]}</span>
                  <span>{column.ends[1]}</span>
                </span>
              ) : null}
            </span>
          ))}
        </span>
      </div>
      <ul className="mt-3 border-t border-line md:mt-0 md:border-t-0">
        {teas.map((tea) => (
          <li
            key={tea.code}
            className="grid grid-cols-1 gap-y-3 border-b border-line py-4 md:grid-cols-[9.5rem_minmax(0,1fr)] md:items-center md:gap-x-8"
            style={{ '--gauge': PACK_COLOURS[tea.code] } as CSSProperties}
          >
            <Link
              href={tea.href}
              className="group/tea flex items-center gap-3 self-start rounded-lg md:self-center"
            >
              <Image
                src={PACK_IMAGES[tea.code]}
                alt=""
                sizes="2.75rem"
                className="h-auto w-11 shrink-0 transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover/tea:-rotate-3"
              />
              <span
                className="font-headline text-[1.375rem] leading-none font-bold underline-offset-4 group-hover/tea:underline"
                style={{ color: PACK_COLOURS[tea.code] }}
              >
                <span className="sr-only">TERAN </span>
                {tea.code}
              </span>
            </Link>
            <dl className="grid gap-x-4 sm:gap-x-6" style={template}>
              {columns.map((column) => {
                const measure = tea.measures.find((candidate) => candidate.key === column.key);
                return (
                  <div key={column.key} className="min-w-0">
                    <dt className="text-[0.6875rem] font-semibold tracking-[0.08em] text-fg-subtle uppercase md:sr-only">
                      {column.label}
                    </dt>
                    <dd className="mt-1 md:mt-0">
                      <span className="block font-headline text-[0.9375rem] leading-tight whitespace-nowrap text-fg [--heading-case:none] sm:text-[1.125rem]">
                        {measure?.value ?? '—'}
                      </span>
                      {measure ? (
                        <MeasureDrawing
                          measure={{ ...measure, scale: column.scale }}
                          ends={false}
                        />
                      ) : null}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}
