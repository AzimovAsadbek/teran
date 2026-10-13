import { expect, test, type Locator, type Page } from '@playwright/test';

/** Form fields live in <main>; the footer's newsletter form also has an "Email" field. */
function main(page: Page): Locator {
  return page.getByRole('main');
}

/** The visible form control whose label starts with `label` (Next keeps previous pages mounted, hidden). */
function field(page: Page, label: string): Locator {
  return visible(main(page).getByLabel(new RegExp(`^${label}`)));
}

function visible(locator: Locator): Locator {
  return locator.filter({ visible: true }).first();
}

const PASSWORD = 'e2e-password-123';

test.describe('customer account', () => {
  test('register, edit the profile, sign out and sign back in', async ({ page }) => {
    const email = `e2e-${Date.now()}@example.test`;

    await page.goto('/en/account/register');
    await field(page, 'First name').fill('Aziza');
    await field(page, 'Email').fill(email);
    await field(page, 'Password$').fill(PASSWORD);
    await field(page, 'Repeat password').fill('something-else-123');
    await main(page).getByRole('button', { name: 'Create account' }).click();
    await expect(visible(page.getByText('Passwords do not match'))).toBeVisible();

    await field(page, 'Repeat password').fill(PASSWORD);
    await main(page).getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/en\/account$/);
    await expect(visible(page.getByRole('heading', { name: 'Welcome, Aziza!' }))).toBeVisible();
    await expect(visible(page.getByText('No orders yet.'))).toBeVisible();

    await field(page, 'Phone').fill('90 111 22 33');
    await main(page).getByRole('button', { name: 'Save' }).click();
    await expect(visible(page.getByText('Saved'))).toBeVisible();

    await main(page).getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/en$/);
    await page.goto('/en/account');
    await expect(page).toHaveURL(
      /\/en\/account\/login\?next=%2Faccount|\/en\/account\/login\?next=\/account/,
    );

    // Wrong password: a generic message that does not reveal whether the account exists.
    await field(page, 'Email').fill(email);
    await field(page, 'Password').fill('not-the-password');
    await main(page).getByRole('button', { name: 'Sign in' }).click();
    await expect(
      visible(page.getByRole('alert').filter({ hasText: 'Incorrect e-mail or password.' })),
    ).toBeVisible();

    await field(page, 'Password').fill(PASSWORD);
    await main(page).getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/en\/account$/);
    await expect(field(page, 'Phone')).toHaveValue('+998 90 111 22 33');
  });

  test('ignores off-site redirects after signing in', async ({ page }) => {
    const email = `e2e-next-${Date.now()}@example.test`;
    await page.goto('/en/account/register');
    await field(page, 'First name').fill('Next');
    await field(page, 'Email').fill(email);
    await field(page, 'Password$').fill(PASSWORD);
    await field(page, 'Repeat password').fill(PASSWORD);
    await main(page).getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/en\/account$/);
    await main(page).getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/en$/);

    await page.goto(`/en/account/login?next=${encodeURIComponent('//evil.example/steal')}`);
    await field(page, 'Email').fill(email);
    await field(page, 'Password').fill(PASSWORD);
    await main(page).getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/en\/account$/);
  });
});

test.describe('enquiries', () => {
  test('contact form validates and sends', async ({ page }) => {
    await page.goto('/en/contact');
    await main(page).getByRole('button', { name: 'Send' }).click();
    await expect(
      visible(page.getByRole('alert').filter({ hasText: 'Please check the highlighted fields' })),
    ).toBeVisible();
    await expect(field(page, 'Your name')).toBeFocused();

    await field(page, 'Your name').fill('E2E Visitor');
    await field(page, 'Email').fill('visitor@example.test');
    await field(page, 'Message').fill('A question sent by the end-to-end test suite.');
    await main(page).getByRole('button', { name: 'Send' }).click();
    await expect(
      visible(page.getByRole('heading', { name: 'Your message has been sent' })),
    ).toBeFocused();
  });

  test('wholesale request requires company details and sends', async ({ page }) => {
    await page.goto('/en/wholesale');
    await main(page).getByRole('button', { name: 'Send' }).click();
    await expect(field(page, 'Company name')).toHaveAttribute('aria-invalid', 'true');
    await expect(field(page, 'Type of business')).toHaveAttribute('aria-invalid', 'true');

    await field(page, 'Company name').fill('E2E Café');
    await field(page, 'Type of business').selectOption('CAFE_RESTAURANT');
    await field(page, 'Contact person').fill('E2E Manager');
    await field(page, 'Phone').fill('90 222 33 44');
    await main(page).getByRole('button', { name: 'Send' }).click();
    await expect(
      visible(page.getByRole('heading', { name: 'Your message has been sent' })),
    ).toBeVisible();
  });
});
