import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { ProductRail } from '@/components/home/product-rail';
import { RailFallback } from '@/components/home/rail-sections';
import { Link } from '@/i18n/navigation';
import { getProductList } from '@/lib/data/catalog';

/** The reference's "Discover something new" row under its missing page: TERAN's newest teas. */
async function Suggestions() {
  await connection();
  const locale = await getLocale();
  const [t, th, tn] = await Promise.all([
    getTranslations('Errors'),
    getTranslations('Home'),
    getTranslations('Nav'),
  ]);
  const list = await getProductList(locale, 'pageSize=8&sort=newest').catch(() => null);
  if (!list || list.items.length === 0) return null;
  return (
    <ProductRail
      tabs={[
        {
          id: 'discover',
          label: t('discoverNew'),
          products: list.items,
          href: '/catalog',
          cta: tn('shopAll'),
        },
      ]}
      labels={{
        tabList: th('showcaseTabs'),
        previous: th('showcasePrevious'),
        next: th('showcaseNext'),
      }}
      heading="condensed"
      frame="content"
    />
  );
}

/**
 * The reference's missing page: a condensed title, one line and the teal "continue shopping" pill,
 * centred in a 450 px band, then a row of products to discover, both in its 1440 px frame.
 */
export default async function NotFound() {
  const [t, tc] = await Promise.all([getTranslations('Errors'), getTranslations('Cart')]);
  return (
    <>
      <div className="container-frame flex min-h-[28.125rem] flex-col items-center justify-center gap-5 py-[6.25rem] text-center">
        <h1 className="max-w-[48.75rem] font-headline text-[1.5rem] leading-none text-fg [--heading-case:none] [--headline-weight:800]">
          {t('notFoundTitle')}
        </h1>
        <p className="max-w-[32.5rem] text-[1rem] leading-[1.6rem] font-medium text-fg">
          {t('notFoundText')}
        </p>
        <Link
          href="/catalog"
          className="pill-hover mt-[0.9375rem] inline-flex min-h-11 items-center rounded-full bg-forest-900 px-8 pt-[0.5625rem] pb-[0.4375rem] text-[1rem] leading-4 font-semibold text-white"
        >
          {tc('continueShopping')}
        </Link>
      </div>
      <Suspense fallback={<RailFallback />}>
        <Suggestions />
      </Suspense>
      <div className="pb-section-sm" />
    </>
  );
}
