import type {
  CategoryDto,
  IllustrationKey,
  ImageDto,
  Locale,
  PublicVisualDto,
} from '@teran/contracts';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import type { CSSProperties, ReactNode } from 'react';
import { CoverImage } from '@/components/content/cover-image';
import { VisualPicture } from '@/components/content/visual-picture';
import { DemoNotice } from '@/components/ui/demo-notice';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { getCategories, getProductList } from '@/lib/data/catalog';
import { CategoryArt } from './category-art';
import { ProductImage } from './product-image';
import { productFamily, type ProductFamily } from './product-family';

/**
 * Each family's header (ADR-051): its own field and ink, so a listing says at once what it holds
 * — the brand's teal for tea, matcha green, the infusions' blush, the cold drinks' summer sky,
 * the warm cream of teaware, black and gold for gift sets (the colours of the home page's family
 * features). Every pairing meets WCAG AA for its text.
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
  teaware: { field: '--color-cream', ink: 'text-fg', text: 'text-fg-muted', dark: false },
  gift: { field: '--color-forest-950', ink: 'text-sun', text: 'text-ivory-50', dark: true },
};

/**
 * The shade the family's colour steeps over: a little deeper for the dark fields, a little paler
 * for the light ones, so the words read on both while the colour spreads.
 */
function baseOf(theme: (typeof THEMES)[ProductFamily['key']], key: ProductFamily['key']): string {
  if (key === 'gift') return `color-mix(in oklab, var(${theme.field}) 86%, var(--color-sun))`;
  return theme.dark
    ? `color-mix(in oklab, var(${theme.field}) 80%, black)`
    : `color-mix(in oklab, var(${theme.field}) 62%, white)`;
}

/** How the pictures stand in the header: turned, raised and in which order (the middle in front). */
const FAN = [
  { turn: -7, rise: 6, z: 1 },
  { turn: 2, rise: 0, z: 3 },
  { turn: 8, rise: 9, z: 2 },
];

/**
 * Up to three of a listing's own products as the header's pictures: a TERAN tea by its pack
 * standing cut out, any other product by its photograph. Nothing when the listing is empty or the
 * API is unavailable (the header then keeps its art).
 */
export async function listingPictures(
  locale: Locale,
  scope: { category?: string; collection?: string },
): Promise<ImageDto[]> {
  const params = new URLSearchParams({ page: '1', pageSize: '3', sort: 'featured' });
  if (scope.category) params.set('category', scope.category);
  if (scope.collection) params.set('collection', scope.collection);
  params.sort();
  const list = await getProductList(locale, params.toString()).catch(() => null);
  return (list?.items ?? [])
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
  /**
   * No entrance: for a header rendered twice (a static shell, then with its banner), where a
   * second entrance would replay the first; and for the catalogue as a whole, which has no family.
   */
  still?: boolean;
  /** Rendered under the banner, e.g. <CategoryChips />. */
  children?: ReactNode;
}) {
  const family = productFamily(illustrationKey);
  const theme = THEMES[family.key];
  const fan = !banner && !image && pictures.length > 0 ? pictures : null;
  return (
    <header className="mt-3 sm:mt-5">
      <div
        className={cn(
          'relative isolate flex min-h-[11rem] items-center overflow-hidden rounded-[1.5rem] sm:min-h-[13.5rem]',
          theme.dark && 'on-dark',
          banner ? 'bg-forest-900 text-ivory-50' : theme.ink,
        )}
        style={banner ? undefined : { backgroundColor: baseOf(theme, family.key) }}
      >
        {banner ? null : (
          // The family's colour, steeping in from the pictures' side.
          <span
            aria-hidden
            className={cn('absolute inset-0 -z-20', !still && 'steep-in')}
            style={
              {
                backgroundColor: `var(${theme.field})`,
                '--steep-at': '88% 50%',
              } as CSSProperties
            }
          />
        )}
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
        ) : fan ? (
          <div
            aria-hidden
            className="absolute inset-y-0 right-0 -z-10 flex w-[46%] items-center justify-center pr-[3%] sm:w-[44%] lg:w-[40%]"
          >
            {fan.map((picture, index) => {
              const place = FAN[fan.length === 1 ? 1 : index]!;
              return (
                <span
                  key={picture.src}
                  className={cn(
                    'relative -mx-[6%] block w-[46%] shrink-0 sm:w-[34%]',
                    !still && 'set-down',
                    index > 1 && 'max-sm:hidden',
                    picture.transparent
                      ? 'aspect-[3/4] drop-shadow-[0_18px_18px_rgb(0_0_0_/_0.28)]'
                      : 'aspect-square overflow-hidden rounded-[1.25rem] shadow-[0_18px_36px_-14px_rgb(0_0_0_/_0.45)] ring-4 ring-white/85',
                  )}
                  style={
                    {
                      zIndex: place.z,
                      rotate: `${place.turn}deg`,
                      translate: `0 ${place.rise}%`,
                      '--i': index,
                    } as CSSProperties
                  }
                >
                  <ProductImage
                    image={picture}
                    name=""
                    sizes="(min-width: 640px) 12rem, 7rem"
                    decorative
                  />
                </span>
              );
            })}
          </div>
        ) : (
          <div
            aria-hidden
            className="cat-card absolute inset-y-0 right-0 -z-10 w-[62%] opacity-60 sm:w-[52%] sm:opacity-100"
          >
            {image ? (
              <CoverImage
                image={image}
                sizes="(min-width: 1024px) 40vw, 60vw"
                priority
                cutoutInset="p-4"
              />
            ) : (
              <CategoryArt
                category={{ image: null, illustrationKey: illustrationKey ?? null }}
                sizes="20rem"
              />
            )}
            {/* Keeps the title readable where the art reaches under it (the teal it sits on). */}
            {theme.dark && family.key === 'tea' ? (
              <span className="absolute inset-0 bg-linear-to-r from-forest-900 via-forest-900/40 to-transparent sm:via-forest-900/10" />
            ) : null}
          </div>
        )}
        <div
          className={cn(
            'px-6 py-8 sm:px-10',
            fan
              ? 'max-w-[56%] sm:max-w-[54%] lg:max-w-[50%]'
              : 'max-w-[min(36rem,80%)] lg:max-w-[48%]',
          )}
        >
          {eyebrow ? (
            <p className={cn('mb-2 text-eyebrow', banner ? 'text-ivory-50' : theme.text)}>
              {eyebrow}
            </p>
          ) : null}
          <h1
            className={cn(
              'font-headline text-[2.25rem] leading-[1.15] break-words [--heading-case:none] [--headline-weight:600] [hyphens:auto] sm:text-[3.125rem] lg:text-[3.75rem]',
              banner ? 'text-ivory-50' : theme.ink,
            )}
          >
            {title}
          </h1>
          {description ? (
            <p
              className={cn(
                'mt-3 line-clamp-3 max-w-[34rem] text-[1rem] leading-normal text-pretty',
                banner ? 'text-ivory-50' : theme.text,
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {children}
      <DemoNotice variant="inline" className="mt-4" />
    </header>
  );
}

export function ListingHeaderSkeleton({ chips = true }: { chips?: boolean }) {
  return (
    <div aria-hidden className="mt-3 sm:mt-5">
      <div className="h-[11rem] animate-pulse rounded-tile bg-forest-900/85 motion-reduce:animate-none sm:h-[12.25rem]" />
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
}: {
  /** Slug of the current category; omit on the all-products page. */
  active?: string;
  categories: CategoryDto[];
}) {
  const t = await getTranslations('Catalog');
  const items: ChipLink[] = [
    { href: '/catalog', name: t('shopAllTitle'), current: active === undefined },
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
export async function CategoryChipsLoader({ active }: { active?: string }) {
  await connection();
  const locale = await getLocale();
  const categories = await getCategories(locale).catch(() => null);
  if (!categories || categories.length === 0) return null;
  return <CategoryChips active={active} categories={categories} />;
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
