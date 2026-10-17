import type { Metadata, Viewport } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { routing } from '@/i18n/routing';
import { isDemoContent, ogLocales, siteUrl } from '@/lib/site';
import { fontVariables } from '@/styles/fonts';
import '@/styles/globals.css';

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
    // Placeholder products and prices must never appear in search results.
    ...(isDemoContent ? { robots: { index: false, follow: true } } : {}),
  };
}

export const viewport: Viewport = {
  themeColor: '#107e84',
  width: 'device-width',
  initialScale: 1,
};

export default async function LocaleLayout({ children }: LayoutProps<'/[locale]'>) {
  const locale = await rootParams.locale();
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html lang={locale} className={fontVariables}>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
