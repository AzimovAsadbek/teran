import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import * as rootParams from 'next/root-params';
import { LegalPage, legalMetadata } from '@/components/content/legal-page';
import { privacyPolicy } from '@/content/pages/privacy';

export async function generateMetadata(): Promise<Metadata> {
  return legalMetadata(privacyPolicy, '/privacy', (await rootParams.locale()) as Locale);
}

export default async function Page() {
  return <LegalPage content={privacyPolicy} locale={(await rootParams.locale()) as Locale} />;
}
