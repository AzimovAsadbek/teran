import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { pickMessages, type Messages } from '@/i18n/messages';

/** Namespaces used by client components on storefront pages (long-form page copy stays on the server). */
const CLIENT_NAMESPACES = [
  'Common',
  'Nav',
  'Language',
  'Cart',
  'Product',
  'Search',
  'Errors',
  'Validation',
  'Newsletter',
  'Catalog',
  'Brewing',
  'Checkout',
  'Forms',
  'Account',
] as const satisfies readonly (keyof Messages)[];

export default async function StoreLayout({ children }: LayoutProps<'/[locale]'>) {
  const t = await getTranslations('Common');
  const messages = (await getMessages()) as Messages;

  return (
    <NextIntlClientProvider messages={pickMessages(messages, CLIENT_NAMESPACES)}>
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-forest-900 px-5 py-3 font-semibold text-ivory-50 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t('skipToContent')}
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <SiteFooter />
      <CartDrawer />
    </NextIntlClientProvider>
  );
}
