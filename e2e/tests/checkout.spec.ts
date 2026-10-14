import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Next.js keeps recently visited pages mounted but hidden (React <Activity>) for instant back
 * navigation, and the bag drawer holds its own copy of some texts, so assertions target the
 * visible match.
 */
function visible(locator: Locator): Locator {
  return locator.filter({ visible: true }).first();
}

/** Opens a product, picks a pack size and quantity, and adds it to the bag. */
async function addToBag(page: Page, slug: string, pack: string, quantity: number) {
  await page.goto(`/en/products/${slug}`);
  await page.locator('label').filter({ hasText: pack }).first().click();
  for (let step = 1; step < quantity; step++) {
    await page.getByRole('button', { name: 'Increase' }).first().click();
  }
  await page.getByRole('button', { name: /^Add to bag · / }).click();
  const drawer = page.getByRole('dialog', { name: 'Your bag' });
  await expect(drawer).toBeVisible();
  return drawer;
}

test.describe('guest checkout', () => {
  test('browse, add to bag, validate and place a cash-on-delivery order', async ({ page }) => {
    await page.goto('/en/catalog');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const drawer = await addToBag(page, 'classic-black-tea', '250 g', 2);
    await expect(page).toHaveURL(/variant=TRN-BLK-CLS-250/);
    await expect(drawer.getByText('Classic black tea')).toBeVisible();
    await expect(drawer.getByText('196,000 UZS').first()).toBeVisible();
    await drawer.getByRole('link', { name: 'Checkout' }).click();
    await expect(page).toHaveURL(/\/en\/checkout$/);

    // An empty submit explains what is missing and moves focus to the first problem.
    await page.getByRole('button', { name: /^Place order/ }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'Please check the highlighted fields' }),
    ).toBeVisible();
    await expect(page.getByLabel('Full name')).toBeFocused();
    await expect(page.getByLabel('Full name')).toHaveAttribute('aria-invalid', 'true');

    await page.getByLabel('Full name').fill('E2E Customer');
    await page.getByLabel('Phone number').fill('90 000 00 00');
    await page.getByLabel('Region').selectOption('UZ-TK');
    await page.getByLabel('City or district').fill('Tashkent');
    await page.getByLabel('Address', { exact: false }).first().fill('Test street 1');
    await page.getByRole('radio', { name: /Cash on delivery/ }).check();
    await page.getByRole('checkbox', { name: /terms of use/ }).check();

    // The button shows the server-calculated total once the delivery quote has loaded.
    const placeOrder = page.getByRole('button', { name: /^Place order · .+UZS$/ });
    await expect(placeOrder).toBeVisible();
    await placeOrder.click();

    await expect(page).toHaveURL(/\/en\/orders\/TRN-[0-9A-Z]{8}\?token=[^&]+&placed=1$/);
    await expect(page.getByRole('heading', { name: /Thank you/ })).toBeVisible();
    await expect(visible(page.getByText('Cash on delivery'))).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);

    // The status link keeps working; a forged token reveals nothing.
    const url = new URL(page.url());
    const number = url.pathname.split('/').pop() ?? '';
    const token = url.searchParams.get('token') ?? '';
    await page.goto(`/en/orders/${number}?token=${encodeURIComponent(token)}`);
    await expect(visible(page.getByRole('heading', { name: `Order ${number}` }))).toBeVisible();
    await page.goto(`/en/orders/${number}?token=${'A'.repeat(43)}`);
    await expect(visible(page.getByRole('heading', { name: /Order not found/ }))).toBeVisible();

    // Placing the order emptied the bag.
    await page.goto('/en/cart');
    await expect(visible(page.getByText('Your bag is empty'))).toBeVisible();
  });

  test('checkout without items shows an empty bag', async ({ page }) => {
    await page.goto('/en/checkout');
    await expect(visible(page.getByText('Your bag is empty'))).toBeVisible();
  });
});

test.describe('not found', () => {
  test('unknown product and page URLs show the branded 404 without indexing', async ({ page }) => {
    for (const path of ['/en/products/does-not-exist', '/en/no-such-page']) {
      await page.goto(path);
      await expect(visible(page.getByRole('heading', { name: 'Page not found' }))).toBeVisible();
      await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
    }
  });
});
