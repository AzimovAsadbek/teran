import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { E2E_ADMIN } from '../scripts/e2e-env.ts';

function visible(locator: Locator): Locator {
  return locator.filter({ visible: true }).first();
}

const API = '/api/v1';

/** A staff session for the admin API (the same endpoints the admin area uses). */
async function staffRequest(page: Page): Promise<APIRequestContext> {
  await page.goto('/en/account/login?next=/admin');
  await visible(page.getByRole('main').getByLabel('Email')).fill(E2E_ADMIN.email);
  await visible(page.getByRole('main').getByLabel('Password')).fill(E2E_ADMIN.password);
  await page.getByRole('main').getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/en\/admin$/);
  return page.request;
}

async function shopMenuLinks(page: Page): Promise<string[]> {
  await page.goto('/en');
  await page.getByRole('button', { name: 'Shop', exact: true }).click();
  return page
    .locator('[id$="-shop"] a')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
}

test.describe('multi-category catalogue', () => {
  test('category pages load directly and after a refresh, with filters in the URL', async ({
    page,
  }) => {
    await page.goto('/en/tea');
    await expect(visible(page.getByRole('heading', { level: 1, name: 'Tea' }))).toBeVisible();
    await expect(visible(page.getByRole('link', { name: 'Green tea' }))).toBeVisible();

    await page.goto('/en/tea/green-tea');
    await expect(visible(page.getByRole('heading', { level: 1, name: 'Green tea' }))).toBeVisible();
    // Breadcrumbs follow the category tree.
    const crumbs = page.getByRole('navigation', { name: /breadcrumb/i });
    await expect(visible(crumbs.getByRole('link', { name: 'Tea' }))).toHaveAttribute(
      'href',
      '/en/tea',
    );

    // A product attribute filter (from the tea product type), kept in the URL.
    await visible(page.getByRole('link', { name: /Flavoured/ })).click();
    await expect(page).toHaveURL(/attr\.flavoured=true/);
    const flavoured = visible(page.getByText(/^\d+ products?$/));
    const text = await flavoured.textContent();
    await page.reload();
    await expect(visible(page.getByText(text ?? ''))).toBeVisible();
    await expect(
      visible(page.getByRole('link', { name: /Remove filter: Flavoured/ })),
    ).toBeVisible();
  });

  test('old category addresses redirect permanently', async ({ page }) => {
    const response = await page.request.get('/en/catalog/green-tea?sort=newest', {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(308);
    expect(response.headers().location).toMatch(/\/en\/tea\/green-tea\?sort=newest$/);
  });

  test('a new category appears in the navigation without code changes, only while active', async ({
    page,
  }) => {
    const request = await staffRequest(page);
    const slug = `e2e-coffee-${Date.now().toString(36)}`;
    const category = await request.post(`${API}/admin/categories`, {
      data: {
        slug,
        position: 50,
        isActive: true,
        illustrationKey: null,
        parentId: null,
        translations: { uz: { name: 'Qahva (test)' }, ru: null, en: { name: 'Coffee (test)' } },
      },
    });
    expect(category.status()).toBe(201);
    const { id } = (await category.json()) as { id: string };
    const product = await request.post(`${API}/admin/products`, {
      data: {
        slug: `${slug}-beans`,
        status: 'ACTIVE',
        categoryId: id,
        format: 'ACCESSORY',
        isFeatured: false,
        caffeineLevel: null,
        brewTempCelsius: null,
        brewTimeMinSeconds: null,
        brewTimeMaxSeconds: null,
        brewAmountGrams: null,
        illustrationKey: null,
        collectionIds: [],
        translations: { uz: { name: 'Test donlari' }, ru: null, en: { name: 'Test beans' } },
        variants: [
          {
            sku: `${slug.toUpperCase()}-250`,
            weightGrams: 250,
            unitCount: null,
            price: '90000',
            compareAtPrice: null,
            lowStockThreshold: 2,
            barcode: null,
            isActive: true,
            initialStock: 5,
          },
        ],
      },
    });
    expect(product.status()).toBe(201);

    await expect.poll(() => shopMenuLinks(page)).toContain(`/en/${slug}`);
    await page.goto(`/en/${slug}`);
    await expect(
      visible(page.getByRole('heading', { level: 1, name: 'Coffee (test)' })),
    ).toBeVisible();
    await expect(visible(page.getByRole('link', { name: /Test beans/ }))).toBeVisible();

    const hidden = await request.put(`${API}/admin/categories/${id}`, {
      data: {
        slug,
        position: 50,
        isActive: false,
        illustrationKey: null,
        parentId: null,
        translations: { uz: { name: 'Qahva (test)' }, ru: null, en: { name: 'Coffee (test)' } },
      },
    });
    expect(hidden.status()).toBe(200);
    await expect.poll(() => shopMenuLinks(page)).not.toContain(`/en/${slug}`);
    await page.goto(`/en/${slug}`);
    await expect(visible(page.getByRole('heading', { name: 'Page not found' }))).toBeVisible();
  });

  test('catalogue changes need a staff session', async ({ page }) => {
    const anonymous = await page.request.post(`${API}/admin/categories`, { data: {} });
    expect(anonymous.status()).toBe(401);
  });
});
