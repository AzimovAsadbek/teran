import { expect, test, type Locator, type Page } from '@playwright/test';

/** Next keeps recently visited pages mounted but hidden, so assertions target the visible match. */
function visible(locator: Locator): Locator {
  return locator.filter({ visible: true }).first();
}

function count(page: Page, text: string): Locator {
  return visible(page.getByText(text, { exact: true }));
}

test.describe('catalogue', () => {
  test('finds products by collection identifier and by name', async ({ page }) => {
    await page.goto('/en/search?q=XC2025');
    await expect(
      visible(page.getByRole('main').getByRole('link', { name: /TERAN XC2025/ })),
    ).toBeVisible();

    await page.goto('/en/search?q=jasmine');
    await expect(
      visible(page.getByRole('main').getByRole('link', { name: /Jasmine green tea/ })),
    ).toBeVisible();

    await page.goto('/en/search?q=zzqqxx');
    await expect(visible(page.getByRole('heading', { name: 'Nothing found' }))).toBeVisible();
  });

  test('filters, sorts and keeps the state in the URL', async ({ page }) => {
    // Pu-erh: one of the two is sold out.
    await page.goto('/en/tea/pu-erh');
    await expect(count(page, '2 products')).toBeVisible();
    await visible(page.getByRole('main').getByRole('link', { name: /^In stock only/ })).click();
    await expect(page).toHaveURL(/inStock=true/);
    await expect(count(page, '1 product')).toBeVisible();

    // Green tea: seven loose-leaf teas and one in pyramids.
    await page.goto('/en/tea/green-tea');
    await expect(count(page, '8 products')).toBeVisible();
    // Filters are dropdowns, as on the reference; a choice applies at once.
    await visible(page.locator('details summary', { hasText: 'Format' })).click();
    await visible(page.getByRole('main').getByRole('link', { name: /^Loose leaf/ })).click();
    await expect(page).toHaveURL(/format=LOOSE_LEAF/);
    await expect(count(page, '7 products')).toBeVisible();

    await page.waitForLoadState('networkidle');
    await visible(page.getByLabel('Sort')).selectOption('price_asc');
    await expect(page).toHaveURL(/format=LOOSE_LEAF&sort=price_asc/);

    // From 150,000 UZS: the four 400 g TERAN packs.
    await visible(page.locator('details summary', { hasText: 'Price' })).click();
    await visible(page.getByLabel('Min price')).fill('150000');
    await visible(page.getByRole('button', { name: 'Apply' })).click();
    await expect(page).toHaveURL(/minPrice=150000/);
    await expect(count(page, '4 products')).toBeVisible();
    await expect(visible(page.getByRole('link', { name: /^Remove filter/ }))).toBeVisible();

    // A reload (or a shared link) restores the same results.
    await page.reload();
    await expect(count(page, '4 products')).toBeVisible();

    // Clearing removes the filters and keeps the chosen sort order.
    await visible(page.getByRole('link', { name: 'Clear filters' })).click();
    await expect(page).toHaveURL(/\/en\/tea\/green-tea\?sort=price_asc$/);
    await expect(count(page, '8 products')).toBeVisible();
  });

  test('choosing a pack size updates the price and the URL', async ({ page }) => {
    await page.goto('/en/products/classic-green-tea');
    await visible(page.locator('label').filter({ hasText: '250 g' })).click();
    await expect(page).toHaveURL(/variant=TRN-GRN-CLS-250/);
    await expect(page.getByRole('button', { name: 'Add to bag · 105,000 UZS' })).toBeVisible();
  });

  test('a TERAN pack product shows what its pack says', async ({ page }) => {
    await page.goto('/en/products/teran-xc2025');
    const main = page.getByRole('main');
    await expect(
      visible(main.getByRole('heading', { level: 1, name: 'TERAN XC2025' })),
    ).toBeVisible();
    await expect(visible(main.getByText(/thin, tightly rolled leaves/))).toBeVisible();
    await expect(visible(main.getByText('400 g', { exact: false }))).toBeVisible();
    // The pack's "How to brew" panel: 5 g per 250 ml, 90 °C, 2–3 minutes.
    const brewing = visible(main.getByRole('region', { name: 'How to brew' }));
    await expect(brewing).toContainText('5 g / 250 ml');
    await expect(brewing).toContainText('90 °C');
    await expect(brewing).toContainText('2–3 min');
    // Front and back of the pack.
    await expect(main.getByRole('img', { name: /TERAN XC2025/ })).not.toHaveCount(0);
  });
});
