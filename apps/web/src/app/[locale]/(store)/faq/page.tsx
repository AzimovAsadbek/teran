import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import {
  categoryHref,
  helpCategories,
  QuestionList,
  searchEntries,
  searchProps,
} from '@/components/help/help-parts';
import { SupportRow } from '@/components/content/support-row';
import { HelpSearch } from '@/components/help/help-search';
import { Link } from '@/i18n/navigation';
import { pageMetadata } from '@/lib/seo';

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

/**
 * The help centre (ADR-051), calm and with its answers in view: an opening with the search, the
 * groups as headed lists of their questions, each opening on its full answer in place (the groups
 * named down the side on wide screens, to jump to), and one row for writing or calling when the
 * answers do not settle it.
 */
export default async function HelpCentrePage() {
  const locale = (await rootParams.locale()) as Locale;
  const [t, tp] = await Promise.all([getTranslations('Help'), getTranslations('Pages')]);
  const categories = helpCategories(locale);
  const search = await searchProps(locale);

  return (
    <>
      <header className="relative z-10 bg-ivory-100">
        <div className="container-page pt-10 pb-12 sm:pt-14 lg:pt-16 lg:pb-16">
          <p className="font-headline text-[0.9375rem] tracking-[0.14em] text-forest-800 uppercase">
            {tp('faqTitle')}
          </p>
          <h1 className="mt-3 max-w-[48rem] font-heading text-[clamp(2.5rem,1.8rem+3vw,4.25rem)] leading-[1.02] text-balance text-fg">
            {t('bannerTitle')}
          </h1>
          <div className="mt-8 max-w-[40rem]">
            <HelpSearch
              entries={searchEntries(categories)}
              labels={search.labels}
              action={search.action}
              variant="hero"
            />
          </div>
        </div>
      </header>
      <div className="container-page grid grid-cols-1 gap-x-14 py-14 lg:grid-cols-12 lg:py-20">
        <nav aria-label={t('categories')} className="hidden lg:col-span-3 lg:block">
          <ul className="sticky top-32 space-y-1 border-l-2 border-forest-900/25 pl-4">
            {categories.map((category) => (
              <li key={category.id}>
                <a
                  href={`#${category.id}`}
                  className="flex items-baseline justify-between gap-3 py-1.5 text-[1rem] text-fg underline-offset-4 hover:underline"
                >
                  {category.heading}
                  <span className="text-[0.875rem] text-fg-subtle">{category.articles.length}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="space-y-14 lg:col-span-9 lg:space-y-16">
          {categories.map((category) => (
            <section
              key={category.id}
              id={category.id}
              aria-labelledby={`${category.id}-title`}
              className="scroll-mt-28"
            >
              <h2
                id={`${category.id}-title`}
                className="font-heading text-[1.75rem] leading-tight text-fg sm:text-[2.25rem]"
              >
                <Link
                  href={categoryHref(category.id)}
                  className="underline-offset-4 hover:underline"
                >
                  {category.heading}
                </Link>
              </h2>
              <div className="mt-4">
                <QuestionList group={category.id} articles={category.articles} />
              </div>
            </section>
          ))}
        </div>
      </div>
      <Suspense fallback={null}>
        <SupportRow />
      </Suspense>
    </>
  );
}
