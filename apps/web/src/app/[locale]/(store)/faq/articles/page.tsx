import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import {
  articleHref,
  categoryHref,
  HelpTopBar,
  helpCategories,
  navCategories,
  searchEntries,
  searchProps,
  shellLabels,
  SupportRow,
} from '@/components/help/help-parts';
import { HelpSearch } from '@/components/help/help-search';
import { HelpShell } from '@/components/help/help-shell';
import { Link } from '@/i18n/navigation';
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

/** "All articles": every question of the help centre, by group, each leading to its answer. */
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
        <h1 className="pt-6 font-heading text-[2.25rem] leading-tight text-fg min-[48rem]:pt-0 sm:text-[2.75rem]">
          {t('allArticles')}
        </h1>
        <div className="mt-8 grid grid-cols-1 gap-x-12 gap-y-10 md:grid-cols-2">
          {categories.map((category) => (
            <section key={category.id} aria-labelledby={`all-${category.id}`}>
              <h2
                id={`all-${category.id}`}
                className="border-b border-line pb-3 font-heading text-[1.375rem] leading-tight text-fg"
              >
                <Link
                  href={categoryHref(category.id)}
                  className="underline-offset-4 hover:underline"
                >
                  {category.heading}
                </Link>
              </h2>
              <ul className="mt-3 space-y-1">
                {category.articles.map((article) => (
                  <li key={article.slug}>
                    <Link
                      href={articleHref(category.id, article.slug)}
                      className="block py-1.5 text-[1rem] leading-snug text-fg underline-offset-4 hover:text-forest-900 hover:underline"
                    >
                      {article.question}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </HelpShell>
      <Suspense fallback={null}>
        <SupportRow />
      </Suspense>
    </>
  );
}
