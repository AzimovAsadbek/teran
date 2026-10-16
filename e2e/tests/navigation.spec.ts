import { expect, test, type Locator } from '@playwright/test';

/** Next.js keeps visited pages mounted but hidden, so assertions target the visible match. */
function visible(locator: Locator): Locator {
  return locator.filter({ visible: true }).first();
}

test.describe('navigation', () => {
  test('the catalogue panel follows the category in focus and closes with Esc', async ({
    page,
  }) => {
    await page.goto('/en');
    const trigger = page.getByRole('button', { name: 'Shop', exact: true });
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const panel = page.locator('[id$="-shop"]');

    // The first category with subcategories is shown first: its subcategories and a link to it.
    await expect(visible(panel.getByRole('link', { name: /^Green tea/ }))).toBeVisible();
    await expect(visible(panel.getByRole('link', { name: 'All in Tea' }))).toBeVisible();

    // Pointing at another category shows that one instead.
    await visible(panel.getByRole('link', { name: /^Gift sets/ })).hover();
    await expect(visible(panel.getByRole('link', { name: 'All in Gift sets' }))).toBeVisible();
    await expect(panel.getByRole('link', { name: /^Green tea/ })).toHaveCount(0);

    // Keyboard: Tab walks from a category into its own subcategories.
    await visible(panel.getByRole('link', { name: /^Tea/ })).focus();
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAccessibleName(/^Black tea/);

    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
    await expect(panel).toBeHidden();
  });

  test('the phone drawer opens a category like an accordion @mobile', async ({ page }) => {
    await page.goto('/en');
    await page.getByRole('button', { name: 'Open menu' }).click();
    const drawer = page.getByRole('dialog', { name: 'Explore' });
    const tea = drawer.getByRole('button', { name: /^Tea/ });
    // With few top-level categories the first one starts open.
    await expect(tea).toHaveAttribute('aria-expanded', 'true');
    await expect(drawer.getByRole('link', { name: /^Green tea/ })).toBeVisible();
    await tea.click();
    await expect(tea).toHaveAttribute('aria-expanded', 'false');
    await expect(drawer.getByRole('link', { name: /^Green tea/ })).toBeHidden();
    await tea.click();
    await drawer.getByRole('link', { name: /^Green tea/ }).click();
    await expect(page).toHaveURL(/\/en\/tea\/green-tea$/);
    await expect(drawer).toBeHidden();
  });
});
