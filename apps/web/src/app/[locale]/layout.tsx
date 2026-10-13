import type { Metadata, Viewport } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Cormorant_Garamond, Manrope } from 'next/font/google';
import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { routing } from '@/i18n/routing';
import { ogLocales, siteUrl } from '@/lib/site';
import '@/styles/globals.css';

const display = Cormorant_Garamond({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const sans = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-manrope',
  display: 'swap',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await rootParams.locale();
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'Meta' });

  return {
    metadataBase: new URL(siteUrl),
    title: { default: t('defaultTitle'), template: t('titleTemplate') },
    description: t('defaultDescription'),
    applicationName: 'TERAN',
    openGraph: {
      siteName: 'TERAN',
      type: 'website',
      locale: ogLocales[locale],
      images: [{ url: '/brand/og-default.png', width: 1200, height: 630, alt: 'TERAN' }],
    },
    twitter: { card: 'summary_large_image' },
    formatDetection: { telephone: false, address: false, email: false },
  };
}

export const viewport: Viewport = {
  themeColor: '#0b2e19',
  width: 'device-width',
  initialScale: 1,
};

export default async function LocaleLayout({ children }: LayoutProps<'/[locale]'>) {
  const locale = await rootParams.locale();
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html lang={locale} className={`${display.variable} ${sans.variable}`}>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
