import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import * as rootParams from 'next/root-params';
import { LegalPage, legalMetadata } from '@/components/content/legal-page';
import { termsOfUse } from '@/content/pages/terms';

export async function generateMetadata(): Promise<Metadata> {
  return legalMetadata(termsOfUse, '/terms', (await rootParams.locale()) as Locale);
}

export default async function Page() {
  return <LegalPage content={termsOfUse} locale={(await rootParams.locale()) as Locale} />;
}
