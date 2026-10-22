import type {
  CategoryDto,
  IllustrationKey,
  ImageDto,
  Locale,
  PublicVisualDto,
} from '@teran/contracts';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import Image, { type StaticImageData } from 'next/image';
import type { CSSProperties, ReactNode } from 'react';
import { PACK_IMAGES } from '@/components/brand/pack-images';
import { CoverImage } from '@/components/content/cover-image';
import { VisualPicture } from '@/components/content/visual-picture';
import { DemoNotice } from '@/components/ui/demo-notice';
import { COLLECTION_CODES, PACK_COLOURS } from '@/content/brand';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { getCategories, getProductList } from '@/lib/data/catalog';
import { ProductImage } from './product-image';
import { productFamily, type ProductFamily } from './product-family';

/**
 * Each family's header (ADR-051): its own field and ink, so a listing says at once what it holds
 * — the brand's teal for tea, matcha green, the infusions' blush, the cold drinks' summer sky,
 * dark chocolate with gold for chocolates, the warm cream of teaware, black and gold for gift
 * sets (the colours of the home page's family features). Every pairing meets WCAG AA for its text.
 */
const THEMES: Record<
  ProductFamily['key'],
  { field: string; ink: string; text: string; dark: boolean }
> = {
  tea: { field: '--color-forest-900', ink: 'text-ivory-50', text: 'text-ivory-50', dark: true },
  matcha: { field: '--color-matcha', ink: 'text-ivory-50', text: 'text-ivory-50', dark: true },
  infusion: { field: '--color-blush', ink: 'text-wine', text: 'text-wine', dark: false },
  iced: { field: '--color-sky', ink: 'text-ocean', text: 'text-ocean', dark: false },
  water: { field: '--color-sky', ink: 'text-ocean', text: 'text-ocean', dark: false },
  juice: { field: '--color-sky', ink: 'text-ocean', text: 'text-ocean', dark: false },
  sweets: { field: '--color-cocoa', ink: 'text-sun', text: 'text-ivory-50', dark: true },
  teaware: { field: '--color-cream', ink: 'text-fg', text: 'text-fg-muted', dark: false },
  gift: { field: '--color-forest-950', ink: 'text-sun', text: 'text-ivory-50', dark: true },
};

/** The premium collection's warm paper (the tea stage's), its words in ink. */
const PAPER = { field: '--color-paper', ink: 'text-fg', text: 'text-fg-muted', dark: false };

/**
 * How each family's colour arrives (ADR-051): tea, matcha and infusions STEEP in; the cold drinks'
 * sky rises like a level (POUR); chocolates, teaware and gift sets stand still under one pass of
 * LIGHT (a bar's gloss).
 */
const MOTIONS: Record<ProductFamily['key'], 'steep' | 'pour' | 'light'> = {
  tea: 'steep',
  matcha: 'steep',
  infusion: 'steep',
  iced: 'pour',
  water: 'pour',
  juice: 'pour',
  sweets: 'light',
  teaware: 'light',
  gift: 'light',
};

/**
 * The shade the family's colour steeps over: a little deeper for the dark fields, a little paler
 * for the light ones, so the words read on both while the colour spreads.
 */
function baseOf(theme: { field: string; dark: boolean }, key: ProductFamily['key']): string {
  const field = `var(${theme.field})`;
  if (key === 'gift') return `color-mix(in oklab, ${field} 86%, var(--color-sun))`;
  return theme.dark
    ? `color-mix(in oklab, ${field} 80%, black)`
    : `color-mix(in oklab, ${field} 62%, white)`;
}

/**
 * Up to three of a listing's own products as the header's pictures — only from beyond its first
 * two rows, so the header never shows what the grid opens with (the owner's rule against repeated
 * blocks): a listing of eight or fewer has none, and its header stands on its colour alone.
 */
export async function listingPictures(
  locale: Locale,
  scope: { category?: string; collection?: string },
): Promise<ImageDto[]> {
  const params = new URLSearchParams({ page: '1', pageSize: '11', sort: 'featured' });
  if (scope.category) params.set('category', scope.category);
  if (scope.collection) params.set('collection', scope.collection);
  params.sort();
  const list = await getProductList(locale, params.toString()).catch(() => null);
  const items = list?.items ?? [];
  if (items.length <= 8) return [];
  return items
    .slice(8)
    .map((product) => product.stageImage ?? product.image)
    .filter((image): image is ImageDto => image !== null)
    .slice(0, 3);
}

/**
 * Listing header: a rounded banner in its family's colours with the title and one or two lines
 * of description on the left. A wide banner set in Admin → Settings fills the whole header, as
 * the reference's collection banners do (with its taller crop on phones); otherwise the right
 * holds the listing's assigned cover, or up to three of its own products set down side by side
 * (packs for TERAN's teas, photographs for the rest), or, with neither, its art. The family's
 * colour steeps in from the pictures' side as the page opens and the pictures are set down one
 * after another (ADR-051; movement only, so nothing waits to be seen). Under it: optional
 * navigation (category chips) and the demo note. Kept short so products start on the first screen
 * of a phone.
 */
export function ListingHeader({
  eyebrow,
  title,
  description,
  illustrationKey,
  image,
  banner,
  pictures = [],
  leaf = null,
  packs = false,
  still = false,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string | null;
  illustrationKey?: IllustrationKey | null;
  /** The category's or collection's assigned cover. */
  image?: ImageDto | null;
  /** A wide banner from Admin → Settings, filling the header; replaces `image` when set. */
  banner?: PublicVisualDto | null;
  /** The listing's own products' pictures (listingPictures), shown without a cover or banner. */
  pictures?: ImageDto[];
  /** A kind of tea's own dry leaf (components/brand/leaf-images.ts), in a circle. */
  leaf?: StaticImageData | null;
  /** TERAN's five pouches standing in the pack order, on warm paper (the premium collection). */
  packs?: boolean;
  /**
   * No entrance: for a header rendered twice (a static shell, then with its banner), where a
   * second entrance would replay the first; and for the catalogue as a whole, which has no family.
   */
  still?: boolean;
  /** Rendered under the banner, e.g. <CategoryChips />. */
  children?: ReactNode;
}) {
  const family = productFamily(illustrationKey);
  const theme = packs ? PAPER : THEMES[family.key];
  const motion = packs ? 'set' : MOTIONS[family.key];
  const fan = !banner && !image && !leaf && !packs && pictures.length > 0 ? pictures : null;
  const field = banner ? null : (
    // The family's colour: steeping in from the right, rising like a level (cold drinks), or
    // still under one pass of light (teaware, gift sets) — and, once there, a pool of light
    // where it came from.
    <span
      aria-hidden
      className={cn(
        'absolute inset-0 -z-20',
        !still && motion === 'steep' && 'steep-in',
        !still && motion === 'pour' && 'pour-in',
      )}
      style={
        {
          backgroundColor: `var(${theme.field})`,
          backgroundImage: `radial-gradient(ellipse 55% 85% at 84% 50%, rgb(255 255 255 / ${theme.dark ? 0.1 : 0.32}), transparent 70%)`,
          '--steep-at': '88% 50%',
        } as CSSProperties
      }
    />
  );
  return (
    <header className="mt-3 sm:mt-5">
      <div
        className={cn(
          'relative isolate overflow-hidden rounded-[1.5rem]',
          packs
            ? 'grid grid-cols-1 items-center sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]'
            : 'flex min-h-[11rem] items-center sm:min-h-[13.5rem]',
          theme.dark && 'on-dark',
          banner ? 'bg-forest-900 text-ivory-50' : theme.ink,
        )}
        style={banner ? undefined : { backgroundColor: baseOf(theme, family.key) }}
      >
        {field}
        {!still && motion === 'light' ? (
          <span aria-hidden className="light-pass pointer-events-none absolute inset-0 -z-10" />
        ) : null}
        {banner ? (
          <div aria-hidden className="absolute inset-0 -z-10">
            <VisualPicture
              visual={banner}
              sizes="(min-width: 1440px) 1312px, calc(100vw - 2rem)"
              priority
            />
            {/* Keeps the white title readable over a light picture. */}
            <span className="absolute inset-0 bg-linear-to-r from-forest-950/60 via-forest-950/20 to-transparent" />
          </div>
        ) : leaf ? (
          <div
            aria-hidden
            className="absolute inset-y-0 right-[4%] -z-10 flex items-center sm:right-[7%]"
          >
            <span
              className={cn(
                'relative block size-[7.5rem] overflow-hidden rounded-full shadow-[0_18px_36px_-14px_rgb(0_0_0_/_0.45)] ring-4 ring-ivory-50/85 sm:size-[11rem]',
                !still && 'unfurl-in',
              )}
            >
              <Image
                src={leaf}
                alt=""
                fill
                sizes="(min-width: 640px) 11rem, 7.5rem"
                className="object-cover"
              />
            </span>
          </div>
        ) : fan ? (
          <div
            aria-hidden
            className="absolute inset-y-0 right-0 -z-10 flex w-[46%] items-center justify-center pr-[3%] sm:w-[44%] lg:w-[40%]"
          >
            {fan.map((picture, index) => (
              <span
                key={picture.src}
                className={cn(
                  'relative -mx-[3%] block aspect-square w-[46%] shrink-0 overflow-hidden rounded-[1.25rem] shadow-[0_18px_36px_-14px_rgb(0_0_0_/_0.45)] sm:w-[32%]',
                  !still && 'set-down',
                  index > 1 && 'max-sm:hidden',
                )}
                style={{ zIndex: index === 1 ? 2 : 1, '--i': index } as CSSProperties}
              >
                <ProductImage
                  image={picture}
                  name=""
                  sizes="(min-width: 640px) 12rem, 7rem"
                  decorative
                />
              </span>
            ))}
          </div>
        ) : image ? (
          <div
            aria-hidden
            className="cat-card absolute inset-y-0 right-0 -z-10 w-[62%] opacity-60 sm:w-[52%] sm:opacity-100"
          >
            <CoverImage
              image={image}
              sizes="(min-width: 1024px) 40vw, 60vw"
              priority
              cutoutInset="p-4"
            />
            {/* Keeps the title readable where the cover reaches under it (the teal it sits on). */}
            {theme.dark && family.key === 'tea' ? (
              <span className="absolute inset-0 bg-linear-to-r from-forest-900 via-forest-900/40 to-transparent sm:via-forest-900/10" />
            ) : null}
          </div>
        ) : null}
        <div
          className={cn(
            'px-6 py-8 sm:px-10',
            packs
              ? 'sm:py-10'
              : fan || leaf
                ? 'max-w-[60%] sm:max-w-[58%] lg:max-w-[52%]'
                : 'max-w-[min(40rem,88%)] lg:max-w-[56%]',
          )}
        >
          {eyebrow ? (
            <p className={cn('mb-2 text-eyebrow', banner ? 'text-ivory-50' : theme.text)}>
              {eyebrow}
            </p>
          ) : null}
          <h1
            className={cn(
              'font-headline text-[2.25rem] leading-[1.15] text-balance break-words [--heading-case:none] [--headline-weight:600] sm:text-[3.125rem] lg:text-[3.75rem]',
              banner ? 'text-ivory-50' : theme.ink,
            )}
          >
            {title}
          </h1>
          {description ? (
            <p
              className={cn(
                'mt-3 max-w-[34rem] text-[1rem] leading-normal text-pretty sm:line-clamp-3',
                banner ? 'text-ivory-50' : theme.text,
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
        {packs ? (
          // TERAN's five standing in the pack order, each code in its pack's colour beneath it.
          <ul
            aria-hidden
            className="flex items-end justify-center gap-1 px-4 pb-7 sm:gap-2 sm:px-8 sm:py-8"
          >
            {COLLECTION_CODES.map((code, index) => (
              <li key={code} className="flex w-1/5 max-w-[7.5rem] flex-col items-center gap-2">
                <span
                  className={cn('block w-full', !still && 'set-down')}
                  style={{ '--i': index } as CSSProperties}
                >
                  <Image
                    src={PACK_IMAGES[code]}
                    alt=""
                    priority={index === 0}
                    sizes="(min-width: 640px) 7.5rem, 18vw"
                    className="h-auto w-full drop-shadow-[0_16px_16px_rgb(32_24_8_/_0.3)]"
                  />
                </span>
                <span
                  className="font-headline text-[0.875rem] tracking-[0.02em] sm:text-[1.125rem]"
                  style={{ color: PACK_COLOURS[code] }}
                >
                  {code}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {children}
      <DemoNotice variant="inline" className="mt-4" />
    </header>
  );
}

/** The header's footprint while it loads: the same size and corners, in a neutral grey. */
export function ListingHeaderSkeleton({ chips = true }: { chips?: boolean }) {
  return (
    <div aria-hidden className="mt-3 sm:mt-5">
      <div className="h-[11rem] animate-pulse rounded-[1.5rem] bg-surface-sunken motion-reduce:animate-none sm:h-[13.5rem]" />
      {chips ? <CategoryChipsFallback /> : null}
    </div>
  );
}

const CHIP_ROW =
  '-mx-gutter mt-5 flex gap-2 overflow-x-auto px-gutter py-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0';
const CHIP =
  'inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-body-sm font-medium whitespace-nowrap transition-colors duration-150';

export interface ChipLink {
  href: string;
  name: string;
  current: boolean;
}

/** A row of category links; the current one is marked with aria-current. */
export function CategoryChipRow({ label, items }: { label: string; items: ChipLink[] }) {
  return (
    <nav aria-label={label}>
      <ul className={CHIP_ROW}>
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={item.current ? 'page' : undefined}
              className={cn(
                CHIP,
                item.current
                  ? 'border-brand bg-brand text-fg-inverse'
                  : 'border-line-strong/45 bg-surface text-fg hover:border-brand/60',
              )}
            >
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Top-level categories with products as links ("All products" first), for the all-products
 * listing; a new category joins them once it has products.
 */
export async function CategoryChips({
  active,
  categories,
  withAll = true,
}: {
  /** Slug of the current category; omit on the all-products page. */
  active?: string;
  categories: CategoryDto[];
  /** "All products" first (not where the page offers it as its own action). */
  withAll?: boolean;
}) {
  const t = await getTranslations('Catalog');
  const items: ChipLink[] = [
    ...(withAll
      ? [{ href: '/catalog', name: t('shopAllTitle'), current: active === undefined }]
      : []),
    ...categories
      .filter((category) => category.parentSlug === null && category.productCount > 0)
      .map((category) => ({
        href: `/${category.path}`,
        name: category.name,
        current: category.slug === active,
      })),
  ];
  return <CategoryChipRow label={t('subcategories')} items={items} />;
}

/** Loads the categories at request time (for pages that have not fetched them already). */
export async function CategoryChipsLoader({
  active,
  withAll,
}: {
  active?: string;
  withAll?: boolean;
}) {
  await connection();
  const locale = await getLocale();
  const categories = await getCategories(locale).catch(() => null);
  if (!categories || categories.length === 0) return null;
  return <CategoryChips active={active} categories={categories} withAll={withAll} />;
}

export function CategoryChipsFallback() {
  return (
    <div aria-hidden className={CHIP_ROW}>
      {['w-24', 'w-28', 'w-28', 'w-24', 'w-20', 'w-32', 'w-28'].map((width, index) => (
        <div
          key={index}
          className={cn(
            'h-9 shrink-0 animate-pulse rounded-full bg-surface-sunken/60 motion-reduce:animate-none',
            width,
          )}
        />
      ))}
    </div>
  );
}
