import { expect, test, type Locator, type Page } from '@playwright/test';

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
      visible(page.getByRole('note').filter({ hasText: 'Demonstration catalogue' })),
    ).toBeVisible();
    await expectNoSidewaysScroll(page);

    await page.goto('/en/products/classic-black-tea');
    await expectNoSidewaysScroll(page);
    // Once the main button scrolls away, the sticky bar at the bottom takes over.
    const stickyAdd = page.getByRole('button', { name: 'Add to bag', exact: true });
    await expect(stickyAdd).toBeHidden();
    await page.evaluate(() => window.scrollBy(0, 1600));
    await stickyAdd.click();

    const drawer = page.getByRole('dialog', { name: 'Your bag' });
    await expect(drawer.getByText('Classic black tea')).toBeVisible();
    await drawer.getByRole('link', { name: 'Checkout' }).click();
    await expect(page).toHaveURL(/\/en\/checkout$/);
    await expect(visible(page.getByRole('heading', { level: 1, name: 'Checkout' }))).toBeVisible();
    await expect(visible(page.getByLabel('Full name'))).toBeVisible();
    await expectNoSidewaysScroll(page);
  });
});
