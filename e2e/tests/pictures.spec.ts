import { expect, test, type Page } from '@playwright/test';
import { PICTURES, publishProduct, signInAsAdmin, visible } from './support/admin.ts';

/*
 * Pictures do what they show: a product's picture opens the zoomed gallery, a pack opens its tea,
 * and a picture beside a link leads where the link does (the home page's pair).
 */

/** Waits until the page's scripts run, so a click reaches React's handlers. */
async function hydrated(page: Page) {
  await page.waitForFunction(() => document.readyState === 'complete');
  await page.waitForLoadState('networkidle');
}

test.describe('pictures', () => {
  test("a product's picture opens the zoomed gallery, which Escape closes", async ({ page }) => {
    await signInAsAdmin(page);
    const id = Date.now().toString(36);
    const slug = `e2e-zoom-${id}`;
    const categories = (await (await page.request.get('/api/v1/admin/categories')).json()) as {
      id: string;
      slug: string;
    }[];
    const category = categories.find((entry) => entry.slug === 'black-tea') ?? categories[0]!;
    await publishProduct(
      page.request,
      {
        slug,
        categoryId: category.id,
        format: 'LOOSE_LEAF',
        isFeatured: false,
        caffeineLevel: null,
        brewTempCelsius: null,
        brewTimeMinSeconds: null,
        brewTimeMaxSeconds: null,
        brewAmountGrams: null,
        illustrationKey: null,
        collectionIds: [],
        translations: {
          uz: { name: `Kattalashtirish ${id}`, shortDescription: 'Sinov.' },
          ru: null,
          en: { name: `Zoom test ${id}`, shortDescription: 'A test.' },
        },
        variants: [
          {
            sku: `ZOOM-${id.toUpperCase()}`,
            weightGrams: 100,
            unitCount: null,
            price: '52000',
            compareAtPrice: null,
            lowStockThreshold: 2,
            barcode: null,
            isActive: true,
            initialStock: 5,
          },
        ],
      },
      PICTURES.lake,
    );

    await expect(async () => {
      await page.goto(`/en/products/${slug}`);
      await expect(page.getByRole('heading', { level: 1, name: `Zoom test ${id}` })).toBeVisible({
        timeout: 1_000,
      });
    }).toPass({ timeout: 20_000 });
    await hydrated(page);
    await page.getByRole('button', { name: 'Enlarge image 1' }).click();
    const zoom = page.getByRole('dialog', { name: `Zoom test ${id}: pictures` });
    await expect(zoom).toBeVisible();
    await expect(zoom.getByRole('img').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(zoom).toBeHidden();
  });

  test('a pack opens its tea, and the home pair pictures lead where their pills do', async ({
    page,
  }) => {
    await page.goto('/en/wholesale');
    await visible(page.getByRole('link', { name: 'TERAN XC2025' })).click();
    // The product page keeps the chosen pack in the address once it has loaded.
    await expect(page).toHaveURL(/\/en\/products\/teran-xc2025(?:\?variant=[^&]+)?$/);
    await expect(page.getByRole('heading', { level: 1, name: 'TERAN XC2025' })).toBeVisible();

    await page.goto('/en');
    const pill = page.getByRole('link', { name: 'Read the article' });
    if ((await pill.count()) > 0) {
      const href = await pill.first().getAttribute('href');
      // The picture above the pill is a link to the same article (for a pointer only).
      const picture = page.locator(`a[aria-hidden="true"][href="${href}"]`).first();
      await picture.scrollIntoViewIfNeeded();
      await hydrated(page);
      await picture.click();
      await expect(page).toHaveURL(new RegExp(`${href}$`));
    }
  });
});
