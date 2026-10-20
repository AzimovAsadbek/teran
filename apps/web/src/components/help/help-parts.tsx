import type { Locale } from '@teran/contracts';
import { ArrowRight, ChevronRight, House, Phone, Send } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import { Disclosure } from '@/components/content/disclosure';
import { Blocks } from '@/components/content/long-form';
import type { Block } from '@/content/types';
import { helpCentre, type HelpArticle, type HelpCategory } from '@/content/pages/faq';
import { getPathname, Link } from '@/i18n/navigation';
import { phoneLinks, socialLinks } from '@/lib/contact';
import { getPublicSettings } from '@/lib/data/content';
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
 * Under every help page: one row for what the answers did not settle — write to TERAN (the
 * contact page), call or message it on Telegram (from Admin → Settings; left out when not set).
 */
export async function SupportRow() {
  await connection();
  const locale = (await getLocale()) as Locale;
  const [t, tp] = await Promise.all([getTranslations('Help'), getTranslations('Pages')]);
  const contact = (await getPublicSettings(locale).catch(() => null))?.contact;
  const phones = phoneLinks(contact);
  const telegram = socialLinks(contact).find((link) => link.network === 'telegram');
  const quiet =
    'inline-flex min-h-11 items-center gap-2 text-[1rem] font-semibold underline decoration-ivory-50/35 underline-offset-[6px] hover:decoration-ivory-50 focus-visible:outline-sun';
  return (
    <section aria-labelledby="help-support" className="container-page pb-16 lg:pb-24">
      <div className="flex flex-col gap-6 rounded-[1.5rem] bg-teal-ink px-6 py-8 text-ivory-50 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:py-10">
        <div className="max-w-[36rem]">
          <h2
            id="help-support"
            className="font-heading text-[1.75rem] leading-tight sm:text-[2rem]"
          >
            {tp('helpCardTitle')}
          </h2>
          <p className="mt-2 text-[1.0625rem] leading-relaxed text-pretty text-ivory-50/85">
            {tp('helpCardText')}
          </p>
          {contact?.workingHours ? (
            <p className="mt-2 text-[0.9375rem] whitespace-pre-line text-ivory-50/85">
              {contact.workingHours}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            href="/contact"
            className="pill-hover inline-flex h-12 items-center gap-2 rounded-full bg-sun px-7 text-[1rem] font-semibold text-ink-900 focus-visible:outline-sun"
          >
            <Send aria-hidden className="h-4 w-4" />
            {t('contactTitle')}
          </Link>
          {phones.map((phone) => (
            <a key={phone.href} href={phone.href} className={quiet}>
              <Phone aria-hidden className="h-4 w-4 text-sun" />
              {phone.label}
            </a>
          ))}
          {telegram ? (
            <a href={telegram.href} target="_blank" rel="noopener noreferrer" className={quiet}>
              {telegram.label}
            </a>
          ) : null}
        </div>
      </div>
    </section>
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
