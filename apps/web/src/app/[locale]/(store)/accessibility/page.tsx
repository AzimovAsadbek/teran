import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { LegalPage, legalMetadata } from '@/components/content/legal-page';
import { accessibilityStatement } from '@/content/pages/accessibility';
import { Link } from '@/i18n/navigation';

export async function generateMetadata(): Promise<Metadata> {
  return legalMetadata(
    accessibilityStatement,
    '/accessibility',
    (await rootParams.locale()) as Locale,
  );
}

/**
 * The website's accessibility statement on the policy template (the reference's footer links an
 * accessibility page; its text is a Canadian employer's policy, so TERAN's says what this website
 * does), closing with the way to reach TERAN.
 */
export default async function AccessibilityPage() {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations('Pages');
  return (
    <LegalPage content={accessibilityStatement} locale={locale} wide>
      <p className="mt-8">
        <Link
          href="/contact"
          className="pill-hover inline-flex min-h-11 items-center rounded-full bg-forest-900 px-8 pt-[0.5625rem] pb-[0.4375rem] text-[1rem] leading-4 font-semibold text-white"
        >
          {t('accessibilityContact')}
        </Link>
      </p>
    </LegalPage>
  );
}
