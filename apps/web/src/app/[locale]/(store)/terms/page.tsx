import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import * as rootParams from 'next/root-params';
import { LegalPage, legalMetadata } from '@/components/content/legal-page';
import { termsFor } from '@/content/pages/terms';
import { showPrices } from '@/lib/site';

/** Without prices on the storefront, orders go by phone and messengers (lib/site showPrices). */
const terms = termsFor(!showPrices);

export async function generateMetadata(): Promise<Metadata> {
  return legalMetadata(terms, '/terms', (await rootParams.locale()) as Locale);
}

export default async function Page() {
  return <LegalPage content={terms} locale={(await rootParams.locale()) as Locale} />;
}
