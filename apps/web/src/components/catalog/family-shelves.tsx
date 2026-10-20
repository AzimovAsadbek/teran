import type { Locale, ProductSummaryDto } from '@teran/contracts';
import { ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { CSSProperties } from 'react';
import { brandCopy, COLLECTION_CODES, teaCodeOf } from '@/content/brand';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { getCategories, getProductList } from '@/lib/data/catalog';
import { categoryTree } from '@/lib/navigation';
import { shelfGridFor } from './catalog-grid';
import { ProductCard } from './product-card';
import { productFamily } from './product-family';

/** Enough for any family the catalogue holds; its own page lists the rest, should there be more. */
const SHELF_SIZE = 48;

/** TERAN's five first, in the order of their packs; the rest as they came (featured first). */
function packFirst(items: ProductSummaryDto[]): ProductSummaryDto[] {
  const place = (slug: string) => {
    const code = teaCodeOf(slug);
    return code ? COLLECTION_CODES.indexOf(code) : COLLECTION_CODES.length;
  };
  return [...items].sort((a, b) => place(a.slug) - place(b.slug));
}

/**
 * The whole catalogue unfiltered (ADR-051): a shelf per stocked family in the menus' order — tea,
 * matcha, infusions, cold drinks, teaware, gifts — each under a rule in the family's ink with its
 * mark, name and count and the way to its own page; tea opens with TERAN's five in the packs'
 * order, across one row under the collection's heading. The same products as the flat grid,
 * grouped as hotels, cafés and shops browse; any filter, sort or page brings the grid back
 * (catalog-results.tsx).
 */
export async function FamilyShelves({ locale }: { locale: Locale }) {
  const collection = brandCopy[locale].collection;
  const [tn, families] = await Promise.all([
    getTranslations('Nav'),
    getCategories(locale)
      .then(categoryTree)
      .catch(() => []),
  ]);
  const shelves = await Promise.all(
    families.map(async (family) => {
      const list = await getProductList(
        locale,
        `category=${family.slug}&pageSize=${SHELF_SIZE}&sort=featured`,
      ).catch(() => null);
      return { family, items: packFirst(list?.items ?? []), total: list?.total ?? 0 };
    }),
  );

  return (
    <div className="mt-8 space-y-14 sm:mt-10 lg:space-y-20">
      {shelves
        .filter((shelf) => shelf.items.length > 0)
        .map(({ family, items, total }, shelfIndex) => {
          const look = productFamily(family.illustrationKey, family.path);
          const Mark = look.icon;
          const teran = items.filter((product) => teaCodeOf(product.slug) !== null);
          const others = items.filter((product) => teaCodeOf(product.slug) === null);
          return (
            <section
              key={family.slug}
              aria-labelledby={`shelf-${family.slug}`}
              style={{ '--shelf': look.ink } as CSSProperties}
            >
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-t-[3px] border-[var(--shelf)] pt-4">
                <div className="flex items-center gap-3">
                  <Mark aria-hidden className="h-6 w-6 shrink-0 text-[var(--shelf)]" />
                  <h2
                    id={`shelf-${family.slug}`}
                    className="font-headline text-[1.75rem] leading-none text-fg sm:text-[2rem]"
                  >
                    {family.name}
                  </h2>
                  <span className="text-[0.9375rem] text-fg-muted">
                    {tn('menuCount', { count: total })}
                  </span>
                </div>
                <Link
                  href={`/${family.path}`}
                  className="inline-flex min-h-11 items-center gap-1.5 text-[1rem] font-semibold text-forest-900 underline decoration-forest-900/30 underline-offset-[6px] hover:decoration-forest-900"
                >
                  {tn('shopIn', { name: family.name })}
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
              </div>
              {teran.length > 0 ? (
                // TERAN's five first, across one row, under the collection's own heading.
                <div className="mt-5 sm:mt-6">
                  <p className="font-heading text-[1.25rem] leading-tight text-fg">
                    {collection.heading}
                  </p>
                  <ShelfGrid items={teran} priority={shelfIndex === 0} className="mt-3" />
                </div>
              ) : null}
              {others.length > 0 ? (
                <ShelfGrid
                  items={others}
                  priority={shelfIndex === 0 && teran.length === 0}
                  className={teran.length > 0 ? 'mt-8' : 'mt-5 sm:mt-6'}
                />
              ) : null}
            </section>
          );
        })}
    </div>
  );
}

/** A shelf's cards, fitted to their number (catalog-grid.ts): never one alone in a row. */
function ShelfGrid({
  items,
  priority,
  className,
}: {
  items: ProductSummaryDto[];
  priority: boolean;
  className?: string;
}) {
  const grid = shelfGridFor(items.length);
  return (
    <ul className={cn('grid gap-2', grid.list, className)}>
      {items.map((product, index) => {
        const layout = grid.layout(index);
        return (
          <li key={product.id} className={grid.item(index)}>
            <ProductCard
              product={product}
              priority={priority && index < 4}
              layout={layout}
              sizes={
                layout === 'feature'
                  ? '(min-width: 1024px) 26rem, 42vw'
                  : layout === 'lead'
                    ? '(min-width: 1024px) 48vw, 50vw'
                    : undefined
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
