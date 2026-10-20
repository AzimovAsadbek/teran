import { cn } from '@/lib/cn';

type CardLayout = 'card' | 'feature' | 'feature-phone' | 'lead';

/**
 * The grid fitted to the number of products when the listing fits on one page, so its last row is
 * never one card alone and a small listing is not a half-empty wall: one or two products as wide
 * feature cards; three or six in rows of three; four as two by two on a tablet; five across from
 * 1024 px; a longer list that would leave one card alone opens on a lead card two columns by two
 * rows; on a phone an odd last card spans both columns, lying down. Longer, paged lists keep
 * four across.
 */
export function gridFor(count: number, onePage: boolean) {
  const card = (): CardLayout => 'card';
  const none = () => undefined;
  if (!onePage) {
    return { list: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4', layout: card, item: none };
  }
  const lastAlone = (index: number) => count % 2 === 1 && count > 2 && index === count - 1;
  const phoneLast = (index: number): CardLayout => (lastAlone(index) ? 'feature-phone' : 'card');
  const spanPhone = (index: number) => (lastAlone(index) ? 'max-md:col-span-2' : undefined);
  if (count <= 2) {
    return {
      list: count === 1 ? 'grid-cols-1 max-w-[60rem]' : 'grid-cols-1 gap-3 lg:grid-cols-2',
      layout: (): CardLayout => 'feature',
      item: none,
    };
  }
  if (count === 3 || count === 6) {
    return { list: 'grid-cols-2 md:grid-cols-3', layout: phoneLast, item: spanPhone };
  }
  if (count === 4) return { list: 'grid-cols-2 lg:grid-cols-4', layout: card, item: none };
  if (count === 5) {
    return {
      list: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
      layout: phoneLast,
      item: spanPhone,
    };
  }
  const lead = count % 4 === 1;
  return {
    list: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    layout: (index: number): CardLayout => (lead && index === 0 ? 'lead' : phoneLast(index)),
    item: (index: number) =>
      cn(lead && index === 0 && 'lg:col-span-2 lg:row-span-2', spanPhone(index)),
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
 * from 768 px likewise); on a phone an odd last card spans both columns, lying down. One or two
 * products stay feature cards.
 */
export function shelfGridFor(count: number) {
  if (count <= 2) return gridFor(count, true);
  const fits = (columns: number) => count % columns !== 1;
  // Three to five fill one row exactly; more choose the columns that leave no card alone.
  const lg = count <= 5 ? count : ([4, 5, 3].find(fits) ?? 4);
  const md = count === 3 ? 3 : ([3, 2].find(fits) ?? 3);
  const lastAlone = (index: number) => count % 2 === 1 && index === count - 1;
  return {
    list: cn('grid-cols-2', SHELF_MD[md], SHELF_LG[lg]),
    layout: (index: number): CardLayout => (lastAlone(index) ? 'feature-phone' : 'card'),
    item: (index: number) => (lastAlone(index) ? 'max-md:col-span-2' : undefined),
  };
}
