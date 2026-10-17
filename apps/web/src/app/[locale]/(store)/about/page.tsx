import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import Image, { type StaticImageData } from 'next/image';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense, type CSSProperties, type ReactNode } from 'react';
import { Emblem } from '@/components/brand/logo';
import { ValueIcon } from '@/components/brand/ornaments';
import { Stamp } from '@/components/brand/stamp';
import { Blocks } from '@/components/content/long-form';
import { VisualPicture } from '@/components/content/visual-picture';
import { ScrollTrack, ScrollTrackHint } from '@/components/content/scroll-track';
import { Sparkles } from '@/components/home/sparkles';
import {
  BRAND,
  BRAND_VALUES,
  brandCopy,
  brandValueLabels,
  PACKAGING,
  teaHref,
  type TeaCode,
} from '@/content/brand';
import { aboutPage } from '@/content/pages/about';
import type { Block } from '@/content/types';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { getCategories } from '@/lib/data/catalog';
import { NETWORK_NAMES, SocialIcon } from '@/components/social/social-icon';
import { socialLinks } from '@/lib/contact';
import { getPublicSettings } from '@/lib/data/content';
import { categoryTree } from '@/lib/navigation';
import { pageMetadata } from '@/lib/seo';
import { showAdvisor, showGallery } from '@/lib/site';
import { visualFor } from '@/lib/visuals';
import lake from '../../../../../public/brand/art/lake.webp';
import sprig from '../../../../../public/brand/art/sprig-1.webp';
import terraces from '../../../../../public/brand/art/terraces.webp';
import pack8009 from '../../../../../public/brand/packs/8009.webp';
import pack8800 from '../../../../../public/brand/packs/8800.webp';
import pack8830 from '../../../../../public/brand/packs/8830.webp';
import packG8810 from '../../../../../public/brand/packs/g8810.webp';
import packXc2025 from '../../../../../public/brand/packs/xc2025.webp';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const page = aboutPage[locale];
  return pageMetadata({
    title: page.metaTitle ? { absolute: page.metaTitle } : page.title,
    description: page.description,
    href: '/about',
    locale,
  });
}

/** The reference's pill: 50 px high, brighter on a soft shadow when pointed at. */
const PILL =
  'pill-hover inline-flex h-[3.125rem] items-center justify-center rounded-full px-8 text-[0.95625rem] font-medium';

/** Outlined capitals, as the reference's hand-set stickers ("we think outside the cup"). */
const OUTLINED =
  'font-headline text-ivory-50 text-sticker [--headline-weight:800] [--sticker-color:var(--color-jade-700)] [--sticker-width:3px]';

/** Tilts of the story cards, as the reference's hand-placed cards. */
const CARD_TURNS = [-2.5, 2, -1.5, 2.5];

/**
 * About TERAN on the reference's About template, with TERAN's own words (content/brand.ts) and
 * pictures (the pack's artwork, or the photographs set in Admin → Settings for the welcome, the
 * ideas and the framed picture): a photographic welcome with a sticker, the story and the pack's
 * values as tilted cards,
 * the three ideas as a sideways timeline, a framed picture, the "difference" band, the range with
 * the catalogue's categories around the packs, the partnership band, the brand's world in three
 * tiles and, once TERAN has entered them, its social profiles. Nothing is invented: no figures,
 * stores, press or certificates the brand does not have.
 */
export default async function AboutPage() {
  const locale = (await rootParams.locale()) as Locale;
  const page = aboutPage[locale];
  const copy = brandCopy[locale];
  const values = brandValueLabels[locale];
  const [t, tn, th, tp, tpr] = await Promise.all([
    getTranslations('About'),
    getTranslations('Nav'),
    getTranslations('Home'),
    getTranslations('Pages'),
    getTranslations('Product'),
  ]);
  const range = page.sections.find((section) => section.id === 'range');
  const history = page.sections.find((section) => section.id === 'history');

  return (
    <>
      {/* 1. Welcome: the lake painted on the packs, the title and a tilted sticker. */}
      <header className="on-dark relative isolate flex h-[18rem] items-center justify-center overflow-hidden bg-forest-950 text-center sm:h-[26.125rem]">
        <Suspense fallback={null}>
          <PagePicture
            slot="about.hero"
            art={lake}
            sizes="(max-width: 767px) 75vw, 100vw"
            priority
            className="-z-20"
          />
        </Suspense>
        <span aria-hidden className="absolute inset-0 -z-10 bg-forest-950/35" />
        <p
          lang="uz"
          aria-hidden
          className="absolute top-[12%] left-[6%] -rotate-12 font-headline text-[1.75rem] leading-[0.9] text-jade-600 text-sticker [--sticker-color:var(--color-ivory-50)] [--sticker-width:2.5px] sm:left-[10%] sm:text-[2.75rem]"
        >
          {PACKAGING.slogan[2]}
        </p>
        <h1 className="container-page font-headline text-[3rem] text-ivory-50 sm:text-[3.75rem]">
          {page.title}
        </h1>
      </header>

      {/* 2. Our story: the heading, the brand's words and its four values as tilted cards. */}
      <section aria-labelledby="story-title" className="overflow-x-clip py-14 sm:py-16">
        <div className="container-page text-center">
          <h2
            id="story-title"
            className="font-headline text-[2.75rem] text-balance text-jade-700 sm:text-[3.75rem]"
          >
            {copy.story.heading}
          </h2>
          <div className="mx-auto mt-5 max-w-2xl space-y-3 text-[1.125rem] leading-normal text-fg">
            {copy.story.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <ul className="mx-auto mt-12 grid max-w-[66rem] grid-cols-2 gap-x-4 gap-y-8 sm:flex sm:justify-center sm:gap-6">
            {BRAND_VALUES.map((value, index) => (
              <li
                key={value}
                style={{ rotate: `${CARD_TURNS[index % CARD_TURNS.length]}deg` } as CSSProperties}
                className="relative flex min-h-[7.5rem] items-center justify-center rounded-[1rem] bg-jade-100 px-4 pt-7 pb-5 shadow-[0_4px_0_rgb(0_0_0_/_0.06)] sm:w-[14.5rem] sm:min-h-[8.25rem]"
              >
                <span className="absolute -top-6 -right-3 flex rounded-full bg-ivory-50 p-1 shadow-[0_4px_12px_rgb(0_0_0_/_0.12)]">
                  <ValueIcon value={value} className="w-11 sm:w-12" />
                </span>
                <span className="font-headline text-[1.625rem] leading-[0.95] [overflow-wrap:anywhere] text-jade-700 sm:text-[2.25rem]">
                  {values[value]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 2b. Our history, from the facts TERAN supplied, beside its five pouches. */}
      {history ? (
        <section aria-labelledby="history-title" className="bg-ivory-100 py-14 sm:py-16">
          <div className="container-page grid items-center gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-16">
            <div>
              <h2
                id="history-title"
                className="font-headline text-[2.5rem] text-balance text-jade-700 sm:text-[3.25rem]"
              >
                {history.heading}
              </h2>
              <div className="mt-5 max-w-[40rem] space-y-4 text-[1.0625rem] leading-relaxed text-fg">
                <Blocks blocks={history.blocks} />
              </div>
            </div>
            <div aria-hidden className="mx-auto flex w-full max-w-[30rem] items-end justify-center">
              {POUCHES.map((pouch, index) => (
                <Link
                  key={pouch.code}
                  href={teaHref(pouch.code)}
                  tabIndex={-1}
                  style={POUCH_FAN[index]}
                  className="relative -ml-[9%] w-[27%] transition-[translate] duration-200 ease-[ease] first:ml-0 hover:-translate-y-2"
                >
                  <Image
                    src={pouch.image}
                    alt=""
                    sizes="(min-width: 1024px) 9rem, 28vw"
                    className="h-auto w-full drop-shadow-[0_18px_18px_rgb(0_0_0_/_0.22)]"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* 3. The three ideas, as the reference's sideways timeline. */}
      <section
        aria-labelledby="ideas-title"
        className="relative bg-linear-to-b from-ivory-50 to-jade-100 py-12 sm:py-16"
      >
        <h2 id="ideas-title" className="sr-only">
          {copy.philosophy.heading}
        </h2>
        <Sparkles
          points={[
            { x: '71%', y: '14%', size: 40 },
            { x: '75%', y: '30%', size: 72 },
          ]}
          className="hidden text-gold-300 lg:block"
        />
        <ScrollTrack label={t('ideasLabel')} previous={t('previous')} next={t('next')}>
          <div className="flex shrink-0 items-center gap-10 px-gutter sm:gap-16 lg:gap-20 lg:px-[6.25rem]">
            {copy.philosophy.principles.map((principle, index) => (
              <IdeaStep
                key={principle.title}
                number={index + 1}
                title={principle.title}
                text={principle.text}
                hint={index === 0 ? <ScrollTrackHint label={t('scrollHint')} /> : null}
                picture={IDEA_PICTURES[index]}
              />
            ))}
          </div>
        </ScrollTrack>
      </section>

      {/* 4. A framed picture with the tagline, as the reference's showcase. */}
      <section aria-labelledby="showcase-title" className="bg-jade-100 px-gutter pb-10 sm:pb-12">
        <div className="relative isolate mx-auto flex h-[15rem] max-w-[61rem] items-center justify-center overflow-hidden rounded-banner px-6 text-center sm:h-[20rem]">
          <Suspense fallback={null}>
            <PagePicture
              slot="about.showcase"
              art={terraces}
              sizes="(min-width: 1024px) 976px, 100vw"
              className="-z-20"
            />
          </Suspense>
          <span aria-hidden className="absolute inset-0 -z-10 bg-forest-950/45" />
          <h2
            id="showcase-title"
            className="text-[1.75rem] leading-tight font-bold text-balance text-ivory-50 sm:text-[2.25rem]"
          >
            {copy.tagline}
          </h2>
        </div>
      </section>

      {/* 5. The difference: a grainy brand band, a stamp, a tilted line and the pack's values. */}
      <section
        aria-labelledby="difference-title"
        className="on-dark relative isolate overflow-hidden bg-jade-700 bg-grain text-ivory-50"
      >
        <Stamp
          top={BRAND.name}
          word={values.quality}
          className="absolute top-8 left-[6%] hidden text-ivory-50 lg:flex"
        />
        <div className="container-page flex flex-col items-center py-14 text-center sm:py-16">
          <h2
            id="difference-title"
            className="font-headline text-[2.5rem] text-balance sm:text-[3.75rem]"
          >
            {tpr('differenceTitle')}
          </h2>
          <p
            lang="uz"
            className="mt-10 max-w-[46rem] -rotate-3 -skew-x-6 font-headline text-[2.25rem] leading-[0.95] text-balance text-ivory-50 text-sticker [--headline-weight:800] [--sticker-color:var(--color-forest-800)] [--sticker-width:2px] sm:text-[4rem]"
          >
            {PACKAGING.tagline}
          </p>
          <ul className="mt-12 grid w-full max-w-[56rem] grid-cols-2 gap-y-8 sm:grid-cols-4">
            {BRAND_VALUES.map((value) => (
              <li key={value} className="flex flex-col items-center gap-4">
                <span className="flex rounded-full bg-ivory-50 p-2">
                  <ValueIcon value={value} className="w-16 sm:w-[4.5rem]" />
                </span>
                <span className="font-headline text-[1.25rem] leading-none">{values[value]}</span>
              </li>
            ))}
          </ul>
          <p className="mt-10 max-w-[66rem] text-[1rem] leading-normal text-ivory-50">
            {copy.description}
          </p>
        </div>
      </section>

      {/* 6. The range: the catalogue's categories as labels around the packs. */}
      {range ? (
        <Suspense
          fallback={<RangeSection heading={range.heading} text={range.blocks} labels={[]} />}
        >
          <RangeWithCategories heading={range.heading} text={range.blocks} />
        </Suspense>
      ) : null}

      {/* 7. Partnership, as the reference's innovation band: its pink, with the deeper pink step
          rising across the lower right, and its white stamp. */}
      <section
        aria-labelledby="partnership-title"
        className="relative isolate overflow-hidden bg-[#ff97b8]"
      >
        <span
          aria-hidden
          className="absolute -right-[10%] -bottom-[40%] -z-10 h-[90%] w-[85%] -rotate-12 bg-[#fc85ab]"
        />
        <div className="container-page grid min-h-[30rem] grid-cols-1 items-center gap-10 py-14 lg:grid-cols-[minmax(0,4fr)_minmax(0,3fr)_minmax(0,5fr)] lg:gap-8">
          <div className="flex flex-col items-start">
            {/* The reference's stamp is white; on this pink only a deep teal keeps AA contrast. */}
            <Stamp top={BRAND.name} word={values.taste} className="text-[#08494c]" />
            <h2
              id="partnership-title"
              className={cn(OUTLINED, 'mt-6 text-[3rem] leading-[0.9] sm:text-[4rem]')}
            >
              {copy.partnership.heading}
            </h2>
            <Link href="/wholesale" className={cn(PILL, 'mt-8 bg-jade-700 text-ivory-50')}>
              {th('businessCta')}
            </Link>
          </div>
          <div
            aria-hidden
            className="relative mx-auto flex h-64 w-full max-w-[18rem] items-end justify-center"
          >
            <Sparkles
              points={[
                { x: '20%', y: '6%', size: 56 },
                { x: '84%', y: '22%', size: 28 },
              ]}
              // The reference's lime sparkle on its pink.
              className="text-[#d8e377]"
            />
            <Link href={teaHref('G8810')} tabIndex={-1} className="relative w-[55%] -rotate-6">
              <Image
                src={packG8810}
                alt=""
                sizes="11rem"
                className="h-auto w-full drop-shadow-[0_24px_24px_rgb(0_0_0_/_0.25)]"
              />
            </Link>
            <Link
              href={teaHref('XC2025')}
              tabIndex={-1}
              className="relative -ml-[18%] w-[55%] rotate-6"
            >
              <Image
                src={packXc2025}
                alt=""
                sizes="11rem"
                className="h-auto w-full drop-shadow-[0_24px_24px_rgb(0_0_0_/_0.25)]"
              />
            </Link>
          </div>
          <p className="rounded-[1rem] bg-ivory-50 px-7 py-6 text-[1.25rem] leading-snug text-jade-700 shadow-[0_8px_24px_-12px_rgb(0_0_0_/_0.2)] sm:text-[1.5rem]">
            {copy.partnership.text} {copy.collection.text}
          </p>
        </div>
      </section>

      {/* 8. The world of TERAN in three tiles, as the reference's community row. */}
      <section aria-labelledby="world-title" className="bg-ivory-100 py-14 text-center">
        <div className="container-page">
          <h2
            id="world-title"
            className="font-headline text-[2.5rem] text-balance text-jade-600 sm:text-[3.75rem]"
          >
            {tn('brandWorld')}
          </h2>
          <p
            lang="uz"
            aria-hidden
            className={cn(OUTLINED, 'mt-4 inline-block -rotate-3 text-[2.25rem] sm:text-[3rem]')}
          >
            {PACKAGING.slogan[1]}
          </p>
          <ul
            className={cn(
              'mx-auto mt-8 grid gap-3',
              showAdvisor || showGallery
                ? 'max-w-[53.5rem] sm:grid-cols-3'
                : 'max-w-[36rem] sm:grid-cols-2',
            )}
          >
            {[
              { href: '/journal', label: tn('journal'), image: terraces },
              { href: '/tea-101', label: tn('tea101'), image: lake },
              ...(showGallery ? [{ href: '/media', label: tn('media'), image: lake }] : []),
              ...(showAdvisor
                ? [{ href: '/assistant', label: tn('assistant'), image: sprig }]
                : []),
            ].map((tile) => (
              <li key={tile.href}>
                <Link
                  href={tile.href}
                  className="group relative isolate flex aspect-[277/198] items-center justify-center overflow-hidden rounded-[0.75rem] bg-jade-700 px-4"
                >
                  <Image
                    src={tile.image}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 18rem, 100vw"
                    // As the reference's community tiles: the picture brightens when pointed at.
                    className="picture-hover -z-20 object-cover"
                  />
                  <span aria-hidden className="absolute inset-0 -z-10 bg-forest-950/40" />
                  <span className="font-heading text-[1.75rem] leading-[1.1] text-ivory-50 sm:text-[2rem]">
                    {tile.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/catalog" className={cn(PILL, 'mt-10 bg-jade-700 text-ivory-50')}>
            {tp('shopTeas')}
          </Link>
        </div>
      </section>

      {/* 9. Follow along: only once TERAN has entered its profiles. */}
      <Suspense fallback={null}>
        <FollowBand />
      </Suspense>
    </>
  );
}

/** The five pouches fanned out, the middle one in front; each opens its tea. */
const POUCHES: { code: TeaCode; image: StaticImageData }[] = [
  { code: 'XC2025', image: packXc2025 },
  { code: 'G8810', image: packG8810 },
  { code: '8800', image: pack8800 },
  { code: '8830', image: pack8830 },
  { code: '8009', image: pack8009 },
];
const POUCH_FAN: CSSProperties[] = [-10, -5, 0, 5, 10].map((turn, index) => ({
  rotate: `${turn}deg`,
  translate: `0 ${Math.abs(turn) * 0.8}%`,
  zIndex: 3 - Math.abs(index - 2),
}));

/** Each idea's picture: its place in Admin → Settings and the artwork shown until one is set. */
const IDEA_PICTURES: { slot: string; art: StaticImageData; shape: 'card' | 'circle' }[] = [
  { slot: 'about.idea.1', art: lake, shape: 'card' },
  { slot: 'about.idea.2', art: terraces, shape: 'circle' },
  { slot: 'about.idea.3', art: sprig, shape: 'card' },
];

/**
 * One of this page's pictures that Admin → Settings can replace: the uploaded photograph when its
 * place has one, else TERAN's artwork. Read at request time, so it streams in; the frame around
 * it is sized by the page, so nothing moves when it arrives.
 */
async function PagePicture({
  slot,
  art,
  sizes,
  priority = false,
  className,
}: {
  slot: string;
  art: StaticImageData;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  await connection();
  const locale = await getLocale();
  const visual = visualFor(await getPublicSettings(locale).catch(() => null), slot);
  if (visual) {
    return (
      <div className={cn('absolute inset-0', className)}>
        <VisualPicture visual={visual} sizes={sizes} priority={priority} />
      </div>
    );
  }
  return (
    <Image
      src={art}
      alt=""
      fill
      sizes={sizes}
      quality={60}
      loading={priority ? 'eager' : undefined}
      fetchPriority={priority ? 'high' : undefined}
      className={cn('object-cover', className)}
    />
  );
}

/** One step of the timeline: a large number, the idea and its line, then its picture. */
function IdeaStep({
  number,
  title,
  text,
  hint,
  picture,
}: {
  number: number;
  title: string;
  text: string;
  hint: ReactNode;
  picture?: { slot: string; art: StaticImageData; shape: 'card' | 'circle' };
}) {
  return (
    <>
      <div className="w-[16rem] shrink-0 snap-start sm:w-[19rem]">
        <p
          aria-hidden
          className="font-headline text-[3.25rem] leading-none text-jade-700 sm:text-[3.75rem]"
        >
          {String(number).padStart(2, '0')}
        </p>
        <h3 className="mt-2 text-[1.5rem] leading-tight text-jade-700 sm:text-[1.75rem]">
          {title}
        </h3>
        <p className="mt-3 text-[1rem] text-jade-700 first-letter:uppercase">{text}</p>
        {hint ? <div className="mt-7">{hint}</div> : null}
      </div>
      {picture ? (
        <div
          aria-hidden
          className={cn(
            'relative shrink-0 overflow-hidden bg-jade-100 shadow-[0_18px_40px_-18px_rgb(0_0_0_/_0.35)]',
            picture.shape === 'circle'
              ? 'aspect-square w-[13rem] rounded-full sm:w-[16rem]'
              : 'aspect-[320/336] w-[15rem] rotate-[-4deg] rounded-[1.25rem] sm:w-[20rem]',
          )}
        >
          <Suspense fallback={null}>
            <PagePicture slot={picture.slot} art={picture.art} sizes="20rem" />
          </Suspense>
        </div>
      ) : null}
    </>
  );
}

const RANGE_PACKS: {
  code: TeaCode;
  pack: StaticImageData;
  side: 'left' | 'right';
  at: [string, string];
  turn: number;
}[] = [
  { code: 'XC2025', pack: packXc2025, side: 'left', at: ['30%', '2%'], turn: -10 },
  { code: '8830', pack: pack8830, side: 'left', at: ['46%', '52%'], turn: 8 },
  { code: 'G8810', pack: packG8810, side: 'right', at: ['18%', '8%'], turn: 12 },
  { code: '8009', pack: pack8009, side: 'right', at: ['44%', '50%'], turn: -8 },
];

/** Where the category labels sit around the packs (left/top, % of each side's area). */
const LABEL_SPOTS: { side: 'left' | 'right'; at: [string, string]; turn: number }[] = [
  { side: 'left', at: ['6%', '30%'], turn: -3 },
  { side: 'right', at: ['56%', '30%'], turn: 3 },
  { side: 'left', at: ['2%', '76%'], turn: 4 },
  { side: 'right', at: ['8%', '62%'], turn: -4 },
  { side: 'left', at: ['58%', '88%'], turn: -2 },
  { side: 'right', at: ['60%', '86%'], turn: 2 },
];

async function RangeWithCategories({ heading, text }: { heading: string; text: readonly Block[] }) {
  await connection();
  const locale = (await getLocale()) as Locale;
  const tree = categoryTree(await getCategories(locale).catch(() => []));
  const labels = tree
    .flatMap((top) => (top.children.length > 0 ? top.children : [top]))
    .filter((category) => category.productCount > 0)
    .slice(0, LABEL_SPOTS.length)
    .map((category) => ({ href: `/${category.path}`, name: category.name }));
  return <RangeSection heading={heading} text={text} labels={labels} />;
}

/**
 * The reference's "variety" band: a sky-coloured field with products scattered on both sides and
 * white tilted labels naming what there is; the stamp, an outlined heading and a line in the middle.
 */
function RangeSection({
  heading,
  text,
  labels,
}: {
  heading: string;
  text: readonly Block[];
  labels: { href: string; name: string }[];
}) {
  const side = (which: 'left' | 'right') => (
    <div
      aria-hidden={labels.length === 0 || undefined}
      className="relative hidden h-[28rem] lg:block"
    >
      {RANGE_PACKS.filter((item) => item.side === which).map((item) => (
        // Each pack opens its tea (pointer only: the labels beside them are the links to tab to).
        <Link
          key={item.code}
          href={teaHref(item.code)}
          tabIndex={-1}
          aria-hidden
          className="absolute w-[9rem] transition-[scale] duration-200 ease-[ease] hover:scale-[1.04]"
          style={{ left: item.at[0], top: item.at[1], rotate: `${item.turn}deg` } as CSSProperties}
        >
          <Image
            src={item.pack}
            alt=""
            sizes="9rem"
            className="h-auto w-full drop-shadow-[0_18px_18px_rgb(0_0_0_/_0.2)]"
          />
        </Link>
      ))}
      {labels.map((label, index) => {
        const spot = LABEL_SPOTS[index];
        if (!spot || spot.side !== which) return null;
        return (
          <Link
            key={label.href}
            href={label.href}
            // The reference's variety labels grow a little (6 %, 200 ms) when pointed at.
            className="absolute inline-flex min-h-12 items-center rounded-[0.75rem] bg-ivory-50 px-6 text-[1.25rem] whitespace-nowrap text-jade-700 shadow-[0_6px_18px_-8px_rgb(0_0_0_/_0.3)] transition-[scale] duration-200 ease-[ease] hover:scale-[1.06] focus-visible:scale-[1.06]"
            style={
              { left: spot.at[0], top: spot.at[1], rotate: `${spot.turn}deg` } as CSSProperties
            }
          >
            {label.name}
          </Link>
        );
      })}
    </div>
  );
  return (
    <section
      aria-labelledby="range-title"
      className="relative isolate overflow-hidden bg-linear-to-b from-jade-100 to-jade-50"
    >
      <div className="container-page grid items-center gap-8 py-14 lg:grid-cols-[1fr_minmax(0,22rem)_1fr] lg:py-10">
        {side('left')}
        <div className="flex flex-col items-center text-center">
          <Emblem className="w-20" sizes="80px" />
          <h2
            id="range-title"
            className={cn(OUTLINED, 'mt-5 text-[3rem] leading-[0.95] text-balance sm:text-[4rem]')}
          >
            {heading}
          </h2>
          <div className="mt-6 text-[1rem] leading-normal text-fg">
            <Blocks blocks={text} />
          </div>
          {/* Phones: the labels in a wrapped row under the words. */}
          {labels.length > 0 ? (
            <ul className="mt-8 flex flex-wrap justify-center gap-3 lg:hidden">
              {labels.map((label, index) => (
                <li
                  key={label.href}
                  style={{ rotate: `${index % 2 ? 2 : -2}deg` } as CSSProperties}
                >
                  <Link
                    href={label.href}
                    className="inline-flex min-h-11 items-center rounded-[0.75rem] bg-ivory-50 px-5 text-[1.125rem] text-jade-700 shadow-[0_6px_18px_-8px_rgb(0_0_0_/_0.3)]"
                  >
                    {label.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {side('right')}
      </div>
    </section>
  );
}

/** The reference's "follow along" band, with the profiles TERAN has entered in the admin. */
async function FollowBand() {
  await connection();
  const locale = await getLocale();
  const [t, tc] = await Promise.all([getTranslations('Footer'), getTranslations('Common')]);
  const contact = (await getPublicSettings(locale).catch(() => null))?.contact;
  const links = socialLinks(contact);
  if (links.length === 0) return null;
  return (
    <section aria-labelledby="follow-title" className="on-dark bg-jade-600 text-ivory-50">
      <div className="container-page flex flex-col items-center gap-8 py-12 sm:flex-row sm:justify-center sm:gap-14">
        {/* Stacked on phones: "Социальные сети" in 48 px would not fit beside the emblem. */}
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:gap-6 sm:text-left">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-ivory-50 sm:h-24 sm:w-24">
            <Emblem className="w-12 sm:w-14" sizes="56px" />
          </span>
          <h2
            id="follow-title"
            className={cn(
              OUTLINED,
              'text-[2.25rem] leading-[0.95] [overflow-wrap:anywhere] [--sticker-color:var(--color-forest-800)] sm:text-[3rem]',
            )}
          >
            {t('followUs')}
          </h2>
        </div>
        {/* The reference's row of 50 px white marks, 8 px apart. */}
        <ul className="flex flex-wrap items-center justify-center gap-2">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                title={NETWORK_NAMES[link.network]}
                className="flex h-[3.125rem] w-[3.125rem] items-center justify-center text-ivory-50"
              >
                <SocialIcon network={link.network} mono className="h-[3.125rem] w-[3.125rem]" />
                <span className="sr-only">
                  {link.label} ({tc('opensInNewTab')})
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
