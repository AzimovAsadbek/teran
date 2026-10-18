import type { ImageDto } from '@teran/contracts';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import type { CSSProperties } from 'react';
import { Emblem } from '@/components/brand/logo';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { getCategories, getCollections, getProductList } from '@/lib/data/catalog';
import { fitWidth } from '@/lib/fit';
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
 * or one of its products standing) and a pill. Built from the API's tree in menu order: stocked
 * categories (a top-level category too when it has its own cover), then stocked collections, up to
 * six; a new category appears here without code changes once it has products.
 */
export async function CategoryCollage() {
  await connection();
  const locale = await getLocale();
  const t = await getTranslations('Home');
  const [categories, collections] = await Promise.all([
    getCategories(locale).catch(() => []),
    getCollections(locale).catch(() => []),
  ]);
  const tree = categoryTree(categories);
  const stocked = new Set(browsableCategories(tree).map((category) => category.slug));
  const sources = [
    ...tree
      .flatMap((top) => [top, ...top.children])
      .filter(
        (category) => stocked.has(category.slug) || (category.image && category.productCount > 0),
      )
      .map((category) => ({
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
    <section aria-labelledby="collage-title" className="container-page py-8 min-[46.875rem]:py-12">
      <h2 id="collage-title" className="sr-only">
        {t('categoriesTitle')}
      </h2>
      <ul className="grid grid-cols-2 gap-4 min-[56.25rem]:grid-cols-4 min-[75rem]:gap-8">
        {tiles.map((tile, index) => {
          const span = tileSpan(index, tiles.length);
          const wide = span !== 'narrow';
          return (
            <li
              key={tile.key}
              className={cn(
                span === 'narrow' ? 'col-span-1' : 'col-span-2',
                span === 'full' && 'min-[56.25rem]:col-span-4',
              )}
            >
              {/* As the reference's: the whole tile leads to the category (pointer only) and its
                  pill is the link for the keyboard and screen readers. */}
              <div
                className={cn(
                  'relative flex h-full min-h-[13.75rem] overflow-hidden rounded-[0.75rem] p-4 min-[46.875rem]:h-[19.25rem] min-[46.875rem]:p-6',
                  COLLAGE_TONES[index % COLLAGE_TONES.length]!.tile,
                  wide
                    ? 'items-center gap-6'
                    : '@container flex-col items-center justify-between gap-3 text-center',
                )}
              >
                <Link
                  href={tile.href}
                  tabIndex={-1}
                  aria-hidden
                  className="absolute inset-0 z-[1]"
                />
                {wide ? (
                  <>
                    <TilePicture image={tile.image} className="w-[45%]" />
                    <span className="@container flex min-w-0 flex-1 flex-col items-start gap-4">
                      <TileName
                        name={tile.name}
                        tone={COLLAGE_TONES[index % COLLAGE_TONES.length]!.name}
                      />
                      <Pill href={tile.href} label={t('viewCategory')} name={tile.name} />
                    </span>
                  </>
                ) : (
                  <>
                    <TileName
                      name={tile.name}
                      tone={COLLAGE_TONES[index % COLLAGE_TONES.length]!.name}
                    />
                    {/* The reference's 308 px tile: a 150 px picture between the name and pill. */}
                    <TilePicture image={tile.image} className="w-[72%] max-w-[9.5rem]" />
                    <Pill href={tile.href} label={t('viewCategory')} name={tile.name} />
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The reference's collage: every tile on its warm grey, names in its deep ocean blue. */
const COLLAGE_TONES = [{ tile: 'bg-ivory-200', name: 'text-ocean' }];

/**
 * The name at the reference's 45 px (32 px from 1199 px down, 25 px on phones), smaller when a
 * long word would not fit its box (fit.ts).
 */
function TileName({ name, tone }: { name: string; tone: string }) {
  return (
    <span
      className={cn(
        'block font-heading leading-none [overflow-wrap:anywhere]',
        tone,
        'text-[length:min(1.5469rem,var(--fit))] min-[46.875rem]:text-[length:min(1.9688rem,var(--fit))] min-[75rem]:text-[length:min(2.8125rem,var(--fit))]',
      )}
      style={{ '--fit': fitWidth(name, 0.6) } as CSSProperties}
    >
      {name}
    </span>
  );
}

/** The tile's pill, above its surface link; named with the tile for screen readers. */
function Pill({ href, label, name }: { href: string; label: string; name: string }) {
  return (
    <Link
      href={href}
      className="pill-hover relative z-[2] inline-flex min-h-10 items-center rounded-full bg-forest-900 px-6 text-[0.9375rem] font-semibold text-ivory-50"
    >
      {label}
      <span className="sr-only">: {name}</span>
    </Link>
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
        'aspect-square min-w-0',
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
    <div aria-hidden className="container-page py-8 min-[46.875rem]:py-12">
      <div className="grid grid-cols-2 gap-4 min-[56.25rem]:grid-cols-4 min-[75rem]:gap-8">
        {[2, 1, 1, 1, 1, 2].map((span, index) => (
          <Skeleton
            key={index}
            className={cn(
              'h-[13.75rem] rounded-[0.75rem] min-[46.875rem]:h-[19.25rem]',
              span === 2 && 'col-span-2',
            )}
          />
        ))}
      </div>
    </div>
  );
}
