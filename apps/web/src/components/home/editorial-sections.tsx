import type { Locale, ProductSummaryDto, PublicVisualDto } from '@teran/contracts';
import { getLocale, getTranslations } from 'next-intl/server';
import Image, { type StaticImageData } from 'next/image';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import type { CSSProperties, ReactNode } from 'react';
import { TeaTypeArt } from '@/components/brand/illustrations';
import { BrandValues } from '@/components/brand/ornaments';
import { RIBBON_STICKERS, StickerDefs } from '@/components/brand/stickers';
import { LoopingFilm, type FilmLabels } from '@/components/content/looping-film';
import { VisualPicture } from '@/components/content/visual-picture';
import { BRAND, brandCopy, PACKAGING, PREMIUM_COLLECTION_SLUG } from '@/content/brand';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { getCategories, getCollections, getProductList } from '@/lib/data/catalog';
import { getArticles, getMedia, getPublicSettings } from '@/lib/data/content';
import { fitWidth } from '@/lib/fit';
import { showGallery } from '@/lib/site';
import { filmPosition, visualFor } from '@/lib/visuals';
import {
  browsableCategories,
  categoryTree,
  imageSources,
  type NavCategory,
} from '@/lib/navigation';
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

/** The reference's pill: 50 px high, 15.3 px text, brighter on a soft shadow when pointed at. */
const PILL =
  'pill-hover inline-flex h-[3.125rem] items-center justify-center rounded-full px-8 text-[0.95625rem] font-medium';

/**
 * A banner's whole surface as a link, under its words, as the reference's: a pointer anywhere on
 * the picture follows it (the words' column stops it, apart from the title and the pill, which
 * are links themselves), while the keyboard and screen readers use the banner's own pill.
 */
function SurfaceLink({ href }: { href: string }) {
  return <Link href={href} tabIndex={-1} aria-hidden className="absolute inset-0 -z-[5]" />;
}

/**
 * The promo strip's surface link, over its words as the reference's: a pointer anywhere on the
 * strip, the words included, follows it (the tilted sticker stays above it, unlinked).
 */
function StripLink({ href }: { href: string }) {
  return <Link href={href} tabIndex={-1} aria-hidden className="absolute inset-0" />;
}

/**
 * A campaign headline's size by its length, so TERAN's longer lines keep the reference's two or
 * three lines: its 110 px (56 px on phones) for short headlines, smaller for longer ones.
 */
function bannerHeadline(title: string): string {
  if (title.length <= 18) return 'text-[3.5rem] lg:text-[6.875rem]';
  if (title.length <= 28) return 'text-[3rem] lg:text-[5.5rem]';
  return 'text-[2.5rem] lg:text-[4.5rem]';
}

/**
 * A home-page picture set in Admin → Settings (see FIXED_VISUAL_SLOTS), read at request time; null
 * keeps the section's own artwork.
 */
async function homeVisual(slot: string): Promise<PublicVisualDto | null> {
  await connection();
  const locale = await getLocale();
  return visualFor(await getPublicSettings(locale).catch(() => null), slot);
}

/** The reference's full-width band, 2560 × 747 at its widest: a film's band keeps to it. */
const BAND_RATIO = 2560 / 747;

/**
 * A full-width band's picture proportions: as the reference's bands, it is as tall as its
 * photograph at the window's width (a film's band as the reference's band), never under 560 px.
 */
function bandRatio(photo: PublicVisualDto | null): CSSProperties | undefined {
  if (!photo) return undefined;
  const ratio = photo.video ? BAND_RATIO : photo.image.width / photo.image.height;
  return { '--band-ratio': ratio.toFixed(4) } as CSSProperties;
}

/** The pause button's corner in a banner: bottom left on phones, top right from 1024 px. */
const BANNER_FILM_CONTROLS = 'bottom-4 left-4 lg:top-6 lg:right-6 lg:bottom-auto lg:left-auto';

/**
 * A photograph filling its frame from behind (the frame sets the size, so nothing moves), and the
 * place's film looping over it when it has one (`film` says where its pause button goes).
 */
function PhotoFill({
  photo,
  sizes,
  className,
  film,
}: {
  photo: PublicVisualDto;
  sizes: string;
  className?: string;
  film?: { labels: FilmLabels; controls: string };
}) {
  const playing = photo.video && film ? photo.video : null;
  return (
    <>
      <div aria-hidden className={cn('absolute inset-0 -z-20', className)}>
        <VisualPicture
          visual={photo}
          sizes={sizes}
          position={filmPosition(playing)}
          phonePosition={filmPosition(playing && (photo.mobileVideo ?? playing))}
        />
      </div>
      {playing && film ? (
        <LoopingFilm
          film={playing}
          phoneFilm={photo.mobileVideo}
          labels={film.labels}
          controlsClassName={film.controls}
        />
      ) : null}
    </>
  );
}

/** The film's pause button labels. */
async function filmLabels(): Promise<FilmLabels> {
  const t = await getTranslations('Home');
  return { pause: t('filmPause'), play: t('filmPlay') };
}

/**
 * A veil on the words' side of a banner over a film (the top on phones, the left from 1024 px), so
 * the words stay readable over moving, bright footage.
 */
function FilmVeil() {
  return (
    <span
      aria-hidden
      className="absolute inset-0 -z-10 bg-linear-to-b from-forest-950/70 via-forest-950/30 via-45% to-forest-950/0 to-75% lg:bg-linear-to-r lg:from-forest-950/70 lg:via-forest-950/25 lg:via-40% lg:to-forest-950/0 lg:to-70%"
    />
  );
}

/* ── 1. Promo strip ──────────────────────────────────────────────────────────────────────── */

/**
 * The reference's dark promotional strip under the header (80 px), carrying TERAN's own collection
 * instead of an offer: the descriptor in teal, the collection's name and its line, the pack's
 * slogan as a tilted sticker (from 1200 px) and the shop pill. As on the reference the whole strip
 * leads to the collection. Phones keep the name and the pill. Hidden when no collection has
 * products.
 */
export async function PromoStrip() {
  await connection();
  const locale = (await getLocale()) as Locale;
  const [t, collectionList] = await Promise.all([
    getTranslations('Home'),
    getCollections(locale).catch(() => []),
  ]);
  const collections = collectionList.filter((collection) => collection.productCount > 0);
  const collection =
    collections.find((candidate) => candidate.slug === PREMIUM_COLLECTION_SLUG) ?? collections[0];
  if (!collection) return null;
  const copy = brandCopy[locale];
  const href = `/collections/${collection.slug}`;
  return (
    <section aria-label={collection.name} className="on-dark bg-forest-950 text-ivory-50">
      <div className="relative isolate mx-auto flex min-h-20 max-w-[120rem] items-center justify-between gap-3 px-[1.375rem] py-4 min-[46.875rem]:gap-5 min-[46.875rem]:px-12 min-[90rem]:gap-6 min-[90rem]:px-[7.5rem] min-[160rem]:px-16">
        <StripLink href={href} />
        <p className="hidden font-headline text-[1.75rem] leading-[1.05] whitespace-nowrap text-gold-300 min-[46.875rem]:block min-[90rem]:text-[2rem]">
          {BRAND.descriptor}
        </p>
        <p className="min-w-0">
          <span className="block font-headline text-[2rem] leading-[1.05] [--headline-weight:600] [overflow-wrap:anywhere] min-[46.875rem]:inline min-[46.875rem]:text-[1.75rem] min-[90rem]:text-[2rem]">
            {collection.name}
          </span>
          <span className="block font-condensed text-[1rem] leading-[1.34] min-[46.875rem]:ml-2 min-[46.875rem]:inline min-[46.875rem]:leading-[2.1]">
            {copy.collection.heading}
          </span>
        </p>
        <p
          lang="uz"
          className="text-sticker hidden -rotate-6 text-[1.575rem] leading-none font-semibold whitespace-nowrap text-ivory-50 uppercase min-[75rem]:block"
        >
          {PACKAGING.slogan[2]}
        </p>
        <Link
          href={href}
          className={cn(PILL, 'relative z-[1] h-12 shrink-0 bg-gold-300 px-6 text-fg sm:px-8')}
        >
          {t('promoCta')}
        </Link>
      </div>
    </section>
  );
}

/* ── 3. Category marquee ─────────────────────────────────────────────────────────────────── */

/**
 * The reference's ribbon: the catalogue's categories with products and the pack's slogan, colour
 * stickers of TERAN's tea things between, in the reference's sticker style. Every word is a link,
 * as the reference's: a category to its page, the slogan to TERAN's story.
 */
export async function CategoryMarquee() {
  await connection();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('Home');
  const tree = categoryTree(await getCategories(locale).catch(() => []));
  const items = [
    ...tree.flatMap((top) =>
      [top, ...top.children].map((category) => ({
        label: category.name,
        href: `/${category.path}`,
      })),
    ),
    ...PACKAGING.slogan.map((label) => ({ label, href: '/about' })),
  ];
  if (items.length === 0) return null;
  return (
    <>
      <StickerDefs />
      <Marquee
        label={t('marqueeLabel')}
        items={items}
        tone="lavender"
        marks={RIBBON_STICKERS.map((Sticker, index) => (
          <Sticker key={index} />
        ))}
      />
    </>
  );
}

/* ── 5, 7, 9. Campaign banners ───────────────────────────────────────────────────────────── */

/**
 * The frame of the reference's campaign banners: inset with a 32 px radius from 640 px, full
 * width on phones; 438 px high from 1440 px (380 px below, 538 px on phones), or `tall` (500 px).
 * The whole surface leads to `href`.
 */
function BannerFrame({
  className,
  href,
  tall = false,
  children,
}: {
  className: string;
  href: string;
  tall?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="sm:container-page sm:py-6">
      <div
        className={cn(
          'relative isolate flex min-h-[33.625rem] overflow-hidden sm:min-h-[23.75rem] sm:rounded-banner',
          tall ? 'min-[90rem]:min-h-[31.25rem]' : 'min-[90rem]:min-h-[27.375rem]',
          className,
        )}
      >
        <SurfaceLink href={href} />
        {children}
      </div>
    </section>
  );
}

/** A banner's title as a link too (pointer only: the pill is the keyboard's way there). */
function TitleLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} tabIndex={-1} className="block">
      {children}
    </Link>
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
export async function StoryBanner({ withPhoto = false }: { withPhoto?: boolean }) {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations('Home');
  const copy = brandCopy[locale];
  // A campaign photograph (Admin → Settings) replaces the scattered packs, as the reference's.
  const photo = withPhoto ? await homeVisual('home.banner.1') : null;
  return (
    <BannerFrame
      href="/about"
      className="items-center justify-center bg-lavender px-6 py-16 text-center"
    >
      {photo ? <PhotoFill photo={photo} sizes="(min-width: 1920px) 1792px, 100vw" /> : null}
      {(photo ? [] : SCATTER).map((item, index) => (
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
        <h2 className="font-heading text-[2.75rem] leading-[0.95] text-balance text-cherry uppercase sm:text-[4rem] lg:text-[4.5rem]">
          <TitleLink href="/about">{copy.story.heading}</TitleLink>
        </h2>
        <Link href="/about" className={cn(PILL, 'mt-8 bg-ivory-200 text-wine lg:mt-10')}>
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
  photo,
  labels,
  title,
  text,
  cta,
  href,
}: {
  image: StaticImageData;
  /**
   * A campaign photograph from Admin → Settings, shown as the reference shows its: no veil (a
   * film gets one on the words' side).
   */
  photo?: PublicVisualDto | null;
  labels: FilmLabels;
  title: string;
  text?: string;
  cta: string;
  href: string;
}) {
  return (
    <BannerFrame href={href} className="on-dark bg-forest-950 text-ivory-50">
      {photo ? (
        <>
          <PhotoFill
            photo={photo}
            sizes="(min-width: 1920px) 1792px, 100vw"
            film={{ labels, controls: BANNER_FILM_CONTROLS }}
          />
          {photo.video ? <FilmVeil /> : null}
        </>
      ) : (
        <>
          <Image
            src={image}
            alt=""
            fill
            sizes="(min-width: 1920px) 1792px, 100vw"
            className="-z-20 object-cover object-bottom lg:object-center"
          />
          <span
            aria-hidden
            className="absolute inset-0 -z-10 bg-linear-to-b from-forest-950/85 via-forest-950/45 to-forest-950/0 lg:bg-linear-to-r lg:from-forest-950/80 lg:via-forest-950/35"
          />
        </>
      )}
      <Sparkles points={PHOTO_SPARKLES} className="-z-10 hidden text-sun lg:block" />
      {/* The words' column takes the banner's left 48 % from 1024 px, as the reference's, so the
          picture beside it stays part of the surface link. */}
      <div className="flex w-full flex-col items-center px-6 pt-10 text-center lg:w-[48%] lg:shrink-0 lg:items-start lg:justify-center lg:px-16 lg:pt-0 lg:text-left">
        <h2
          className={cn('max-w-[46rem] font-headline text-balance text-sun', bannerHeadline(title))}
        >
          <TitleLink href={href}>{title}</TitleLink>
        </h2>
        {text ? (
          <p className="mt-5 max-w-[30rem] text-[0.9375rem] leading-[1.4] lg:mt-8 lg:text-[1.125rem] lg:leading-normal">
            {text}
          </p>
        ) : null}
        <Link
          href={href}
          className={cn(PILL, 'mt-6 lg:mt-9', photo ? 'bg-ivory-50 text-fg' : 'bg-cream text-fg')}
        >
          {cta}
        </Link>
      </div>
    </BannerFrame>
  );
}

/**
 * Section 7: the gallery when photographs or films are published and the gallery is shown
 * (lib/site showGallery); otherwise the premium collection over the tea terraces from the back of
 * the pack.
 */
export async function GalleryBanner() {
  await connection();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('Home');
  const [media, photo, labels] = await Promise.all([
    getMedia(locale, { pageSize: 1 }).catch(() => null),
    homeVisual('home.banner.2'),
    filmLabels(),
  ]);
  if (showGallery && media && media.total > 0) {
    return (
      <PhotoBanner
        image={terraces}
        photo={photo}
        labels={labels}
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
      photo={photo}
      labels={labels}
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
    <BannerFrame
      href="/assistant"
      tall
      className="flex-col bg-gold-100 text-jade-700 lg:flex-row lg:items-center"
    >
      <Sparkles points={ADVISOR_SPARKLES} className="-z-10 hidden text-jade-600 lg:block" />
      <div className="flex flex-col items-center px-6 pt-10 text-center lg:w-[46%] lg:items-start lg:py-12 lg:pr-0 lg:pl-16 lg:text-left">
        <h2 className={cn('font-headline text-balance', bannerHeadline(t('advisorTitle')))}>
          <TitleLink href="/assistant">{t('advisorTitle')}</TitleLink>
        </h2>
        <p className="mt-5 max-w-[22rem] text-[0.9375rem] leading-[1.4] lg:mt-8 lg:text-[1.125rem] lg:leading-normal">
          {t('advisorText')}
        </p>
        <Link href="/assistant" className={cn(PILL, 'mt-6 bg-ivory-50 text-jade-700 lg:mt-9')}>
          {t('advisorCta')}
        </Link>
      </div>
      <PackRow />
    </BannerFrame>
  );
}

/** The four packs side by side on a soft light, the banner's right half (its bottom on phones). */
function PackRow() {
  return (
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
  );
}

/**
 * In the advisor banner's place while the advisor is hidden (lib/site showAdvisor): how to order,
 * with one pill to the contact page (its phones, Telegram and WhatsApp), as the reference's banner
 * has one pill, and the packs beside the words. 500 px high, as the reference's third banner.
 */
export async function OrderBanner() {
  await connection();
  const locale = await getLocale();
  const [t, tn, settings, labels] = await Promise.all([
    getTranslations('Product'),
    getTranslations('Nav'),
    getPublicSettings(locale).catch(() => null),
    filmLabels(),
  ]);
  // A campaign photograph (Admin → Settings) or film behind the words, instead of the packs.
  const photo = visualFor(settings, 'home.banner.3');
  return (
    <BannerFrame
      href="/contact"
      tall
      className="on-dark flex-col bg-matcha text-ivory-50 lg:flex-row lg:items-center"
    >
      {photo ? (
        <PhotoFill
          photo={photo}
          sizes="(min-width: 1920px) 1792px, 100vw"
          film={{ labels, controls: BANNER_FILM_CONTROLS }}
        />
      ) : null}
      {photo?.video ? <FilmVeil /> : null}
      <Sparkles points={ADVISOR_SPARKLES} className="-z-10 hidden text-gold-100 lg:block" />
      <div className="flex flex-col items-center px-6 pt-10 text-center lg:w-[46%] lg:items-start lg:py-12 lg:pr-0 lg:pl-16 lg:text-left">
        <h2 className={cn('font-headline text-balance', bannerHeadline(t('orderByContactTitle')))}>
          <TitleLink href="/contact">{t('orderByContactTitle')}</TitleLink>
        </h2>
        <p className="mt-5 max-w-[24rem] text-[0.9375rem] leading-[1.4] lg:mt-8 lg:text-[1.125rem] lg:leading-normal">
          {t('orderByContactText')}
        </p>
        <Link href="/contact" className={cn(PILL, 'mt-6 bg-ivory-50 text-jade-700 lg:mt-9')}>
          {tn('contact')}
        </Link>
      </div>
      {photo ? null : <PackRow />}
    </BannerFrame>
  );
}

/* ── 6. Category shortcuts ───────────────────────────────────────────────────────────────── */

/** The reference's tiles share one pastel; each name has its own colour. */
const SHORTCUT_COLOURS = [
  'text-wine',
  'text-cherry',
  'text-matcha-ink',
  'text-navy',
  'text-tangerine-ink',
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
    <nav aria-label={t('categoriesTitle')} className="container-page">
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
                'relative flex aspect-[210/193] items-center justify-center rounded-[0.75rem] bg-jade-100 px-3 text-center transition-transform duration-[350ms] ease-[ease] hover:z-[1] hover:scale-[1.02] focus-visible:z-[1] focus-visible:scale-[1.02]',
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

/** The reference's four bento tiles: tangerine, wine, navy and lavender, each with its own ink. */
const BENTO_TONES = [
  {
    tile: 'bg-tangerine',
    // The reference's lavender is 2.1:1 on tangerine; its palest tint passes for large type.
    title: 'text-lavender-light',
    button: 'bg-lavender text-fg',
    spark: 'text-lavender',
  },
  {
    tile: 'bg-wine',
    title: 'text-blush',
    button: 'bg-blush text-wine',
    spark: 'text-blush',
  },
  {
    // The reference's third tile: a softer navy, and its photograph deepened.
    tile: 'bg-[#1b4578]',
    title: 'text-[#a6ceeb]',
    button: 'bg-[#a6ceeb] text-[#1b4578]',
    spark: 'text-[#a6ceeb]',
    photo: '[filter:contrast(1.25)_brightness(0.8)_saturate(1.1)]',
  },
  {
    tile: 'bg-lavender',
    title: 'text-cherry',
    button: 'bg-cherry text-ivory-50',
    spark: 'text-cherry',
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
  const [categories, collections, settings] = await Promise.all([
    getCategories(locale).catch(() => []),
    getCollections(locale).catch(() => []),
    getPublicSettings(locale).catch(() => null),
  ]);
  // Campaign photographs (Admin → Settings) fill the tiles, as the reference's; a tile without one
  // shows a product of its own category or collection. Only stocked categories and collections
  // make tiles, so a new one (coffee, say) appears here once it has products.
  const photos = [1, 2, 3, 4].map((number) => visualFor(settings, `home.bento.${number}`));
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
          const photo = photos[index] ?? null;
          const product = photo ? null : products[index];
          const image = product?.stageImage ?? product?.image ?? null;
          const sources = image ? imageSources(image, 640) : null;
          return (
            <li key={tile.key}>
              {/* The whole tile leads where its pill does, for a pointer; the pill is the keyboard's and
                  screen readers' way there. */}
              <div
                className={cn(
                  'relative isolate flex aspect-[342/332] items-center overflow-hidden rounded-banner px-6 py-8 sm:aspect-auto sm:min-h-[21.25rem] sm:px-9 min-[90rem]:min-h-[24rem] min-[90rem]:px-[3.75rem]',
                  tone.tile,
                )}
              >
                {photo ? (
                  <PhotoFill
                    photo={photo}
                    sizes="(min-width: 1024px) 644px, 100vw"
                    className={'photo' in tone ? tone.photo : undefined}
                  />
                ) : (
                  <Sparkles points={SPARKLES_HIGH} className={cn('-z-10', tone.spark)} />
                )}
                <SurfaceLink href={tile.href} />
                <span className="@container pointer-events-none relative z-10 w-[55%]">
                  <span
                    className={cn(
                      'block font-headline text-[length:min(3rem,var(--fit))] [overflow-wrap:anywhere] sm:text-[length:min(5rem,var(--fit))]',
                      tone.title,
                    )}
                    // Short names keep the reference's 80 px; a long word gets smaller instead.
                    style={{ '--fit': fitWidth(tile.name, 0.55) } as CSSProperties}
                  >
                    {tile.name}
                  </span>
                  <Link
                    href={tile.href}
                    className={cn(PILL, 'pointer-events-auto mt-4 h-12 sm:mt-8', tone.button)}
                  >
                    {t('viewCategory')}
                    <span className="sr-only">: {tile.name}</span>
                  </Link>
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
                      'pointer-events-none absolute right-[4%] bottom-[6%] h-[82%] w-[44%] object-contain drop-shadow-[0_28px_28px_rgb(0_0_0_/_0.28)]',
                      !image.transparent && 'rounded-tile object-cover',
                    )}
                  />
                ) : null}
              </div>
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
export async function BrewingBanner({ withPhoto = false }: { withPhoto?: boolean }) {
  const t = await getTranslations('Home');
  // A campaign photograph (Admin → Settings) or film fills the band; the guide card then steps
  // aside.
  const [photo, labels] = await Promise.all([
    withPhoto ? homeVisual('home.feature') : null,
    filmLabels(),
  ]);
  return (
    <section
      aria-labelledby="brewing-title"
      className="on-dark relative isolate overflow-hidden bg-jade-700 text-ivory-50"
      style={bandRatio(photo)}
    >
      {photo ? (
        <PhotoFill
          photo={photo}
          sizes="100vw"
          film={{
            labels,
            // In line with the words (the page's frame), at the top right from 1024 px.
            controls:
              'inset-x-0 bottom-4 container-page flex lg:top-6 lg:bottom-auto lg:justify-end',
          }}
        />
      ) : null}
      {photo?.video ? <FilmVeil /> : null}
      <Sparkles points={BREWING_SPARKLES} className="-z-10 hidden text-blush lg:block" />
      <SurfaceLink href="/journal" />
      <div className="pointer-events-none container-page grid min-h-[33.625rem] grid-cols-1 items-center gap-10 py-12 lg:min-h-[max(35rem,calc(100vw/var(--band-ratio,100)))] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:py-14">
        {/* Over a photograph, phones get the words centred at the top, clear of its subject below
            (as the reference's), and the text drops its mention of the guide card. */}
        <div
          className={cn(
            'pointer-events-auto',
            photo &&
              'max-lg:flex max-lg:flex-col max-lg:items-center max-lg:self-start max-lg:text-center',
          )}
        >
          <p className="inline-flex bg-blush px-2.5 py-0.5 font-headline text-[1.375rem] leading-[1.1] text-teal-ink lg:text-[1.75rem]">
            {t('brewingEyebrow')}
          </p>
          <h2
            id="brewing-title"
            className="mt-3 font-headline text-[2.25rem] text-balance text-blush-light sm:text-[3.5rem] lg:text-[5rem]"
          >
            {t('brewingTitle')}
          </h2>
          <p className="mt-6 max-w-md text-[1rem] leading-normal text-ivory-50">
            {photo ? t('brewingTextPhoto') : t('brewingText')}
          </p>
          {photo ? null : (
            <p className="mt-2 max-w-md text-helper text-ivory-50">{t('brewingNote')}</p>
          )}
          <Link href="/journal" className={cn(PILL, 'mt-8 bg-blush text-teal-ink')}>
            {t('journalCta')}
          </Link>
        </div>
        {photo ? null : (
          <div className="pointer-events-auto rounded-banner bg-ivory-50 p-2 text-fg shadow-overlay sm:p-3">
            <BrewingGuide />
          </div>
        )}
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
export async function ValuesBanner({ withPhoto = false }: { withPhoto?: boolean }) {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations('Home');
  const copy = brandCopy[locale];
  const photo = withPhoto ? await homeVisual('home.values') : null;
  return (
    <section
      aria-labelledby="values-banner-title"
      className="on-dark relative isolate overflow-hidden bg-forest-900 text-ivory-50"
      style={bandRatio(photo)}
    >
      {photo ? (
        <>
          <PhotoFill photo={photo} sizes="100vw" />
          {/* A light veil keeps the small labels readable over a bright illustration. */}
          <span aria-hidden className="absolute inset-0 -z-10 bg-forest-950/20" />
        </>
      ) : (
        <>
          <Image src={terraces} alt="" fill sizes="100vw" className="-z-20 object-cover" />
          <span aria-hidden className="absolute inset-0 -z-10 bg-forest-950/55" />
        </>
      )}
      <SurfaceLink href="/about" />
      <div className="pointer-events-none container-page flex min-h-[33.625rem] flex-col items-center justify-center py-14 text-center lg:min-h-[max(35rem,calc(100vw/var(--band-ratio,100)))]">
        <h2
          id="values-banner-title"
          className="pointer-events-auto max-w-[31rem] font-headline text-[2.75rem] text-balance sm:text-[4rem] lg:max-w-[50rem] lg:text-[5rem]"
        >
          {copy.tagline}
        </h2>
        <BrandValues
          locale={locale}
          tone="dark"
          className="pointer-events-auto mt-8 w-full max-w-2xl"
        />
        <Link href="/about" className={cn(PILL, 'pointer-events-auto mt-9 bg-ivory-50 text-fg')}>
          {t('storyCta')}
        </Link>
      </div>
    </section>
  );
}

/* ── 16. Pair ────────────────────────────────────────────────────────────────────────────── */

/**
 * Two columns, picture over words: a journal article and the business page. The article card
 * shows the article's own cover (the newest article that has one, featured first), so the page it
 * opens starts with the same picture; an article without a cover shows its illustration, as its
 * page does. Each picture leads where its pill does.
 */
export async function PairSection() {
  await connection();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('Home');
  const copy = brandCopy[locale];
  const [articles, settings] = await Promise.all([
    getArticles(locale, 1, 6, true).catch(() => null),
    getPublicSettings(locale).catch(() => null),
  ]);
  const items = articles?.items ?? [];
  const article = items.find((item) => item.cover) ?? items[0] ?? null;
  const cover = article?.cover ? imageSources(article.cover, 960) : null;
  // The business card's campaign photograph (Admin → Settings), as the reference's pair.
  const businessPhoto = visualFor(settings, 'home.pair.2');
  const pairSizes = '(min-width: 1024px) 45vw, 100vw';

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
                sizes={pairSizes}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-ivory-200">
                <span className="h-32 w-32 sm:h-40 sm:w-40">
                  <TeaTypeArt kind={article.illustrationKey} />
                </span>
              </span>
            ),
        }
      : null,
    {
      key: 'business',
      href: '/wholesale',
      title: copy.partnership.heading,
      text: copy.partnership.text,
      cta: t('businessCta'),
      picture: businessPhoto ? (
        <VisualPicture visual={businessPhoto} sizes={pairSizes} />
      ) : (
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
    <section className="container-page pt-8 pb-8 sm:pt-12 sm:pb-16">
      {/* The pills are the links for assistive technology; each picture leads to the same place
          for a pointer (hidden from screen readers and the tab order, so nothing is said twice). */}
      <ul
        className={cn(
          'grid gap-x-4 gap-y-10 sm:gap-y-[3.125rem]',
          cards.length > 1 && 'lg:grid-cols-2',
        )}
      >
        {cards.map((card) => (
          <li key={card.key} className="flex flex-col">
            <Link
              href={card.href}
              tabIndex={-1}
              aria-hidden
              className="relative block aspect-[648/364] overflow-hidden rounded-[0.75rem] bg-surface-muted"
            >
              <span className="picture-hover absolute inset-0 block">{card.picture}</span>
            </Link>
            <h2 className="mt-4 font-heading text-[1.5rem] leading-[1.2] text-fg">{card.title}</h2>
            <p className="mt-2 line-clamp-3 text-[1rem] leading-normal text-fg">{card.text}</p>
            <Link
              href={card.href}
              className={cn(PILL, 'mt-4 h-12 self-start bg-forest-900 text-[1rem] text-ivory-50')}
            >
              {card.cta}
            </Link>
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
  // The reference's band above the footer: a line, the moving figures, a line and a link that is
  // underlined while the pointer is anywhere on the band.
  return (
    <section
      aria-label={PACKAGING.slogan.join(' · ')}
      className="group bg-gold-400 pt-7 pb-6 text-center text-fg min-[46.875rem]:pt-8 min-[46.875rem]:pb-4"
    >
      <p className="px-6 text-[0.9375rem] leading-[1.375rem] font-medium tracking-[0.02em] uppercase min-[46.875rem]:text-[1.125rem] min-[46.875rem]:leading-[1.6875rem]">
        {BRAND.name}® · {BRAND.descriptor}
      </p>
      <div className="mt-6 min-[46.875rem]:mt-9">
        <Marquee
          label={PACKAGING.slogan.join(' · ')}
          items={PACKAGING.slogan.map((label) => ({ label }))}
          tone="surf"
          size="lg"
          marks={[]}
        />
      </div>
      <p
        lang="uz"
        className="mt-7 px-6 text-[0.9375rem] leading-[1.375rem] font-medium tracking-[0.02em] uppercase min-[46.875rem]:mt-10 min-[46.875rem]:text-[1.125rem] min-[46.875rem]:leading-[1.6875rem]"
      >
        {PACKAGING.tagline}
      </p>
      <Link
        href="/about"
        className="inline-flex text-[1rem] leading-6 font-semibold tracking-[0.06em] uppercase underline decoration-transparent decoration-1 underline-offset-[3px] transition-[text-decoration-color] duration-200 group-focus-within:decoration-current group-hover:decoration-current"
      >
        {t('storyCta')}
      </Link>
    </section>
  );
}
