import { Leaf } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { BrewingMeasure } from '@/lib/brewing';
import { cn } from '@/lib/cn';

/** Where a value falls on its measure's scale, from 0 to 1. */
function along(measure: BrewingMeasure, value: number): number {
  const { from, to } = measure.scale;
  return Math.min(1, Math.max(0, (value - from) / (to - from)));
}

/**
 * A measure's range on its ruler: a bar from the low to the high value (a single value keeps a
 * short bar around it). The bar is the full width, clipped to the range by two registered
 * properties, so moving to another tea's range slides and stretches it smoothly
 * (styles/globals.css, `.brew-ruler`).
 */
function Ruler({ measure, ends = true }: { measure: BrewingMeasure; ends?: boolean }) {
  const low = along(measure, measure.min);
  const high = along(measure, measure.max);
  const width = Math.max(high - low, 0.05);
  const start = Math.min(Math.max(low - (high - low < 0.05 ? width / 2 : 0), 0), 1 - width);
  const { from, to, ticks } = measure.scale;
  return (
    <span aria-hidden className="block min-w-0 flex-1 min-[30rem]:mt-3">
      <span
        className="brew-ruler relative block h-3"
        style={{ '--from': start, '--to': start + width } as CSSProperties}
      >
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-current opacity-20" />
        {ticks.map((tick) => (
          <span
            key={tick}
            className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-current opacity-30"
            style={{ left: `${((tick - from) / (to - from)) * 100}%` }}
          />
        ))}
        <span className="brew-ruler-range absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-[var(--gauge)]" />
      </span>
      {ends && measure.ends ? (
        <span className="mt-1.5 flex justify-between text-[0.6875rem] leading-none text-fg-muted">
          <span>{measure.ends[0]}</span>
          <span>{measure.ends[1]}</span>
        </span>
      ) : null}
    </span>
  );
}

/**
 * The amount of leaf as leaves, one a gram (up to six): full ones up to the amount, paler ones
 * across a range ("3–5 g"), the rest curled and faint. Changing tea opens or curls them one after
 * another (`.brew-leaf`).
 */
function Leaves({ measure, large }: { measure: BrewingMeasure; large: boolean }) {
  const slots = measure.scale.to;
  return (
    <span aria-hidden className="flex flex-1 gap-[3px] min-[30rem]:mt-2.5">
      {Array.from({ length: slots }, (_, index) => {
        const gram = index + 1;
        const state =
          gram <= Math.floor(measure.min)
            ? 'full'
            : gram <= Math.ceil(measure.max)
              ? 'part'
              : 'empty';
        return (
          <Leaf
            key={gram}
            data-state={state}
            strokeWidth={1.5}
            className={cn(
              'brew-leaf text-[var(--gauge)]',
              large ? 'size-[1.375rem]' : 'size-[1.05rem]',
            )}
            style={{ '--i': index } as CSSProperties}
          />
        );
      })}
    </span>
  );
}

/**
 * One measure's drawing alone (its leaves or its ruler), coloured by the nearest `--gauge`: for
 * a table of teas read against the same rulers (components/brand/tea-rulers.tsx), whose head
 * carries the scale's ends once.
 */
export function MeasureDrawing({
  measure,
  ends = true,
  large = false,
}: {
  measure: BrewingMeasure;
  ends?: boolean;
  large?: boolean;
}) {
  return measure.key === 'amount' ? (
    <Leaves measure={measure} large={large} />
  ) : (
    <Ruler measure={measure} ends={ends} />
  );
}

/**
 * The pack's brewing read as instruments rather than numbers alone (ADR-051): the amount of leaf
 * as leaves, the water's temperature and the time as ranges on fixed rulers, so the five teas can
 * be compared at a glance and the measures move when another tea is chosen. The words stay the
 * accessible content (`dt`/`dd`); the drawings are decoration. `colour` is the tea's pack colour
 * or the product family's ink.
 */
export function BrewingGauge({
  measures,
  colour,
  size = 'md',
  className,
}: {
  measures: BrewingMeasure[];
  colour: string;
  /** `lg` on the product page, where the gauge is a section of its own. */
  size?: 'md' | 'lg';
  className?: string;
}) {
  const large = size === 'lg';
  if (measures.length === 0) return null;
  return (
    <dl
      // A row a measure on phones (its value, then its drawing), a column each from 480 px.
      className={cn(
        'grid grid-cols-1 gap-x-6 gap-y-4 min-[30rem]:gap-y-5',
        measures.length >= 3
          ? 'min-[30rem]:grid-cols-3'
          : measures.length === 2
            ? 'min-[30rem]:grid-cols-2'
            : 'min-[30rem]:max-w-[18rem]',
        className,
      )}
      style={{ '--gauge': colour } as CSSProperties}
    >
      {measures.map((measure) => (
        <div key={measure.key} className="min-w-0">
          <dt className="text-[0.6875rem] font-semibold tracking-[0.08em] text-fg-subtle uppercase min-[30rem]:text-[0.75rem]">
            {measure.label}
          </dt>
          <dd className="mt-1 flex items-center gap-4 text-fg-muted min-[30rem]:block">
            <span
              className={cn(
                // Units keep their case ("5 g / 250 ml"), unlike the headline's capitals.
                'block w-[8.5rem] shrink-0 font-headline leading-tight text-fg [--heading-case:none] min-[30rem]:w-auto',
                large
                  ? 'text-[1.25rem] min-[30rem]:text-[1.75rem]'
                  : 'text-[1.0625rem] min-[30rem]:text-[1.25rem]',
              )}
            >
              {measure.value}
            </span>
            <MeasureDrawing measure={measure} large={large} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
