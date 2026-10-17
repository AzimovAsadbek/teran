import { LOCALES } from '@teran/contracts';
import { describe, expect, it } from 'vitest';
import { aboutPage } from './pages/about';
import { accessibilityStatement } from './pages/accessibility';
import { deliveryPage } from './pages/delivery';
import { faqByContact, faqFor, faqGroups } from './pages/faq';
import { privacyPolicy } from './pages/privacy';
import { returnsPolicy } from './pages/returns';
import { termsFor, termsOfUse } from './pages/terms';
import { wholesalePage } from './pages/wholesale';
import type { Block, Localized, LongFormContent } from './types';

/** Shape of a block list: kinds and list lengths, so translations cannot silently drop content. */
function shape(blocks: readonly Block[]): string[] {
  return blocks.map((block) =>
    typeof block === 'string' ? 'text' : 'list' in block ? `list:${block.list.length}` : 'note',
  );
}

function longFormShape(page: LongFormContent) {
  return page.sections.map((section) => ({ id: section.id, blocks: shape(section.blocks) }));
}

describe('long-form content', () => {
  const documents: [string, Localized<LongFormContent>][] = [
    ['about', aboutPage],
    ['privacy', privacyPolicy],
    ['terms', termsOfUse],
    ['terms ordered by contact', termsFor(true)],
    ['returns', returnsPolicy],
    ['accessibility', accessibilityStatement],
  ];

  it.each(documents)('%s has the same sections and blocks in every language', (_name, document) => {
    const reference = longFormShape(document.en);
    for (const locale of LOCALES) expect(longFormShape(document[locale])).toEqual(reference);
  });

  it.each(documents)('%s keeps meta descriptions within 160 characters', (_name, document) => {
    for (const locale of LOCALES)
      expect(document[locale].description.length).toBeLessThanOrEqual(160);
  });

  it('the terms keep their sections when orders go by contact, and nothing awaits confirmation', () => {
    for (const locale of LOCALES) {
      const ids = (page: LongFormContent) => page.sections.map((section) => section.id);
      expect(ids(termsFor(true)[locale])).toEqual(ids(termsOfUse[locale]));
      expect(termsFor(false)).toBe(termsOfUse);
    }
    // A [bracketed] detail marks a draft on the page (components/content/legal-page.tsx).
    for (const document of [privacyPolicy, termsOfUse, termsFor(true), returnsPolicy]) {
      for (const locale of LOCALES)
        expect(JSON.stringify(document[locale])).not.toMatch(/\[[^\]"]+\]/);
    }
  });

  it('FAQ has the same groups and number of questions in every language', () => {
    const reference = faqGroups.en.map((group) => ({ id: group.id, items: group.items.length }));
    for (const locale of LOCALES) {
      expect(
        faqGroups[locale].map((group) => ({ id: group.id, items: group.items.length })),
      ).toEqual(reference);
    }
  });

  it('wholesale and delivery pages have the same steps everywhere', () => {
    for (const locale of LOCALES) {
      expect(wholesalePage[locale].steps).toHaveLength(wholesalePage.en.steps.length);
      expect(wholesalePage[locale].faq.items).toHaveLength(wholesalePage.en.faq.items.length);
      expect(deliveryPage[locale].steps).toHaveLength(deliveryPage.en.steps.length);
      expect(deliveryPage[locale].notes).toHaveLength(deliveryPage.en.notes.length);
      const { byContact } = deliveryPage[locale];
      expect(byContact.steps).toHaveLength(deliveryPage.en.byContact.steps.length);
      expect(byContact.notes).toHaveLength(deliveryPage.en.byContact.notes.length);
      expect(byContact.description.length).toBeLessThanOrEqual(160);
    }
  });

  it('FAQ answers for ordering by contact replace existing answers, the same ones everywhere', () => {
    const keys = (locale: (typeof LOCALES)[number]) =>
      Object.entries(faqByContact[locale]).map(([id, answers]) => [id, Object.keys(answers)]);
    for (const locale of LOCALES) {
      expect(keys(locale)).toEqual(keys('en'));
      for (const [id, answers] of Object.entries(faqByContact[locale])) {
        const group = faqGroups[locale].find((entry) => entry.id === id);
        for (const index of Object.keys(answers)) expect(group?.items[Number(index)]).toBeDefined();
      }
      // Only answers change: the questions and their order stay.
      const questions = (groups: typeof faqGroups.en) =>
        groups.map((group) => group.items.map((item) => item.question));
      expect(questions(faqFor(locale, true))).toEqual(questions(faqGroups[locale]));
      expect(faqFor(locale, false)).toBe(faqGroups[locale]);
    }
  });
});
