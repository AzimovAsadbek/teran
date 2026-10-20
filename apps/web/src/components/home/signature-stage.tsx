'use client';

import type { ImageDto } from '@teran/contracts';
import { ArrowRight, Check, Leaf, Loader2, MapPin, ShoppingBag } from 'lucide-react';
import Image, { type StaticImageData } from 'next/image';
import { useLocale } from 'next-intl';
import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { ProductFilm } from '@/components/catalog/product-film';
import { BrewingGauge } from '@/components/brand/brewing-gauge';
import { ProductImage } from '@/components/catalog/product-image';
import type { TeaCode } from '@/content/brand';
import { cartActions, useCart } from '@/features/cart/cart-store';
import { Link } from '@/i18n/navigation';
import type { BrewingMeasure } from '@/lib/brewing';
import { cn } from '@/lib/cn';
import { useScrollScene } from '@/lib/scroll-scene';
import pack8009 from '../../../public/brand/packs/8009.webp';
import pack8800 from '../../../public/brand/packs/8800.webp';
import pack8830 from '../../../public/brand/packs/8830.webp';
import packG8810 from '../../../public/brand/packs/g8810.webp';
import packXc2025 from '../../../public/brand/packs/xc2025.webp';

const PACKS: Record<TeaCode, StaticImageData> = {
  XC2025: packXc2025,
  G8810: packG8810,
  '8800': pack8800,
  '8830': pack8830,
  '8009': pack8009,
};

export interface SignatureTea {
  code: TeaCode;
  slug: string;
  name: string;
  /** The pack's own colour (content/brand PACK_COLOURS). */
  colour: string;
  origin: string | null;
  description: string | null;
  notes: string | null;
  /** The pack's brewing as measures (lib/brewing). */
  measures: BrewingMeasure[];
  pack: string | null;
  orderLabel: string;
  addLabel: string;
  /** With prices only. */
  price: string | null;
  variantId: string | null;
  leaves: ImageDto | null;
  cup: ImageDto | null;
}

/**
 * The signature range as one stage, a tasting: the chosen tea's pack standing on its own colour,
 * its dry leaf poured in front of it and its brewed cup beside it — the tea, the leaf and the cup
 * in one picture — and, beside the stage, what TERAN says about it and how it is brewed, as
 * measures that move from one tea to the next. The five codes form a tab list (arrow keys, Home,
 * End). Choosing a tea is the brewing language's focal moment (ADR-051): its colour STEEPS into
 * the field from the cup outward, the last pack leaves as the next is set down, the dry leaf
 * UNFURLS, the cup fills from below (POUR), the name comes into focus, and the leaf, temperature
 * and time gauges glide to the new tea's values. With reduced motion everything changes at once.
 * Scrolled into view, the stage opens from an inset frame to its full size (lib/scroll-scene).
 */
export function SignatureStage({
  teas,
  heading,
  text,
  labels,
}: {
  teas: SignatureTea[];
  heading: string;
  text: string;
  labels: {
    tabs: string;
    view: string;
    order: string;
    add: string;
    adding: string;
    added: string;
    notes: string;
    origin: string;
  };
}) {
  const baseId = useId();
  const locale = useLocale();
  const [active, setActive] = useState(0);
  // The field's colours, newest last: each new tea's colour steeps in over the one before it.
  const [fields, setFields] = useState<{ id: number; colour: string }[]>(() => [
    { id: 0, colour: teas[0]!.colour },
  ]);
  const fieldId = useRef(1);
  // A tea's leaf, cup and cup film load once it is shown or its tab is pointed at or focused, not
  // all five with the page (the packs, light and always there, carry the change between teas).
  const [seen, setSeen] = useState<ReadonlySet<number>>(() => new Set([0]));
  const reveal = (index: number) =>
    setSeen((current) => (current.has(index) ? current : new Set(current).add(index)));
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const sectionRef = useRef<HTMLElement>(null);
  const tea = teas[active]!;
  const { pendingKey } = useCart();
  const pending = tea.variantId !== null && pendingKey === `add:${tea.variantId}`;
  const [added, setAdded] = useState<string | null>(null);

  useScrollScene(sectionRef, ({ gsap, root }) => {
    const q = gsap.utils.selector(root);
    gsap.fromTo(
      q('[data-signature-frame]'),
      { clipPath: 'inset(9% 7% 9% 7% round 2.5rem)' },
      {
        clipPath: 'inset(0% 0% 0% 0% round 2rem)',
        ease: 'none',
        scrollTrigger: { trigger: root, start: 'top 85%', end: 'top 35%', scrub: 0.5 },
      },
    );
    gsap.fromTo(
      q('[data-signature-packs]'),
      { yPercent: 10 },
      {
        yPercent: -4,
        ease: 'none',
        scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
      },
    );
  });

  function choose(index: number, focus = false) {
    reveal(index);
    if (index !== active) {
      const colour = teas[index]!.colour;
      // Keep the two below it, so a quick second choice still steeps over a full field.
      setFields((current) => [...current.slice(-2), { id: fieldId.current++, colour }]);
    }
    setActive(index);
    if (focus) tabRefs.current[index]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const last = teas.length - 1;
    const next =
      event.key === 'ArrowRight'
        ? (active + 1) % teas.length
        : event.key === 'ArrowLeft'
          ? (active - 1 + teas.length) % teas.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    choose(next, true);
  }

  async function add() {
    if (!tea.variantId || pending) return;
    if (await cartActions.add(tea.variantId, 1, locale)) {
      setAdded(tea.variantId);
      window.setTimeout(() => setAdded(null), 1800);
    }
  }

  return (
    <section
      ref={sectionRef}
      aria-labelledby={`${baseId}-title`}
      className="container-page py-12 min-[46.875rem]:py-16 lg:py-24"
    >
      <div className="grid grid-cols-1 items-center gap-x-12 gap-y-8 lg:grid-cols-12">
        {/* The stage. */}
        <div className="min-w-0 lg:col-span-7">
          <div
            data-signature-frame
            className="relative isolate aspect-square overflow-hidden rounded-[2rem] min-[30rem]:aspect-[6/5]"
          >
            {/* The field: the chosen tea's colour, steeping in from the cup (lower right). */}
            {fields.map((field, index) => (
              <span
                key={field.id}
                aria-hidden
                className={cn('absolute inset-0 -z-20', index > 0 && 'steep-in')}
                style={
                  {
                    backgroundColor: `color-mix(in oklab, ${field.colour} 16%, var(--color-paper))`,
                    '--steep-at': '80% 80%',
                  } as CSSProperties
                }
              />
            ))}
            {/* Light falling on the field from the upper left. */}
            <span
              aria-hidden
              className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_60%_at_30%_20%,rgb(255_255_255_/_0.65),transparent_70%)]"
            />
            {teas.map((entry, index) => {
              const state = index === active ? 'in' : index < active ? 'before' : 'after';
              return (
                <div
                  key={entry.code}
                  aria-hidden={index !== active}
                  data-state={state}
                  className="group/tea absolute inset-0"
                >
                  {/* The dry leaf, poured in front (its white ground drops into the field); a
                      new tea's leaf UNFURLS into place, the last one curls away. */}
                  {entry.leaves && seen.has(index) ? (
                    <div className="absolute bottom-[-7%] left-[-6%] w-[72%] mix-blend-multiply transition-[opacity,rotate,scale] duration-[900ms] ease-[var(--ease-out-expo)] [mask-image:radial-gradient(closest-side,#000_72%,transparent)] min-[30rem]:w-[66%] group-data-[state=after]/tea:scale-[0.82] group-data-[state=after]/tea:rotate-[22deg] group-data-[state=after]/tea:opacity-0 group-data-[state=before]/tea:scale-[0.82] group-data-[state=before]/tea:-rotate-[22deg] group-data-[state=before]/tea:opacity-0">
                      {/* The photograph's near-white ground lifted to white, so the multiply
                          leaves no edge. */}
                      <div className="aspect-square brightness-[1.05] contrast-[1.04]">
                        <ProductImage
                          image={entry.leaves}
                          name={entry.name}
                          sizes="(min-width: 1024px) 34vw, 66vw"
                          decorative
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
            {/* The packs, above the leaves, below the cup. */}
            <div data-signature-packs className="absolute inset-0">
              {teas.map((entry, index) => {
                const state = index === active ? 'in' : index < active ? 'before' : 'after';
                return (
                  <div
                    key={entry.code}
                    data-state={state}
                    className="absolute top-[11%] left-[24%] h-[68%] transition-[opacity,translate,rotate] duration-700 ease-[var(--ease-out-expo)] data-[state=after]:translate-x-[18%] data-[state=after]:rotate-6 data-[state=after]:opacity-0 data-[state=before]:-translate-x-[24%] data-[state=before]:-rotate-6 data-[state=before]:opacity-0 data-[state=in]:-rotate-3 min-[30rem]:top-[9%] min-[30rem]:left-[34%] min-[30rem]:h-[74%]"
                  >
                    <Image
                      src={PACKS[entry.code]}
                      alt=""
                      sizes="(min-width: 1024px) 22vw, 40vw"
                      className="h-full w-auto drop-shadow-[0_28px_26px_rgb(32_24_8_/_0.32)]"
                    />
                  </div>
                );
              })}
            </div>
            {/* The brewed cup, on a saucer-white ring. */}
            {teas.map((entry, index) =>
              entry.cup && seen.has(index) ? (
                <div
                  key={entry.code}
                  aria-hidden={index !== active}
                  className={cn(
                    'absolute right-[4%] bottom-[5%] w-[36%] transition-opacity duration-700 ease-[var(--ease-standard)] min-[30rem]:right-[5%] min-[30rem]:bottom-[6%] min-[30rem]:w-[34%]',
                    // The chosen cup above the last, which fades out beneath it.
                    index === active ? 'z-[2] opacity-100' : 'z-[1] opacity-0',
                  )}
                >
                  {/* The chosen tea's cup fills from below (POUR) inside the saucer's ring. */}
                  <div className="relative aspect-square overflow-hidden rounded-full shadow-[0_20px_40px_-18px_rgb(32_24_8_/_0.55)] ring-[6px] ring-white">
                    <div className={cn('absolute inset-0', index === active && 'pour-in')}>
                      <ProductImage image={entry.cup} name={entry.name} sizes="20rem" decorative />
                      {entry.cup.film?.cardSrc ? (
                        <ProductFilm film={entry.cup.film} size="card" active={index === active} />
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null,
            )}
          </div>
        </div>

        {/* What TERAN says about the chosen tea. */}
        <div className="min-w-0 lg:col-span-5">
          <h2
            id={`${baseId}-title`}
            className="font-heading text-[2.25rem] leading-[1.1] text-balance text-fg min-[46.875rem]:text-[2.75rem]"
          >
            {heading}
          </h2>
          <p className="mt-3 text-[1.0625rem] leading-relaxed text-fg-muted">{text}</p>

          <div
            role="tablist"
            aria-label={labels.tabs}
            onKeyDown={onKeyDown}
            // All five in view on every screen (two rows on a phone), never scrolled away.
            className="mt-7 flex flex-wrap gap-2 py-1"
          >
            {teas.map((entry, index) => {
              const on = index === active;
              return (
                <button
                  key={entry.code}
                  ref={(element) => {
                    tabRefs.current[index] = element;
                  }}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-${entry.code}`}
                  aria-selected={on}
                  aria-controls={`${baseId}-panel`}
                  tabIndex={on ? 0 : -1}
                  onClick={() => choose(index)}
                  onPointerEnter={() => reveal(index)}
                  onFocus={() => reveal(index)}
                  className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border-[1.5px] px-4 font-headline text-[1.0625rem] tracking-[0.02em] transition-[background-color,color,border-color] duration-300 ease-[var(--ease-out-expo)]"
                  style={
                    on
                      ? { backgroundColor: entry.colour, borderColor: entry.colour, color: '#fff' }
                      : { borderColor: `color-mix(in oklab, ${entry.colour} 45%, transparent)` }
                  }
                >
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 rounded-full ring-2 ring-white/70"
                    style={{ backgroundColor: on ? '#fff' : entry.colour }}
                  />
                  {entry.code}
                </button>
              );
            })}
          </div>

          <div
            id={`${baseId}-panel`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-${tea.code}`}
            className="mt-7"
          >
            {/* The name comes into focus; the words about it follow at once. */}
            <p
              key={`name-${tea.code}`}
              className="clear-in font-headline text-[2.5rem] leading-none tracking-[0.01em] uppercase min-[46.875rem]:text-[3.25rem]"
              style={{ color: tea.colour }}
            >
              {tea.name}
            </p>
            <div key={tea.code} className="animate-fade-in">
              {tea.origin || tea.pack ? (
                <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.9375rem] text-fg-muted">
                  {tea.origin ? (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin aria-hidden className="h-4 w-4" />
                      <span className="sr-only">{labels.origin}: </span>
                      {tea.origin}
                    </span>
                  ) : null}
                  {tea.pack ? <span>· {tea.pack}</span> : null}
                  {tea.price ? <span className="font-semibold text-fg">· {tea.price}</span> : null}
                </p>
              ) : null}
              {tea.description ? (
                <p className="mt-4 text-[1.0625rem] leading-relaxed text-fg">{tea.description}</p>
              ) : null}
              {tea.notes ? (
                <figure className="mt-5">
                  <figcaption className="flex items-center gap-2 text-[0.8125rem] font-semibold tracking-[0.08em] text-fg-subtle uppercase">
                    <Leaf aria-hidden className="h-4 w-4" style={{ color: tea.colour }} />
                    {labels.notes}
                  </figcaption>
                  <blockquote className="mt-1.5 font-heading text-[1.125rem] leading-snug whitespace-pre-line text-fg min-[46.875rem]:text-[1.25rem]">
                    {tea.notes}
                  </blockquote>
                </figure>
              ) : null}
            </div>
            {/* How it is brewed, as measures that glide to each tea's own values. */}
            <BrewingGauge
              measures={tea.measures}
              colour={tea.colour}
              className="mt-6 border-t border-line pt-5"
            />
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href={`/products/${tea.slug}`}
                className="pill-hover inline-flex h-12 items-center gap-2 rounded-full bg-forest-900 px-7 text-[1rem] font-semibold text-ivory-50"
              >
                {labels.view}
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
              {tea.variantId ? (
                <button
                  type="button"
                  onClick={() => void add()}
                  aria-label={tea.addLabel}
                  aria-busy={pending || undefined}
                  className="outline-hover inline-flex h-12 items-center gap-2 rounded-full border-[1.5px] border-forest-900 px-6 text-[1rem] font-semibold text-forest-900"
                >
                  {pending ? (
                    <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                  ) : added === tea.variantId ? (
                    <Check aria-hidden className="h-4 w-4" />
                  ) : (
                    <ShoppingBag aria-hidden className="h-4 w-4" />
                  )}
                  {pending ? labels.adding : added === tea.variantId ? labels.added : labels.add}
                </button>
              ) : tea.price === null ? (
                <Link
                  href={`/contact?tea=${encodeURIComponent(tea.slug)}`}
                  aria-label={tea.orderLabel}
                  className="outline-hover inline-flex h-12 items-center rounded-full border-[1.5px] border-forest-900 px-6 text-[1rem] font-semibold text-forest-900"
                >
                  {labels.order}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
