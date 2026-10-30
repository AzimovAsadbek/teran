import { expect, test } from '@playwright/test';

/*
 * The missing page (ADR-067): crawlers get a real 404 for an unknown product, category or article;
 * a browser gets the branded page, which then fetches its row of teas once. Pages that are found
 * never ask for that row, and do not carry it in their HTML.
 */

const CRAWLERS = {
  Googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  YandexBot: 'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
  bingbot: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
};
const UNKNOWN = [
  '/en/products/does-not-exist',
  '/en/tea/no-such-kind',
  '/en/journal/no-such-article',
];

test('crawlers get a real 404 for an unknown product, category and article', async ({
  request,
}) => {
  for (const [name, agent] of Object.entries(CRAWLERS)) {
    for (const path of UNKNOWN) {
      const response = await request.get(path, {
        headers: { 'User-Agent': agent },
        maxRedirects: 0,
      });
      expect(response.status(), `${name} ${path}`).toBe(404);
      const html = await response.text();
      expect(html, `${name} ${path}`).toMatch(/<meta name="robots" content="noindex/);
      expect(html, `${name} ${path}`).toContain('404');
    }
  }
});

test('a visitor sees the branded page, then its row of teas, fetched once', async ({ page }) => {
  const asked: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/suggestions')) asked.push(request.url());
  });
  await page.goto('/en/journal/no-such-article');
  await expect(page.getByText('404', { exact: true })).toBeVisible();
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  await expect(page.locator('main a[href*="/products/"]').first()).toBeVisible();
  expect(asked).toHaveLength(1);
  expect(asked[0]).toContain('locale=en');
});

test('found pages never ask for the row, nor carry it', async ({ page, request }) => {
  const asked: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/suggestions')) asked.push(request.url());
  });
  for (const path of ['/en', '/en/catalog', '/en/products/classic-green-tea', '/en/contact']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
  }
  expect(asked).toEqual([]);
  // The not-found element is in every page's payload: a found page carries its labels only, not
  // the row's teas (rendered on the server, they came as `"id":"discover"` with eight products).
  for (const path of ['/en/stores', '/en/contact']) {
    const html = await (await request.get(path)).text();
    expect(html, path).not.toMatch(/\\?"id\\?":\\?"discover\\?"/);
  }
});
