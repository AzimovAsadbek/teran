import type { Metadata, Viewport } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { routing } from '@/i18n/routing';
import { DEFAULT_OG_IMAGE, defaultRobots, searchIndexing } from '@/lib/seo';
import { ogLocales, siteUrl } from '@/lib/site';
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
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: { card: 'summary_large_image' },
    formatDetection: { telephone: false, address: false, email: false },
    // Only the real shop on its public address is indexed (demonstration content, staging and
    // local builds are not); pages can only narrow this.
    robots: defaultRobots(searchIndexing),
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
