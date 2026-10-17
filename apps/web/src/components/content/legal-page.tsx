import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import type { getPathname } from '@/i18n/navigation';
import type { Block, Localized, LongFormContent } from '@/content/types';
import { pageMetadata } from '@/lib/seo';
import { LongForm, RichText } from './long-form';
import { DraftNotice, PageHeader } from './page-header';
import { PromiseCard } from './promise-card';

type Href = Parameters<typeof getPathname>[0]['href'];

/** The reference's page column: 920 px of 16 px text, 40 px under the banner, 80 px above the footer. */
const POLICY_TEXT =
  'mx-auto w-full px-4 pt-7 pb-14 text-[1rem] leading-[1.6rem] font-medium text-[#121212] min-[46.875rem]:px-5 min-[61.875rem]:pt-10 min-[61.875rem]:pb-20';
export const POLICY_COLUMN = `${POLICY_TEXT} max-w-[60rem]`;

/** The words of a block, whatever its kind. */
function blockTexts(block: Block): readonly string[] {
  if (typeof block === 'string') return [block];
  return 'list' in block ? block.list : [block.note];
}

export function legalMetadata(
  content: Localized<LongFormContent>,
  href: Href,
  locale: Locale,
): Metadata {
  const page = content[locale];
  return pageMetadata({ title: page.title, description: page.description, href, locale });
}

/**
 * Privacy, terms and returns on the reference's page template: the banner with the title, then one
 * 920 px column of 16 px text (the intro first, then the sections), with the draft notice on top
 * while details still await confirmation. Returns opens with the promise card and heads its
 * sections in teal, as the reference's shipping and returns page. `children` close the column
 * (the accessibility statement's way to reach TERAN).
 */
export async function LegalPage({
  content,
  locale,
  headings = 'bold',
  wide = false,
  children,
}: {
  content: Localized<LongFormContent>;
  locale: Locale;
  headings?: 'bold' | 'teal';
  /** The reference's 1000 px column (its accessibility page) instead of the policies' 920 px. */
  wide?: boolean;
  children?: ReactNode;
}) {
  const t = await getTranslations('Pages');
  const page = content[locale];
  // A [bracketed] detail anywhere in the words (not the brackets of a list) marks a draft.
  const isDraft = [
    page.intro ?? '',
    ...page.sections.flatMap((section) => section.blocks.flatMap(blockTexts)),
  ].some((text) => /\[[^\]]+\]/.test(text));

  return (
    <>
      <PageHeader title={page.title} />
      {headings === 'teal' ? <PromiseCard /> : null}
      <div className={wide ? `${POLICY_TEXT} max-w-[65rem]` : POLICY_COLUMN}>
        {isDraft ? <DraftNotice>{t('draftNotice')}</DraftNotice> : null}
        {page.intro ? (
          <p className="mb-4">
            <RichText text={page.intro} />
          </p>
        ) : null}
        <LongForm sections={page.sections} headings={headings} />
        {children}
      </div>
    </>
  );
}
