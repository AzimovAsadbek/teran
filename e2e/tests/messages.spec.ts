import { expect, test, type Page } from '@playwright/test';

/*
 * Each storefront page sends the browser only the messages its own client components read
 * (ADR-020, ADR-067; scripts/check-client-messages.mjs checks it from the code). This walks every
 * family of pages in the three languages, opens the parts that render later (validation, the 404
 * row), and fails on a message the page lacks: next-intl reports it and shows its key instead.
 */

const LOCALES = [
  { prefix: '', name: 'uz' },
  { prefix: '/ru', name: 'ru' },
  { prefix: '/en', name: 'en' },
];

const PAGES: { path: string; then?: (page: Page) => Promise<void> }[] = [
  { path: '' },
  { path: '/catalog' },
  { path: '/tea' },
  { path: '/search?q=tea' },
  { path: '/products/classic-green-tea' },
  { path: '/cart' },
  { path: '/stores' },
  { path: '/checkout' },
  { path: '/contact', then: submitEmpty },
  { path: '/wholesale', then: submitEmpty },
  { path: '/account/login', then: submitEmpty },
  {
    path: '/no-such-page',
    // The missing page's row of teas is fetched once it shows.
    then: (page) => expect(page.locator('main a[href*="/products/"]').first()).toBeVisible(),
  },
];

/** Sends the page's own form empty, so its validation messages render. */
async function submitEmpty(page: Page) {
  await page.locator('main form button[type="submit"]').first().click();
  await expect(page.locator('main [role="alert"]').first()).toBeVisible();
}

for (const locale of LOCALES) {
  test(`every page family has its messages in ${locale.name}`, async ({ page }) => {
    test.slow();
    const missing: string[] = [];
    page.on('console', (message) => {
      if (/MISSING_MESSAGE|INSUFFICIENT_PATH|IntlError/.test(message.text())) {
        missing.push(`${page.url()}: ${message.text().slice(0, 200)}`);
      }
    });
    for (const { path, then } of PAGES) {
      await page.goto(`${locale.prefix}${path}`);
      await page.waitForLoadState('networkidle');
      if (then) await then(page);
      // A missing message is shown as its key ("Catalog.sortOptions.newest").
      const text = await page.locator('body').innerText();
      expect(text, `${locale.prefix}${path}`).not.toMatch(
        /\b(Common|Nav|Cart|Product|Catalog|Brewing|Checkout|Forms|Account|Payment|Validation|Wholesale|Stores|Errors|Search|Newsletter|Social|Chat)\.[a-z][A-Za-z]+\b/,
      );
    }
    expect(missing).toEqual([]);
  });
}
