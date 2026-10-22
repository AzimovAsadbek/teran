import type { Locale } from '@teran/contracts';
import { BRAND, BRAND_VALUES, brandCopy, brandValueLabels, PACKAGING } from './brand';
import { aboutPage } from './pages/about';
import { deliveryPage } from './pages/delivery';
import { faqFor } from './pages/faq';
import { returnsPolicy } from './pages/returns';
import { wholesalePage } from './pages/wholesale';
import type { Block, LongFormContent, QuestionGroup } from './types';

/*
 * The site's own texts as one plain document per language, for the AI assistant's knowledge
 * (Admin → Settings → AI assistant, ADR-055): what TERAN is (the brand copy and About), how
 * ordering and delivery work, the help centre's answers, returns and the for-business page.
 * Admin offers it to fill the assistant's text, which TERAN then edits; the catalogue, contacts,
 * stores and delivery methods the assistant reads live, so they are not repeated here.
 */

function blockText(block: Block): string {
  if (typeof block === 'string') return block;
  if ('list' in block) return block.list.map((item) => `• ${item}`).join('\n');
  return block.note;
}

function longForm(page: LongFormContent): string {
  return [
    `## ${page.title}`,
    page.intro,
    ...page.sections.map(
      (section) => `### ${section.heading}\n${section.blocks.map(blockText).join('\n')}`,
    ),
  ]
    .filter(Boolean)
    .join('\n\n');
}

function questions(group: QuestionGroup): string {
  return [
    `### ${group.heading}`,
    ...group.items.map((item) => `${item.question}\n${item.answer.map(blockText).join('\n')}`),
  ].join('\n\n');
}

function steps(list: readonly { title: string; text: string }[]): string {
  return list.map((step, index) => `${index + 1}. ${step.title}: ${step.text}`).join('\n');
}

/**
 * The texts in one language. `byContact`: the store shows no prices and takes orders by phone and
 * messages (lib/site `showPrices` off), so ordering, payment and delivery read as they do then.
 */
export function siteKnowledge(locale: Locale, byContact: boolean): string {
  const brand = brandCopy[locale];
  const values = brandValueLabels[locale];
  const delivery = deliveryPage[locale];
  const ordering = byContact ? delivery.byContact : delivery;
  const wholesale = wholesalePage[locale];
  return [
    [
      `## ${BRAND.name}`,
      `${BRAND.name} — ${BRAND.descriptor}. ${BRAND.company}, ${brand.location}. ${BRAND.website.label}`,
      brand.tagline,
      brand.description,
      `### ${brand.story.heading}\n${brand.story.paragraphs.join('\n')}`,
      `### ${brand.philosophy.heading}\n${brand.philosophy.principles
        .map((principle) => `• ${principle.title}: ${principle.text}`)
        .join('\n')}`,
      `### ${brand.collection.heading}\n${brand.collection.text}`,
      `### ${brand.partnership.heading}\n${brand.partnership.text}`,
      `${BRAND_VALUES.map((value) => values[value]).join(' · ')}\n${PACKAGING.tagline} ${PACKAGING.slogan.join(' · ')}`,
    ].join('\n\n'),
    longForm(aboutPage[locale]),
    [
      `## ${ordering.title}`,
      ordering.intro,
      steps(ordering.steps),
      ordering.notes.map((note) => `• ${note}`).join('\n'),
    ].join('\n\n'),
    faqFor(locale, byContact).map(questions).join('\n\n'),
    longForm(returnsPolicy[locale]),
    [
      `## ${wholesale.title}`,
      wholesale.intro,
      `### ${wholesale.products.title}\n${wholesale.products.text}`,
      `### ${wholesale.dealer.title}\n${wholesale.dealer.text}\n${wholesale.dealer.points
        .map((point) => `• ${point}`)
        .join('\n')}`,
      `### ${wholesale.segmentsTitle}\n${Object.values(wholesale.segments).join(' · ')}`,
      `### ${wholesale.processTitle}\n${steps(wholesale.steps)}`,
      questions(wholesale.faq),
    ].join('\n\n'),
  ].join('\n\n');
}
