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

  test('the phone drawer shows category tiles and opens the categories a level deeper @mobile', async ({
    page,
  }) => {
    await page.goto('/en');
    await page.getByRole('button', { name: 'Open menu' }).click();
    const drawer = page.getByRole('dialog', { name: 'Explore' });
    // Picture tiles for the top-level categories and collections, as on the reference.
    await expect(drawer.getByRole('link', { name: 'Tea', exact: true })).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'All products', exact: true })).toBeVisible();
    // "Shop" opens every category with its subcategories; "Back" returns.
    await drawer.getByRole('button', { name: 'Shop', exact: true }).click();
    await expect(drawer.getByRole('link', { name: /^Green tea/ })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Back' })).toBeFocused();
    await drawer.getByRole('button', { name: 'Back' }).click();
    await expect(drawer.getByRole('link', { name: /^Green tea/ })).toBeHidden();
    await drawer.getByRole('button', { name: 'Shop', exact: true }).click();
    await drawer.getByRole('link', { name: /^Green tea/ }).click();
    await expect(page).toHaveURL(/\/en\/tea\/green-tea$/);
    await expect(drawer).toBeHidden();
  });

  test('a kind of business on the home page opens the request form with it chosen', async ({
    page,
  }) => {
    await page.goto('/en');
    const business = page.getByRole('region', { name: 'Grow with TERAN.' });
    const hotels = business.getByRole('link', { name: /^Hotels/ });
    await hotels.scrollIntoViewIfNeeded();
    await expect(hotels).toHaveAttribute('href', /\/wholesale\?type=HOTEL#request$/);
    await business.getByRole('link', { name: /^Retail stores/ }).click();
    await expect(page).toHaveURL(/\/en\/wholesale\?type=RETAIL#request$/);
    const kind = page.getByLabel('Type of business');
    await expect(kind).toHaveValue('RETAIL');
    // A kind the visitor chooses themselves is kept.
    await kind.selectOption('DISTRIBUTOR');
    await expect(kind).toHaveValue('DISTRIBUTOR');
  });
});
