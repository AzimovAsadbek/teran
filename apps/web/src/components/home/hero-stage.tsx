'use client';

import type { PublicVisualDto } from '@teran/contracts';
import Image, { type StaticImageData } from 'next/image';
import { useRef, type CSSProperties } from 'react';
import { LoopingFilm } from '@/components/content/looping-film';
import { VisualPicture } from '@/components/content/visual-picture';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { useScrollScene } from '@/lib/scroll-scene';
import { filmPosition } from '@/lib/visuals';
import pack8009 from '../../../public/brand/packs/8009.webp';
import pack8800 from '../../../public/brand/packs/8800.webp';
import pack8830 from '../../../public/brand/packs/8830.webp';
import packG8810 from '../../../public/brand/packs/g8810.webp';
import packXc2025 from '../../../public/brand/packs/xc2025.webp';

export interface HeroWords {
  eyebrow: string;
  /** The headline, one entry per line. */
  lines: string[];
  text: string | null;
  cta: { href: string; label: string };
}

export interface HeroLabels {
  /** The page's heading, for screen readers and search engines. */
  heading: string;
}

/**
 * The five pouches as they stand on the first view's shelf, outer ones lower, turned outwards
 * and a little smaller, XC2025 in front: the TERAN range as one family.
 */
const SHELF: { pack: StaticImageData; code: string; turn: number; drop: number; size: number }[] = [
  { pack: packG8810, code: 'G8810', turn: -9, drop: 7, size: 0.8 },
  { pack: pack8830, code: '8830', turn: -4.5, drop: 2.5, size: 0.9 },
  { pack: packXc2025, code: 'XC2025', turn: 0, drop: 0, size: 1 },
  { pack: pack8800, code: '8800', turn: 4.5, drop: 2.5, size: 0.9 },
  { pack: pack8009, code: '8009', turn: 9, drop: 7, size: 0.8 },
];

/**
 * Headline size, so a long line still fits: the reference's 72 px capitals on phones for short
 * words, smaller for long ones. From 1024 px the headline is the page's largest type, up to 6rem,
 * sized so its longest line just fits the words' column (min(46rem, 52vw), clear of the packs):
 * `--hero-fit` is that line's width in ems, taking Oswald's capitals at about half an em each
 * (Cyrillic a little wider).
 */
function headlineSize(lines: string[]): { className: string; fit: number } {
  const longestWord = Math.max(
    ...lines.flatMap((line) => line.split(/\s+/)).map((word) => word.length),
  );
  const longestLine = Math.max(...lines.map((line) => line.length));
  const phoneSize =
    longestWord <= 8
      ? 'text-[clamp(2.75rem,1rem+8vw,4.5rem)]'
      : longestWord <= 11
        ? 'text-[clamp(2.5rem,0.75rem+7.5vw,3.5rem)]'
        : 'text-[clamp(2.25rem,0.5rem+7.5vw,2.75rem)]';
  const cyrillic = lines.some((line) => /[Ѐ-ӿ]/.test(line));
  const fit = Math.max(4, longestLine * (cyrillic ? 0.53 : 0.49));
  return {
    className: `${phoneSize} lg:text-[min(6rem,calc(min(46rem,52vw)/var(--hero-fit)))]`,
    fit: Math.round(fit * 100) / 100,
  };
}

/**
 * The front page's first view, one view without rotation (ADR-037): TERAN's words over the film
 * of `home.hero.1` (or its picture, or the lake painted on the packs), and the five TERAN pouches
 * standing on the view's lower edge, the range as one family. It fills the first screen under the
 * header and the promo strip (phones: 1.2 times as tall as wide), the words on the left from
 * 1024 px (in the middle on phones, over a soft veil there only: the owner wants the film's own
 * light on wide screens; a layered shadow keeps the letters readable).
 *
 * Motion (one choreography, styles/globals.css "Arrivals"): on load the picture settles from a
 * slight zoom, the headline's lines rise out of their own masks, then the packs rise onto the
 * shelf one after another. While the view scrolls away the layers part at different speeds —
 * the film slowest, the words faster, the packs fastest and fanning out — so the first view has
 * depth (a scrubbed scene, lib/scroll-scene; nothing moves with reduced motion).
 *
 * The film (LoopingFilm): the place's picture is its first frame, painted at once (the page's
 * largest paint); the film is fetched once the page has loaded, fades in over it and loops.
 */
export function HeroStage({
  words,
  media,
  art,
  labels,
}: {
  words: HeroWords;
  /** The place's picture (and film); null for the painting; 'pending' while the page streams. */
  media: PublicVisualDto | null | 'pending';
  art: StaticImageData;
  labels: HeroLabels;
}) {
  const visual = media === 'pending' ? null : media;
  const film = visual?.video ?? null;
  const headline = headlineSize(words.lines);
  const sectionRef = useRef<HTMLElement>(null);

  useScrollScene(sectionRef, ({ gsap, root }) => {
    const q = gsap.utils.selector(root);
    gsap
      .timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: root, start: 0, end: 'bottom top', scrub: 0.6 },
      })
      .to(q('[data-hero-media]'), { yPercent: 16 }, 0)
      .to(q('[data-hero-words]'), { yPercent: -22 }, 0)
      .to(
        q('[data-hero-pack]'),
        {
          yPercent: (index: number) => -26 - Math.abs(index - 2) * 7,
          xPercent: (index: number) => (index - 2) * 14,
        },
        0,
      );
  });

  return (
    <section
      ref={sectionRef}
      // Clipped at the sides only: the packs, drifting apart as the page scrolls, never widen the
      // page, while they may still stand over the view's lower edge.
      className="relative isolate h-[clamp(31rem,122vw,44rem)] w-full overflow-x-clip min-[56.25rem]:h-[clamp(36rem,calc(100svh-13.5rem),52rem)]"
    >
      <h1 className="sr-only">{labels.heading}</h1>
      {/* The pictures, clipped to the view (the packs below may stand over its edge). */}
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden bg-forest-950">
        <div data-hero-media className="absolute inset-0 will-change-transform">
          <div className="arrive-settle absolute inset-0">
            {visual ? (
              // The film's first frame (or the picture): it fills the view from its centre, as the
              // film does, so the film starts exactly where it is.
              <div className="absolute inset-0 -z-30">
                <VisualPicture
                  visual={visual}
                  sizes="100vw"
                  priority
                  phoneBelow={900}
                  position={filmPosition(film)}
                  phonePosition={filmPosition(visual.mobileVideo ?? film)}
                />
              </div>
            ) : media === null ? (
              <Image
                src={art}
                alt=""
                fill
                priority
                quality={60}
                sizes="100vw"
                className="-z-30 object-cover object-[60%_100%] lg:object-center"
              />
            ) : null}
            {film ? (
              <LoopingFilm film={film} phoneFilm={visual?.mobileVideo} phoneBelow={900} />
            ) : null}
          </div>
        </div>
        {/* On phones a soft veil where the words are; wide screens keep the film's own light. */}
        <span className="absolute inset-0 bg-[radial-gradient(ellipse_95%_46%_at_50%_38%,color-mix(in_oklab,var(--color-forest-950)_55%,transparent),transparent)] lg:hidden" />
        {/* The shelf: the lower edge darkens a little where the packs stand. */}
        <span className="absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-forest-950/45 via-forest-950/10 to-transparent" />
      </div>
      {/* The whole picture leads where the pill does, for a pointer (the pill is the keyboard's
          way and the screen readers'). */}
      <Link href={words.cta.href} tabIndex={-1} aria-hidden className="absolute inset-0 -z-[5]" />

      <div className="pointer-events-none container-page flex h-full flex-col items-center pt-[clamp(3rem,10vw,5rem)] text-center lg:items-start lg:justify-center lg:pt-0 lg:pb-[4%] lg:text-left">
        <div
          data-hero-words
          className="pointer-events-auto flex max-w-[45rem] flex-col items-center [text-shadow:0_1px_2px_rgb(0_0_0_/_0.5),0_3px_10px_rgb(0_0_0_/_0.35),0_6px_32px_rgb(0_0_0_/_0.5)] lg:max-w-[min(46rem,52vw)] lg:items-start"
        >
          <p
            className="arrive-rise text-[0.9375rem] leading-[1.2] font-bold tracking-[0.12em] text-ivory-50 uppercase lg:text-[1.0625rem]"
            style={{ '--i': -2 } as CSSProperties}
          >
            {words.eyebrow}
          </p>
          <p
            className={cn(
              'mt-3 font-headline text-sun [overflow-wrap:anywhere] lg:mt-4',
              headline.className,
            )}
            style={{ '--hero-fit': headline.fit } as CSSProperties}
          >
            {words.lines.map((line, index) => (
              // Each line rises out of its own mask; the padding keeps accents and descenders.
              <span key={line} className="-my-[0.08em] block overflow-clip py-[0.08em]">
                <span className="arrive-line block" style={{ '--i': index } as CSSProperties}>
                  {index > 0 ? ' ' : null}
                  {line}
                </span>
              </span>
            ))}
          </p>
          {words.text ? (
            <p
              className="arrive-rise mt-4 max-w-[30rem] text-[0.8125rem] leading-normal font-semibold text-ivory-50 max-lg:hidden lg:mt-6 lg:text-[1.0625rem]"
              style={{ '--i': 0 } as CSSProperties}
            >
              {words.text}
            </p>
          ) : null}
          <div
            className="arrive-rise mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 lg:mt-8 lg:justify-start"
            style={{ '--i': 1 } as CSSProperties}
          >
            {/* The view's one button; the way in for businesses is the strip above it. */}
            <Link
              href={words.cta.href}
              className="pill-hover inline-flex h-[3.125rem] items-center rounded-full bg-cream px-8 text-[1rem] font-medium text-fg [text-shadow:none]"
            >
              {words.cta.label}
            </Link>
          </div>
        </div>
      </div>

      {/* The five packs on the view's lower edge, standing a little over it (into the ribbon). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -bottom-4 z-[2] flex items-end justify-center lg:-bottom-6 lg:justify-end lg:pr-[max(var(--spacing-gutter),calc((100vw-90rem)/2+var(--spacing-gutter)))]"
      >
        {SHELF.map((item, index) => (
          <div
            key={item.code}
            data-hero-pack
            className={cn(
              'relative will-change-transform',
              index === 2 ? 'z-[3]' : index % 4 === 0 ? 'z-[1]' : 'z-[2]',
            )}
            style={{ marginInline: 'clamp(-1.6rem, -2.4vw, -0.9rem)' }}
          >
            <div
              className="arrive-pack"
              style={
                {
                  '--i': Math.abs(index - 2),
                  rotate: `${item.turn}deg`,
                  translate: `0 ${item.drop}%`,
                } as CSSProperties
              }
            >
              <Image
                src={item.pack}
                alt=""
                priority={index === 2}
                sizes="(min-width: 1024px) 15rem, 30vw"
                className="h-auto w-[clamp(4.6rem,19vw,7.6rem)] drop-shadow-[0_18px_22px_rgb(0_0_0_/_0.35)] lg:w-[clamp(8.5rem,11.5vw,12.5rem)]"
                style={{ scale: item.size }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
