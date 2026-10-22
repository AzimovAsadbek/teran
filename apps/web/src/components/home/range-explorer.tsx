import type { ImageDto, Locale, ProductSummaryDto, PublicVisualDto } from '@teran/contracts';
import { ArrowRight } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { ProductImage } from '@/components/catalog/product-image';
import { LoopingFilm } from '@/components/content/looping-film';
import { VisualPicture } from '@/components/content/visual-picture';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { getCategories, getProductList } from '@/lib/data/catalog';
import { getPublicSettings } from '@/lib/data/content';
import { categoryTree, type NavCategoryTree } from '@/lib/navigation';
import { filmPosition, visualFor } from '@/lib/visuals';

/**
 * Where each family's tile sits on the four-column grid from 1024 px, by how many families there
 * are: the first (tea, TERAN's own centre) always large, the rest arranged around it so the grid
 * closes without gaps.
 */
const LAYOUTS: Record<number, string[]> = {
  2: ['lg:col-span-2 lg:row-span-2', 'lg:col-span-2 lg:row-span-2'],
  3: ['lg:col-span-2 lg:row-span-2', 'lg:col-span-2', 'lg:col-span-2'],
  4: ['lg:col-span-2 lg:row-span-2', 'lg:col-span-1', 'lg:col-span-1', 'lg:col-span-2'],
  5: [
    'lg:col-span-2 lg:row-span-2',
    'lg:col-span-1',
    'lg:col-span-1',
    'lg:col-span-2',
    'lg:col-span-4',
  ],
  6: [
    'lg:col-span-2 lg:row-span-2',
    'lg:col-span-1',
    'lg:col-span-1',
    'lg:col-span-2',
    'lg:col-span-2',
    'lg:col-span-2',
  ],
  7: [
    'lg:col-span-2 lg:row-span-2',
    'lg:col-span-1',
    'lg:col-span-1',
    'lg:col-span-2',
    'lg:col-span-2',
    'lg:col-span-1',
    'lg:col-span-1',
  ],
};

/** The field a family's picture stands on (a cut-out shows it; a photograph covers it). */
const FIELDS: Record<string, string> = {
  green: '#e9f0e1',
  black: '#f2e8e0',
  white: '#f3f0e8',
  oolong: '#f4ecdf',
  dark: '#eee5dd',
  matcha: '#e6f0d8',
  herbal: '#f6eee0',
  fruit: '#f7e8e5',
  iced: '#e4eff2',
  water: '#e7eef5',
  juice: '#fae9dc',
  sweets: '#f4ebe2',
  teaware: '#efece6',
  gift: '#f1ebe2',
};

interface Tile {
  family: NavCategoryTree;
  /** A page picture (and film) set for the first tile in Admin → Settings (`home.bento.1`). */
  visual: PublicVisualDto | null;
  image: ImageDto | null;
}

/**
 * The picture of a family without its own cover: one of its photographed products, beyond the
 * first three when there are more (a family's feature further down shows those three, so the
 * page does not show the same photograph twice).
 */
function pictureOf(list: ProductSummaryDto[]): ImageDto | null {
  const items = list.length > 3 ? [...list.slice(3), ...list.slice(0, 3)] : list;
  const photo = items.find((item) => item.image && !item.image.transparent)?.image;
  return photo ?? items.find((item) => item.stageImage)?.stageImage ?? items[0]?.image ?? null;
}

/**
 * The whole range at a glance: one tile per product family the catalogue holds, in the menus'
 * order (tea at the centre, then cold drinks, chocolates, matcha, infusions, gifts, teaware —
 * whatever is stocked, up to seven), each with its picture (its own cover, else one of its
 * products), its name, how many products it holds and its ranges, leading to the family's page.
 * Replaces three rows of shortcuts to the same pages: a new family appears here by itself once it
 * has products. Pointed at, a tile's picture leans in and its label opens on the family's ranges.
 * The tiles stand still as they scroll in (ADR-051: no generic reveals; the brewing language
 * moves where it means something).
 */
export async function RangeExplorer() {
  await connection();
  const locale = (await getLocale()) as Locale;
  const [t, tc, tn, categories, settings] = await Promise.all([
    getTranslations('Home'),
    getTranslations('Catalog'),
    getTranslations('Nav'),
    getCategories(locale).catch(() => []),
    getPublicSettings(locale).catch(() => null),
  ]);
  const families = categoryTree(categories).slice(0, 7);
  if (families.length < 2) return null;
  const lists = await Promise.all(
    families.map((family) =>
      family.image
        ? null
        : getProductList(locale, `category=${family.slug}&pageSize=6&sort=featured`).catch(
            () => null,
          ),
    ),
  );
  const places = LAYOUTS[families.length]!;
  // Phones: the first tile across both columns, the rest two by two (an odd last one across).
  const lastAcross = (families.length - 1) % 2 === 1;
  const tiles: Tile[] = families.map((family, index) => ({
    family,
    visual: index === 0 ? visualFor(settings, 'home.bento.1') : null,
    image: family.image ?? pictureOf(lists[index]?.items ?? []),
  }));

  return (
    // On a light grey of its own, between the white of the five teas' stage and the business teal.
    <section aria-labelledby="range-title" className="bg-surface-muted">
      <div className="container-page py-12 lg:py-20">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <div className="max-w-[40rem]">
            <h2
              id="range-title"
              className="font-heading text-[2.25rem] leading-[1.1] text-fg min-[46.875rem]:text-[2.75rem]"
            >
              {t('rangeTitle')}
            </h2>
            <p className="mt-3 text-[1.0625rem] leading-relaxed text-fg-muted">{t('rangeText')}</p>
          </div>
          <Link
            href="/catalog"
            className="group inline-flex min-h-11 items-center gap-2 text-[1rem] font-semibold text-gold-800 underline decoration-gold-800/30 underline-offset-[6px] hover:decoration-gold-800"
          >
            {tn('shopAll')}
            <ArrowRight
              aria-hidden
              className="h-4 w-4 transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:translate-x-1"
            />
          </Link>
        </div>

        <ul className="mt-8 grid grid-cols-2 gap-3 min-[46.875rem]:gap-4 lg:mt-10 lg:auto-rows-[15.5rem] lg:grid-cols-4 min-[90rem]:auto-rows-[17.5rem]">
          {tiles.map((tile, index) => {
            const { family } = tile;
            const field = (family.illustrationKey && FIELDS[family.illustrationKey]) || '#efece6';
            return (
              <li
                key={family.slug}
                className={cn(
                  'relative',
                  index === 0 || (lastAcross && index === families.length - 1)
                    ? 'col-span-2 aspect-[4/3] min-[46.875rem]:aspect-[16/9] lg:aspect-auto'
                    : 'aspect-[4/5] lg:aspect-auto',
                  places[index],
                )}
              >
                <Link
                  href={`/${family.path}`}
                  className="group/tile relative isolate block h-full overflow-hidden rounded-[1.5rem] focus-visible:outline-offset-4"
                  style={{ backgroundColor: field }}
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 -z-10 transition-transform duration-[1200ms] ease-[var(--ease-out-expo)] group-hover/tile:scale-[1.05]"
                  >
                    {tile.visual ? (
                      <>
                        <span className="absolute inset-0 -z-30">
                          <VisualPicture
                            visual={tile.visual}
                            sizes="(min-width: 1024px) 50vw, 100vw"
                            position={filmPosition(tile.visual.video)}
                          />
                        </span>
                        {tile.visual.video ? (
                          <LoopingFilm
                            film={tile.visual.video}
                            phoneFilm={tile.visual.mobileVideo}
                          />
                        ) : null}
                      </>
                    ) : tile.image ? (
                      <ProductImage
                        image={tile.image}
                        name={family.name}
                        sizes={
                          index === 0
                            ? '(min-width: 1024px) 50vw, 100vw'
                            : '(min-width: 1024px) 25vw, 50vw'
                        }
                        decorative
                      />
                    ) : null}
                  </span>
                  {/* The label plate: the family's name and count, its ranges when pointed at. */}
                  <span className="absolute bottom-0 left-0 flex max-w-[calc(100%-1.5rem)] flex-col rounded-tr-[1.25rem] bg-ivory-50 px-3 pt-2.5 pb-3 min-[46.875rem]:px-5 min-[46.875rem]:pt-4 min-[46.875rem]:pb-3.5">
                    <span className="flex items-center gap-3">
                      <span
                        className={cn(
                          'font-headline leading-none text-fg uppercase',
                          index === 0
                            ? 'text-[1.75rem] min-[46.875rem]:text-[2.25rem]'
                            : 'text-[1.125rem] min-[46.875rem]:text-[1.625rem]',
                        )}
                      >
                        {family.name}
                      </span>
                      <span
                        aria-hidden
                        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-forest-900 text-ivory-50 min-[46.875rem]:size-8"
                      >
                        <ArrowRight className="h-4 w-4 transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover/tile:translate-x-0.5" />
                      </span>
                    </span>
                    <span className="mt-1 text-[0.875rem] text-fg-muted">
                      {tc('results', { count: family.productCount })}
                    </span>
                    {family.children.length > 0 ? (
                      // As wide as the plate already is (width 0, min-width 100%), so the ranges
                      // never stretch the label.
                      <span className="grid w-0 min-w-full grid-rows-[0fr] transition-[grid-template-rows] duration-500 ease-[var(--ease-out-expo)] group-hover/tile:grid-rows-[1fr] group-focus-visible/tile:grid-rows-[1fr] max-lg:hidden">
                        <span className="overflow-hidden">
                          <span className="flex flex-wrap gap-1.5 pt-2.5">
                            {family.children.map((child) => (
                              <span
                                key={child.slug}
                                className="rounded-full bg-jade-100 px-2.5 py-1 text-[0.8125rem] leading-none font-medium text-teal-ink"
                              >
                                {child.name}
                              </span>
                            ))}
                          </span>
                        </span>
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
