import { registerForm } from './verification.ts';
import { expect, type Page } from '@playwright/test';

/** Exercise the shop's return path with a new buyer and their existing guest bag. */
export async function registerAtCheckout(page: Page) {
  await expect(page).toHaveURL(/\/en\/account\/login\?next=(?:%2F|\/)checkout/i);
  const main = page.getByRole('main');
  await expect(main.getByText('Your items stay in your bag.', { exact: false })).toBeVisible();
  await main.getByRole('link', { name: 'Create account', exact: true }).click();
  await registerForm(page);
  await expect(page).toHaveURL(/\/en\/checkout$/);
}
