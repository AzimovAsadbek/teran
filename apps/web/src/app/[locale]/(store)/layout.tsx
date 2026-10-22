import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Suspense } from 'react';
import { CartDrawerSlot } from '@/components/cart/cart-drawer-slot';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { SkipLink } from '@/components/layout/skip-link';
import { ChatSlot, PromoPopupSlot } from '@/components/layout/store-widgets';
import { pickMessages, STORE_CLIENT_NAMESPACES, type Messages } from '@/i18n/messages';

export default async function StoreLayout({ children }: LayoutProps<'/[locale]'>) {
  const messages = (await getMessages()) as Messages;

  return (
    <NextIntlClientProvider messages={pickMessages(messages, STORE_CLIENT_NAMESPACES)}>
      <SkipLink />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <SiteFooter />
      <CartDrawerSlot />
      {/* The corner widgets: the offer card (lower left), the chat and the networks (lower right). */}
      <Suspense fallback={null}>
        <PromoPopupSlot />
      </Suspense>
      <Suspense fallback={null}>
        <ChatSlot />
      </Suspense>
    </NextIntlClientProvider>
  );
}
