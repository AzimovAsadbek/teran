import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { LegalPage, legalMetadata } from '@/components/content/legal-page';
import { accessibilityStatement } from '@/content/pages/accessibility';

export async function generateMetadata(): Promise<Metadata> {
  return legalMetadata(
    accessibilityStatement,
    '/accessibility',
    (await rootParams.locale()) as Locale,
  );
}

/**
 * The website's accessibility statement on the policy template (TERAN's says what this website
 * does), closing with the way to reach TERAN.
 */
export default async function AccessibilityPage() {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations('Pages');
  return (
    <LegalPage
      content={accessibilityStatement}
      locale={locale}
      action={t('accessibilityContact')}
    />
  );
}
