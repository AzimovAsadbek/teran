import { cn } from '@/lib/cn';

type CardLayout = 'card' | 'feature' | 'lead';

/**
 * The grid fitted to the number of products when the listing fits on one page, so its last row is
 * never one card alone from 768 px and a small listing is not a half-empty wall: one or two
 * products as wide feature cards from 768 px; three or six in rows of three; four as two by two
 * on a tablet; five across from 1024 px; a longer list that would leave one card alone opens on
 * a lead card two columns by two rows. On a phone every card is the same size in two columns, an
 * odd last one too (the owner's word of 2026-10-22). Longer, paged lists keep four across.
 */
export function gridFor(count: number, onePage: boolean) {
  const card = (): CardLayout => 'card';
  const none = () => undefined;
  if (!onePage) {
    return { list: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4', layout: card, item: none };
  }
  if (count <= 2) {
    return {
      list:
        count === 1
          ? 'grid-cols-2 md:grid-cols-1 max-w-[60rem]'
          : 'grid-cols-2 gap-3 md:grid-cols-1 lg:grid-cols-2',
      layout: (): CardLayout => 'feature',
      item: none,
    };
  }
  if (count === 3 || count === 6) {
    return { list: 'grid-cols-2 md:grid-cols-3', layout: card, item: none };
  }
  if (count === 4) return { list: 'grid-cols-2 lg:grid-cols-4', layout: card, item: none };
  if (count === 5) {
    return { list: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5', layout: card, item: none };
  }
  const lead = count % 4 === 1;
  return {
    list: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    layout: (index: number): CardLayout => (lead && index === 0 ? 'lead' : 'card'),
    item: (index: number) => (lead && index === 0 ? 'lg:col-span-2 lg:row-span-2' : undefined),
  };
}

const SHELF_LG: Record<number, string> = {
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
};
const SHELF_MD: Record<number, string> = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3' };

/**
 * A catalogue shelf's grid (family-shelves.tsx): never a lead card (a shelf has no product to put
 * first), so its columns are chosen instead — three to five products fill one row; more stand
 * four across, else five or three, whichever leaves no card alone on the last row (three or two
 * from 768 px likewise); on a phone every card is the same size in two columns. One or two
 * products stay feature cards from 768 px.
 */
export function shelfGridFor(count: number) {
  if (count <= 2) return gridFor(count, true);
  const fits = (columns: number) => count % columns !== 1;
  // Three to five fill one row exactly; more choose the columns that leave no card alone.
  const lg = count <= 5 ? count : ([4, 5, 3].find(fits) ?? 4);
  const md = count === 3 ? 3 : ([3, 2].find(fits) ?? 3);
  return {
    list: cn('grid-cols-2', SHELF_MD[md], SHELF_LG[lg]),
    layout: (): CardLayout => 'card',
    item: (): string | undefined => undefined,
  };
}
