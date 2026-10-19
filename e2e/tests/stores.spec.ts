import { expect, test, type Locator, type Page } from '@playwright/test';
import { API, signInAsAdmin } from './support/admin.ts';

/*
 * The store locator shows the stores entered under Admin → Store addresses: their names,
 * addresses, hours, phones and kinds, a search over names and addresses, the kind filter and
 * directions to each; a single store is shown chosen, without the search; with none entered it
 * invites visitors to get in touch instead.
 */

/** Reloads a storefront page until the expectation holds (settings refresh within a second). */
async function eventually(page: Page, path: string, check: () => Promise<void>) {
  await expect(async () => {
    await page.goto(path);
    await check();
  }).toPass({ timeout: 20_000 });
}

/** Fills one store's card in the admin form. */
async function fillStore(
  card: Locator,
  store: { name: string; address: string; hours: string; phone: string; at: string },
) {
  await card.getByLabel(/^Name/).fill(store.name);
  await card.getByLabel(/^Phone/).fill(store.phone);
  await card.getByLabel(/^Address · Uzbek/).fill(store.address);
  await card.getByLabel(/^Address · English/).fill(store.address);
  await card.getByLabel(/^Opening hours · English/).fill(store.hours);
  await card.getByLabel(/^Place on the map/).fill(store.at);
}

test.describe('store locator', () => {
  test('lists, searches and filters the stores entered in the admin area', async ({
    page,
    browser,
  }) => {
    await signInAsAdmin(page, '/admin/stores');
    const panel = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Stores', exact: true }) });
    await panel.getByRole('button', { name: 'Add a store' }).click();
    await panel.getByRole('button', { name: 'Add a store' }).click();
    const cards = panel.locator('ol > li');
    await fillStore(cards.nth(0), {
      name: 'E2E Chilonzor tea corner',
      address: '12 Bunyodkor avenue, Chilonzor, Tashkent',
      hours: 'Mon–Fri 9:00–18:00\nSat 10:00–16:00',
      phone: '+998 71 200 00 01',
      at: '41.2856, 69.2034',
    });
    await fillStore(cards.nth(1), {
      name: 'E2E Namangan dealer',
      address: '5 Navoi street, Namangan',
      hours: 'Every day 9:00–20:00',
      phone: '+998 69 200 00 02',
      at: '40.9983, 71.6726',
    });
    // The second is a dealer, not a shop, so the kind filter has two kinds to offer.
    await cards.nth(1).getByLabel('Shop', { exact: true }).uncheck();
    await cards.nth(1).getByLabel('Official dealer').check();
    await panel.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(panel.getByText('Saved', { exact: true })).toBeVisible();

    const visitor = await (await browser.newContext()).newPage();
    const main = visitor.getByRole('main');
    await eventually(visitor, '/en/stores', () =>
      expect(main.getByRole('status')).toHaveText('2 stores found', { timeout: 1_000 }),
    );
    await expect(main.getByRole('heading', { level: 1, name: 'Store locator' })).toBeVisible();
    const list = main.getByRole('region', { name: 'Stores', exact: true });
    await expect(list.getByRole('heading', { level: 2 })).toHaveText([
      'E2E Chilonzor tea corner',
      'E2E Namangan dealer',
    ]);
    const first = list.getByRole('listitem').filter({ hasText: 'E2E Chilonzor tea corner' });
    await expect(first.getByText('12 Bunyodkor avenue, Chilonzor, Tashkent')).toBeVisible();
    await expect(first.getByText('Mon–Fri')).toBeVisible();
    await expect(first.getByText('9:00–18:00')).toBeVisible();
    await expect(first.getByRole('link', { name: '+998 71 200 00 01' })).toHaveAttribute(
      'href',
      'tel:+998712000001',
    );
    await expect(first.getByRole('link', { name: /^Get directions/ })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=41.2856,69.2034',
    );

    // Choosing a store marks it in the list (and brings it to the middle of the map).
    await first.getByRole('button', { name: 'E2E Chilonzor tea corner' }).click();
    await expect(
      list.locator('li[aria-current="true"]').filter({ hasText: 'E2E Chilonzor tea corner' }),
    ).toBeVisible();

    // The search matches names and addresses, whatever the case.
    const search = main.getByLabel('City, address or store name');
    await search.fill('namangan');
    await expect(list.getByRole('heading', { level: 2 })).toHaveText(['E2E Namangan dealer']);
    await expect(main.getByRole('status')).toHaveText('1 store found');
    await search.fill('Samarkand');
    await expect(main.getByText('No stores match your search.')).toBeVisible();
    await main.getByRole('button', { name: 'Clear filters' }).click();
    await expect(list.getByRole('heading', { level: 2 })).toHaveCount(2);

    // The kind filter keeps the chosen kinds.
    await main.getByRole('button', { name: 'Filter by kind' }).click();
    await main.getByLabel('Official dealer').check();
    await expect(list.getByRole('heading', { level: 2 })).toHaveText(['E2E Namangan dealer']);
    await visitor.keyboard.press('Escape');
    await expect(main.getByLabel('Official dealer')).toBeHidden();

    // With no stores the page invites visitors to get in touch.
    const cleared = await page.request.put(`${API}/admin/settings/stores`, { data: [] });
    expect(cleared.status()).toBe(200);
    await eventually(visitor, '/en/stores', () =>
      expect(visitor.getByText('No stores are listed here yet')).toBeVisible({ timeout: 1_000 }),
    );
    await expect(main.getByRole('link', { name: 'Contact us' })).toHaveAttribute(
      'href',
      '/en/contact',
    );
  });

  test('a single store is shown chosen, placed with a click on the admin map', async ({
    page,
    browser,
  }) => {
    await signInAsAdmin(page);
    const emptied = await page.request.put(`${API}/admin/settings/stores`, { data: [] });
    expect(emptied.status()).toBe(200);
    await page.goto('/en/admin/stores');
    const panel = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Stores', exact: true }) });
    await panel.getByRole('button', { name: 'Add a store' }).click();
    const card = panel.locator('ol > li').first();
    await card.getByLabel(/^Name/).fill('E2E Namangan shop');
    await card
      .getByLabel(/^Address · Uzbek/)
      .fill('Namangan shahri, Toʻraqoʻrgʻon koʻchasi, 200-uy');
    await card.getByLabel(/^Address · English/).fill('200 Turakurgan street, Namangan');
    // A click on the map places the store: its coordinates fill themselves in.
    const coordinates = card.getByLabel(/^Place on the map/);
    await expect(coordinates).toHaveValue('');
    await card.getByRole('region', { name: /^Map: click/ }).click();
    await expect(coordinates).toHaveValue(/^\d+(\.\d+)?, \d+(\.\d+)?$/);
    await panel.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(panel.getByText('Saved', { exact: true })).toBeVisible();

    try {
      const visitor = await (await browser.newContext()).newPage();
      const main = visitor.getByRole('main');
      await eventually(visitor, '/en/stores', () =>
        expect(main.getByRole('status')).toHaveText('1 store found', { timeout: 1_000 }),
      );
      // Nothing to search with one store: it is shown chosen, with both map links.
      await expect(main.getByLabel('City, address or store name')).toBeHidden();
      const list = main.getByRole('region', { name: 'Stores', exact: true });
      await expect(list.locator('li[aria-current="true"]')).toContainText('E2E Namangan shop');
      await expect(list.getByRole('link', { name: /^Open in Yandex Maps/ })).toHaveAttribute(
        'href',
        /^https:\/\/yandex\.uz\/maps\/\?pt=/,
      );
      await expect(main.getByRole('heading', { name: 'Any questions?' })).toBeVisible();
    } finally {
      await page.request.put(`${API}/admin/settings/stores`, { data: [] });
    }
  });

  test('the map groups nearby stores, opens a store’s bubble and follows the list', async ({
    page,
    browser,
  }) => {
    await signInAsAdmin(page);
    const store = (id: string, name: string, latitude: number, longitude: number) => ({
      id,
      name,
      address: { uz: `${name}, Toshkent`, ru: '', en: `${name}, Tashkent` },
      hours: null,
      phone: null,
      latitude,
      longitude,
      kinds: ['SHOP'],
      active: true,
    });
    const saved = await page.request.put(`${API}/admin/settings/stores`, {
      data: [
        store('e2e-map-chilonzor', 'E2E Chilonzor', 41.2856, 69.2034),
        store('e2e-map-yunusobod', 'E2E Yunusobod', 41.364, 69.287),
        store('e2e-map-namangan', 'E2E Namangan', 40.9983, 71.6726),
      ],
    });
    expect(saved.status()).toBe(200);
    try {
      const visitor = await (await browser.newContext()).newPage();
      const main = visitor.getByRole('main');
      await eventually(visitor, '/en/stores', () =>
        expect(main.getByRole('status')).toHaveText('3 stores found', { timeout: 1_000 }),
      );
      await visitor.waitForLoadState('networkidle');
      const map = main.getByRole('region', { name: 'Map of the stores' });
      // The pins are for a pointer (the list carries the same): hidden from assistive technology.
      const markers = map.locator('button[aria-hidden="true"]');
      const cluster = markers.filter({ hasText: /^2$/ });
      const pin = markers.filter({ hasNotText: /\d/ });
      // The two Tashkent stores share a numbered circle at the first zoom; Namangan has its pin.
      await expect(cluster).toHaveCount(1);
      await expect(pin).toHaveCount(1);

      // The circle zooms in until its stores stand apart (Namangan's pin is now off the frame).
      await cluster.click();
      await expect(cluster).toHaveCount(0);
      await expect(pin).toHaveCount(3);

      // A pin opens the store's bubble, which its close button shuts.
      const bubble = map.locator('div.z-\\[2\\]');
      await pin.first().click();
      await expect(bubble).toContainText(/E2E (Chilonzor|Yunusobod)/);
      await bubble.locator('button').click();
      await expect(bubble).toBeHidden();

      // A store chosen in the list comes to the middle of the map with its bubble.
      const list = main.getByRole('region', { name: 'Stores', exact: true });
      await list.getByRole('button', { name: 'E2E Namangan' }).click();
      await expect(bubble).toContainText('E2E Namangan');
      await expect(bubble).toContainText('E2E Namangan, Tashkent');
    } finally {
      await page.request.put(`${API}/admin/settings/stores`, { data: [] });
    }
  });
});
