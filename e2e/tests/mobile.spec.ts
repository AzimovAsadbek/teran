import { expect, test, type Locator, type Page } from '@playwright/test';
import { API, publishProduct, staffRequest } from './support/admin.ts';

/** Next.js keeps visited pages mounted but hidden, so assertions target the visible match. */
function visible(locator: Locator): Locator {
  return locator.filter({ visible: true }).first();
}

/** A phone layout must never scroll sideways. */
async function expectNoSidewaysScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe('phone', () => {
  test('menu drawer, catalogue, sticky purchase bar and checkout @mobile', async ({ page }) => {
    await page.goto('/en');
    await expectNoSidewaysScroll(page);

    await page.getByRole('button', { name: 'Open menu' }).click();
    const menu = page.getByRole('dialog', { name: 'Explore' });
    await menu.getByRole('link', { name: 'All products' }).click();
    await expect(page).toHaveURL(/\/en\/catalog$/);
    await expect(menu).toBeHidden();
    await expect(
      visible(page.getByRole('note').filter({ hasText: 'Demonstration mode' })),
    ).toBeVisible();
    await expectNoSidewaysScroll(page);

    await page.goto('/en/products/classic-black-tea');
    await expectNoSidewaysScroll(page);
    // Once the main button scrolls away, the sticky bar at the bottom takes over. The main button
    // (its label carries the price) is scrolled past the top of the screen, however long the
    // product's facts above it are.
    const stickyAdd = page.getByRole('button', { name: 'Add to bag', exact: true });
    await expect(stickyAdd).toBeHidden();
    const mainAdd = visible(page.getByRole('button', { name: /^Add to bag ·/ }));
    await mainAdd.evaluate((button) =>
      window.scrollBy(0, button.getBoundingClientRect().bottom + 200),
    );
    await stickyAdd.click();

    const drawer = page.getByRole('dialog', { name: 'Your bag' });
    await expect(drawer.getByText('Classic black tea')).toBeVisible();
    await drawer.getByRole('link', { name: 'Checkout' }).click();
    await expect(page).toHaveURL(/\/en\/checkout$/);
    await expect(visible(page.getByRole('heading', { level: 1, name: 'Checkout' }))).toBeVisible();
    await expect(visible(page.getByLabel('Full name'))).toBeVisible();
    await expectNoSidewaysScroll(page);
  });

  test('a drawer leaves the page below the screen unrendered while open; the filters drawer applies its choices @mobile', async ({
    page,
  }) => {
    await page.goto('/en/catalog?sort=newest');
    // While a drawer is open, the blocks wholly below the screen stop rendering, so making the
    // page inert stays quick (ADR-066); they render again once it has closed.
    const footer = page.locator('footer');
    const filters = visible(page.getByRole('button', { name: 'Filters' }));
    const drawer = page.getByRole('dialog', { name: 'Sort and filter' });
    await filters.click();
    await expect(drawer).toBeVisible();
    await expect(footer).toHaveCSS('content-visibility', 'hidden');
    await drawer.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(drawer).toBeHidden();
    await expect(footer).toHaveCSS('content-visibility', 'visible');
    await expect(filters).toBeFocused();

    // The drawer's one form applies its choices together and closes.
    await filters.click();
    await drawer.getByRole('checkbox', { name: 'In stock only' }).check();
    await drawer.getByRole('button', { name: /^Show \d+ products?$/ }).click();
    await expect(page).toHaveURL(/[?&]inStock=true/);
    await expect(drawer).toBeHidden();
    await expectNoSidewaysScroll(page);
  });

  test('the hero is one view: TERAN’s words and a pill to the teas, without rotation @mobile', async ({
    page,
  }) => {
    await page.goto('/en');
    // One page heading (for screen readers), the tagline in view and the pill to the five teas.
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByText('Deep Taste.', { exact: true }).first()).toBeVisible();
    const pill = page.getByRole('link', { name: 'Shop teas', exact: true }).first();
    await expect(pill).toBeVisible();
    // No carousel: no slides, no dots to choose one.
    await expect(page.locator('[aria-roledescription="carousel"]')).toHaveCount(0);
    await expect(page.locator('[aria-roledescription="slide"]')).toHaveCount(0);
    await expectNoSidewaysScroll(page);
    // The pill opens the five teas the view shows (the premium collection).
    await pill.click();
    await expect(page).toHaveURL(/\/en\/collections\/teran-premium$/);
  });

  test('a category with a very long name fits the phone, on its page and in the menu @mobile', async ({
    page,
  }) => {
    const request = await staffRequest(page);
    const id = Date.now().toString(36);
    const slug = `e2e-long-${id}`;
    const name =
      'Tog‘ yonbag‘irlarida qo‘lda terilgan, an’anaviy usulda quritilgan noyob ko‘k choylar to‘plami';
    const english =
      'Rare hand-picked mountain-slope oolong teas, dried in the traditional way, with long names';
    const category = await request.post(`${API}/admin/categories`, {
      data: {
        slug,
        position: 70,
        isActive: true,
        illustrationKey: null,
        parentId: null,
        translations: { uz: { name }, ru: null, en: { name: english } },
      },
    });
    expect(category.status()).toBe(201);
    const { id: categoryId } = (await category.json()) as { id: string };
    await publishProduct(request, {
      slug: `${slug}-tea`,
      categoryId,
      format: 'LOOSE_LEAF',
      isFeatured: false,
      caffeineLevel: null,
      brewTempCelsius: null,
      brewTimeMinSeconds: null,
      brewTimeMaxSeconds: null,
      brewAmountGrams: null,
      illustrationKey: null,
      collectionIds: [],
      translations: { uz: { name: 'Uzun nomli choy' }, ru: null, en: { name: 'Long-named tea' } },
      variants: [
        {
          sku: `${slug.toUpperCase()}-50`,
          weightGrams: 50,
          unitCount: null,
          price: '70000',
          compareAtPrice: null,
          lowStockThreshold: 2,
          barcode: null,
          isActive: true,
          initialStock: 5,
        },
      ],
    });

    await expect(async () => {
      await page.goto(`/en/${slug}`);
      await expect(visible(page.getByRole('heading', { level: 1, name: english }))).toBeVisible({
        timeout: 1_000,
      });
    }).toPass({ timeout: 20_000 });
    await expectNoSidewaysScroll(page);

    // The menus' category list is cached and refreshed about a second after the change, while
    // the new category's own page is fresh at once: reload until the menu has it too. The
    // drawer's first view holds five picture tiles; every category is under its "Shop" row.
    const menu = page.getByRole('dialog', { name: 'Explore' });
    await expect(async () => {
      await page.reload();
      await page.getByRole('button', { name: 'Open menu' }).click();
      await menu.getByRole('button', { name: 'Shop', exact: true }).click();
      await expect(menu.getByText(english).first()).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 20_000 });
    const fits = await menu.evaluate((element) => element.scrollWidth <= element.clientWidth);
    expect(fits).toBe(true);
    await expectNoSidewaysScroll(page);

    const hidden = await request.put(`${API}/admin/categories/${categoryId}`, {
      data: {
        slug,
        position: 70,
        isActive: false,
        illustrationKey: null,
        parentId: null,
        translations: { uz: { name }, ru: null, en: { name: english } },
      },
    });
    expect(hidden.status()).toBe(200);
  });
});
