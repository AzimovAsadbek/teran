import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { E2E_ADMIN } from '../scripts/e2e-env.ts';

/** Automated WCAG 2.0, 2.1 and 2.2 level A and AA rules. Manual review still applies. */
const WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Runs axe on what is currently rendered and lists every violation with its first targets. */
async function expectAccessible(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze();
  const violations = results.violations.map(
    (violation) =>
      `${violation.id} [${violation.impact ?? 'n/a'}] ${violation.help}: ${violation.nodes
        .slice(0, 3)
        .map((node) => node.target.join(' '))
        .join(' | ')}`,
  );
  // Soft, so one run reports every page with problems instead of stopping at the first.
  expect.soft(violations, `axe violations on ${label}`).toEqual([]);
}

async function visit(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

test.describe('accessibility (axe, WCAG 2.2 AA)', () => {
  test('storefront pages', async ({ page }) => {
    // Thirty-two pages, each loaded and analysed in turn: well over a minute on a busy machine.
    test.setTimeout(180_000);
    const paths = [
      '/',
      '/ru',
      '/en',
      '/en/catalog',
      '/en/tea',
      '/en/tea/black-tea',
      '/en/gift-sets',
      '/en/collections/everyday-classics',
      '/en/products/classic-black-tea',
      '/en/search?q=tea',
      '/en/cart',
      '/en/about',
      '/en/wholesale',
      '/en/journal',
      '/en/media',
      '/en/media/photos',
      '/en/media/videos',
      '/en/media/shorts',
      '/en/contact',
      '/en/stores',
      '/en/tea-101',
      '/en/accessibility',
      '/en/faq',
      '/en/faq/ordering',
      '/en/faq/ordering/how-do-i-place-an-order',
      '/en/delivery',
      '/en/returns',
      '/en/privacy',
      '/en/terms',
      '/en/account/login',
      '/en/account/register',
      '/en/account/forgot-password',
      '/en/products/does-not-exist',
    ];
    for (const path of paths) {
      await visit(page, path);
      await expectAccessible(page, path);
    }
  });

  test('bag drawer, checkout and form errors', async ({ page }) => {
    await visit(page, '/en/products/classic-black-tea');
    await page.getByRole('button', { name: /^Add to bag · / }).click();
    await expect(page.getByRole('dialog', { name: 'Your bag' })).toBeVisible();
    await expectAccessible(page, 'open bag drawer');

    await visit(page, '/en/checkout');
    await expect(page.getByLabel('Full name')).toBeVisible();
    await expectAccessible(page, 'checkout');
    await page.getByRole('button', { name: /^Place order/ }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'highlighted' })).toBeVisible();
    await expectAccessible(page, 'checkout with errors');

    await visit(page, '/en/contact');
    await page.getByRole('main').getByRole('button', { name: /send/i }).click();
    await expectAccessible(page, 'contact form with errors');
  });

  test('administration', async ({ page }) => {
    test.setTimeout(150_000);
    await visit(page, '/en/account/login?next=/admin');
    await page.getByRole('main').getByLabel('Email').fill(E2E_ADMIN.email);
    await page.getByRole('main').getByLabel('Password').fill(E2E_ADMIN.password);
    await page.getByRole('main').getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/en\/admin$/);
    for (const path of [
      '/en/admin',
      '/en/admin/orders',
      '/en/admin/products',
      '/en/admin/products/new',
      '/en/admin/categories',
      '/en/admin/journal',
      '/en/admin/journal/new',
      '/en/admin/media',
      '/en/admin/media?kind=videos',
      '/en/admin/media/post?kind=videos',
      '/en/admin/media?kind=shorts',
      '/en/admin/media/post?kind=shorts',
      '/en/admin/telegram',
      '/en/admin/product-types',
      '/en/admin/inventory',
      '/en/admin/customers',
      '/en/admin/inquiries',
      '/en/admin/delivery',
      '/en/admin/settings',
      '/en/admin/staff',
      '/en/admin/audit',
    ]) {
      await visit(page, path);
      await expectAccessible(page, path);
    }
  });

  test('account area, order and payment pages', async ({ page }) => {
    test.setTimeout(150_000);
    await visit(page, '/en/account/register');
    const main = page.getByRole('main');
    await main.getByLabel('First name').fill('Axe');
    await main.getByLabel('Email').fill(`axe-${Date.now()}@example.test`);
    await main.getByLabel(/^Password/).fill('axe-password-12345');
    await main.getByLabel('Repeat password').fill('axe-password-12345');
    await main.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/en\/account$/);
    for (const path of [
      '/en/account',
      '/en/account/orders',
      '/en/account/purchases',
      '/en/account/addresses',
      '/en/account/profile',
      '/en/account/security',
    ]) {
      await visit(page, path);
      await expectAccessible(page, path);
    }
    await page.getByRole('banner').getByLabel('Account menu').first().click();
    await expectAccessible(page, 'open account menu');

    // A demo online payment: the demonstration payment page and the order awaiting payment.
    await visit(page, '/en/products/classic-black-tea');
    await page.getByRole('button', { name: /^Add to bag · / }).click();
    await expect(page.getByRole('dialog', { name: 'Your bag' })).toBeVisible();
    await visit(page, '/en/checkout');
    await main.getByLabel('Phone number').fill('90 765 43 21');
    await main.getByLabel('Region').selectOption('UZ-TK');
    await main.getByLabel('City or district').fill('Tashkent');
    await main.getByLabel('Address', { exact: false }).first().fill('Axe street 1');
    await main.getByRole('radio', { name: /Payme/ }).check();
    await main.getByRole('checkbox', { name: /terms of use/ }).check();
    await main.getByRole('button', { name: /^Place order · / }).click();
    await expect(page).toHaveURL(/\/en\/payments\/demo\//);
    await page.waitForLoadState('networkidle');
    await expectAccessible(page, 'demonstration payment page');
    await page.getByRole('button', { name: 'Simulate a declined payment' }).click();
    await page.getByRole('link', { name: 'Continue to the order' }).click();
    await expect(page).toHaveURL(/\/en\/account\/orders\/TRN-/);
    await page.waitForLoadState('networkidle');
    await expectAccessible(page, 'order awaiting payment');
  });

  test('phone menu drawer and filters @mobile', async ({ page }) => {
    await visit(page, '/en/catalog');
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('dialog', { name: 'Explore' })).toBeVisible();
    await expectAccessible(page, 'open menu drawer');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Filters' }).click();
    await expect(page.getByRole('dialog', { name: 'Sort and filter' })).toBeVisible();
    await expectAccessible(page, 'open filters');
  });
});
