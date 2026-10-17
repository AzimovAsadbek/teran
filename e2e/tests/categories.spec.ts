import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { E2E_ADMIN } from '../scripts/e2e-env.ts';
import { publishProduct } from './support/admin.ts';

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
    await publishProduct(request, {
      slug: `${slug}-beans`,
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
    });

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
    // The storefront's cache follows the change within a moment (the API notifies it debounced).
    await expect(async () => {
      await page.goto(`/en/${slug}`);
      await expect(visible(page.getByRole('heading', { name: 'Page not found' }))).toBeVisible({
        timeout: 1_000,
      });
    }).toPass({ timeout: 20_000 });
  });

  test('a new kind of product brings its own characteristics and no tea fields', async ({
    page,
  }) => {
    const request = await staffRequest(page);
    const id = Date.now().toString(36);
    const slug = `e2e-honey-${id}`;
    // A characteristic template and a category made only in the admin area (disposable data).
    const created = await request.post(`${API}/admin/product-types`, {
      data: {
        key: slug,
        isActive: true,
        position: 30,
        brewingGuide: false,
        translations: {
          uz: { name: `Asal (test ${id})` },
          ru: null,
          en: { name: `Honey (test ${id})` },
        },
        attributes: [
          {
            key: `flower-${id}`,
            kind: 'SELECT',
            isRequired: false,
            isFilterable: true,
            isSearchable: true,
            isVisible: true,
            translations: { uz: { label: 'Gul' }, ru: null, en: { label: 'Flower' } },
            options: [
              {
                key: 'acacia',
                translations: { uz: { label: 'Akatsiya' }, ru: null, en: { label: 'Acacia' } },
              },
              {
                key: 'cotton',
                translations: { uz: { label: 'Paxta' }, ru: null, en: { label: 'Cotton' } },
              },
            ],
          },
        ],
      },
    });
    expect(created.status()).toBe(201);
    const honey = (await created.json()) as {
      id: string;
      attributes: { id: string; options: { id: string; key: string }[] }[];
    };
    const flower = honey.attributes[0]!;
    const taxonomy = (isActive: boolean) => ({
      slug,
      position: 60,
      isActive,
      illustrationKey: null,
      parentId: null,
      productTypeId: honey.id,
      translations: {
        uz: { name: `Asal (test ${id})` },
        ru: null,
        en: { name: `Honey (test ${id})` },
      },
    });
    const category = await request.post(`${API}/admin/categories`, { data: taxonomy(true) });
    expect(category.status()).toBe(201);
    const { id: categoryId } = (await category.json()) as { id: string };
    await publishProduct(request, {
      slug: `${slug}-acacia`,
      categoryId,
      productTypeId: honey.id,
      attributes: [
        {
          attributeId: flower.id,
          optionIds: [flower.options.find((option) => option.key === 'acacia')!.id],
        },
      ],
      // None of the tea formats fits honey.
      format: 'OTHER',
      isFeatured: false,
      caffeineLevel: null,
      brewTempCelsius: null,
      brewTimeMinSeconds: null,
      brewTimeMaxSeconds: null,
      brewAmountGrams: null,
      illustrationKey: null,
      collectionIds: [],
      translations: { uz: { name: 'Akatsiya asali' }, ru: null, en: { name: 'Acacia honey' } },
      variants: [
        {
          sku: `${slug.toUpperCase()}-500`,
          weightGrams: 500,
          unitCount: null,
          price: '120000',
          compareAtPrice: null,
          lowStockThreshold: 2,
          barcode: null,
          isActive: true,
          initialStock: 5,
        },
      ],
    });

    // The category page filters by the new characteristic and offers no tea formats.
    await expect.poll(() => shopMenuLinks(page)).toContain(`/en/${slug}`);
    await page.goto(`/en/${slug}`);
    await expect(
      visible(page.getByRole('heading', { level: 1, name: `Honey (test ${id})` })),
    ).toBeVisible();
    const filter = visible(page.getByRole('group', { name: 'Flower' }));
    await filter.locator('summary').click();
    await expect(filter.getByRole('link', { name: /Acacia/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^(Loose leaf|Other)\b/ })).toHaveCount(0);

    // The product page names the characteristic, with no format label and no brewing panel.
    await visible(page.getByRole('link', { name: /Acacia honey/ })).click();
    await expect(
      visible(page.getByRole('heading', { level: 1, name: 'Acacia honey' })),
    ).toBeVisible();
    const main = page.getByRole('main');
    await expect(visible(main.getByText('Flower', { exact: true }))).toBeVisible();
    await expect(visible(main.getByText('Acacia', { exact: true }))).toBeVisible();
    await expect(main.getByRole('heading', { name: 'How to brew' })).toHaveCount(0);
    await expect(main.getByText('Other', { exact: true })).toHaveCount(0);

    // It sells like any other product.
    await page.getByRole('button', { name: /^Add to bag · / }).click();
    const bag = page.getByRole('dialog', { name: 'Your bag' });
    await expect(visible(bag.getByText('Acacia honey'))).toBeVisible();
    await expect(visible(bag.getByText(/500 g/))).toBeVisible();

    // A new product in the category starts with its template and without the tea-only fields.
    await page.goto('/en/admin/products/new');
    const form = page.getByRole('main');
    await visible(form.getByLabel('Category')).selectOption({ label: `Honey (test ${id})` });
    await expect(visible(form.getByLabel('Characteristic template'))).toHaveValue(honey.id);
    await expect(visible(form.getByLabel(/^Flower/))).toBeVisible();
    await expect(form.getByRole('heading', { name: 'Brewing' })).toHaveCount(0);
    await expect(form.getByLabel('Caffeine')).toHaveCount(0);
    await expect(visible(form.getByLabel('Format'))).toHaveValue('OTHER');

    const hidden = await request.put(`${API}/admin/categories/${categoryId}`, {
      data: taxonomy(false),
    });
    expect(hidden.status()).toBe(200);
  });

  test('catalogue changes need a staff session', async ({ page }) => {
    const anonymous = await page.request.post(`${API}/admin/categories`, { data: {} });
    expect(anonymous.status()).toBe(401);
  });
});
