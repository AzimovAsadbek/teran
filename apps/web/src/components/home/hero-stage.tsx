'use client';

import type { PublicVisualDto } from '@teran/contracts';
import Image, { type StaticImageData } from 'next/image';
import { LoopingFilm } from '@/components/content/looping-film';
import { VisualPicture } from '@/components/content/visual-picture';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { filmPosition } from '@/lib/visuals';
import { Sparkles, type SparklePoint } from './sparkles';

/** Sparkles to the right of the pill, clear of the words. */
const HERO_SPARKLES: SparklePoint[] = [
  { x: '20%', y: '76%', size: 30 },
  { x: '23.5%', y: '86%', size: 18 },
  { x: '17.5%', y: '91%', size: 22 },
];

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
 * Headline size, so a long line still fits: the reference's 72 px (phones) and 100 px (desktop)
 * capitals for short words, smaller for long ones. On wide screens the words keep to the left
 * side, so the line counts there (up to the 16 characters the block holds before it wraps).
 */
function headlineSize(lines: string[]): string {
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
  const desktop = Math.max(longestWord, Math.min(longestLine, 16));
  const desktopSize =
    desktop <= 9
      ? 'lg:text-[6.25rem]'
      : desktop <= 13
        ? 'lg:text-[5rem]'
        : desktop <= 16
          ? 'lg:text-[4.25rem]'
          : 'lg:text-[4rem]';
  return `${phoneSize} ${desktopSize}`;
}

/**
 * The front page's first view, one view without rotation: TERAN's words — the pack's tagline in
 * yellow condensed capitals, what TERAN is, a pill to the teas — over `home.hero.1`'s film, or
 * over that place's picture, or over the lake painted on the packs. Below 900 px it is 1.12 times
 * as tall as it is wide (464 to 672 px: the next section shows on a phone's first screen), from
 * 900 px 560 px or as tall as a 3.1:1 picture at wider windows. The words stand in the middle on
 * phones (over a soft veil behind them only), on the left from 1024 px, where the film stays as
 * bright as it is (the owner's wish of 2026-10-18); a soft shadow behind the letters keeps them
 * readable.
 *
 * The film (LoopingFilm): the place's picture is its first frame, painted at once (the page's
 * largest paint); the film is fetched once the page has loaded, fades in over it and loops
 * without a seam.
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
  return (
    <section className="relative isolate h-[clamp(29rem,112vw,42rem)] w-full overflow-hidden bg-forest-950 min-[56.25rem]:h-[max(35rem,calc(100vw/3.0956))]">
      <h1 className="sr-only">{labels.heading}</h1>
      {visual ? (
        // The film's first frame (or the picture): it fills the slide from its centre, as the
        // film does, so the film starts exactly where it is.
        <div aria-hidden className="absolute inset-0 -z-30">
          <VisualPicture
            visual={visual}
            sizes="100vw"
            priority
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
      {film ? <LoopingFilm film={film} phoneFilm={visual?.mobileVideo} /> : null}
      {/* On phones a soft veil where the words are (the middle), so the yellow headline and the
          white words stay readable over the bright leaves; wide screens keep the film's own light
          and shade the letters instead. */}
      <span
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_90%_50%_at_50%_50%,color-mix(in_oklab,var(--color-forest-950)_55%,transparent),transparent)] lg:hidden"
      />
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-1/4 bg-linear-to-t from-forest-950/30 to-forest-950/0"
      />
      <Sparkles points={HERO_SPARKLES} className="-z-10 hidden text-ivory-50 lg:block" />
      {/* The whole picture leads where the pill does, for a pointer (the pill is the keyboard's
          way and the screen readers'). */}
      <Link href={words.cta.href} tabIndex={-1} aria-hidden className="absolute inset-0 -z-[5]" />
      <div className="pointer-events-none container-page flex h-full flex-col items-center justify-center text-center lg:items-start lg:text-left">
        <div className="pointer-events-auto flex max-w-[45rem] flex-col items-center [text-shadow:0_2px_18px_rgb(0_0_0_/_0.45),0_1px_3px_rgb(0_0_0_/_0.3)] lg:max-w-[min(36rem,40vw)] lg:items-start">
          <p className="text-[1.25rem] leading-[1.1] font-bold text-ivory-50 uppercase">
            {words.eyebrow}
          </p>
          <p
            className={cn(
              'mt-3 font-headline text-sun [overflow-wrap:anywhere] lg:mt-4',
              headlineSize(words.lines),
            )}
          >
            {words.lines.map((line, index) => (
              <span key={line} className="block">
                {index > 0 ? ' ' : null}
                {line}
              </span>
            ))}
          </p>
          {words.text ? (
            <p className="mt-4 line-clamp-2 max-w-[30rem] text-[0.8125rem] leading-normal text-ivory-50 max-lg:hidden lg:mt-6 lg:text-[1rem]">
              {words.text}
            </p>
          ) : null}
          <Link
            href={words.cta.href}
            className="pill-hover mt-5 inline-flex h-[3.125rem] items-center rounded-full bg-cream px-8 text-[1rem] font-medium text-fg [text-shadow:none] lg:mt-8"
          >
            {words.cta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
