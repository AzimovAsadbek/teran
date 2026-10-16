import type { Locale } from '@teran/contracts';
import { ChevronDown } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { HelpFooter } from '@/components/content/help-footer';
import { Blocks } from '@/components/content/long-form';
import { PageHeader } from '@/components/content/page-header';
import { faqGroups } from '@/content/pages/faq';
import type { Block } from '@/content/types';
import { jsonLd, pageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Pages' });
  return pageMetadata({
    title: t('faqTitle'),
    description: t('faqDescription'),
    href: '/faq',
    locale,
  });
}

function plainText(blocks: readonly Block[]): string {
  return blocks
    .map((block) =>
      typeof block === 'string' ? block : 'list' in block ? block.list.join(' ') : block.note,
    )
    .join(' ');
}

export default async function FaqPage() {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations('Pages');
  const groups = faqGroups[locale];

  // Mirrors the visible questions and answers exactly.
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: groups.flatMap((group) =>
      group.items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: plainText(item.answer) },
      })),
    ),
  };

  return (
    <>
      <PageHeader
        eyebrow={t('helpEyebrow')}
        title={t('faqTitle')}
        intro={t('faqDescription')}
        illustration="oolong"
      />
      <div className="container-page grid grid-cols-1 gap-10 py-12 sm:py-16 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-16">
        <nav aria-label={t('onThisPage')} className="hidden lg:block">
          <ol className="sticky top-24 space-y-1 border-l border-line text-body-sm">
            {groups.map((group) => (
              <li key={group.id}>
                <a
                  href={`#${group.id}`}
                  className="-ml-px block border-l-2 border-transparent py-1.5 pl-4 text-fg-muted transition-colors hover:border-accent hover:text-fg"
                >
                  {group.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="max-w-3xl space-y-12">
          {groups.map((group) => (
            <section
              key={group.id}
              id={group.id}
              aria-labelledby={`${group.id}-title`}
              className="scroll-mt-24"
            >
              <h2 id={`${group.id}-title`} className="text-display-sm text-forest-900">
                {group.heading}
              </h2>
              <div className="mt-4 divide-y divide-line border-y border-line">
                {group.items.map((item) => (
                  <details key={item.question} data-disclose className="group py-1">
                    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-title text-fg transition-colors hover:text-brand [&::-webkit-details-marker]:hidden">
                      {item.question}
                      <ChevronDown
                        aria-hidden
                        className="h-5 w-5 shrink-0 text-fg-subtle transition-transform duration-200 group-open:rotate-180"
                      />
                    </summary>
                    <div className="max-w-prose space-y-3 pb-5 text-body text-fg-muted">
                      <Blocks blocks={item.answer} />
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      <HelpFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
    </>
  );
}
