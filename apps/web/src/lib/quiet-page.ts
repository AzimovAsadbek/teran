/*
 * While a modal drawer is open the page behind it is inert, and making a page inert (or live again)
 * restyles every element the page renders. Blocks lying wholly below the screen cannot be seen
 * behind the drawer, so they stop rendering while it is open (`content-visibility: hidden`, their
 * size kept, so nothing moves) and render again once it has closed and that frame has been painted
 * (ADR-066).
 */

interface Quieted {
  visibility: string;
  inline: string;
  block: string;
}

const quieted = new Map<HTMLElement, Quieted>();
let openCount = 0;
let pendingWake = false;

/** How deep to look inside blocks that cross the screen's lower edge (page, main, shelf, grid…). */
const DEPTH = 6;

/** Stops rendering the blocks wholly below the screen (call before `showModal()`). */
export function quietPageBelow(dialog: Element): void {
  openCount += 1;
  if (openCount > 1) return;
  // Blocks still quiet from a drawer closed a moment ago stay so (their wake is cancelled).
  pendingWake = false;
  // A quarter of a screen to spare, should the browser's toolbar move.
  const edge = window.innerHeight * 1.25;
  // Everything is measured first and changed after, so the page is laid out only once.
  const below: [HTMLElement, number, number][] = [];
  const visit = (parent: Element, depth: number) => {
    for (const child of parent.children) {
      if (!(child instanceof HTMLElement) || child === dialog || quieted.has(child)) continue;
      const box = child.getBoundingClientRect();
      if (box.height === 0) continue;
      if (box.top >= edge && !child.contains(dialog)) {
        // Hidden content counts as empty: its content box keeps the size it has now.
        const style = getComputedStyle(child);
        const sum = (...sides: string[]) =>
          sides.reduce((total, side) => total + (parseFloat(style.getPropertyValue(side)) || 0), 0);
        below.push([
          child,
          box.width -
            sum('padding-left', 'padding-right', 'border-left-width', 'border-right-width'),
          box.height -
            sum('padding-top', 'padding-bottom', 'border-top-width', 'border-bottom-width'),
        ]);
      } else if (depth > 0 && box.bottom > edge) {
        visit(child, depth - 1);
      }
    }
  };
  visit(document.body, DEPTH);
  for (const [element, width, height] of below) quiet(element, width, height);
}

/** Renders the quiet blocks again, after the frame that shows the drawer closing (on its close). */
export function wakePage(): void {
  openCount = Math.max(0, openCount - 1);
  if (openCount > 0 || quieted.size === 0) return;
  pendingWake = true;
  requestAnimationFrame(() =>
    setTimeout(() => {
      if (!pendingWake) return;
      pendingWake = false;
      for (const [element, previous] of quieted) {
        restore(element, 'content-visibility', previous.visibility);
        restore(element, 'contain-intrinsic-inline-size', previous.inline);
        restore(element, 'contain-intrinsic-block-size', previous.block);
      }
      quieted.clear();
    }, 0),
  );
}

function quiet(element: HTMLElement, width: number, height: number): void {
  const style = element.style;
  quieted.set(element, {
    visibility: style.getPropertyValue('content-visibility'),
    inline: style.getPropertyValue('contain-intrinsic-inline-size'),
    block: style.getPropertyValue('contain-intrinsic-block-size'),
  });
  style.setProperty('contain-intrinsic-inline-size', `${Math.max(0, width)}px`);
  style.setProperty('contain-intrinsic-block-size', `${Math.max(0, height)}px`);
  style.setProperty('content-visibility', 'hidden');
}

function restore(element: HTMLElement, property: string, value: string): void {
  if (value) element.style.setProperty(property, value);
  else element.style.removeProperty(property);
}
