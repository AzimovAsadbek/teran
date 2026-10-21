import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { ProductCardSkeleton, Skeleton } from '@/components/ui/skeleton';
import { teaCodeOf } from '@/content/brand';
import { getProductList } from '@/lib/data/catalog';
import { ProductRail, type RailLabels, type RailTab } from './product-rail';

/*
 * The home page's product row (reference section 4) and the placeholder every product row shows
 * while it streams. The row renders at request time inside its own Suspense boundary, reads
 * through the cached loaders and disappears if the API fails or there is nothing to show. Tabs and
 * products come from the catalogue only: newest and featured products. No sales ranking is claimed.
 */

const PAGE = 'pageSize=8';

async function railLabels(): Promise<RailLabels> {
  const t = await getTranslations('Home');
  return { tabList: t('showcaseTabs'), previous: t('showcasePrevious'), next: t('showcaseNext') };
}

/**
 * "New arrivals" and "our picks" (the admin's featured flag) beyond TERAN's own five teas, which
 * have their own stage (SignatureTeas). A tab that would show the same products as the one before
 * it is left out (a switch that changes nothing reads as broken), and so is the row when nothing
 * but the five is stocked.
 */
export async function NewArrivalsRail({
  featuredFamilies = [],
}: {
  /** Families shown in their own feature on the page (top-level category slugs). */
  featuredFamilies?: string[];
} = {}) {
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
  // TERAN's own five are on the stage above (signature-teas.tsx) and the featured families in
  // their own sections (family-feature.tsx): the row shows the rest of the range, and with nothing
  // else stocked (production today) it is left out.
  const inFeature = (path: string) =>
    featuredFamilies.some((family) => path === family || path.startsWith(`${family}/`));
  const others = tabs.map((tab) => ({
    ...tab,
    products: tab.products.filter(
      (product) => !teaCodeOf(product.slug) && !inFeature(product.category.path),
    ),
  }));
  const shown = (tab: RailTab) =>
    tab.products
      .slice(0, 5)
      .map((product) => product.slug)
      .sort()
      .join(' ');
  const distinct = others.filter(
    (tab, index) =>
      tab.products.length > 0 &&
      others.slice(0, index).every((earlier) => shown(earlier) !== shown(tab)),
  );
  if (distinct.length === 0) return null;
  return <ProductRail tabs={distinct} labels={await railLabels()} />;
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
