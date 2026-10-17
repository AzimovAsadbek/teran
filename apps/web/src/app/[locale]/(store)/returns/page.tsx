import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import * as rootParams from 'next/root-params';
import { LegalPage, legalMetadata } from '@/components/content/legal-page';
import { returnsPolicy } from '@/content/pages/returns';

export async function generateMetadata(): Promise<Metadata> {
  return legalMetadata(returnsPolicy, '/returns', (await rootParams.locale()) as Locale);
}

export default async function Page() {
  return (
    <LegalPage
      content={returnsPolicy}
      locale={(await rootParams.locale()) as Locale}
      headings="teal"
    />
  );
}
