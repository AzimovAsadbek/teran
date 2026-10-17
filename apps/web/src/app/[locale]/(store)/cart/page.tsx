import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { CartView } from '@/components/cart/cart-view';
import { ProductRail } from '@/components/home/product-rail';
import { RailFallback } from '@/components/home/rail-sections';
import { ContactToOrder } from '@/components/social/contact-to-order';
import { getProductList } from '@/lib/data/catalog';
import { pageMetadata } from '@/lib/seo';
import { showPrices } from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Cart' });
  return pageMetadata({ title: t('metaTitle'), href: '/cart', locale, noIndex: true });
}

/** The reference's "you may also like" row under the bag: TERAN's featured products. */
async function CartSuggestions() {
  await connection();
  const locale = await getLocale();
  const [t, th, tn] = await Promise.all([
    getTranslations('Product'),
    getTranslations('Home'),
    getTranslations('Nav'),
  ]);
  const list = await getProductList(locale, 'featured=true&pageSize=8&sort=featured').catch(
    () => null,
  );
  if (!list || list.items.length === 0) return null;
  return (
    <ProductRail
      tabs={[
        {
          id: 'suggested',
          label: t('related'),
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
      // With an empty bag the row is what the page shows first.
      priorityCount={2}
    />
  );
}

async function OrderByContact() {
  await connection();
  const t = await getTranslations('Cart');
  return (
    <ContactToOrder title={t('orderByContactTitle')} text={t('orderByContactText')} layout="bag" />
  );
}

/** The bag is personal, so the page is a static shell and the lines load in the browser. */
export default async function CartPage() {
  const t = await getTranslations('Cart');
  return (
    <>
      {/* The same height while the bag loads and once it is known to be empty, and a placeholder of
          the suggestions' size, so nothing below moves as the parts arrive. */}
      <div className="container-frame min-h-[21.75rem] pt-6 sm:pt-8">
        <h1 className="sr-only">{t('drawerTitle')}</h1>
        {showPrices ? (
          <CartView />
        ) : (
          // No prices, no bag for now: orders go through TERAN's contact channels.
          <Suspense fallback={null}>
            <OrderByContact />
          </Suspense>
        )}
      </div>
      <Suspense fallback={<RailFallback />}>
        <CartSuggestions />
      </Suspense>
      <div className="pb-section-sm" />
    </>
  );
}
