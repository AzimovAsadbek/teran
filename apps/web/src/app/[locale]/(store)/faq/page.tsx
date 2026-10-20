import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import {
  CategoryCards,
  HelpPicture,
  helpCategories,
  searchEntries,
  searchProps,
  SupportCards,
} from '@/components/help/help-parts';
import { HelpSearch } from '@/components/help/help-search';
import { HelpSection } from '@/components/help/help-section';
import { pageMetadata } from '@/lib/seo';
import lake from '../../../../../public/brand/art/lake.webp';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Pages' });
  return pageMetadata({
    title: t('faqTitle'),
    description: t('faqMetaDescription'),
    href: '/faq',
    locale,
  });
}

const H2 = 'text-[1.5rem] leading-8 font-semibold tracking-[-0.015rem] text-black';

/**
 * The help centre on the reference's: a 316 px banner (picture, a line in the soft serif, the
 * search box over it), "Get more information" with the five categories (grid or list), and "Get
 * support" with the contact and phone cards. The reference's chat card under it all is left out:
 * the support cards already lead to the contact page (ADR-045, ADR-047).
 */
export default async function HelpCentrePage() {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations('Help');
  const categories = helpCategories(locale);
  const search = await searchProps(locale);

  return (
    <>
      <section aria-labelledby="help-title" className="relative isolate z-10 h-[19.75rem]">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <Suspense fallback={null}>
            <HelpPicture slot="help.banner" art={lake} sizes="100vw" priority />
          </Suspense>
        </div>
        <div className="mx-auto flex h-full max-w-[75rem] flex-col items-center px-4 pt-[4.5rem] min-[48rem]:pt-[5.125rem]">
          <h1
            id="help-title"
            className="font-heading text-center text-[1.5rem] leading-8 tracking-[-0.025rem] text-balance text-[#003142] lowercase [--display-weight:700] min-[48rem]:text-[2.5rem] min-[48rem]:leading-[2.75rem]"
          >
            {t('bannerTitle')}
          </h1>
          <div className="mt-14 flex w-full justify-center min-[48rem]:mt-14">
            <HelpSearch
              entries={searchEntries(categories)}
              labels={search.labels}
              action={search.action}
              variant="hero"
            />
          </div>
        </div>
      </section>
      <div className="mx-auto w-full max-w-[75rem] px-4 pt-10 min-[48rem]:px-6 min-[78rem]:px-6">
        <div className="mx-auto max-w-[72rem]">
          <HelpSection
            heading={t('getInfo')}
            headingClassName={H2}
            headerClassName="mb-[3.75rem] min-[48rem]:mb-[3.75rem]"
            className="mb-10"
            labels={{ toList: t('toList'), toGrid: t('toGrid') }}
          >
            <CategoryCards categories={categories} />
          </HelpSection>
          <section aria-labelledby="support-title" className="pt-10 pb-16">
            <h2 id="support-title" className={`${H2} mb-[3.75rem]`}>
              {t('getSupport')}
            </h2>
            <Suspense fallback={<div className="h-48" />}>
              <SupportCards />
            </Suspense>
          </section>
        </div>
      </div>
    </>
  );
}
