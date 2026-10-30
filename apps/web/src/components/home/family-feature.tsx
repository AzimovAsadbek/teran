import type { CategoryDto, Locale } from '@teran/contracts';
import { ArrowRight } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { ProductCard } from '@/components/catalog/product-card';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { getCategories, getProductList } from '@/lib/data/catalog';
import { categoryTree, type NavCategoryTree } from '@/lib/navigation';

/** Each feature's light: the cold drinks in a summer sky, the gift sets in a gift box's black. */
const TONES = {
  summer: {
    section: 'bg-sky text-ocean',
    muted: 'text-ocean',
    chip: 'bg-ivory-50 text-ocean hover:bg-ocean hover:text-ivory-50',
    cta: 'bg-ocean text-ivory-50',
    link: 'text-ocean decoration-ocean/35 hover:decoration-ocean',
  },
  gift: {
    section: 'bg-forest-950 text-ivory-50',
    muted: 'text-ivory-50/85',
    chip: 'bg-ivory-50/10 text-ivory-50 hover:bg-sun hover:text-ink-900',
    cta: 'bg-sun text-ink-900',
    link: 'text-sun decoration-sun/40 hover:decoration-sun',
  },
} as const;

/** The family (a top-level category or one of its ranges) with this address. */
function findFamily(tree: NavCategoryTree[], slug: string): NavCategoryTree | null {
  for (const family of tree) {
    if (family.slug === slug) return family;
    const range = family.children.find((child) => child.slug === slug);
    if (range) return { ...range, children: [] };
  }
  return null;
}

/**
 * One family of the range given its own moment on the home page — the cold drinks in summer
 * light, the gift sets in the black and gold of a gift box — once it holds at least three
 * products: its name and description from the catalogue, its ranges as chips, three of its
 * products and the way to all of them (for gift sets, also the way in for corporate gifts).
 * Until then it renders nothing, so no empty or invented feature ever shows.
 */
export async function FamilyFeature({
  slug,
  tone,
  business,
}: {
  slug: string;
  tone: keyof typeof TONES;
  /** A second way on, to the request form (gift sets: corporate gifts). */
  business?: { href: string; label: string };
}) {
  await connection();
  const locale = (await getLocale()) as Locale;
  const [tc, categories] = await Promise.all([
    getTranslations('Catalog'),
    getCategories(locale).catch((): CategoryDto[] => []),
  ]);
  const family = findFamily(categoryTree(categories), slug);
  if (!family || family.productCount < 3) return null;
  const list = await getProductList(locale, `category=${slug}&pageSize=3&sort=featured`).catch(
    () => null,
  );
  const products = list?.items ?? [];
  if (products.length < 3) return null;
  const colours = TONES[tone];
  const titleId = `feature-${slug}`;

  return (
    <section aria-labelledby={titleId} className={colours.section}>
      <div className="container-page grid grid-cols-1 gap-x-12 gap-y-10 py-16 min-[46.875rem]:py-20 lg:grid-cols-12 lg:items-center lg:py-24">
        <div className={cn('lg:col-span-4', tone === 'gift' && 'lg:order-2 lg:col-start-9')}>
          <h2
            id={titleId}
            className="font-heading text-[2.5rem] leading-[1.02] text-balance min-[46.875rem]:text-[3.25rem] lg:text-[3.75rem]"
          >
            {family.name}
          </h2>
          {family.description ? (
            <p className={cn('mt-4 text-[1.0625rem] leading-relaxed', colours.muted)}>
              {family.description}
            </p>
          ) : null}
          {family.children.length > 0 ? (
            <ul className="mt-6 flex flex-wrap gap-2">
              {family.children
                .filter((child) => child.productCount > 0)
                .map((child) => (
                  <li key={child.slug}>
                    <Link
                      href={`/${child.path}`}
                      className={cn(
                        'inline-flex min-h-10 items-center rounded-full px-4 text-[0.9375rem] font-semibold transition-colors duration-200',
                        colours.chip,
                      )}
                    >
                      {child.name}
                    </Link>
                  </li>
                ))}
            </ul>
          ) : null}
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href={`/${family.path}`}
              className={cn(
                'pill-hover inline-flex h-12 items-center rounded-full px-7 text-[1rem] font-semibold',
                colours.cta,
              )}
            >
              {tc('allIn', { name: family.name })}
            </Link>
            {business ? (
              <Link
                href={business.href}
                className={cn(
                  'group inline-flex min-h-11 items-center gap-2 text-[1rem] font-semibold underline underline-offset-[6px]',
                  colours.link,
                )}
              >
                {business.label}
                <ArrowRight
                  aria-hidden
                  className="h-4 w-4 transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:translate-x-1"
                />
              </Link>
            ) : null}
          </div>
        </div>
        {/* Three of the family's products; a row to swipe through on phones. */}
        <ul
          className={cn(
            '-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] min-[46.875rem]:mx-0 min-[46.875rem]:grid min-[46.875rem]:grid-cols-3 min-[46.875rem]:gap-4 min-[46.875rem]:overflow-visible min-[46.875rem]:px-0 min-[46.875rem]:pb-0 lg:col-span-8',
            tone === 'gift' && 'lg:order-1',
          )}
        >
          {products.map((product) => (
            <li
              key={product.id}
              className="w-[72%] max-w-[18rem] shrink-0 snap-start min-[46.875rem]:w-auto min-[46.875rem]:max-w-none"
            >
              {/* On phones a card is 72 % of the row inside the page's margins (1.5rem a side). */}
              <ProductCard
                product={product}
                sizes="(min-width: 1024px) 20vw, (min-width: 750px) 30vw, calc((100vw - 3rem) * 0.72)"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
