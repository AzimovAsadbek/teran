import type { Locale } from '@teran/contracts';
import { ArrowRight, ChevronRight, House } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Disclosure } from '@/components/content/disclosure';
import { Blocks } from '@/components/content/long-form';
import type { Block } from '@/content/types';
import { helpCentre, type HelpArticle, type HelpCategory } from '@/content/pages/faq';
import { getPathname, Link } from '@/i18n/navigation';
import { showPrices } from '@/lib/site';
import type { HelpSearchLabels } from './help-search';
import type { HelpSearchEntry } from './match';
import type { HelpNavCategory } from './help-shell';

/** The help centre in the reader's language (the answers as they apply now: see faqFor). */
export function helpCategories(locale: Locale): readonly HelpCategory[] {
  return helpCentre(locale, !showPrices);
}

export const categoryHref = (id: string) => `/faq/${id}`;
export const articleHref = (group: string, slug: string) => `/faq/${group}/${slug}`;

/** An answer as plain text: for excerpts, search and descriptions. */
export function plainText(blocks: readonly Block[]): string {
  return blocks
    .map((block) =>
      typeof block === 'string' ? block : 'list' in block ? block.list.join(' ') : block.note,
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function searchEntries(categories: readonly HelpCategory[]): HelpSearchEntry[] {
  return categories.flatMap((category) =>
    category.articles.map((article) => ({
      href: articleHref(category.id, article.slug),
      title: article.question,
      trail: category.heading,
      text: plainText(article.answer),
    })),
  );
}

export function navCategories(categories: readonly HelpCategory[]): HelpNavCategory[] {
  return categories.map((category) => ({
    id: category.id,
    heading: category.heading,
    href: categoryHref(category.id),
    articles: category.articles.map((article) => ({
      href: articleHref(category.id, article.slug),
      title: article.question,
    })),
  }));
}

export async function searchProps(locale: Locale) {
  const t = await getTranslations('Help');
  const labels: HelpSearchLabels = {
    placeholder: t('search'),
    label: t('searchLabel'),
    clear: t('clearSearch'),
    more: t.raw('moreResults') as string,
    none: t.raw('noResults') as string,
    count: t.raw('resultsCount') as string,
  };
  return { labels, action: getPathname({ href: '/faq/search', locale }) };
}

export async function shellLabels() {
  const t = await getTranslations('Help');
  return {
    open: t('openSidebar'),
    close: t('closeSidebar'),
    sidebar: t('sidebar'),
    allArticles: t('allArticles'),
  };
}

/**
 * A help group's questions, each opening on its full answer in place (ADR-051, UNFURL): the help
 * centre's front page and each group's page. The answer's own page stays one link away.
 */
export async function QuestionList({
  group,
  articles,
  headingLevel = 'h3',
}: {
  group: string;
  articles: readonly HelpArticle[];
  headingLevel?: 'h2' | 'h3';
}) {
  const t = await getTranslations('Help');
  return (
    <div className="border-t border-line">
      {articles.map((article) => (
        <Disclosure key={article.slug} question={article.question} headingLevel={headingLevel}>
          <Blocks blocks={article.answer} />
          <p>
            <Link
              href={articleHref(group, article.slug)}
              className="inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-forest-900 underline-offset-4 hover:underline"
            >
              {t('openAnswer')}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </p>
        </Disclosure>
      ))}
    </div>
  );
}

/** Search results: the question over three lines of the answer, two to a row. */
export function ArticleCards({
  articles,
}: {
  articles: readonly { href: string; title: string; text: string }[];
}) {
  return (
    <ul className="grid grid-cols-1 gap-4 min-[48rem]:grid-cols-2 min-[48rem]:gap-6">
      {articles.map((article) => (
        <li key={article.href}>
          <Link
            href={article.href}
            className="block h-full min-h-[9.375rem] rounded-[1.25rem] border border-line bg-surface p-6 transition-colors duration-200 hover:border-forest-900"
          >
            <span className="mb-1.5 block font-heading text-[1.1875rem] leading-snug text-fg">
              {article.title}
            </span>
            <span className="line-clamp-3 text-[1rem] leading-6 text-fg-muted">{article.text}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * The top of the help centre's inner pages: the breadcrumbs (a house for the help centre's home,
 * then the trail, the page itself in grey) and the small search at the right (under the trail on
 * phones).
 */
export async function HelpTopBar({
  trail,
  search,
}: {
  trail: readonly { label: string; href?: string }[];
  search: ReactNode;
}) {
  const t = await getTranslations('Help');
  return (
    <div className="mx-auto flex w-full max-w-[75rem] flex-col gap-4 px-4 pt-4 min-[48rem]:flex-row min-[48rem]:items-start min-[48rem]:justify-between min-[48rem]:px-6 min-[48rem]:pt-10 min-[78rem]:px-0">
      <nav aria-label={t('breadcrumb')}>
        <ol className="flex flex-wrap items-center gap-y-2">
          <li className="flex items-center">
            <Link
              href="/faq"
              aria-label={t('home')}
              className="-m-2.5 flex h-11 w-11 items-center justify-center text-fg"
            >
              <House aria-hidden className="h-6 w-6" strokeWidth={2} />
            </Link>
          </li>
          {trail.map((item, index) => (
            <li key={`${item.label}-${index}`} className="flex items-center">
              <ChevronRight
                aria-hidden
                className="mx-3 h-5 w-5 shrink-0 text-fg-subtle"
                strokeWidth={2}
              />
              {item.href ? (
                <Link
                  href={item.href}
                  className="text-[1rem] leading-6 text-fg underline-offset-4 hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-[1rem] leading-6 text-fg-subtle">
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      {search}
    </div>
  );
}
