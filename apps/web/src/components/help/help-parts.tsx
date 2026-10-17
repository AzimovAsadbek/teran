import type { Locale } from '@teran/contracts';
import { ChevronRight, House, Phone } from 'lucide-react';
import Image, { type StaticImageData } from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { Fragment, Suspense, type ReactNode } from 'react';
import { ChatCard, OPTION_SMALL } from '@/components/content/contact-options';
import { VisualPicture } from '@/components/content/visual-picture';
import type { Block } from '@/content/types';
import { helpCentre, type HelpCategory } from '@/content/pages/faq';
import { getPathname, Link } from '@/i18n/navigation';
import { phoneLinks } from '@/lib/contact';
import { getPublicSettings } from '@/lib/data/content';
import { showPrices } from '@/lib/site';
import { visualFor } from '@/lib/visuals';
import lake from '../../../public/brand/art/lake.webp';
import sprig from '../../../public/brand/art/sprig-1.webp';
import terraces from '../../../public/brand/art/terraces.webp';
import pack8830 from '../../../public/brand/packs/8830.webp';
import packXc2025 from '../../../public/brand/packs/xc2025.webp';
import type { HelpSearchLabels } from './help-search';
import type { HelpSearchEntry } from './match';
import type { HelpNavCategory } from './help-shell';

/** TERAN's artwork for each category until a picture is set in Admin → Settings. */
const CATEGORY_ART: Record<string, { art: StaticImageData; contain?: boolean }> = {
  ordering: { art: packXc2025, contain: true },
  payment: { art: lake },
  delivery: { art: terraces },
  tea: { art: sprig },
  returns: { art: pack8830, contain: true },
};

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

/** A help-centre picture: the one set in Admin → Settings for `slot`, or TERAN's artwork. */
export async function HelpPicture({
  slot,
  art,
  contain = false,
  sizes,
  priority = false,
}: {
  slot: string;
  art: StaticImageData;
  contain?: boolean;
  sizes: string;
  priority?: boolean;
}) {
  await connection();
  const locale = await getLocale();
  const visual = visualFor(await getPublicSettings(locale).catch(() => null), slot);
  if (visual) {
    return (
      <div className="absolute inset-0">
        <VisualPicture visual={visual} sizes={sizes} priority={priority} />
      </div>
    );
  }
  return (
    <Image
      src={art}
      alt=""
      fill
      sizes={sizes}
      quality={60}
      priority={priority}
      className={contain ? 'bg-[#f2f1e9] object-contain p-3' : 'object-cover'}
    />
  );
}

/**
 * A help category's picture at the top of its own page: the same one its card shows (its place in
 * Admin → Settings, or TERAN's artwork), so the card's picture is where it leads.
 */
export function CategoryBanner({ id }: { id: string }) {
  const art = CATEGORY_ART[id] ?? { art: terraces };
  return (
    <div className="relative mb-8 aspect-[954/300] overflow-hidden rounded-[0.5rem] border border-[#ddd] bg-white min-[48rem]:aspect-[5/1]">
      <Suspense fallback={null}>
        <HelpPicture
          slot={`help.${id}`}
          art={art.art}
          contain={art.contain}
          sizes="(min-width: 78rem) 52rem, 100vw"
        />
      </Suspense>
    </div>
  );
}

/** The reference's category cards: three to a row with the picture on top, or one row each. */
export async function CategoryCards({ categories }: { categories: readonly HelpCategory[] }) {
  const t = await getTranslations('Help');
  return (
    <ul className="grid grid-cols-2 gap-4 min-[48rem]:grid-cols-3 min-[48rem]:gap-6 min-[48rem]:group-data-[mode=list]/mode:grid-cols-1">
      {categories.map((category) => {
        const art = CATEGORY_ART[category.id] ?? { art: terraces };
        return (
          <li key={category.id}>
            <Link
              href={categoryHref(category.id)}
              className="flex h-full flex-col overflow-hidden rounded-[0.5rem] border border-[#ddd] bg-white transition-[border-color,box-shadow] duration-200 hover:border-[#02b1af] hover:shadow-[inset_0_1px_2px_rgb(22_22_22_/_16%)] min-[48rem]:group-data-[mode=list]/mode:h-[10.25rem] min-[48rem]:group-data-[mode=list]/mode:flex-row"
            >
              <span className="relative block aspect-[954/450] w-full shrink-0 min-[48rem]:aspect-auto min-[48rem]:h-40 min-[48rem]:group-data-[mode=list]/mode:h-full min-[48rem]:group-data-[mode=list]/mode:w-[19.8125rem]">
                <Suspense fallback={null}>
                  <HelpPicture
                    slot={`help.${category.id}`}
                    art={art.art}
                    contain={art.contain}
                    sizes="(min-width: 48rem) 23rem, 50vw"
                  />
                </Suspense>
              </span>
              <span className="flex min-h-[5.125rem] flex-col justify-center px-4 py-3 min-[48rem]:min-h-0 min-[48rem]:justify-start min-[48rem]:group-data-[mode=list]/mode:justify-center">
                <span className="text-[1rem] leading-6 font-semibold text-black">
                  {category.heading}
                </span>
                <span className="hidden text-[0.75rem] leading-5 text-[#6a6a6a] min-[48rem]:block min-[48rem]:group-data-[mode=list]/mode:mt-3.5">
                  {t('articleCount', { count: category.articles.length })}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** The reference's article cards: the question over three lines of the answer, two to a row. */
export function ArticleCards({
  articles,
}: {
  articles: readonly { href: string; title: string; text: string }[];
}) {
  return (
    <ul className="grid grid-cols-1 gap-4 min-[48rem]:grid-cols-2 min-[48rem]:gap-6 min-[48rem]:group-data-[mode=list]/mode:grid-cols-1">
      {articles.map((article) => (
        <li key={article.href}>
          <Link
            href={article.href}
            className="block h-full min-h-[9.375rem] rounded-[0.5rem] border border-[#ddd] bg-white p-6 transition-[border-color,box-shadow] duration-200 hover:border-[#02b1af] hover:shadow-[inset_0_1px_2px_rgb(22_22_22_/_16%)]"
          >
            <span className="mb-1 block text-[1rem] leading-6 font-semibold text-black">
              {article.title}
            </span>
            <span className="line-clamp-3 text-[1rem] leading-6 text-[#6a6a6a]">
              {article.text}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** The reference's support cards: write (to the contact page) and call (TERAN's phones). */
export async function SupportCards() {
  await connection();
  const locale = (await getLocale()) as Locale;
  const [t, tp] = await Promise.all([getTranslations('Help'), getTranslations('Pages')]);
  const contact = (await getPublicSettings(locale).catch(() => null))?.contact;
  const phones = phoneLinks(contact);
  const TITLE = 'ml-4 text-[1rem] leading-6 font-semibold text-[#161616]';
  const BODY = 'p-4 text-[0.875rem] leading-6 text-[#6a6a6a]';
  return (
    <ul className="grid grid-cols-1 gap-4 min-[48rem]:grid-cols-2 min-[48rem]:gap-6">
      <li className="rounded-[0.5rem] border border-[#ddd] bg-white">
        <Link
          href="/contact"
          className="flex h-[3.5625rem] items-center border-b border-[#ddd] px-4"
        >
          {/* The reference's envelope: a teal card with a white flap. */}
          <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 shrink-0">
            <rect x="1.5" y="4.5" width="21" height="15" rx="1.8" fill="#02b1af" />
            <path
              d="m5.5 8.5 6.5 4.2 6.5-4.2"
              fill="none"
              stroke="#fff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className={TITLE}>{t('contactTitle')}</span>
          <ChevronRight
            aria-hidden
            className="ml-auto h-6 w-6 shrink-0 text-[#afafaf]"
            strokeWidth={2}
          />
        </Link>
        <p className={BODY}>{t('contactText')}</p>
      </li>
      <li className="rounded-[0.5rem] border border-[#ddd] bg-white">
        <div className="flex h-[3.5625rem] items-center border-b border-[#ddd] px-4">
          <Phone
            aria-hidden
            className="h-6 w-6 shrink-0 fill-[#02b1af] text-[#02b1af]"
            strokeWidth={1}
          />
          <h3 className={TITLE}>{t('callTitle')}</h3>
        </div>
        <div className={BODY}>
          <p>{tp('callCardText')}</p>
          {contact?.workingHours ? (
            <p className="whitespace-pre-line">{contact.workingHours}</p>
          ) : null}
          {phones.length > 0 ? (
            <p className="my-3.5 font-semibold">
              {tp('callCardPhones')}{' '}
              {phones.map((phone, index) => (
                <Fragment key={phone.href}>
                  {index > 0 ? ', ' : null}
                  <a
                    href={phone.href}
                    className="text-[#107e84] underline underline-offset-2 hover:decoration-2"
                  >
                    {phone.label}
                  </a>
                </Fragment>
              ))}
            </p>
          ) : null}
        </div>
      </li>
    </ul>
  );
}

/**
 * The top of the help centre's inner pages, as the reference's: the breadcrumbs (a house for the
 * help centre's home, then the trail, the page itself in grey) and the small search at the right
 * (under the trail on phones).
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
              className="-m-2.5 flex h-11 w-11 items-center justify-center text-[#161616]"
            >
              <House aria-hidden className="h-6 w-6" strokeWidth={2} />
            </Link>
          </li>
          {trail.map((item, index) => (
            <li key={`${item.label}-${index}`} className="flex items-center">
              <ChevronRight
                aria-hidden
                className="mx-4 h-6 w-6 shrink-0 text-[#afafaf]"
                strokeWidth={2}
              />
              {item.href ? (
                <Link
                  href={item.href}
                  className="text-[1rem] leading-6 text-[#161616] hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-[1rem] leading-6 text-[#6a6a6a]">
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

/** Under every help-centre page, as under the reference's: the chat card, 1152 px wide. */
export async function HelpChat() {
  const t = await getTranslations('Pages');
  return (
    <div className="container-frame pt-[0.3125rem] pb-[2.625rem] min-[61.875rem]:pb-[3.75rem]">
      <div className="mx-auto max-w-[72rem]">
        <ChatCard title={t('chatCardTitle')}>
          <p className={OPTION_SMALL}>{t('chatCardText')}</p>
        </ChatCard>
      </div>
    </div>
  );
}
