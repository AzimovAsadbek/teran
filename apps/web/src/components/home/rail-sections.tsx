import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { ProductCardSkeleton, Skeleton } from '@/components/ui/skeleton';
import { PREMIUM_COLLECTION_SLUG } from '@/content/brand';
import { getCategories, getCollections, getProductList } from '@/lib/data/catalog';
import { categoryTree } from '@/lib/navigation';
import { ProductRail, type RailLabels, type RailTab } from './product-rail';

/*
 * The home page's product rows (reference sections 4, 8 and 10). Each renders at request time
 * inside its own Suspense boundary, reads through the cached loaders and disappears if the API
 * fails or there is nothing to show. Tabs and products come from the catalogue only: newest and
 * featured products, the collections, the top-level categories. No sales ranking is claimed.
 */

const PAGE = 'pageSize=8';

/**
 * What the first row shows: TERAN's premium collection and the newest products.
 */
async function firstRowSlugs(locale: Parameters<typeof getProductList>[0]): Promise<Set<string>> {
  const [premium, latest] = await Promise.all([
    getProductList(locale, `${PAGE}&collection=${PREMIUM_COLLECTION_SLUG}&sort=featured`).catch(
      () => null,
    ),
    getProductList(locale, `${PAGE}&sort=newest`).catch(() => null),
  ]);
  return new Set([...(premium?.items ?? []), ...(latest?.items ?? [])].map((item) => item.slug));
}

/**
 * Whether a later row would mostly repeat the first one: at least three in four of each tab's
 * products are already there (a small catalogue). It is then left out, and comes back by itself
 * once the catalogue outgrows one row.
 */
async function repeatsFirstRow(
  locale: Parameters<typeof getProductList>[0],
  tabs: RailTab[],
): Promise<boolean> {
  const shown = await firstRowSlugs(locale);
  return tabs.every((tab) => {
    const seen = tab.products.filter((product) => shown.has(product.slug)).length;
    return tab.products.length === 0 || seen / tab.products.length >= 0.75;
  });
}

async function railLabels(): Promise<RailLabels> {
  const t = await getTranslations('Home');
  return { tabList: t('showcaseTabs'), previous: t('showcasePrevious'), next: t('showcaseNext') };
}

/**
 * Section 4: TERAN's own premium collection first (its five teas), then "new arrivals" and "our
 * picks" (the admin's featured flag). A tab that would show the same products as the one before
 * it is left out, so with only TERAN's teas in the shop the row is simply the collection.
 */
export async function NewArrivalsRail() {
  await connection();
  const locale = await getLocale();
  const t = await getTranslations('Home');
  const [collections, premium, latest, featured] = await Promise.all([
    getCollections(locale).catch(() => []),
    getProductList(locale, `${PAGE}&collection=${PREMIUM_COLLECTION_SLUG}&sort=featured`).catch(
      () => null,
    ),
    getProductList(locale, `${PAGE}&sort=newest`).catch(() => null),
    getProductList(locale, `${PAGE}&featured=true&sort=featured`).catch(() => null),
  ]);
  const collection = collections.find((entry) => entry.slug === PREMIUM_COLLECTION_SLUG);
  const tabs: RailTab[] = [
    ...(collection
      ? [
          {
            id: 'teran',
            label: collection.name,
            products: premium?.items ?? [],
            href: `/collections/${collection.slug}`,
            cta: t('featuredCta'),
          },
        ]
      : []),
    {
      id: 'new',
      label: t('railNew'),
      products: latest?.items ?? [],
      href: '/catalog?sort=newest',
      cta: t('railNewCta'),
    },
    {
      id: 'featured',
      label: t('tabFeatured'),
      products: featured?.items ?? [],
      href: '/catalog',
      cta: t('railFeaturedCta'),
    },
  ];
  // A switch that changes nothing reads as broken: a tab showing the same products as an earlier
  // one is left out, and comes back once the lists differ.
  const shown = (tab: RailTab) =>
    tab.products
      .slice(0, 5)
      .map((product) => product.slug)
      .sort()
      .join(' ');
  const distinct = tabs.filter(
    (tab, index) =>
      tab.products.length === 0 ||
      tabs.slice(0, index).every((earlier) => shown(earlier) !== shown(tab)),
  );
  return <ProductRail tabs={distinct} labels={await railLabels()} />;
}

/**
 * Section 8: the other collections with products (the premium one leads the first row), as the
 * reference's row: no visible heading, no pill.
 */
export async function CollectionsRail() {
  await connection();
  const locale = await getLocale();
  const t = await getTranslations('Home');
  // The premium collection leads the first row (NewArrivalsRail), so it is not repeated here.
  const collections = (await getCollections(locale).catch(() => []))
    .filter(
      (collection) => collection.productCount > 0 && collection.slug !== PREMIUM_COLLECTION_SLUG,
    )
    .slice(0, 3);
  if (collections.length === 0) return null;
  const lists = await Promise.all(
    collections.map((collection) =>
      getProductList(locale, `${PAGE}&collection=${collection.slug}&sort=featured`).catch(
        () => null,
      ),
    ),
  );
  const tabs: RailTab[] = collections.map((collection, index) => ({
    id: collection.slug,
    label: collection.name,
    products: lists[index]?.items ?? [],
    href: `/collections/${collection.slug}`,
    cta: t('featuredCta'),
  }));
  if (await repeatsFirstRow(locale, tabs)) return null;
  return <ProductRail tabs={tabs} labels={await railLabels()} heading="hidden" cta={false} />;
}

/** Section 10: the first top-level category with products, headed only for screen readers. */
export async function CategoriesRail() {
  await connection();
  const locale = await getLocale();
  const t = await getTranslations('Nav');
  const tree = categoryTree(await getCategories(locale).catch(() => []))
    .filter((category) => category.productCount > 0)
    .slice(0, 3);
  if (tree.length === 0) return null;
  const lists = await Promise.all(
    tree.map((category) =>
      getProductList(locale, `${PAGE}&category=${category.slug}&sort=newest`).catch(() => null),
    ),
  );
  const tabs: RailTab[] = tree.map((category, index) => ({
    id: category.slug,
    label: category.name,
    products: lists[index]?.items ?? [],
    href: `/${category.path}`,
    cta: t('shopIn', { name: category.name }),
  }));
  if (await repeatsFirstRow(locale, tabs)) return null;
  return <ProductRail tabs={tabs} labels={await railLabels()} heading="hidden" />;
}

/**
 * The footprint of a rail while it streams: headings, four cards (two on phones), the pill; a
 * `compact` row (no visible heading) has no heading, and no pill without `cta`.
 */
export function RailFallback({
  compact = false,
  cta = true,
}: {
  compact?: boolean;
  cta?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={compact ? 'py-10 min-[46.875rem]:pt-0' : 'py-10 min-[46.875rem]:pt-16'}
    >
      <div className="container-page">
        {compact ? null : (
          <Skeleton className="mx-auto mb-[1.125rem] h-[2.625rem] w-72 max-w-full min-[46.875rem]:mb-8" />
        )}
        <div className="grid grid-cols-2 gap-2 min-[46.875rem]:gap-4 min-[75rem]:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
        {cta ? <Skeleton className="mx-auto mt-8 h-12 w-44 rounded-full" /> : null}
      </div>
    </div>
  );
}
