import { randomUUID } from 'node:crypto';
import { expect, type Page } from '@playwright/test';

/** Exercise the shop's return path with a new buyer and their existing guest bag. */
export async function registerAtCheckout(page: Page) {
  await expect(page).toHaveURL(/\/en\/account\/login\?next=(?:%2F|\/)checkout/i);
  const main = page.getByRole('main');
  await expect(main.getByText('Your tea stays in your bag.', { exact: false })).toBeVisible();
  await main.getByRole('link', { name: 'Create account', exact: true }).click();
  const fields = main
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Create account', exact: true }) });
  await fields.getByLabel(/^First name/).fill('Buyer');
  await fields.getByLabel(/^Email/).fill('checkout-' + randomUUID() + '@example.test');
  await fields.getByLabel(/^Password$/).fill('test-checkout-password');
  await fields.getByLabel(/^Repeat password/).fill('test-checkout-password');
  await fields.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/en\/checkout$/);
}
