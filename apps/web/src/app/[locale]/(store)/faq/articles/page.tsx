import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import {
  CategoryCards,
  HelpContact,
  HelpTopBar,
  helpCategories,
  navCategories,
  searchEntries,
  searchProps,
  shellLabels,
} from '@/components/help/help-parts';
import { HelpSearch } from '@/components/help/help-search';
import { HelpSection } from '@/components/help/help-section';
import { HelpShell } from '@/components/help/help-shell';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const [t, tp] = await Promise.all([
    getTranslations({ locale, namespace: 'Help' }),
    getTranslations({ locale, namespace: 'Pages' }),
  ]);
  return pageMetadata({
    title: `${t('allArticles')} · ${tp('faqTitle')}`,
    description: tp('faqDescription'),
    href: '/faq/articles',
    locale,
  });
}

/** The reference's "All articles": the trail, the title with the view switch, then the categories. */
export default async function HelpArticlesPage() {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations('Help');
  const categories = helpCategories(locale);
  const [search, labels] = await Promise.all([searchProps(locale), shellLabels()]);

  return (
    <>
      <HelpTopBar
        trail={[{ label: t('allArticles') }]}
        search={
          <HelpSearch
            entries={searchEntries(categories)}
            labels={search.labels}
            action={search.action}
            variant="bar"
          />
        }
      />
      <HelpShell categories={navCategories(categories)} current="/faq/articles" labels={labels}>
        <HelpSection
          level={1}
          heading={t('allArticles')}
          headingClassName="text-[1.5rem] leading-8 font-semibold tracking-[-0.015rem] text-[#161616]"
          headerClassName="mb-10 pt-6 min-[48rem]:pt-0"
          labels={{ toList: t('toList'), toGrid: t('toGrid') }}
        >
          <h2 className="mb-4 text-[1.25rem] leading-7 font-semibold text-[#161616]">
            {t('categories')}
          </h2>
          <CategoryCards categories={categories} />
        </HelpSection>
      </HelpShell>
      <HelpContact />
    </>
  );
}
