import { cn } from '@/lib/cn';

/**
 * The reference's quick-add geometry, shared with the order pill shown while prices are hidden:
 * - touch screens: a white 40 px round button 8 px inside the picture's lower-right corner,
 *   always shown;
 * - with a mouse: a 44 px teal pill across the picture's foot (8 px from its edges) that appears
 *   at once while the card is pointed at or holds focus, and brightens while pointed at itself.
 */
export const QUICK_ACTION = cn(
  'absolute z-10 inline-flex items-center justify-center gap-1.5 rounded-full',
  'right-2 bottom-2 h-10 w-10 bg-surface text-fg shadow-[0_4px_14px_-4px_rgb(14_61_18_/_0.35)] ring-1 ring-forest-900/10',
  'pointer-fine:inset-x-2 pointer-fine:h-11 pointer-fine:w-auto pointer-fine:border-2 pointer-fine:border-forest-900 pointer-fine:bg-forest-900 pointer-fine:px-2 pointer-fine:pt-1 pointer-fine:text-ivory-50 pointer-fine:shadow-none pointer-fine:ring-0',
  'transition-[filter] duration-200 pointer-fine:hover:brightness-[1.08]',
  'pointer-fine:opacity-0 pointer-fine:group-focus-within/card:opacity-100 pointer-fine:group-hover/card:opacity-100',
);
