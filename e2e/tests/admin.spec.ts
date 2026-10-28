import { fileURLToPath } from 'node:url';
import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import { E2E_ADMIN } from '../scripts/e2e-env.ts';

/** A real TERAN picture (the packaging art) to upload as a photograph. */
const PHOTO = fileURLToPath(
  new URL('../../apps/web/public/brand/art/terraces.webp', import.meta.url),
);

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
  // Cash on delivery: staff record the payment in this journey.
  await page.getByRole('radio', { name: /Cash on delivery/ }).check();
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

    // New product with one pack size. (The dashboard links to products too: use the menu.)
    await page
      .getByRole('navigation', { name: 'Administration' })
      .getByRole('link', { name: 'Products' })
      .click();
    // The dashboard stays in the document, hidden, with a "New product" link of its own: wait
    // for the products page before looking for its button.
    await expect(visible(page.getByRole('heading', { level: 1, name: 'Products' }))).toBeVisible();
    await visible(page.getByRole('link', { name: 'New product' })).click();
    const slug = `e2e-tea-${Date.now()}`;
    const sku = `E2E-${Date.now()}`;
    await field(page, 'Name').first().fill('E2E Admin Tea');
    // A new product starts without a category: staff choose one.
    await field(page, 'Category').selectOption({ index: 1 });
    await field(page, 'URL slug').fill(slug);
    await field(page, 'SKU').fill(sku);
    await field(page, 'Price').fill('61000');
    await field(page, /^Weight/).fill('100');
    await field(page, 'Initial stock').fill('5');

    // It cannot go on sale without a picture, and the editor says what is missing.
    await field(page, 'Status').selectOption('ACTIVE');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(
      visible(page.getByText(/Can’t publish yet — missing: .*Main image/)),
    ).toBeVisible();
    await field(page, 'Status').selectOption('DRAFT');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(visible(page.getByText('Product created.'))).toBeVisible();
    await expect(page).toHaveURL(/\/en\/admin\/products\/[0-9a-f-]{36}\?created=1$/);

    // The picture is previewed before it is sent, then becomes the main image.
    await page.locator('input[type="file"][multiple]').setInputFiles(PHOTO);
    await expect(visible(page.getByText('Ready', { exact: true }))).toBeVisible();
    await page.getByRole('button', { name: 'Upload 1 image' }).click();
    await expect(visible(page.locator('main ol img[src*="/uploads/"]'))).toBeVisible();
    await expect(visible(page.getByText('Main image', { exact: true }))).toBeVisible();

    // Published, and announced on Telegram — in this stack a dry run that sends nothing.
    await field(page, 'Status').selectOption('ACTIVE');
    await page
      .getByRole('checkbox', { name: 'Announce on the Telegram channel when it goes on sale' })
      .check();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(visible(page.getByText('Saved', { exact: true }))).toBeVisible();
    await expect(async () => {
      await page.reload();
      await expect(visible(page.getByText('Test: not sent'))).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Preview the post' }).click();
    const post = page.getByRole('dialog', { name: 'Telegram post' });
    await expect(post.getByText(/61 000/)).toBeVisible();
    await expect(post.getByRole('link')).toHaveAttribute('href', new RegExp(`/products/${slug}$`));
    await expect(post.getByText('This item has already been announced.')).toBeVisible();
    await post.getByRole('button', { name: 'Close' }).click();

    const store = await page.context().newPage();
    await store.goto(`/en/products/${slug}`);
    await expect(
      visible(store.getByRole('heading', { level: 1, name: 'E2E Admin Tea' })),
    ).toBeVisible();
    await expect(visible(store.getByText('61,000 UZS'))).toBeVisible();
    await store.close();

    // Restock through the ledger.
    await page.goto(`/en/admin/inventory?q=${sku}`);
    await visible(page.getByRole('button', { name: 'Adjust stock' })).click();
    const adjust = page.getByRole('dialog');
    await expect(adjust.getByRole('radio', { name: 'Stock in (+)' })).toBeChecked();
    await adjust.getByLabel('Quantity').fill('7');
    await adjust.getByRole('button', { name: 'Save stock in' }).click();
    await expect(visible(page.getByRole('cell', { name: '12', exact: true }))).toBeVisible();

    // A customer orders it; staff confirm, deliver and record the cash.
    const number = await placeGuestOrder(browser, slug);
    await page.goto(`/en/admin/orders?q=${number}`);
    await page.getByRole('link', { name: number }).click();
    // Every step is confirmed in a dialog that names the same action.
    for (const step of ['Confirm order', 'Start packing', 'Mark as sent', 'Mark as delivered']) {
      await visible(page.getByRole('main').getByRole('button', { name: step })).click();
      await page.getByRole('dialog').getByRole('button', { name: step }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.getByRole('main').getByRole('button', { name: step })).toHaveCount(0);
    }
    await page.getByRole('button', { name: 'Record cash payment' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Record cash payment' }).click();
    await expect(visible(page.getByText('Paid'))).toBeVisible();
    await expect(visible(page.getByText('This order is closed.'))).toBeVisible();
  });
  test('publishes a photograph to the gallery, then removes it', async ({ page }) => {
    await signInAsAdmin(page);
    await page
      .getByRole('navigation', { name: 'Administration' })
      .getByRole('link', { name: 'Gallery' })
      .click();
    // Photos and videos are separate lists, each with its own "new" button.
    await expect(
      visible(page.getByRole('navigation', { name: 'Type' }).getByRole('link', { name: /Photos/ })),
    ).toHaveAttribute('aria-current', 'page');
    await page.getByRole('link', { name: 'New photo' }).click();
    const title = `E2E photograph ${Date.now()}`;
    await field(page, 'Title').fill(title);
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page).toHaveURL(/\/en\/admin\/media\/[0-9a-f-]{36}$/);

    // Publishing waits for the photograph, which is previewed before it is uploaded.
    const status = field(page, 'Status');
    await expect(status.locator('option[value="PUBLISHED"]')).toBeDisabled();
    await page.locator('input[type="file"][accept^="image/"]').setInputFiles(PHOTO);
    await expect(visible(page.getByText('Not uploaded yet'))).toBeVisible();
    await visible(page.getByRole('button', { name: 'Upload', exact: true })).click();
    // (Pages visited before stay in the document, hidden: only the visible preview counts.)
    await expect(visible(page.locator('main img[src*="/uploads/media/"]'))).toBeVisible();
    await expect(status.locator('option[value="PUBLISHED"]')).toBeEnabled();
    await status.selectOption('PUBLISHED');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    const store = await page.context().newPage();
    const tile = () => store.getByRole('button', { name: `${title} — enlarge` });
    /** The photos page streams in after it loads: wait for it before looking at the tiles. */
    const openGallery = async () => {
      await store.goto('/en/media/photos');
      await expect(store.getByRole('navigation', { name: 'Kind of media' })).toBeVisible();
    };
    await expect(async () => {
      await openGallery();
      await expect(tile()).toHaveCount(1, { timeout: 1_000 });
    }).toPass({ timeout: 20_000 });
    await tile().click();
    await expect(store.getByRole('dialog', { name: title })).toBeVisible();
    await store.keyboard.press('Escape');

    // Back to the admin tab, as a person would: a tab behind another one is not painted, so its
    // confirmation dialog would never finish opening.
    await page.bringToFront();
    await page.getByRole('button', { name: 'Delete item' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete item' }).click();
    await expect(page).toHaveURL(/\/en\/admin\/media$/);
    await expect(async () => {
      await openGallery();
      await expect(tile()).toHaveCount(0, { timeout: 1_000 });
    }).toPass({ timeout: 20_000 });
    await store.close();
  });
});
