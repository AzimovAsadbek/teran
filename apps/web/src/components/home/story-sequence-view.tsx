'use client';

import type { ImageDto, PublicVisualDto } from '@teran/contracts';
import { ArrowRight } from 'lucide-react';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { ProductImage } from '@/components/catalog/product-image';
import { LoopingFilm } from '@/components/content/looping-film';
import { VisualPicture } from '@/components/content/visual-picture';
import { PACK_COLOURS, type TeaCode } from '@/content/brand';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { filmPosition } from '@/lib/visuals';

type StoryMedia =
  | { kind: 'visual'; visual: PublicVisualDto }
  | { kind: 'leaves'; leaves: { code: string; image: ImageDto }[] };

export interface StoryStep {
  key: string;
  title: string;
  text: string;
  media: StoryMedia | null;
}

/**
 * One step's picture: a page picture (with its film while it is the one shown) or the leaves. The
 * story's frames are upright, so a page picture shows its taller crop and film (the ones the
 * banners use on phones) wherever there is one, at every width.
 */
function Media({
  media,
  playing,
  frame,
}: {
  media: StoryMedia;
  playing: boolean;
  /** Where the picture shows: the framed window (wide screens) or above its step (phones). */
  frame: 'window' | 'step';
}) {
  if (media.kind === 'visual') {
    const { visual } = media;
    const film = visual.mobileVideo ?? visual.video;
    const upright: PublicVisualDto = {
      ...visual,
      image: visual.mobile ?? visual.image,
      mobile: null,
    };
    return (
      <>
        <span className="absolute inset-0 -z-30">
          <VisualPicture
            visual={upright}
            sizes={coverSizes(upright.image.width / upright.image.height, frame)}
            position={filmPosition(film)}
          />
        </span>
        {playing && film ? <LoopingFilm film={film} /> : null}
      </>
    );
  }
  // The five teas' dry leaves, the owner's photographs, side by side on one ground: two by two
  // and the last across, each as large as its row allows, so the five fit any frame.
  const odd = media.leaves.length % 2 === 1;
  return (
    <span className="absolute inset-0 grid grid-cols-2 grid-rows-3 gap-x-[4%] gap-y-[2%] bg-[#f4efe6] p-[7%]">
      {media.leaves.map((leaf, index) => (
        <span
          key={leaf.code}
          className={cn(
            'flex min-h-0 flex-col items-center justify-center',
            odd && index === media.leaves.length - 1 && 'col-span-2',
          )}
        >
          <span className="block aspect-square h-[calc(100%-1.75rem)] max-w-full mix-blend-multiply brightness-[1.05] contrast-[1.04] [mask-image:radial-gradient(closest-side,#000_74%,transparent)]">
            <ProductImage image={leaf.image} name={leaf.code} sizes="16rem" decorative />
          </span>
          {/* 20 px bold (large text): every pack colour reads on the leaves' ground. */}
          <span
            className="font-headline text-[1.25rem] leading-[1.75rem] tracking-[0.04em]"
            style={{ color: PACK_COLOURS[leaf.code as TeaCode] ?? 'inherit' }}
          >
            {leaf.code}
          </span>
        </span>
      ))}
    </span>
  );
}

/**
 * The width a picture is drawn at when it covers its frame: as wide as the frame when it is as
 * upright as the frame or more, else as wide as the frame's height times its own proportions (a
 * landscape picture in an upright frame is cut at its sides and drawn wider than the frame). The
 * window is up to 40rem wide and 48rem high (wide screens, about 0.85 : 1); a step's frame is 4 : 5
 * and up to 28rem wide.
 */
function coverSizes(aspect: number, frame: 'window' | 'step'): string {
  if (frame === 'window') {
    return aspect <= 0.85 ? '(min-width: 1440px) 40rem, 45vw' : `${Math.ceil(48 * aspect)}rem`;
  }
  return aspect <= 0.8
    ? '(min-width: 750px) 28rem, 100vw'
    : `(min-width: 750px) ${Math.ceil(35 * aspect)}rem, ${Math.ceil(125 * aspect)}vw`;
}

/**
 * The story as a sequence: on wide screens the pictures stay in one framed window while the words
 * scroll past beside it, and each step, as it reaches the middle of the screen, wipes its picture
 * up over the last one (an image mask, not a fade; reversed when scrolling back). Only the shown
 * step's film plays. On phones each step simply carries its own picture. Nothing is pinned or
 * hijacked: the page scrolls as usual; with reduced motion the pictures change without the wipe.
 */
export function StorySequenceView({
  heading,
  intro,
  steps,
  more,
  learn,
}: {
  heading: string;
  intro: string;
  steps: StoryStep[];
  more: { href: string; label: string };
  learn: { href: string; label: string };
}) {
  const baseId = useId();
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
  const withMedia = steps.map((step, index) => ({ step, index })).filter(({ step }) => step.media);

  useEffect(() => {
    // The step crossing the middle of the screen is the one shown.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = stepRefs.current.indexOf(entry.target as HTMLLIElement);
          if (index >= 0) setActive(index);
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    for (const element of stepRefs.current) if (element) observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // The picture shown: the active step's, or the last one before it that has a picture.
  const shownIndex =
    [...withMedia].reverse().find(({ index }) => index <= active)?.index ?? withMedia[0]?.index;

  return (
    <section aria-labelledby={`${baseId}-title`} className="bg-lavender">
      <div className="container-page grid grid-cols-1 gap-x-16 py-16 min-[46.875rem]:py-20 lg:grid-cols-12 lg:py-28">
        {/* The framed window (wide screens): every step's picture stacked, the shown one on top. */}
        <div className="hidden lg:col-span-6 lg:block">
          {/* Below the header (announcement bar and menu, 8.625rem) and as tall as the view
              allows, so the whole frame stays in sight while the words pass. */}
          <div
            aria-hidden
            className="sticky top-[10.5rem] h-[min(calc(100svh-12.5rem),48rem)] overflow-hidden rounded-[2rem] bg-forest-950 shadow-[0_40px_80px_-40px_rgb(60_20_40_/_0.45)]"
          >
            {withMedia.map(({ step, index }) => {
              const state =
                index === shownIndex ? 'shown' : index < (shownIndex ?? 0) ? 'past' : 'next';
              return (
                <div
                  key={step.key}
                  data-state={state}
                  className="wipe-layer absolute inset-0 isolate overflow-hidden"
                  style={{ zIndex: index + 1 } as CSSProperties}
                >
                  <div className="wipe-layer-media absolute inset-0">
                    <Media media={step.media!} playing={state === 'shown'} frame="window" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 lg:col-start-8">
          <h2
            id={`${baseId}-title`}
            className="font-heading text-[2.5rem] leading-[0.95] text-balance text-cherry uppercase min-[46.875rem]:text-[3.5rem] lg:text-[4rem]"
          >
            {heading}
          </h2>
          <p className="mt-5 max-w-[34rem] text-[1.125rem] leading-relaxed text-pretty text-wine">
            {intro}
          </p>

          <ol className="mt-10 lg:mt-4">
            {steps.map((step, index) => (
              <li
                key={step.key}
                ref={(element) => {
                  stepRefs.current[index] = element;
                }}
                data-active={index === active ? '' : undefined}
                className="story-step group/step border-t border-wine/20 py-8 lg:flex lg:min-h-[50svh] lg:flex-col lg:justify-center lg:border-t-0 lg:py-0"
              >
                {step.media ? (
                  // Phones and tablets: the step's own picture above its words.
                  <div
                    aria-hidden
                    className="relative isolate mb-6 aspect-[4/5] w-full max-w-[28rem] overflow-hidden rounded-[1.5rem] bg-forest-950 lg:hidden"
                  >
                    <Media media={step.media} playing frame="step" />
                  </div>
                ) : null}
                <p className="flex items-center gap-3 font-headline text-[1rem] tracking-[0.08em] text-wine">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  {/* The step being shown draws its line longer, in cherry (wide screens). */}
                  <span
                    aria-hidden
                    className="h-0.5 w-10 bg-wine/35 transition-[width,background-color] duration-700 ease-[var(--ease-out-expo)] motion-reduce:transition-none lg:group-data-[active]/step:w-20 lg:group-data-[active]/step:bg-cherry"
                  />
                </p>
                <h3 className="mt-3 font-headline text-[2rem] leading-[1.05] text-cherry uppercase min-[46.875rem]:text-[2.5rem]">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-[32rem] text-[1.0625rem] leading-relaxed text-pretty text-wine">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 lg:mt-0">
            <Link
              href={more.href}
              className="pill-hover inline-flex h-12 items-center rounded-full bg-wine px-7 text-[1rem] font-semibold text-ivory-50"
            >
              {more.label}
            </Link>
            <Link
              href={learn.href}
              className="group inline-flex min-h-11 items-center gap-2 text-[1rem] font-semibold text-wine underline decoration-wine/30 underline-offset-[6px] hover:decoration-wine"
            >
              {learn.label}
              <ArrowRight
                aria-hidden
                className="h-4 w-4 transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:translate-x-1"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
