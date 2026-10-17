import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { getPathname } from '@/i18n/navigation';
import type { Localized, LongFormContent } from '@/content/types';
import { pageMetadata } from '@/lib/seo';
import { HelpFooter } from './help-footer';
import { LongForm, RichText } from './long-form';
import { DraftNotice, PageHeader } from './page-header';

type Href = Parameters<typeof getPathname>[0]['href'];

export function legalMetadata(
  content: Localized<LongFormContent>,
  href: Href,
  locale: Locale,
): Metadata {
  const page = content[locale];
  return pageMetadata({ title: page.title, description: page.description, href, locale });
}

/** Privacy, terms and returns: numbered sections, table of contents and a draft notice. */
export async function LegalPage({
  content,
  locale,
}: {
  content: Localized<LongFormContent>;
  locale: Locale;
}) {
  const t = await getTranslations('Pages');
  const page = content[locale];
  const isDraft = page.sections.some((section) =>
    section.blocks.some((block) => JSON.stringify(block).includes('[')),
  );

  return (
    <>
      <PageHeader
        title={page.title}
        intro={page.intro ? <RichText text={page.intro} /> : undefined}
      />
      <div className="container-page py-12 sm:py-16">
        {isDraft ? <DraftNotice>{t('draftNotice')}</DraftNotice> : null}
        <LongForm sections={page.sections} tocLabel={t('onThisPage')} numbered />
      </div>
      <HelpFooter />
    </>
  );
}
