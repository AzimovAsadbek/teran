import type { Locale } from '@teran/contracts';
import { ChevronDown } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense, type ReactNode } from 'react';
import type { getPathname } from '@/i18n/navigation';
import type { Block, Localized, LongFormContent, Section } from '@/content/types';
import { cn } from '@/lib/cn';
import { pageMetadata } from '@/lib/seo';
import { LongForm, RichText } from './long-form';
import { DraftNotice, PageHeader } from './page-header';
import { SupportRow } from './support-row';

type Href = Parameters<typeof getPathname>[0]['href'];

/**
 * The policy pages' reading column (ADR-051): 17 px text at about 70 characters a line, left on
 * the page's margin under its opening, as typography.md asks of long reading.
 */
export const POLICY_PROSE = 'max-w-[40rem] text-[1.0625rem] leading-[1.75] text-fg';

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
 * "On this page": the sections' headings as links, down the side of a long document on wide
 * screens (and staying in view), folded into a disclosure above the text on phones.
 */
function Contents({ sections, label }: { sections: readonly Section[]; label: string }) {
  const links = (
    <ol className="space-y-1.5 text-[0.9375rem] leading-snug">
      {sections.map((section) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            className="block py-0.5 text-fg-muted underline-offset-4 hover:text-fg hover:underline"
          >
            {section.heading}
          </a>
        </li>
      ))}
    </ol>
  );
  return (
    <>
      <details className="group mb-8 rounded-[1rem] border border-line px-5 lg:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between font-semibold text-fg [&::-webkit-details-marker]:hidden">
          {label}
          <ChevronDown
            aria-hidden
            className="h-5 w-5 transition-transform duration-200 group-open:rotate-180"
          />
        </summary>
        <nav aria-label={label} className="pb-5">
          {links}
        </nav>
      </details>
      <nav aria-label={label} className="hidden lg:block">
        <div className="sticky top-32">
          <p className="font-headline text-[0.875rem] tracking-[0.12em] text-forest-900 uppercase">
            {label}
          </p>
          <div className="mt-4 border-l-2 border-forest-900/20 pl-4">{links}</div>
        </div>
      </nav>
    </>
  );
}

/**
 * Privacy, terms, returns and the accessibility statement on one reading template (ADR-051): the
 * opening with the title, then the text at a reading measure (the intro, then the sections under
 * serif headings), with "On this page" beside it when the document is long, the draft notice on
 * top while details still await confirmation, and at the end the row for writing or calling.
 * `children` close the text (before that row).
 */
export async function LegalPage({
  content,
  locale,
  action,
  children,
}: {
  content: Localized<LongFormContent>;
  locale: Locale;
  /** The closing pill's words where the page asks for something specific. */
  action?: string;
  children?: ReactNode;
}) {
  const t = await getTranslations('Pages');
  const page = content[locale];
  // A [bracketed] detail anywhere in the words (not the brackets of a list) marks a draft.
  const isDraft = [
    page.intro ?? '',
    ...page.sections.flatMap((section) => section.blocks.flatMap(blockTexts)),
  ].some((text) => /\[[^\]]+\]/.test(text));
  const long = page.sections.length >= 5;

  return (
    <>
      <PageHeader title={page.title} />
      <div
        className={cn(
          'container-page grid grid-cols-1 gap-x-14 pt-8 pb-14 sm:pt-10 lg:pt-14 lg:pb-20',
          long && 'lg:grid-cols-12',
        )}
      >
        {long ? (
          <div className="lg:col-span-3">
            <Contents sections={page.sections} label={t('onThisPage')} />
          </div>
        ) : null}
        <div className={cn(POLICY_PROSE, long && 'lg:col-span-8 lg:col-start-5')}>
          {isDraft ? <DraftNotice>{t('draftNotice')}</DraftNotice> : null}
          {page.intro ? (
            <p className="mb-2 text-[1.1875rem] leading-relaxed text-fg-muted">
              <RichText text={page.intro} />
            </p>
          ) : null}
          <LongForm sections={page.sections} />
          {children}
        </div>
      </div>
      <Suspense fallback={null}>
        <SupportRow action={action} />
      </Suspense>
    </>
  );
}
