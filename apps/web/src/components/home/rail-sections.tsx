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

async function railLabels(): Promise<RailLabels> {
  const t = await getTranslations('Home');
  return { tabList: t('showcaseTabs'), previous: t('showcasePrevious'), next: t('showcaseNext') };
}

/** Section 4: "new arrivals" and "our picks" (the admin's featured flag). */
export async function NewArrivalsRail() {
  await connection();
  const locale = await getLocale();
  const t = await getTranslations('Home');
  const [latest, featured] = await Promise.all([
    getProductList(locale, `${PAGE}&sort=newest`).catch(() => null),
    getProductList(locale, `${PAGE}&featured=true&sort=featured`).catch(() => null),
  ]);
  const tabs: RailTab[] = [
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
  return <ProductRail tabs={tabs} labels={await railLabels()} />;
}

/** Section 8: one tab per collection with products (the premium collection first), up to three. */
export async function CollectionsRail() {
  await connection();
  const locale = await getLocale();
  const t = await getTranslations('Home');
  const collections = (await getCollections(locale).catch(() => []))
    .filter((collection) => collection.productCount > 0)
    .sort(
      (a, b) =>
        Number(b.slug === PREMIUM_COLLECTION_SLUG) - Number(a.slug === PREMIUM_COLLECTION_SLUG),
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
  return <ProductRail tabs={tabs} labels={await railLabels()} tone="tinted" />;
}

/** Section 10: one tab per top-level category with products, up to three. */
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
  return <ProductRail tabs={tabs} labels={await railLabels()} />;
}

/** The footprint of a rail while it streams: headings, four cards (two on phones), the pill. */
export function RailFallback({ tinted = false }: { tinted?: boolean }) {
  return (
    <div
      aria-hidden
      className={tinted ? 'bg-ivory-100 py-12 sm:py-14 lg:py-16' : 'py-12 sm:py-14 lg:py-16'}
    >
      <div className="container-page">
        <Skeleton className="mx-auto h-10 w-72 max-w-full" />
        <div className="mt-8 grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4 lg:mt-9 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className={index === 3 ? 'md:max-lg:hidden' : undefined}>
              <ProductCardSkeleton />
            </div>
          ))}
        </div>
        <Skeleton className="mx-auto mt-8 h-13 w-44 rounded-full lg:mt-9" />
      </div>
    </div>
  );
}
