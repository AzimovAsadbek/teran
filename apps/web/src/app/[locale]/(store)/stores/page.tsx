import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { preconnect } from 'react-dom';
import { PageHeader } from '@/components/content/page-header';
import { StoreLocator } from '@/components/stores/store-locator';
import { pickMessages, STORE_CLIENT_NAMESPACES, type Messages } from '@/i18n/messages';
import { getPublicSettings } from '@/lib/data/content';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Stores' });
  return pageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    href: '/stores',
    locale,
  });
}

/** The stores from Admin → Settings → Stores (null when they could not be read). */
async function Locator() {
  await connection();
  const locale = await getLocale();
  const [settings, messages] = await Promise.all([
    getPublicSettings(locale).catch(() => null),
    getMessages() as Promise<Messages>,
  ]);
  // The locator's own texts reach the browser on this page only.
  return (
    <NextIntlClientProvider
      messages={pickMessages(messages, [...STORE_CLIENT_NAMESPACES, 'Stores'])}
    >
      <StoreLocator stores={settings ? settings.stores : null} />
    </NextIntlClientProvider>
  );
}

/**
 * Store locator on the reference's page: its tall pale banner with the title and tagline, then
 * the locator panel (search, list and map; 600 px high from 990 px) in the 1440 px page width.
 */
export default async function StoresPage() {
  // The map's tiles come from OpenStreetMap: open the connection while the page loads.
  preconnect('https://tile.openstreetmap.org');
  const t = await getTranslations('Stores');
  return (
    <>
      <PageHeader title={t('title')} intro={t('tagline')} size="large" />
      <div className="container-frame pt-10 pb-6">
        <Suspense
          fallback={
            <div
              aria-hidden
              className="h-[37.5rem] rounded-[0.3125rem] border border-black/10 bg-white shadow-[0_0_10px_rgb(0_0_0_/_3%)]"
            />
          }
        >
          <Locator />
        </Suspense>
      </div>
    </>
  );
}
