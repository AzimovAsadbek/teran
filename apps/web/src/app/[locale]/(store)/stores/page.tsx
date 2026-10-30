import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { preconnect } from 'react-dom';
import { PageHeader } from '@/components/content/page-header';
import { StoreLocator } from '@/components/stores/store-locator';
import { ClientMessages } from '@/i18n/client-messages';
import { getPublicSettings } from '@/lib/data/content';
import { pageMetadata, pointsOfSaleSchema } from '@/lib/seo';
import { JsonLd } from '@/components/seo/json-ld';

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

/** The stores from Admin → Store addresses (null when they could not be read). */
async function Locator() {
  await connection();
  const locale = await getLocale();
  const settings = await getPublicSettings(locale).catch(() => null);
  const places = settings ? pointsOfSaleSchema(settings.stores, locale as Locale) : null;
  // The locator's own texts reach the browser on this page only.
  return (
    <>
      {/* Each point of sale for search engines and maps, as entered in Admin (ADR-068). */}
      {places ? <JsonLd data={places} /> : null}
      <ClientMessages pick={['Stores']}>
        <StoreLocator stores={settings ? settings.stores : null} />
      </ClientMessages>
    </>
  );
}

/**
 * Store locator: the pale banner with the title and tagline, then the locator panel (search, list
 * and map, 600 px high from 990 px; a single store's card beside the map) in the 1440 px page
 * width. The stores carry their own phones; every channel is in the footer (ADR-045).
 */
export default async function StoresPage() {
  // The map's tiles come from OpenStreetMap: open the connection while the page loads.
  preconnect('https://tile.openstreetmap.org');
  const t = await getTranslations('Stores');
  return (
    <>
      <PageHeader title={t('title')} intro={t('tagline')} />
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
