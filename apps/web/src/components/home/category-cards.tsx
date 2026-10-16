import { ArrowRight } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import type { CSSProperties } from 'react';
import { CategoryArt } from '@/components/catalog/category-art';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { getCategories } from '@/lib/data/catalog';
import { browsableCategories, categoryTree } from '@/lib/navigation';

/** Cards shown on the home page; the catalogue page lists every category. */
const MAX_CARDS = 8;

/**
 * Column spans (of 12) for rows of at most four cards, as even as possible, so a row is never left
 * half empty: 6 → 3 + 3, 7 → 4 + 3, 5 → 3 + 2, 2 → 2.
 */
function wideSpans(count: number): number[] {
  const rows = Math.ceil(count / 4);
  const spans: number[] = [];
  let placed = 0;
  for (let row = 0; row < rows; row += 1) {
    const size = Math.ceil((count - placed) / (rows - row));
    for (let index = 0; index < size; index += 1) spans.push(12 / size);
    placed += size;
  }
  return spans;
}

const LIST =
  '-mx-gutter mt-8 flex snap-x snap-mandatory scroll-px-gutter gap-4 overflow-x-auto px-gutter pb-3 [scrollbar-width:thin] sm:mx-0 sm:grid sm:grid-cols-12 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:mt-10';
const ITEM =
  'w-[78%] max-w-[22rem] shrink-0 snap-start sm:w-auto sm:max-w-none sm:[grid-column:span_var(--span-sm)/span_var(--span-sm)] lg:[grid-column:span_var(--span-lg)/span_var(--span-lg)]';
const CARD_HEIGHT = 'h-[25rem]';

/**
 * The categories as cards: deep green, a moon window with the category's picture (a product
 * standing in front of it, a photograph inside it, or its illustration), soft light and slow
 * botanical silhouettes (category-art.css). Built only from the API's category tree: a category
 * created in the admin area gets its card once it is active and has products. Phones scroll the
 * cards sideways; wider screens show balanced rows.
 */
export async function CategoryCardsSection() {
  await connection();
  const locale = await getLocale();
  const [t, tc, tn] = await Promise.all([
    getTranslations('Home'),
    getTranslations('Catalog'),
    getTranslations('Nav'),
  ]);
  const categories = browsableCategories(
    categoryTree(await getCategories(locale).catch(() => [])),
  ).slice(0, MAX_CARDS);
  if (categories.length === 0) return null;
  const spans = wideSpans(categories.length);

  return (
    <section aria-labelledby="categories-title" className="container-page pb-section-sm">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div>
          <p className="text-eyebrow text-accent-fg">{t('categoriesEyebrow')}</p>
          <h2 id="categories-title" className="mt-3 text-display-md text-forest-900">
            {t('categoriesTitle')}
          </h2>
        </div>
        <Link
          href="/catalog"
          className="group inline-flex items-center gap-1.5 text-body-sm font-semibold text-brand underline-offset-4 hover:underline"
        >
          {tn('shopAll')}
          <ArrowRight
            aria-hidden
            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
      </div>
      <ul className={LIST}>
        {categories.map((category, index) => {
          const titleId = `category-card-${category.slug}`;
          const lastAlone = categories.length % 2 === 1 && index === categories.length - 1;
          return (
            <li
              key={category.slug}
              className={ITEM}
              style={
                {
                  '--span-sm': lastAlone ? 12 : 6,
                  '--span-lg': spans[index],
                } as CSSProperties
              }
            >
              <Link
                href={`/${category.path}`}
                aria-labelledby={titleId}
                aria-describedby={`${titleId}-details`}
                className={cn(
                  'cat-card group relative block overflow-hidden rounded-[1.25rem] text-ivory-50 shadow-[0_24px_48px_-32px_rgb(8_43_13_/_0.7)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus',
                  CARD_HEIGHT,
                )}
              >
                <CategoryArt
                  category={category}
                  variant={index}
                  sizes="(min-width: 1024px) 11rem, (min-width: 640px) 26vw, 46vw"
                />
                <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-forest-950 via-forest-950/80 to-transparent px-6 pt-20 pb-6">
                  <span id={titleId} className="block text-display-sm text-ivory-50">
                    {category.name}
                  </span>
                  <span id={`${titleId}-details`} className="block">
                    <span className="mt-1 block text-micro tracking-[0.16em] text-gold-300 uppercase">
                      {tc('results', { count: category.productCount })}
                    </span>
                    {category.description ? (
                      <span className="mt-2 line-clamp-2 block text-body-sm text-ivory-100/75">
                        {category.description}
                      </span>
                    ) : null}
                  </span>
                  <span
                    aria-hidden
                    className="mt-4 inline-flex items-center gap-1.5 text-button text-gold-300"
                  >
                    {t('viewCategory')}
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </span>
                {/* A gold hairline appears on hover and focus: the whole card is the link. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-gold-300/0 transition-[box-shadow] duration-500 ring-inset group-hover:ring-gold-300/40 group-focus-visible:ring-gold-300/40"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The section's footprint while the categories stream in (two rows of three on wide screens). */
export function CategoryCardsFallback() {
  return (
    <div aria-hidden className="container-page pb-section-sm">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-3 h-10 w-64" />
      <div className={LIST}>
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className={ITEM}
            style={{ '--span-sm': 6, '--span-lg': 4 } as CSSProperties}
          >
            <div className={cn('rounded-[1.25rem] bg-forest-900/90', CARD_HEIGHT)} />
          </div>
        ))}
      </div>
    </div>
  );
}
