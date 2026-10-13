import { LOCALES } from '@teran/contracts';
import { describe, expect, it } from 'vitest';
import { aboutPage } from './pages/about';
import { deliveryPage } from './pages/delivery';
import { faqGroups } from './pages/faq';
import { privacyPolicy } from './pages/privacy';
import { returnsPolicy } from './pages/returns';
import { termsOfUse } from './pages/terms';
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
    ['returns', returnsPolicy],
  ];

  it.each(documents)('%s has the same sections and blocks in every language', (_name, document) => {
    const reference = longFormShape(document.en);
    for (const locale of LOCALES) expect(longFormShape(document[locale])).toEqual(reference);
  });

  it.each(documents)('%s keeps meta descriptions within 160 characters', (_name, document) => {
    for (const locale of LOCALES)
      expect(document[locale].description.length).toBeLessThanOrEqual(160);
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
    }
  });
});
