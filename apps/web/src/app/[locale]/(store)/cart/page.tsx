import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { CartView } from '@/components/cart/cart-view';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Cart' });
  return pageMetadata({ title: t('metaTitle'), href: '/cart', locale, noIndex: true });
}

/** The bag is personal, so the page is a static shell and the lines load in the browser. */
export default async function CartPage() {
  const t = await getTranslations('Cart');
  return (
    <div className="container-page pt-8 pb-section sm:pt-10">
      <h1 className="text-display-lg text-forest-900">{t('drawerTitle')}</h1>
      <CartView />
    </div>
  );
}
