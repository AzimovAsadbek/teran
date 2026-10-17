import type { Locale, ProductSummaryDto } from '@teran/contracts';
import { getLocale, getTranslations } from 'next-intl/server';
import Image, { type StaticImageData } from 'next/image';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import type { CSSProperties, ReactNode } from 'react';
import { BrandValues, ValueIcon } from '@/components/brand/ornaments';
import { ButtonLink } from '@/components/ui/button';
import {
  BRAND,
  BRAND_VALUES,
  brandCopy,
  PACKAGING,
  PREMIUM_COLLECTION_SLUG,
} from '@/content/brand';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { getCategories, getCollections, getProductList } from '@/lib/data/catalog';
import { getArticles, getMedia } from '@/lib/data/content';
import {
  browsableCategories,
  categoryTree,
  imageSources,
  type NavCategory,
} from '@/lib/navigation';
import lake from '../../../public/brand/art/lake.webp';
import terraces from '../../../public/brand/art/terraces.webp';
import pack8009 from '../../../public/brand/packs/8009.webp';
import pack8830 from '../../../public/brand/packs/8830.webp';
import packG8810 from '../../../public/brand/packs/g8810.webp';
import packXc2025 from '../../../public/brand/packs/xc2025.webp';
import { BrewingGuide } from './brewing-guide';
import { Marquee } from './marquee';
import { Sparkles, SPARKLES_HIGH, type SparklePoint } from './sparkles';

/*
 * The home page's editorial sections, in the reference's order and at its measurements
 * (docs/design/reference-map.md). Every one uses TERAN's own content: the catalogue, the journal
 * and gallery from the API, the official brand copy (content/brand.ts) and the packaging artwork.
 * Nothing is invented — no offer, statistic, certification or rating — and a section with
 * nothing real to show is left out.
 */

/** The reference's pill: 50 px high, 15.3 px text, brightening a little when pointed at. */
const PILL =
  'inline-flex h-[3.125rem] items-center justify-center rounded-full px-8 text-[0.95625rem] font-medium transition-[filter,box-shadow] duration-200 ease-out hover:shadow-[0_6px_18px_-6px_rgb(0_0_0_/_0.35)] hover:brightness-[1.04]';

/**
 * A campaign headline's size by its length, so TERAN's longer lines keep the reference's two or
 * three lines: its 110 px (56 px on phones) for short headlines, smaller for longer ones.
 */
function bannerHeadline(title: string): string {
  if (title.length <= 18) return 'text-[3.5rem] lg:text-[6.875rem]';
  if (title.length <= 28) return 'text-[3rem] lg:text-[5.5rem]';
  return 'text-[2.5rem] lg:text-[4.5rem]';
}

/* ── 1. Promo strip ──────────────────────────────────────────────────────────────────────── */

/**
 * The reference's dark promotional strip under the header (80 px; 121 px on phones), carrying
 * TERAN's own collection instead of an offer: the descriptor in gold, the collection's name with
 * its line, the pack's slogan as a tilted sticker and a pill. Phones keep the name and the pill.
 * Hidden when no collection has products.
 */
export async function PromoStrip() {
  await connection();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('Home');
  const collections = (await getCollections(locale).catch(() => [])).filter(
    (collection) => collection.productCount > 0,
  );
  const collection =
    collections.find((candidate) => candidate.slug === PREMIUM_COLLECTION_SLUG) ?? collections[0];
  if (!collection) return null;
  const copy = brandCopy[locale];
  return (
    <section aria-label={collection.name} className="on-dark bg-forest-950 text-ivory-50">
      <div className="container-page flex min-h-[7.5625rem] items-center justify-between gap-5 py-4 lg:min-h-20 lg:justify-evenly lg:gap-8 lg:py-2">
        <p className="hidden font-headline text-[2rem] leading-[1.05] whitespace-nowrap text-gold-300 xl:block">
          {BRAND.descriptor}
        </p>
        <p className="min-w-0 lg:flex lg:items-baseline lg:gap-2.5">
          <span className="block font-headline text-[1.75rem] leading-[1.05] [--headline-weight:600] [overflow-wrap:anywhere] sm:text-[2rem] lg:whitespace-nowrap">
            {collection.name}
          </span>
          <span className="mt-1 block font-condensed text-[1rem] leading-tight lg:mt-0">
            {copy.collection.heading}
          </span>
        </p>
        <p
          lang="uz"
          className="text-sticker hidden -rotate-6 text-[1.575rem] leading-none font-semibold whitespace-nowrap text-ivory-50 uppercase min-[90rem]:block"
        >
          {PACKAGING.slogan[2]}
        </p>
        <Link
          href={`/collections/${collection.slug}`}
          className={cn(PILL, 'h-12 shrink-0 bg-gold-300 px-6 text-forest-950 sm:px-8')}
        >
          {t('promoCta')}
        </Link>
      </div>
    </section>
  );
}

/* ── 3. Category marquee ─────────────────────────────────────────────────────────────────── */

/** The reference's ribbon: the catalogue's categories and the pack's slogan, the pack's value icons between. */
export async function CategoryMarquee() {
  await connection();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('Home');
  const tree = categoryTree(await getCategories(locale).catch(() => []));
  const words = [
    ...tree.flatMap((top) => [top.name, ...top.children.map((child) => child.name)]),
    ...PACKAGING.slogan,
  ];
  if (words.length === 0) return null;
  return (
    <Marquee
      label={t('marqueeLabel')}
      words={words}
      tone="jade"
      marks={BRAND_VALUES.map((value) => (
        <ValueIcon key={value} value={value} className="h-full w-auto" />
      ))}
    />
  );
}

/* ── 5, 7, 9. Campaign banners ───────────────────────────────────────────────────────────── */

/**
 * The frame of the reference's campaign banners: inset with a 24 px radius from 640 px, full
 * width on phones; 438 px high and more on wide screens, 538 px on phones.
 */
function BannerFrame({ className, children }: { className: string; children: ReactNode }) {
  return (
    <section className="sm:container-page sm:py-6">
      <div
        className={cn(
          'relative isolate flex min-h-[33.625rem] overflow-hidden sm:min-h-[27.375rem] sm:rounded-banner',
          className,
        )}
      >
        {children}
      </div>
    </section>
  );
}

/** TERAN's packs scattered around a banner's words, as the reference scatters its products. */
const SCATTER: {
  pack: StaticImageData;
  /** Position from 1024 px, and on smaller screens (left/top of the pack, % of the banner). */
  at: [string, string];
  small?: [string, string];
  turn: number;
}[] = [
  { pack: packXc2025, at: ['4%', '9%'], small: ['-5%', '3%'], turn: -16 },
  { pack: packG8810, at: ['14%', '58%'], small: ['3%', '75%'], turn: 13 },
  { pack: pack8830, at: ['26%', '5%'], small: ['74%', '-3%'], turn: -7 },
  { pack: pack8009, at: ['25%', '76%'], small: ['42%', '83%'], turn: 19 },
  { pack: packXc2025, at: ['67%', '71%'], small: ['80%', '71%'], turn: -12 },
  { pack: packG8810, at: ['72%', '3%'], turn: 10 },
  { pack: pack8830, at: ['84%', '41%'], turn: -19 },
  { pack: pack8009, at: ['91%', '-5%'], turn: 16 },
  { pack: packG8810, at: ['93%', '73%'], turn: -8 },
];

/**
 * Section 5, the reference's gift-guide banner: a pastel field with products scattered around a
 * large soft-serif title and a pill. Here the TERAN packs around the brand's story heading.
 */
export async function StoryBanner() {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations('Home');
  const copy = brandCopy[locale];
  return (
    <BannerFrame className="items-center justify-center bg-jade-100 px-6 py-16 text-center">
      {SCATTER.map((item, index) => (
        <Image
          key={`${item.pack.src}-${index}`}
          src={item.pack}
          alt=""
          sizes="96px"
          className={cn(
            'absolute -z-10 h-24 w-auto drop-shadow-[0_14px_14px_rgb(0_0_0_/_0.18)] lg:h-32',
            item.small
              ? 'top-(--small-y) left-(--small-x) lg:top-(--y) lg:left-(--x)'
              : 'hidden lg:top-(--y) lg:left-(--x) lg:block',
          )}
          style={
            {
              '--x': item.at[0],
              '--y': item.at[1],
              '--small-x': item.small?.[0],
              '--small-y': item.small?.[1],
              rotate: `${item.turn}deg`,
            } as CSSProperties
          }
        />
      ))}
      <div className="flex max-w-[34rem] flex-col items-center">
        <h2 className="font-heading text-[2.75rem] leading-[0.95] text-balance text-forest-900 uppercase sm:text-[4rem] lg:text-[4.5rem]">
          {copy.story.heading}
        </h2>
        <Link href="/about" className={cn(PILL, 'mt-8 bg-ivory-50 text-forest-900 lg:mt-10')}>
          {t('storyCta')}
        </Link>
      </div>
    </BannerFrame>
  );
}

/** Sparkles at the top corner and beside the pill, clear of the words. */
const PHOTO_SPARKLES: SparklePoint[] = [
  { x: '3.5%', y: '11%', size: 24 },
  { x: '25%', y: '79%', size: 34 },
  { x: '28.5%', y: '89%', size: 20 },
];

/**
 * The reference's photographic campaign banner: a picture filling the frame, the words on its
 * left from 1024 px (centred over its top on phones) — 110 px condensed capitals, a line of text
 * and a pill — with sparkles.
 */
function PhotoBanner({
  image,
  title,
  text,
  cta,
  href,
}: {
  image: StaticImageData;
  title: string;
  text?: string;
  cta: string;
  href: string;
}) {
  return (
    <BannerFrame className="on-dark bg-forest-950 text-ivory-50">
      <Image
        src={image}
        alt=""
        fill
        sizes="(min-width: 1440px) 1312px, 100vw"
        className="-z-20 object-cover object-bottom lg:object-center"
      />
      <span
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-b from-forest-950/85 via-forest-950/45 to-forest-950/0 lg:bg-linear-to-r lg:from-forest-950/80 lg:via-forest-950/35"
      />
      <Sparkles points={PHOTO_SPARKLES} className="-z-10 hidden text-gold-300 lg:block" />
      <div className="flex w-full flex-col items-center px-6 pt-10 text-center lg:items-start lg:justify-center lg:px-16 lg:pt-0 lg:text-left">
        <h2
          className={cn(
            'max-w-[46rem] font-headline text-balance text-gold-300',
            bannerHeadline(title),
          )}
        >
          {title}
        </h2>
        {text ? (
          <p className="mt-5 max-w-[30rem] text-[0.9375rem] leading-[1.4] lg:mt-8 lg:text-[1.125rem] lg:leading-normal">
            {text}
          </p>
        ) : null}
        <Link href={href} className={cn(PILL, 'mt-6 bg-ivory-50 text-forest-900 lg:mt-9')}>
          {cta}
        </Link>
      </div>
    </BannerFrame>
  );
}

/**
 * Section 7: the gallery when photographs or films are published; otherwise the premium
 * collection over the tea terraces from the back of the pack.
 */
export async function GalleryBanner() {
  await connection();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('Home');
  const media = await getMedia(locale, { pageSize: 1 }).catch(() => null);
  if (media && media.total > 0) {
    return (
      <PhotoBanner
        image={terraces}
        title={t('galleryTitle')}
        text={t('galleryText')}
        cta={t('galleryCta')}
        href="/media"
      />
    );
  }
  const copy = brandCopy[locale];
  return (
    <PhotoBanner
      image={terraces}
      title={copy.collection.heading}
      text={copy.collection.text}
      cta={t('featuredCta')}
      href={`/collections/${PREMIUM_COLLECTION_SLUG}`}
    />
  );
}

const PACKS = [packXc2025, packG8810, pack8830, pack8009];

/** Sparkles around the packs, as the reference's beside its products. */
const ADVISOR_SPARKLES: SparklePoint[] = [
  { x: '52%', y: '20%', size: 34 },
  { x: '55.5%', y: '30%', size: 20 },
  { x: '95%', y: '14%', size: 26 },
];

/**
 * Section 9, the reference's colour campaign banner: saturated capitals on a pastel field, the
 * products standing on the right (below the words on phones). Here the advisor, with TERAN's packs.
 */
export async function AdvisorBanner() {
  const t = await getTranslations('Home');
  return (
    <BannerFrame className="flex-col bg-gold-100 text-jade-700 lg:flex-row lg:items-center">
      <Sparkles points={ADVISOR_SPARKLES} className="-z-10 hidden text-jade-600 lg:block" />
      <div className="flex flex-col items-center px-6 pt-10 text-center lg:w-[46%] lg:items-start lg:py-12 lg:pr-0 lg:pl-16 lg:text-left">
        <h2 className={cn('font-headline text-balance', bannerHeadline(t('advisorTitle')))}>
          {t('advisorTitle')}
        </h2>
        <p className="mt-5 max-w-[22rem] text-[0.9375rem] leading-[1.4] lg:mt-8 lg:text-[1.125rem] lg:leading-normal">
          {t('advisorText')}
        </p>
        <Link href="/assistant" className={cn(PILL, 'mt-6 bg-ivory-50 text-jade-700 lg:mt-9')}>
          {t('advisorCta')}
        </Link>
      </div>
      <div
        aria-hidden
        className="relative mt-auto flex h-64 items-end justify-center px-4 sm:h-72 lg:mt-0 lg:h-[27rem] lg:flex-1 lg:pr-12"
      >
        <span className="absolute inset-x-[10%] bottom-0 h-[55%] rounded-[50%] bg-ivory-50/70 blur-3xl" />
        {PACKS.map((pack, index) => (
          <Image
            key={pack.src}
            src={pack}
            alt=""
            sizes="(min-width: 1024px) 14vw, 28vw"
            className={cn(
              'relative h-auto w-[25%] max-w-[11.5rem] drop-shadow-[0_24px_24px_rgb(0_0_0_/_0.25)]',
              index % 2 === 1 ? '-mx-[2%] mb-0' : 'mb-[7%]',
            )}
          />
        ))}
      </div>
    </BannerFrame>
  );
}

/* ── 6. Category shortcuts ───────────────────────────────────────────────────────────────── */

/** The reference's tiles share one pastel; each name has its own colour. */
const SHORTCUT_COLOURS = [
  'text-forest-900',
  'text-gold-700',
  'text-jade-700',
  'text-forest-600',
  'text-gold-800',
];

/** Five pastel tiles (210 × 193 px) with category names in coloured capitals, centred. */
export async function CategoryShortcuts() {
  await connection();
  const locale = await getLocale();
  const t = await getTranslations('Home');
  const tree = categoryTree(await getCategories(locale).catch(() => []));
  const stocked = browsableCategories(tree);
  const tops = tree.filter((category) => category.productCount > 0);
  // Subcategories first, then top-level categories not yet listed, up to five.
  const items: NavCategory[] = [];
  for (const category of [...stocked, ...tops]) {
    if (items.length >= 5) break;
    if (!items.some((item) => item.path === category.path)) items.push(category);
  }
  if (items.length === 0) return null;
  return (
    <nav aria-label={t('categoriesTitle')} className="container-page py-4 sm:py-6">
      {/* Phones scroll the tiles sideways; from 640 px they share the row, at most 210 px each. */}
      <ul className="-mx-gutter flex snap-x snap-mandatory scroll-px-gutter gap-3 overflow-x-auto px-gutter py-1 [scrollbar-width:none] sm:mx-0 sm:justify-center sm:overflow-visible sm:px-0 lg:gap-4">
        {items.map((category, index) => (
          <li
            key={category.path}
            className="w-[40%] shrink-0 snap-start sm:w-auto sm:max-w-[13.125rem] sm:min-w-0 sm:flex-1"
          >
            <Link
              href={`/${category.path}`}
              className={cn(
                'flex aspect-[210/193] items-center justify-center rounded-[0.75rem] bg-jade-100 px-3 text-center transition-transform duration-[350ms] ease-out hover:scale-[1.03]',
                SHORTCUT_COLOURS[index % SHORTCUT_COLOURS.length],
              )}
            >
              <span className="font-headline text-[1.75rem] [overflow-wrap:anywhere] lg:text-[2.5rem]">
                {category.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ── 11. Bento ───────────────────────────────────────────────────────────────────────────── */

const BENTO_TONES = [
  {
    tile: 'bg-forest-900',
    title: 'text-gold-300',
    button: 'bg-gold-300 text-forest-950',
    spark: 'text-gold-300',
  },
  {
    tile: 'bg-gold-100',
    title: 'text-jade-700',
    button: 'bg-jade-700 text-ivory-50',
    spark: 'text-jade-600',
  },
  {
    tile: 'bg-jade-700',
    title: 'text-jade-100',
    button: 'bg-jade-100 text-jade-700',
    spark: 'text-jade-100',
  },
  {
    tile: 'bg-sage-200',
    title: 'text-forest-800',
    button: 'bg-forest-800 text-ivory-50',
    spark: 'text-forest-700',
  },
];

/**
 * Four tiles, two by two (stacked on phones), 384 px high: the catalogue's categories and
 * collections with products, each on its own colour with its name in 80 px capitals in a lighter
 * or deeper shade, a pill in that shade and a product standing on the right, with sparkles.
 */
export async function BentoSection() {
  await connection();
  const locale = await getLocale();
  const t = await getTranslations('Home');
  const [categories, collections] = await Promise.all([
    getCategories(locale).catch(() => []),
    getCollections(locale).catch(() => []),
  ]);
  const tree = categoryTree(categories);
  const candidates = [
    ...browsableCategories(tree).map((category) => ({
      key: `c-${category.path}`,
      name: category.name,
      href: `/${category.path}`,
      query: `category=${category.slug}`,
    })),
    ...collections
      .filter((collection) => collection.productCount > 0)
      .map((collection) => ({
        key: `k-${collection.slug}`,
        name: collection.name,
        href: `/collections/${collection.slug}`,
        query: `collection=${collection.slug}`,
      })),
  ].slice(0, 4);
  if (candidates.length < 2) return null;
  const products = await Promise.all(
    candidates.map((candidate) =>
      getProductList(locale, `${candidate.query}&pageSize=4&sort=featured`)
        .then((list) => pickVisual(list.items))
        .catch(() => null),
    ),
  );
  const tiles = candidates.slice(0, candidates.length >= 4 ? 4 : 2);
  return (
    <section aria-label={t('categoriesTitle')} className="container-page py-6 sm:py-8">
      <ul className="grid grid-cols-1 gap-8 sm:gap-6 lg:grid-cols-2">
        {tiles.map((tile, index) => {
          const tone = BENTO_TONES[index % BENTO_TONES.length]!;
          const product = products[index];
          const image = product?.stageImage ?? product?.image ?? null;
          const sources = image ? imageSources(image, 640) : null;
          return (
            <li key={tile.key}>
              <Link
                href={tile.href}
                className={cn(
                  'group relative isolate flex aspect-[336/326] items-center overflow-hidden rounded-banner px-6 py-8 sm:aspect-auto sm:min-h-[24rem] sm:px-[3.75rem]',
                  tone.tile,
                )}
              >
                <Sparkles points={SPARKLES_HIGH} className={cn('-z-10', tone.spark)} />
                <span className="relative z-10 max-w-[55%]">
                  <span
                    className={cn(
                      'block font-headline text-[3rem] [overflow-wrap:anywhere] sm:text-[5rem]',
                      tone.title,
                    )}
                  >
                    {tile.name}
                  </span>
                  <span
                    className={cn(
                      'mt-6 inline-flex h-[3.125rem] items-center rounded-full px-8 text-[0.95625rem] font-medium transition-[filter] duration-200 ease-out group-hover:brightness-[1.06]',
                      tone.button,
                    )}
                  >
                    {t('viewCategory')}
                  </span>
                </span>
                {image && sources ? (
                  // eslint-disable-next-line @next/next/no-img-element -- API renditions (ADR-009)
                  <img
                    src={sources.src}
                    srcSet={sources.srcSet}
                    sizes="(min-width: 1024px) 20vw, 39vw"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className={cn(
                      'absolute right-[4%] bottom-[6%] h-[82%] w-[44%] object-contain drop-shadow-[0_28px_28px_rgb(0_0_0_/_0.28)] transition-transform duration-500 ease-[var(--ease-soft)] group-hover:-translate-y-1 group-hover:rotate-[-2deg]',
                      !image.transparent && 'rounded-tile object-cover',
                    )}
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The product that shows best standing in a tile: one with a cut-out first, then any picture. */
function pickVisual(items: ProductSummaryDto[]): ProductSummaryDto | null {
  return items.find((item) => item.stageImage) ?? items.find((item) => item.image) ?? null;
}

/* ── 12. Brewing banner ──────────────────────────────────────────────────────────────────── */

/** Sparkles between the words and the guide, and at its foot. */
const BREWING_SPARKLES: SparklePoint[] = [
  { x: '40.5%', y: '14%', size: 30 },
  { x: '43%', y: '23%', size: 18 },
  { x: '97%', y: '91%', size: 24 },
];

/**
 * The reference's full-width feature band (560 px): a tag in a box, 80 px capitals, a line of
 * text and a pill on the left, with sparkles; the pack's brewing guide stands on the right.
 */
export async function BrewingBanner() {
  const t = await getTranslations('Home');
  return (
    <section
      aria-labelledby="brewing-title"
      className="on-dark relative isolate overflow-hidden bg-jade-700 text-ivory-50"
    >
      <Sparkles points={BREWING_SPARKLES} className="-z-10 hidden text-gold-300 lg:block" />
      <div className="container-page grid min-h-[33.625rem] grid-cols-1 items-center gap-10 py-12 lg:min-h-[35rem] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:py-14">
        <div>
          <p className="inline-flex bg-gold-300 px-2.5 py-0.5 font-headline text-[1.375rem] leading-[1.1] text-forest-950 lg:text-[1.75rem]">
            {t('brewingEyebrow')}
          </p>
          <h2
            id="brewing-title"
            className="mt-3 font-headline text-[2.25rem] text-balance text-gold-100 sm:text-[3.5rem] lg:text-[5rem]"
          >
            {t('brewingTitle')}
          </h2>
          <p className="mt-6 max-w-md text-[1rem] leading-normal text-ivory-50">
            {t('brewingText')}
          </p>
          <p className="mt-2 max-w-md text-helper text-ivory-100">{t('brewingNote')}</p>
          <Link href="/journal" className={cn(PILL, 'mt-8 bg-gold-100 text-forest-900')}>
            {t('journalCta')}
          </Link>
        </div>
        <div className="rounded-banner bg-ivory-50 p-2 text-fg shadow-overlay sm:p-3">
          <BrewingGuide />
        </div>
      </div>
    </section>
  );
}

/* ── 14. Values banner ───────────────────────────────────────────────────────────────────── */

/**
 * The reference's full-width statement band (560 px): a painting behind white 80 px capitals, a
 * row of marks and a white pill. Here the tea terraces, the pack's tagline and its four values
 * (where the reference shows certifications — none is claimed).
 */
export async function ValuesBanner() {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations('Home');
  const copy = brandCopy[locale];
  return (
    <section
      aria-labelledby="values-banner-title"
      className="on-dark relative isolate overflow-hidden text-ivory-50"
    >
      <Image src={terraces} alt="" fill sizes="100vw" className="-z-20 object-cover" />
      <span aria-hidden className="absolute inset-0 -z-10 bg-forest-950/55" />
      <div className="container-page flex min-h-[33.625rem] flex-col items-center justify-center py-14 text-center lg:min-h-[35rem]">
        <h2
          id="values-banner-title"
          className="max-w-[31rem] font-headline text-[2.75rem] text-balance sm:text-[4rem] lg:max-w-[50rem] lg:text-[5rem]"
        >
          {copy.tagline}
        </h2>
        <BrandValues locale={locale} tone="dark" className="mt-8 w-full max-w-2xl" />
        <Link href="/about" className={cn(PILL, 'mt-9 bg-ivory-50 text-forest-900')}>
          {t('storyCta')}
        </Link>
      </div>
    </section>
  );
}

/* ── 16. Pair ────────────────────────────────────────────────────────────────────────────── */

/** Two columns, picture over words: the journal's featured article and the business page. */
export async function PairSection() {
  await connection();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('Home');
  const copy = brandCopy[locale];
  const article = (await getArticles(locale, 1, 1, true).catch(() => null))?.items[0] ?? null;
  const cover = article?.cover ? imageSources(article.cover, 960) : null;

  const cards = [
    article
      ? {
          key: 'journal',
          href: `/journal/${article.slug}`,
          title: article.title,
          text: article.excerpt ?? t('journalTitle'),
          cta: t('pairJournalCta'),
          picture:
            cover && article.cover ? (
              // eslint-disable-next-line @next/next/no-img-element -- API renditions (ADR-009)
              <img
                src={cover.src}
                srcSet={cover.srcSet}
                sizes="(min-width: 1024px) 45vw, 100vw"
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <Image
                src={lake}
                alt=""
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            ),
        }
      : null,
    {
      key: 'business',
      href: '/wholesale',
      title: copy.partnership.heading,
      text: copy.partnership.text,
      cta: t('businessCta'),
      picture: (
        <Image
          src={terraces}
          alt=""
          fill
          sizes="(min-width: 1024px) 45vw, 100vw"
          className="object-cover object-right"
        />
      ),
    },
  ].filter((card) => card !== null);

  return (
    <section className="container-page py-12">
      <ul className={cn('grid gap-12 sm:gap-4', cards.length > 1 && 'lg:grid-cols-2')}>
        {cards.map((card) => (
          <li key={card.key} className="flex flex-col">
            <Link
              href={card.href}
              tabIndex={-1}
              aria-hidden
              className="relative block aspect-[648/364] overflow-hidden rounded-[0.75rem] bg-surface-muted"
            >
              {card.picture}
            </Link>
            <h2 className="mt-5 font-heading text-[1.5rem] leading-[1.2] text-fg">{card.title}</h2>
            <p className="mt-1.5 line-clamp-3 text-[1rem] leading-normal text-fg">{card.text}</p>
            <div className="mt-5">
              <ButtonLink href={card.href}>{card.cta}</ButtonLink>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── 17. Slogan band ─────────────────────────────────────────────────────────────────────── */

/**
 * The reference's ribbon above the footer (226 px): a small capital line, a 64 px ribbon of the
 * same words repeated, a second capital line and an underlined link. Here the pack's slogan.
 */
export async function SloganBand() {
  const t = await getTranslations('Home');
  return (
    <section
      aria-label={PACKAGING.slogan.join(' · ')}
      className="on-dark bg-jade-700 py-8 text-center text-ivory-50"
    >
      <p className="container-page text-[0.9375rem] leading-[1.45] font-medium uppercase lg:text-[1.125rem]">
        {BRAND.name}® · {BRAND.descriptor}
      </p>
      <div className="mt-3">
        <Marquee
          label={PACKAGING.slogan.join(' · ')}
          words={PACKAGING.slogan}
          tone="jade-deep"
          size="lg"
          marks={[]}
        />
      </div>
      <div className="container-page mt-3">
        <p
          lang="uz"
          className="text-[0.9375rem] leading-[1.45] font-medium uppercase lg:text-[1.125rem]"
        >
          {PACKAGING.tagline}
        </p>
        <Link
          href="/about"
          className="mt-1 inline-flex min-h-8 items-center text-[1rem] font-semibold tracking-[0.04em] uppercase underline decoration-1 underline-offset-[5px] hover:decoration-2"
        >
          {t('storyCta')}
        </Link>
      </div>
    </section>
  );
}
