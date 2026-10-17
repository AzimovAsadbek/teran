import type { ImageDto } from '@teran/contracts';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { Emblem } from '@/components/brand/logo';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { getCategories, getCollections, getProductList } from '@/lib/data/catalog';
import { browsableCategories, categoryTree, imageSources } from '@/lib/navigation';

const MAX_TILES = 6;

interface Tile {
  key: string;
  name: string;
  href: string;
  image: ImageDto | null;
}

/**
 * Rows of three tiles on a four-column grid: wide, narrow, narrow, then narrow, narrow, wide
 * (reference section 13: 640 + 304 + 304 px at 1440). A last row of two is two wide tiles, a last
 * tile alone spans the row. Phones: wide tiles across, narrow ones two by two.
 */
function tileSpan(index: number, count: number): 'wide' | 'narrow' | 'full' {
  const position = index % 3;
  const row = Math.floor(index / 3);
  const rowSize = Math.min(3, count - row * 3);
  if (rowSize === 1) return 'full';
  if (rowSize === 2) return 'wide';
  return (row % 2 === 0 ? position === 0 : position === 2) ? 'wide' : 'narrow';
}

/**
 * The catalogue as a collage of cream tiles, each with its name, a picture (the category's own,
 * or one of its products standing) and a pill. Built from the API's tree: stocked categories, then
 * collections with products, up to six; a new category appears here without code changes.
 */
export async function CategoryCollage() {
  await connection();
  const locale = await getLocale();
  const t = await getTranslations('Home');
  const [categories, collections] = await Promise.all([
    getCategories(locale).catch(() => []),
    getCollections(locale).catch(() => []),
  ]);
  const sources = [
    ...browsableCategories(categoryTree(categories)).map((category) => ({
      key: `c-${category.path}`,
      name: category.name,
      href: `/${category.path}`,
      image: category.image,
      query: `category=${category.slug}`,
    })),
    ...collections
      .filter((collection) => collection.productCount > 0)
      .map((collection) => ({
        key: `k-${collection.slug}`,
        name: collection.name,
        href: `/collections/${collection.slug}`,
        image: collection.image,
        query: `collection=${collection.slug}`,
      })),
  ].slice(0, MAX_TILES);
  if (sources.length < 2) return null;

  // A tile without its own picture borrows one of its products (a cut-out first).
  const tiles: Tile[] = await Promise.all(
    sources.map(async (source) => {
      if (source.image) return source;
      const list = await getProductList(locale, `${source.query}&pageSize=4&sort=featured`).catch(
        () => null,
      );
      const product =
        list?.items.find((item) => item.stageImage) ?? list?.items.find((item) => item.image);
      return { ...source, image: product?.stageImage ?? product?.image ?? null };
    }),
  );

  return (
    <section aria-labelledby="collage-title" className="container-page py-12 sm:py-14">
      <h2 id="collage-title" className="sr-only">
        {t('categoriesTitle')}
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4 lg:gap-8">
        {tiles.map((tile, index) => {
          const span = tileSpan(index, tiles.length);
          const wide = span !== 'narrow';
          return (
            <li
              key={tile.key}
              className={cn(
                span === 'narrow' ? 'col-span-1' : 'col-span-2',
                span === 'full' && 'lg:col-span-4',
              )}
            >
              <Link
                href={tile.href}
                className={cn(
                  'group flex h-full min-h-[14.5rem] overflow-hidden rounded-tile p-5 sm:min-h-[19.25rem] sm:p-8',
                  COLLAGE_TONES[index % COLLAGE_TONES.length]!.tile,
                  wide
                    ? 'items-center gap-4 sm:gap-8'
                    : 'flex-col items-center justify-between gap-3 text-center',
                )}
              >
                {wide ? (
                  <>
                    <TilePicture image={tile.image} className="w-[46%] sm:w-[42%]" />
                    <span className="min-w-0 flex-1">
                      <TileName
                        name={tile.name}
                        large
                        tone={COLLAGE_TONES[index % COLLAGE_TONES.length]!.name}
                      />
                      <Pill label={t('viewCategory')} />
                    </span>
                  </>
                ) : (
                  <>
                    <TileName
                      name={tile.name}
                      tone={COLLAGE_TONES[index % COLLAGE_TONES.length]!.name}
                    />
                    <TilePicture image={tile.image} className="w-[72%] max-w-[11rem]" />
                    <Pill label={t('viewCategory')} />
                  </>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The reference's collage: each tile on its own pastel, its name in the deep shade of that colour. */
const COLLAGE_TONES = [
  { tile: 'bg-jade-100', name: 'text-jade-700' },
  { tile: 'bg-gold-50', name: 'text-gold-800' },
  { tile: 'bg-sage-100', name: 'text-forest-800' },
  { tile: 'bg-ivory-100', name: 'text-forest-900' },
];

function TileName({ name, large = false, tone }: { name: string; large?: boolean; tone: string }) {
  return (
    <span
      className={cn(
        'block font-heading leading-none [overflow-wrap:anywhere]',
        tone,
        large ? 'text-[1.75rem] sm:text-[2.8125rem]' : 'text-[1.375rem] sm:text-[2.25rem]',
      )}
    >
      {name}
    </span>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <span className="mt-4 inline-flex h-10 items-center rounded-full bg-forest-900 px-6 text-[0.9375rem] font-semibold text-ivory-50 transition-[filter] duration-200 group-hover:brightness-125">
      {label}
    </span>
  );
}

function TilePicture({ image, className }: { image: ImageDto | null; className?: string }) {
  if (!image) {
    return (
      <span
        aria-hidden
        className={cn(
          'flex aspect-square items-center justify-center rounded-full bg-ivory-50',
          className,
        )}
      >
        <Emblem className="w-1/2 opacity-80" sizes="96px" />
      </span>
    );
  }
  const sources = imageSources(image, 480);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- API renditions (ADR-009)
    <img
      src={sources.src}
      srcSet={sources.srcSet}
      sizes="(min-width: 1024px) 16rem, 40vw"
      alt=""
      loading="lazy"
      decoding="async"
      className={cn(
        'aspect-square transition-transform duration-[350ms] ease-out group-hover:scale-105',
        image.transparent
          ? 'object-contain drop-shadow-[0_18px_20px_rgb(32_24_8_/_0.25)]'
          : 'rounded-full object-cover',
        className,
      )}
    />
  );
}

/** The collage's footprint while it streams (one row on phones, two on wide screens). */
export function CategoryCollageFallback() {
  return (
    <div aria-hidden className="container-page py-12 sm:py-14">
      <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4 lg:gap-8">
        {[2, 1, 1, 1, 1, 2].map((span, index) => (
          <Skeleton
            key={index}
            className={cn('h-[14.5rem] rounded-tile sm:h-[19.25rem]', span === 2 && 'col-span-2')}
          />
        ))}
      </div>
    </div>
  );
}
