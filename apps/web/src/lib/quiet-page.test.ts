import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type QuietPage = typeof import('./quiet-page');

/** A page laid out by hand (jsdom has no layout): each element's top and height on screen. */
function page(layout: Record<string, [number, number]>, dialogInside?: string) {
  document.body.innerHTML = `
    <div id="page">
      <header id="header"></header>
      <main id="main">
        <section id="a"></section>
        <section id="b"><div id="b1"></div><div id="b2"></div></section>
        <section id="c"></section>
      </main>
      <footer id="footer"></footer>
    </div>`;
  const dialog = document.createElement('dialog');
  (dialogInside ? document.getElementById(dialogInside)! : document.body).append(dialog);
  for (const element of document.querySelectorAll<HTMLElement>('body *')) {
    const [top, height] = layout[element.id] ?? [0, 0];
    element.getBoundingClientRect = () =>
      ({ top, height, bottom: top + height, width: 400, left: 0, right: 400 }) as DOMRect;
  }
  return dialog;
}

const LAYOUT: Record<string, [number, number]> = {
  page: [0, 4100],
  header: [0, 89],
  main: [89, 3000],
  a: [89, 500],
  b: [589, 700],
  b1: [589, 300],
  b2: [889, 400],
  c: [1289, 800],
  footer: [3089, 1000],
};

const hidden = (id: string) =>
  document.getElementById(id)!.style.getPropertyValue('content-visibility') === 'hidden';

describe('quiet page while a drawer is open', () => {
  let quiet: QuietPage;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.stubGlobal('innerHeight', 800);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      setTimeout(() => callback(0), 16),
    );
    vi.resetModules();
    quiet = await import('./quiet-page');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('stops rendering only the blocks wholly below the screen, keeping their size', () => {
    const dialog = page(LAYOUT);
    quiet.quietPageBelow(dialog);
    // The edge is a quarter of a screen below the screen (1,000 px here).
    expect(['c', 'footer'].filter(hidden)).toEqual(['c', 'footer']);
    expect(['page', 'header', 'main', 'a', 'b', 'b1', 'b2'].filter(hidden)).toEqual([]);
    const c = document.getElementById('c')!.style;
    expect(c.getPropertyValue('contain-intrinsic-block-size')).toBe('800px');
    expect(c.getPropertyValue('contain-intrinsic-inline-size')).toBe('400px');
  });

  it('renders them again after the frame that shows the drawer closing, as they were', () => {
    const dialog = page(LAYOUT);
    document.getElementById('footer')!.style.setProperty('content-visibility', 'auto');
    quiet.quietPageBelow(dialog);
    quiet.wakePage();
    expect(hidden('c')).toBe(true);
    vi.runAllTimers();
    expect(hidden('c')).toBe(false);
    expect(document.getElementById('c')!.getAttribute('style')).toBeFalsy();
    expect(document.getElementById('footer')!.style.getPropertyValue('content-visibility')).toBe(
      'auto',
    );
  });

  it('waits for the last of two open drawers, and a drawer opened again keeps them quiet', () => {
    const dialog = page(LAYOUT);
    quiet.quietPageBelow(dialog);
    quiet.quietPageBelow(dialog);
    quiet.wakePage();
    vi.runAllTimers();
    expect(hidden('c')).toBe(true);
    quiet.wakePage();
    // Opened again before the page woke: nothing is restored, and nothing measured twice.
    quiet.quietPageBelow(dialog);
    vi.runAllTimers();
    expect(hidden('c')).toBe(true);
    quiet.wakePage();
    vi.runAllTimers();
    expect(['c', 'footer'].filter(hidden)).toEqual([]);
  });

  it('never hides the block that holds the drawer itself', () => {
    const dialog = page(LAYOUT, 'footer');
    quiet.quietPageBelow(dialog);
    expect(hidden('footer')).toBe(false);
    expect(hidden('c')).toBe(true);
  });
});
