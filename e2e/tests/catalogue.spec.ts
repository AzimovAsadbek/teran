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
    await page.goto('/en/catalog/pu-erh');
    await expect(count(page, '3 products')).toBeVisible();

    await visible(page.getByRole('main').getByRole('link', { name: /^In stock only/ })).click();
    await expect(page).toHaveURL(/inStock=true/);
    await expect(count(page, '2 products')).toBeVisible();

    await page.waitForLoadState('networkidle');
    await visible(page.getByLabel('Sort')).selectOption('price_asc');
    await expect(page).toHaveURL(/inStock=true&sort=price_asc/);

    await visible(page.locator('details summary', { hasText: 'Price' })).click();
    await visible(page.getByLabel('Min price')).fill('100000');
    await visible(page.getByRole('button', { name: 'Apply' })).click();
    await expect(page).toHaveURL(/minPrice=100000/);
    await expect(count(page, '1 product')).toBeVisible();
    await expect(visible(page.getByRole('link', { name: /^Remove filter/ }))).toBeVisible();

    // A reload (or a shared link) restores the same results.
    await page.reload();
    await expect(count(page, '1 product')).toBeVisible();

    // Clearing removes the filters and keeps the chosen sort order.
    await visible(page.getByRole('link', { name: 'Clear filters' })).click();
    await expect(page).toHaveURL(/\/en\/catalog\/pu-erh\?sort=price_asc$/);
    await expect(count(page, '3 products')).toBeVisible();
  });

  test('choosing a pack size updates the price and the URL', async ({ page }) => {
    await page.goto('/en/products/teran-xc2025');
    await expect(visible(page.getByText('Demo listing, shown as an oolong.'))).toBeVisible();
    await visible(page.locator('label').filter({ hasText: '100 g' })).click();
    await expect(page).toHaveURL(/variant=TRN-XC2025-100/);
    await expect(page.getByRole('button', { name: 'Add to bag · 124,000 UZS' })).toBeVisible();
  });
});
