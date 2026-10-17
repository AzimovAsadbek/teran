import { expect, test, type Locator, type Page } from '@playwright/test';
import { API, publishProduct, staffRequest } from './support/admin.ts';

/** Next.js keeps visited pages mounted but hidden, so assertions target the visible match. */
function visible(locator: Locator): Locator {
  return locator.filter({ visible: true }).first();
}

/** A phone layout must never scroll sideways. */
async function expectNoSidewaysScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe('phone', () => {
  test('menu drawer, catalogue, sticky purchase bar and checkout @mobile', async ({ page }) => {
    await page.goto('/en');
    await expectNoSidewaysScroll(page);

    await page.getByRole('button', { name: 'Open menu' }).click();
    const menu = page.getByRole('dialog', { name: 'Explore' });
    await menu.getByRole('link', { name: 'All products' }).click();
    await expect(page).toHaveURL(/\/en\/catalog$/);
    await expect(menu).toBeHidden();
    await expect(
      visible(page.getByRole('note').filter({ hasText: 'Demonstration catalogue' })),
    ).toBeVisible();
    await expectNoSidewaysScroll(page);

    await page.goto('/en/products/classic-black-tea');
    await expectNoSidewaysScroll(page);
    // Once the main button scrolls away, the sticky bar at the bottom takes over.
    const stickyAdd = page.getByRole('button', { name: 'Add to bag', exact: true });
    await expect(stickyAdd).toBeHidden();
    await page.evaluate(() => window.scrollBy(0, 1600));
    await stickyAdd.click();

    const drawer = page.getByRole('dialog', { name: 'Your bag' });
    await expect(drawer.getByText('Classic black tea')).toBeVisible();
    await drawer.getByRole('link', { name: 'Checkout' }).click();
    await expect(page).toHaveURL(/\/en\/checkout$/);
    await expect(visible(page.getByRole('heading', { level: 1, name: 'Checkout' }))).toBeVisible();
    await expect(visible(page.getByLabel('Full name'))).toBeVisible();
    await expectNoSidewaysScroll(page);
  });

  test('the hero slides change by themselves and by swiping, and wait with reduced motion @mobile', async ({
    page,
  }) => {
    const hero = page.getByRole('region', { name: 'TERAN products' });
    const current = () => hero.locator('button[aria-current="true"]').getAttribute('aria-label');
    await page.goto('/en');
    // One page heading, outside the slides, so it stays while they change.
    await expect(hero.getByRole('heading', { level: 1 })).toHaveCount(1);
    const first = await current();
    expect(first).toMatch(/^1 \/ \d+/);
    // It moves on by itself after about five seconds.
    await expect.poll(current, { timeout: 9_000 }).not.toBe(first);

    // A swipe to the right brings the previous slide back.
    const box = (await hero.boundingBox())!;
    const y = box.y + box.height * 0.6;
    await page.mouse.move(box.x + box.width * 0.2, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5, y, { steps: 6 });
    await page.mouse.move(box.x + box.width * 0.8, y, { steps: 6 });
    await page.mouse.up();
    await expect.poll(current).toBe(first);
    await expectNoSidewaysScroll(page);

    // With reduced motion nothing changes by itself.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    const still = await current();
    await page.waitForTimeout(6_500);
    expect(await current()).toBe(still);
    await expect(hero.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('a category with a very long name fits the phone, on its page and in the menu @mobile', async ({
    page,
  }) => {
    const request = await staffRequest(page);
    const id = Date.now().toString(36);
    const slug = `e2e-long-${id}`;
    const name =
      'Tog‘ yonbag‘irlarida qo‘lda terilgan, an’anaviy usulda quritilgan noyob ko‘k choylar to‘plami';
    const english =
      'Rare hand-picked mountain-slope oolong teas, dried in the traditional way, with long names';
    const category = await request.post(`${API}/admin/categories`, {
      data: {
        slug,
        position: 70,
        isActive: true,
        illustrationKey: null,
        parentId: null,
        translations: { uz: { name }, ru: null, en: { name: english } },
      },
    });
    expect(category.status()).toBe(201);
    const { id: categoryId } = (await category.json()) as { id: string };
    await publishProduct(request, {
      slug: `${slug}-tea`,
      categoryId,
      format: 'LOOSE_LEAF',
      isFeatured: false,
      caffeineLevel: null,
      brewTempCelsius: null,
      brewTimeMinSeconds: null,
      brewTimeMaxSeconds: null,
      brewAmountGrams: null,
      illustrationKey: null,
      collectionIds: [],
      translations: { uz: { name: 'Uzun nomli choy' }, ru: null, en: { name: 'Long-named tea' } },
      variants: [
        {
          sku: `${slug.toUpperCase()}-50`,
          weightGrams: 50,
          unitCount: null,
          price: '70000',
          compareAtPrice: null,
          lowStockThreshold: 2,
          barcode: null,
          isActive: true,
          initialStock: 5,
        },
      ],
    });

    await expect(async () => {
      await page.goto(`/en/${slug}`);
      await expect(visible(page.getByRole('heading', { level: 1, name: english }))).toBeVisible({
        timeout: 1_000,
      });
    }).toPass({ timeout: 20_000 });
    await expectNoSidewaysScroll(page);

    // The menus' category list is cached and refreshed about a second after the change, while
    // the new category's own page is fresh at once: reload until the menu has it too.
    const menu = page.getByRole('dialog', { name: 'Explore' });
    await expect(async () => {
      await page.reload();
      await page.getByRole('button', { name: 'Open menu' }).click();
      await expect(menu.getByText(english).first()).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 20_000 });
    const fits = await menu.evaluate((element) => element.scrollWidth <= element.clientWidth);
    expect(fits).toBe(true);
    await expectNoSidewaysScroll(page);

    const hidden = await request.put(`${API}/admin/categories/${categoryId}`, {
      data: {
        slug,
        position: 70,
        isActive: false,
        illustrationKey: null,
        parentId: null,
        translations: { uz: { name }, ru: null, en: { name: english } },
      },
    });
    expect(hidden.status()).toBe(200);
  });
});
