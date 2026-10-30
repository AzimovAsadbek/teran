import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { CheckoutFooter, CheckoutHeader } from '@/components/layout/checkout-chrome';
import { SkipLink } from '@/components/layout/skip-link';
import { pickMessages, CHECKOUT_CLIENT_MESSAGES, type Messages } from '@/i18n/messages';

/**
 * Distraction-free checkout: the wordmark, a way back to the bag and the policies, without the shop
 * navigation, search or promotions that could pull the customer away from finishing the order.
 */
export default async function CheckoutLayout({ children }: LayoutProps<'/[locale]'>) {
  const messages = (await getMessages()) as Messages;

  return (
    <NextIntlClientProvider messages={pickMessages(messages, CHECKOUT_CLIENT_MESSAGES)}>
      <SkipLink />
      <CheckoutHeader />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <CheckoutFooter />
    </NextIntlClientProvider>
  );
}
