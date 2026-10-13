import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import { E2E_ADMIN } from '../scripts/e2e-env.ts';

function visible(locator: Locator): Locator {
  return locator.filter({ visible: true }).first();
}

function field(page: Page, label: string | RegExp): Locator {
  return visible(page.getByRole('main').getByLabel(label));
}

async function signInAsAdmin(page: Page) {
  await page.goto('/en/account/login?next=/admin');
  await field(page, 'Email').fill(E2E_ADMIN.email);
  await field(page, 'Password').fill(E2E_ADMIN.password);
  await page.getByRole('main').getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/en\/admin$/);
}

async function placeGuestOrder(browser: Browser, slug: string): Promise<string> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/en/products/${slug}`);
  await page.getByRole('button', { name: /^Add to bag · / }).click();
  await visible(
    page.getByRole('dialog', { name: 'Your bag' }).getByRole('link', { name: 'Checkout' }),
  ).click();
  await field(page, 'Full name').fill('Admin Journey');
  await field(page, 'Phone number').fill('90 333 44 55');
  await field(page, 'Region').selectOption('UZ-TK');
  await field(page, 'City or district').fill('Tashkent');
  await field(page, /^Address/).fill('Test street 5');
  await page.getByRole('checkbox', { name: /terms of use/ }).check();
  await page.getByRole('button', { name: /^Place order · / }).click();
  await expect(page).toHaveURL(/\/en\/orders\/TRN-/);
  const number = new URL(page.url()).pathname.split('/').pop() ?? '';
  await context.close();
  return number;
}

test.describe('administration', () => {
  test('is closed to visitors and customers', async ({ page }) => {
    await page.goto('/en/admin');
    await expect(page).toHaveURL(/\/en\/account\/login\?next=/);

    const email = `e2e-customer-${Date.now()}@example.test`;
    await page.goto('/en/account/register');
    await field(page, 'First name').fill('Customer');
    await field(page, 'Email').fill(email);
    await field(page, /^Password$/).fill('e2e-password-123');
    await field(page, 'Repeat password').fill('e2e-password-123');
    await page.getByRole('main').getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/en\/account$/);

    await page.goto('/en/admin');
    await expect(visible(page.getByRole('heading', { name: 'Staff only' }))).toBeVisible();
    const response = await page.request.get('/api/v1/admin/dashboard');
    expect(response.status()).toBe(403);
  });

  test('creates a product that appears in the store, then fulfils an order', async ({
    page,
    browser,
  }) => {
    await signInAsAdmin(page);
    await expect(visible(page.getByRole('heading', { name: 'Dashboard' }))).toBeVisible();
    await expect(page.getByRole('link', { name: 'Staff' })).toBeVisible();

    // New product with one pack size.
    await page.getByRole('link', { name: 'Products' }).click();
    await page.getByRole('link', { name: 'New product' }).click();
    const slug = `e2e-tea-${Date.now()}`;
    const sku = `E2E-${Date.now()}`;
    await field(page, 'Name').first().fill('E2E Admin Tea');
    await field(page, 'Status').selectOption('ACTIVE');
    await field(page, 'URL slug').fill(slug);
    await field(page, 'SKU').fill(sku);
    await field(page, 'Price').fill('61000');
    await field(page, /^Weight/).fill('100');
    await field(page, 'Initial stock').fill('5');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(visible(page.getByText('Product created.'))).toBeVisible();

    const store = await page.context().newPage();
    await store.goto(`/en/products/${slug}`);
    await expect(
      visible(store.getByRole('heading', { level: 1, name: 'E2E Admin Tea' })),
    ).toBeVisible();
    await expect(visible(store.getByText('61,000 UZS'))).toBeVisible();
    await store.close();

    // Restock through the ledger.
    await page.goto(`/en/admin/inventory?q=${sku}`);
    await visible(page.getByRole('button', { name: 'Adjust' })).click();
    const adjust = page.getByRole('dialog');
    await adjust.getByLabel('Change').fill('7');
    await adjust.getByRole('button', { name: 'Save' }).click();
    await expect(visible(page.getByRole('cell', { name: '12', exact: true }))).toBeVisible();

    // A customer orders it; staff confirm, deliver and record the cash.
    const number = await placeGuestOrder(browser, slug);
    await page.goto(`/en/admin/orders?q=${number}`);
    await page.getByRole('link', { name: number }).click();
    await page.getByRole('button', { name: 'Mark as “Confirmed”' }).click();
    await expect(
      visible(page.getByRole('button', { name: 'Mark as “Being prepared”' })),
    ).toBeVisible();
    for (const status of ['Being prepared', 'On its way', 'Delivered']) {
      await page.getByRole('button', { name: `Mark as “${status}”` }).click();
      await expect(page.getByRole('button', { name: `Mark as “${status}”` })).toHaveCount(0);
    }
    await page.getByRole('button', { name: 'Record cash payment' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Record cash payment' }).click();
    await expect(visible(page.getByText('Paid'))).toBeVisible();
    await expect(visible(page.getByText('This order is closed.'))).toBeVisible();
  });
});
