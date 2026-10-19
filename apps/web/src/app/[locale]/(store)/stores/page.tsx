import type { Locale } from '@teran/contracts';
import { Phone, Send } from 'lucide-react';
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
import { Link } from '@/i18n/navigation';
import { phoneLinks, socialLinks } from '@/lib/contact';
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

const PILL =
  'inline-flex items-center gap-2 rounded-[3.125rem] px-5 pt-2.5 pb-2 text-[1rem] leading-[1.05rem] font-medium transition-colors';

/** The stores from Admin → Store addresses (null when they could not be read). */
async function Locator() {
  await connection();
  const locale = await getLocale();
  const [settings, messages, t] = await Promise.all([
    getPublicSettings(locale).catch(() => null),
    getMessages() as Promise<Messages>,
    getTranslations('Stores'),
  ]);
  const stores = settings ? settings.stores : null;
  const [phone] = phoneLinks(settings?.contact);
  const telegram = socialLinks(settings?.contact).find((link) => link.network === 'telegram');
  // The locator's own texts reach the browser on this page only.
  return (
    <>
      <NextIntlClientProvider
        messages={pickMessages(messages, [...STORE_CLIENT_NAMESPACES, 'Stores'])}
      >
        <StoreLocator stores={stores} />
      </NextIntlClientProvider>
      {stores && stores.length > 0 ? (
        // Under the stores: whom to ask about buying in bulk or becoming a partner.
        <section
          aria-labelledby="stores-help"
          className="mt-8 flex flex-col gap-5 rounded-[0.75rem] bg-ivory-200 p-6 sm:p-8 md:flex-row md:items-center md:justify-between"
        >
          <div className="max-w-xl">
            <h2
              id="stores-help"
              className="font-heading text-[1.5rem] leading-[1.9rem] text-black [--display-weight:600]"
            >
              {t('helpTitle')}
            </h2>
            <p className="mt-2 text-[0.9375rem] leading-[1.45rem] text-[#444]">{t('helpText')}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {phone ? (
              <a href={phone.href} className={`${PILL} bg-[#107e84] text-white hover:bg-[#0b6c71]`}>
                <Phone aria-hidden className="h-4 w-4" />
                {phone.label}
              </a>
            ) : null}
            {telegram ? (
              <a
                href={telegram.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${PILL} border border-[#107e84] text-[#107e84] hover:bg-[#107e84]/[0.06]`}
              >
                <Send aria-hidden className="h-4 w-4" />
                Telegram
              </a>
            ) : null}
            <Link
              href="/wholesale"
              className={`${PILL} border border-[#107e84] text-[#107e84] hover:bg-[#107e84]/[0.06]`}
            >
              {t('emptyWholesale')}
            </Link>
          </div>
        </section>
      ) : null}
    </>
  );
}

/**
 * Store locator: the pale banner with the title and tagline, then the locator panel (search, list
 * and map, 600 px high from 990 px; a single store's card beside the map) in the 1440 px page
 * width, and under it whom to ask about buying in bulk.
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
