/*
 * The reference's filter controls: outlined rectangles with the group's name and a chevron.
 * Class strings are complete per state (cn is plain clsx, so nothing relies on one utility
 * overriding another).
 */
const FILTER_BUTTON_BASE =
  'inline-flex h-10 items-center gap-2.5 rounded-[0.5rem] border bg-surface px-3 text-[0.875rem] font-medium whitespace-nowrap text-fg transition-colors duration-200 ease-[ease] hover:border-[#191919]';

/** A filter button with nothing applied (the reference's grey outline, dark when pointed at). */
export const FILTER_BUTTON = `${FILTER_BUTTON_BASE} border-[#b7b7b9]`;

/** A filter button whose filter is applied (or whose panel is open). */
export const FILTER_BUTTON_ON = `${FILTER_BUTTON_BASE} border-[#191919]`;

/** The same button for filters with their own popover (price, number ranges); they colour it. */
export const FILTER_POPOVER_BUTTON =
  'inline-flex h-10 items-center gap-2.5 rounded-[0.5rem] border px-3 text-[0.875rem] font-medium whitespace-nowrap transition-colors duration-200 ease-[ease]';

/** A choice inside a filter dropdown: a checkbox square, the label and its count. */
export const FILTER_OPTION =
  'flex min-h-10 items-center gap-3 px-4 py-1.5 text-[0.9375rem] text-fg transition-colors duration-150 hover:bg-surface-muted';

/** The sort control beside the result count. */
export const SORT_SELECT =
  'h-10 cursor-pointer appearance-none rounded-[0.5rem] border border-[#b7b7b9] bg-surface pr-10 pl-3 text-[0.875rem] font-medium text-fg outline-none transition-[border-color,box-shadow] duration-200 ease-[ease] hover:border-[#191919] focus:border-focus focus:ring-[3px] focus:ring-focus/15';
