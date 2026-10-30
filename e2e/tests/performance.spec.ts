import { expect, test, type APIRequestContext } from '@playwright/test';
import { visible } from './support/admin.ts';

/*
 * What keeps a first visit light on a slow phone (ADR-064, docs/performance-audit.md): pages with
 * no form to check load no validation library, a page's main picture is announced in the document
 * and never left to lazy loading, and the product cards draw their icons from one shared set
 * instead of each card carrying its own copies.
 */

/** The text of every script a page's HTML asks for as it loads. */
async function firstLoadScripts(request: APIRequestContext, path: string): Promise<string[]> {
  const html = await (await request.get(path)).text();
  const sources = [...html.matchAll(/<script src="([^"]+)"/g)].map((match) => match[1]!);
  expect(sources.length).toBeGreaterThan(0);
  return Promise.all(sources.map(async (source) => (await request.get(source)).text()));
}

test.describe('a light first load', () => {
  test('the home page, the catalogue and a product page load no validation library', async ({
    request,
  }) => {
    for (const path of ['/en', '/en/catalog', '/en/products/teran-xc2025']) {
      const scripts = await firstLoadScripts(request, path);
      expect(
        scripts.filter((script) => script.includes('ZodError')),
        path,
      ).toHaveLength(0);
    }
  });

  test("a TERAN tea's page announces its pack in the document and never loads it lazily", async ({
    page,
  }) => {
    await page.goto('/en/products/teran-xc2025');
    const pack = visible(
      page.getByRole('main').getByRole('img', { name: 'TERAN XC2025', exact: true }),
    );
    await expect(pack).not.toHaveAttribute('loading', 'lazy');
    await expect(
      page.locator('link[rel="preload"][as="image"][imagesrcset*="xc2025"]'),
    ).not.toHaveCount(0);
  });

  test("a pack fan's front pack stands from the first frame", async ({ page }) => {
    for (const path of ['/en/wholesale', '/en/about']) {
      await page.goto(path);
      const packs = page.getByRole('main').locator('div[aria-hidden].items-end img');
      await expect(packs).toHaveCount(5);
      // The front pack, the only one loaded at once, is the page's largest picture: an arrival
      // would postpone its paint (ADR-064). The four others still arrive.
      const front = await packs.evaluateAll((images) =>
        images.map((image) => image.getAttribute('loading') !== 'lazy'),
      );
      const moving = await packs.evaluateAll((images) =>
        images.map((image) => (image.parentElement?.getAnimations().length ?? 0) > 0),
      );
      expect(front.filter(Boolean), path).toHaveLength(1);
      expect(moving[front.indexOf(true)], path).toBe(false);
      expect(moving.filter(Boolean), path).toHaveLength(4);
    }
  });

  test('product cards draw their icons from one shared set', async ({ page }) => {
    await page.goto('/en/catalog');
    const cards = page.getByRole('main').locator('article');
    await expect(visible(cards)).toBeVisible();
    // The set is defined once on the page; the cards only point at it.
    await expect(page.locator('symbol[id^="card-icon-"]')).toHaveCount(5);
    expect(await cards.locator('use[href^="#card-icon-"]').count()).toBeGreaterThan(0);
  });
});
