import { expect, test, type Locator, type Page } from '@playwright/test';
import { E2E_ADMIN } from '../scripts/e2e-env.ts';

/** Next keeps recently visited pages mounted but hidden, so assertions target the visible match. */
function visible(locator: Locator): Locator {
  return locator.filter({ visible: true }).first();
}

function main(page: Page): Locator {
  return page.getByRole('main');
}

function field(page: Page, label: string | RegExp): Locator {
  return visible(main(page).getByLabel(label));
}

const PASSWORD = 'e2e-journey-password-1';

async function bagCount(page: Page): Promise<number> {
  const label = await page
    .getByRole('button', { name: /in your bag|Your bag is empty/ })
    .first()
    .getAttribute('aria-label');
  const match = /(\d+)/.exec(label ?? '');
  return match ? Number(match[1]) : 0;
}

async function signIn(page: Page, email: string, password: string, next = '/account') {
  await page.goto(`/en/account/login?next=${encodeURIComponent(next)}`);
  await field(page, 'Email').fill(email);
  await field(page, 'Password').fill(password);
  await main(page).getByRole('button', { name: 'Sign in' }).click();
}

/**
 * The whole customer journey on the real stack (online payments in demo mode): a visitor's bag
 * survives a refresh and registration, the order is paid through the demonstration provider after
 * a declined attempt, stays in the account across sessions, is invisible to another customer and
 * appears for staff with every payment attempt.
 */
test('visitor to paying customer, end to end', async ({ page, browser }) => {
  const email = `e2e-journey-${Date.now()}@example.test`;

  // 1. A visitor browses a category page and adds a product to the bag.
  await page.goto('/en/tea/green-tea');
  await expect(visible(page.getByRole('heading', { level: 1, name: 'Green tea' }))).toBeVisible();
  await page.goto('/en/products/classic-green-tea');
  await page.getByRole('button', { name: /^Add to bag · / }).click();
  const drawer = page.getByRole('dialog', { name: 'Your bag' });
  await expect(drawer.getByText('Classic green tea')).toBeVisible();
  await drawer.getByRole('button', { name: /close/i }).first().click();

  // 2. The bag survives a refresh (it lives on the server, behind an HttpOnly cookie).
  await page.reload();
  await expect.poll(() => bagCount(page)).toBe(1);
  const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  expect(storage).not.toMatch(/teran_session|teran_cart|password/i);

  // 3. The header offers registration; the visitor creates an account.
  await visible(page.getByRole('banner').getByRole('link', { name: 'Register' })).click();
  await expect(page).toHaveURL(/\/en\/account\/register/);
  await field(page, 'First name').fill('Journey');
  await field(page, 'Email').fill(email);
  await field(page, /^Password/).fill(PASSWORD);
  await field(page, 'Repeat password').fill(PASSWORD);
  await main(page).getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/en\/account$/);

  // 4. The bag is still there after registering, and the header shows the account menu.
  await expect.poll(() => bagCount(page)).toBe(1);
  await expect(visible(page.getByRole('banner').getByLabel('Account menu'))).toBeVisible();

  // 5. Checkout with an online method (simulated in demo mode, and labelled as such).
  await page.goto('/en/checkout');
  await field(page, 'Phone number').fill('90 555 44 33');
  await field(page, 'Region').selectOption('UZ-TK');
  await field(page, 'City or district').fill('Tashkent');
  await visible(main(page).getByLabel('Address', { exact: false })).fill('Journey street 7');
  await visible(main(page).getByRole('checkbox', { name: /Save this address/ })).check();
  const click = visible(main(page).getByRole('radio', { name: /Click/ }));
  await click.check();
  await expect(visible(main(page).getByText(/Demo · no money is charged/))).toBeVisible();
  await visible(main(page).getByRole('checkbox', { name: /terms of use/ })).check();
  await visible(main(page).getByRole('button', { name: /^Place order · .+UZS$/ })).click();

  // 6. The demonstration payment page: no card details, a clear label; the payment is declined.
  await expect(page).toHaveURL(/\/en\/payments\/demo\/[A-Za-z0-9_-]+$/);
  await expect(visible(page.getByRole('heading', { name: 'Demonstration payment' }))).toBeVisible();
  await expect(page.locator('input[autocomplete*="cc-"], input[name*="card"]')).toHaveCount(0);
  await visible(page.getByRole('button', { name: 'Simulate a declined payment' })).click();
  await expect(visible(page.getByText(/Simulated result: Payment failed/))).toBeVisible();
  await visible(page.getByRole('link', { name: 'Continue to the order' })).click();

  // 7. Back on the order: nothing is marked paid; the customer retries with another method.
  await expect(page).toHaveURL(/\/en\/account\/orders\/TRN-[0-9A-Z]{8}$/);
  const orderNumber = page.url().split('/').pop() ?? '';
  await expect(visible(page.getByRole('heading', { name: 'Waiting for payment' }))).toBeVisible();
  await expect(visible(page.getByText(/did not go through/))).toBeVisible();
  await visible(main(page).getByRole('radio', { name: /Payme/ })).check();
  await visible(main(page).getByRole('button', { name: 'Pay with Payme' })).click();
  await expect(page).toHaveURL(/\/en\/payments\/demo\//);
  await visible(page.getByRole('button', { name: 'Simulate a successful payment' })).click();
  await expect(visible(page.getByText(/Simulated result: Paid/))).toBeVisible();
  await visible(page.getByRole('link', { name: 'Continue to the order' })).click();

  // 8. The order is stored and paid (as a demonstration: no money moved).
  await expect(page).toHaveURL(new RegExp(`/en/account/orders/${orderNumber}$`));
  await expect(visible(page.getByText('Payment received'))).toBeVisible();
  await expect(visible(page.getByText(/no money was charged/))).toBeVisible();

  // 9. Order history lists it; the address was saved to the address book.
  await page.goto('/en/account/orders');
  await expect(
    visible(main(page).getByRole('link', { name: new RegExp(orderNumber) })),
  ).toBeVisible();
  await page.goto('/en/account/addresses');
  await expect(visible(main(page).getByText('Journey street 7', { exact: false }))).toBeVisible();

  // 10. The order page shows its history and both payment attempts.
  await page.goto(`/en/account/orders/${orderNumber}`);
  await expect(visible(page.getByRole('heading', { name: 'Order history' }))).toBeVisible();
  await expect(visible(main(page).getByText(/Click · Payment failed/))).toBeVisible();
  await expect(visible(main(page).getByText(/Payme · Paid/))).toBeVisible();

  // 11. Sign out from the header menu and sign back in: the order is still there.
  await visible(page.getByRole('banner').getByLabel('Account menu')).click();
  await visible(page.getByRole('banner').getByRole('button', { name: 'Sign out' })).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(
    visible(page.getByRole('banner').getByRole('link', { name: 'Sign in' })),
  ).toBeVisible();
  await signIn(page, email, PASSWORD, '/account/orders');
  await expect(page).toHaveURL(/\/en\/account\/orders$/);
  await expect(
    visible(main(page).getByRole('link', { name: new RegExp(orderNumber) })),
  ).toBeVisible();

  // 12. Another customer cannot see this order, even with its number.
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto('/en/account/register');
  await field(otherPage, 'First name').fill('Other');
  await field(otherPage, 'Email').fill(`e2e-other-${Date.now()}@example.test`);
  await field(otherPage, /^Password/).fill(PASSWORD);
  await field(otherPage, 'Repeat password').fill(PASSWORD);
  await main(otherPage).getByRole('button', { name: 'Create account' }).click();
  await expect(otherPage).toHaveURL(/\/en\/account$/);
  await otherPage.goto(`/en/account/orders/${orderNumber}`);
  await expect(visible(otherPage.getByRole('heading', { name: 'Page not found' }))).toBeVisible();
  const forbidden = await otherPage.request.get(`/api/v1/account/orders/${orderNumber}`);
  expect(forbidden.status()).toBe(404);
  await other.close();

  // 13. Staff see the order with every attempt, marked as simulated.
  const staff = await browser.newContext();
  const staffPage = await staff.newPage();
  await signIn(staffPage, E2E_ADMIN.email, E2E_ADMIN.password, '/admin');
  await expect(staffPage).toHaveURL(/\/en\/admin$/);
  await staffPage.goto(`/en/admin/orders/${orderNumber}`);
  await expect(visible(staffPage.getByRole('heading', { name: 'Payments' }))).toBeVisible();
  await expect(visible(staffPage.getByText('Demo (simulated)'))).toBeVisible();
  await expect(visible(staffPage.getByText(/no money moved/))).toBeVisible();
  await staff.close();
});

test('a visitor without a session goes straight to sign-in from a private page', async ({
  page,
}) => {
  const response = await page.request.get('/en/account/orders', { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toMatch(/\/en\/account\/login\?next=%2Faccount%2Forders$/);
  await page.goto('/en/account/addresses');
  await expect(page).toHaveURL(/\/en\/account\/login\?next=/);
  await expect(visible(page.getByLabel('Email'))).toBeVisible();
});
