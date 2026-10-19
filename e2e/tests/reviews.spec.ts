import { expect, test, type Browser, type Page } from '@playwright/test';
import { field, signInAsAdmin, visible } from './support/admin.ts';

/** Reviews reach the page once the storefront's catalogue cache is refreshed (a second or so). */
async function eventually(page: Page, path: string, check: () => Promise<void>) {
  await expect(async () => {
    await page.goto(path);
    await check();
  }).toPass({ timeout: 20_000 });
}

async function visitor(browser: Browser): Promise<Page> {
  return (await browser.newContext()).newPage();
}

const PRODUCT = '/en/products/classic-green-tea';

test.describe('product ratings and reviews (ADR-042)', () => {
  test('a customer rates a tea, the page and its card show it, and staff can hide it', async ({
    page,
    browser,
  }) => {
    const reviews = () => page.locator('#reviews');
    await page.goto(PRODUCT);
    await expect(
      visible(reviews().getByRole('heading', { name: 'Customer reviews' })),
    ).toBeVisible();
    await expect(visible(page.getByRole('link', { name: 'No ratings yet' }))).toBeVisible();

    // A visitor is offered to register and comes straight back to the tea.
    await visible(reviews().getByRole('link', { name: 'Create an account' })).click();
    const email = `e2e-review-${Date.now()}@example.test`;
    await field(page, /^First name/).fill('Malika');
    await field(page, /^Email/).fill(email);
    await field(page, /^Password$/).fill('e2e-password-123');
    await field(page, /^Repeat password/).fill('e2e-password-123');
    await page.getByRole('main').getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/en\/products\/classic-green-tea/);

    // Stars are required; then the rating is saved and shown at once. Keys rather than clicks: the
    // offer card that slides in after 20 s must not catch them.
    const form = visible(reviews().locator('form'));
    const submit = form.getByRole('button', { name: 'Submit' });
    await submit.press('Enter');
    await expect(visible(form.getByText('Choose a number of stars.'))).toBeVisible();
    await form.getByRole('radio', { name: '5 stars' }).press('Space');
    await form.getByLabel(/^Comment/).fill('Fresh and bright, with a nutty finish.');
    await submit.press('Enter');
    await expect(visible(reviews().getByText('Thank you! Your rating is saved.'))).toBeVisible();

    // Everyone sees it once the catalogue refreshes: the average, the review and the card's stars.
    const store = await visitor(browser);
    await eventually(store, PRODUCT, async () => {
      await expect(
        visible(store.locator('#reviews').getByText('Fresh and bright, with a nutty finish.')),
      ).toBeVisible({
        timeout: 1_000,
      });
    });
    await expect(visible(store.getByRole('link', { name: /^5\.0 1 rating$/ }))).toBeVisible();
    await eventually(store, '/en/catalog', async () => {
      await expect(
        visible(store.getByRole('link', { name: 'Rated 5.0 out of 5 (1 rating)' })),
      ).toBeVisible({ timeout: 1_000 });
    });

    // Staff hide it: it leaves the page and the average.
    const admin = await visitor(browser);
    await signInAsAdmin(admin, '/admin/reviews');
    const card = admin
      .getByRole('listitem')
      .filter({ hasText: 'Fresh and bright, with a nutty finish.' });
    await card.getByRole('button', { name: 'Hide' }).click();
    await expect(card.getByRole('button', { name: 'Show on the site' })).toBeVisible();
    await eventually(store, PRODUCT, async () => {
      await expect(visible(store.getByRole('link', { name: 'No ratings yet' }))).toBeVisible({
        timeout: 1_000,
      });
    });
    // The author still sees their review, marked hidden.
    await page.reload();
    await expect(
      visible(reviews().getByText('A moderator has hidden this review from the site.')),
    ).toBeVisible();

    // Shown again, then deleted for good.
    await card.getByRole('button', { name: 'Show on the site' }).click();
    await expect(card.getByRole('button', { name: 'Hide' })).toBeVisible();
    await card.getByRole('button', { name: 'Delete' }).click();
    await admin.getByRole('dialog').getByRole('button', { name: 'Yes, delete' }).click();
    await expect(
      admin.getByRole('listitem').filter({ hasText: 'Fresh and bright, with a nutty finish.' }),
    ).toHaveCount(0);
    await store.context().close();
    await admin.context().close();
  });
});
