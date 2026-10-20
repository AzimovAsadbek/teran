import { expect, test, type Browser, type Page } from '@playwright/test';
import {
  API,
  PICTURES,
  field,
  publishProduct,
  signInAsAdmin,
  visible,
  type ProductInput,
} from './support/admin.ts';

/*
 * Every change made in the admin area reaches the storefront: store details, delivery prices,
 * categories, collections, products, stock and characteristics, and what visitors send (messages,
 * subscriptions, accounts) reaches the admin area. The storefront caches catalogue data and is told
 * to refresh after each change, so checks reload until the change shows (a second at most).
 */

/** Reloads a storefront page until the expectation holds. */
async function eventually(page: Page, path: string, check: () => Promise<void>) {
  await expect(async () => {
    await page.goto(path);
    await check();
  }).toPass({ timeout: 20_000 });
}

function product(
  slug: string,
  categoryId: string,
  extra: Partial<ProductInput> = {},
): ProductInput {
  return {
    slug,
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
    translations: {
      uz: { name: `Sinov choyi ${slug}`, shortDescription: 'Birinchi tavsif.' },
      ru: null,
      en: null,
    },
    variants: [
      {
        sku: `${slug.toUpperCase()}-100`,
        weightGrams: 100,
        unitCount: null,
        price: '52000',
        compareAtPrice: null,
        lowStockThreshold: 2,
        barcode: null,
        isActive: true,
        initialStock: 6,
      },
    ],
    ...extra,
  };
}

/**
 * A category of the test's own, so the products it adds never change what other journeys count
 * in the seeded categories. `retire` switches it off again at the end.
 */
async function ownCategory(page: Page, id: string) {
  const data = (isActive: boolean) => ({
    slug: `e2e-prop-${id}`,
    position: 90,
    isActive,
    illustrationKey: null,
    parentId: null,
    translations: { uz: { name: `Sinov turkumi ${id}` }, ru: null, en: null },
  });
  const created = await page.request.post(`${API}/admin/categories`, { data: data(true) });
  expect(created.status()).toBe(201);
  const { id: categoryId } = (await created.json()) as { id: string };
  return {
    id: categoryId,
    retire: async () => {
      const response = await page.request.put(`${API}/admin/categories/${categoryId}`, {
        data: data(false),
      });
      expect(response.status()).toBe(200);
    },
  };
}

async function storefront(browser: Browser): Promise<Page> {
  // A visitor without the staff session.
  const context = await browser.newContext();
  return context.newPage();
}

test.describe('admin changes reach the storefront', () => {
  test('store details: the announcement bar, the contact page and the footer', async ({
    page,
    browser,
  }) => {
    await signInAsAdmin(page);
    const store = await storefront(browser);
    await page.goto('/en/admin/settings');
    const bar = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Announcement at the top of the site' }) });
    const english = bar.getByLabel(/^Text · English/);
    const previous = await english.inputValue();
    await english.fill('E2E tasting week: every Friday');
    await bar.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(bar.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
    await eventually(store, '/en', () =>
      expect(store.getByText('E2E tasting week: every Friday').first()).toBeVisible({
        timeout: 1_000,
      }),
    );

    const contact = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Public contact details' }) });
    await contact.getByLabel(/^Phone/).fill('+998 90 765 43 21');
    await contact.getByLabel(/^E-mail/).fill('hello@teran.test');
    await contact.getByLabel(/^Address · English/).fill('12 Test street, Namangan');
    await contact.getByLabel(/^Opening hours · English/).fill('Mon–Sat 9:00–18:00');
    await contact.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(contact.getByText('Saved')).toBeVisible();
    await eventually(store, '/en/contact', () =>
      expect(store.getByRole('main').getByText('hello@teran.test').first()).toBeVisible({
        timeout: 1_000,
      }),
    );
    const main = store.getByRole('main');
    await expect(main.getByText('12 Test street, Namangan').first()).toBeVisible();
    await expect(main.getByText('Mon–Sat 9:00–18:00').first()).toBeVisible();
    await expect(store.getByRole('contentinfo').getByText('hello@teran.test')).toBeVisible();

    // Back to how they were, for the other journeys.
    await english.fill(previous);
    await bar.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(bar.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
    for (const label of [/^Phone/, /^E-mail/, /^Address · English/, /^Opening hours · English/]) {
      await contact.getByLabel(label).fill('');
    }
    await contact.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(contact.getByText('Saved')).toBeVisible();
    await store.context().close();
  });

  test('delivery: a new price shows on the delivery page', async ({ page, browser }) => {
    await signInAsAdmin(page);
    const store = await storefront(browser);
    await page.goto('/en/admin/delivery');
    await page
      .getByRole('button', { name: /^Edit: / })
      .first()
      .click();
    const sheet = page.getByRole('dialog');
    const price = sheet.getByLabel('Price', { exact: true });
    const previous = await price.inputValue();
    await price.fill('27500');
    await sheet.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await eventually(store, '/en/delivery', () =>
      expect(
        store
          .getByRole('main')
          .getByText(/27,500 UZS/)
          .first(),
      ).toBeVisible({
        timeout: 1_000,
      }),
    );

    await page
      .getByRole('button', { name: /^Edit: / })
      .first()
      .click();
    await page.getByRole('dialog').getByLabel('Price', { exact: true }).fill(previous);
    await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await store.context().close();
  });

  test('page pictures: a catalogue banner set in Settings fills the header until it is removed', async ({
    page,
    browser,
  }) => {
    await signInAsAdmin(page);
    const store = await storefront(browser);
    await page.goto('/en/admin/settings');
    const card = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: 'Catalogue banner', exact: true }) });
    await card.locator('input[type="file"]').first().setInputFiles(PICTURES.terraces);
    await card.getByRole('button', { name: 'Upload', exact: true }).click();
    const remove = card.getByRole('button', { name: 'Remove', exact: true });
    await expect(remove).toBeVisible();
    // The phone crop can be added once the main picture is there.
    await expect(card.locator('input[type="file"]')).toHaveCount(2);

    const banner = store.locator('main header picture img[src*="/uploads/visuals/"]');
    await eventually(store, '/en/catalog', () => expect(banner).toBeVisible({ timeout: 1_000 }));

    await remove.click();
    await page.getByRole('dialog').getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(remove).toHaveCount(0);
    await eventually(store, '/en/catalog', () => expect(banner).toHaveCount(0, { timeout: 1_000 }));
    await store.context().close();
  });

  test('a new category is in the menu as coming soon until its first product, its texts update, and it goes when switched off', async ({
    page,
    browser,
  }) => {
    await signInAsAdmin(page);
    const store = await storefront(browser);
    const id = Date.now().toString(36);
    const name = `Yangi turkum ${id}`;
    await page.goto('/en/admin/categories');
    await page.getByRole('button', { name: 'New category' }).click();
    const sheet = page.getByRole('dialog');
    await sheet.locator('[name="uz-name"]').fill(name);
    await sheet.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: name, exact: true })).toBeVisible();

    // Without products it is already in the menus, marked "coming soon" (the range TERAN plans
    // shows from the start, ADR-041), and its own page says products are coming.
    const shopMenu = async () => {
      await store.goto('/en');
      await store.getByRole('button', { name: 'Shop', exact: true }).click();
      return store.locator('[id$="-shop"]');
    };
    const slug = `yangi-turkum-${id}`;
    await eventually(store, `/en/${slug}`, () =>
      expect(visible(store.getByRole('heading', { level: 1, name }))).toBeVisible({
        timeout: 1_000,
      }),
    );
    await expect(visible(store.getByText('Products coming soon'))).toBeVisible();
    await expect(async () => {
      const link = (await shopMenu()).getByRole('link', { name: new RegExp(name) });
      await expect(link).toBeVisible({ timeout: 1_000 });
      await expect(link).toContainText('Coming soon', { timeout: 1_000 });
    }).toPass({ timeout: 20_000 });

    // Its first product drops the mark, with no code change.
    const categories = (await (await page.request.get(`${API}/admin/categories`)).json()) as {
      id: string;
      slug: string;
    }[];
    const created = categories.find((entry) => entry.slug === slug)!;
    await publishProduct(page.request, product(`e2e-cat-${id}`, created.id), PICTURES.lake);
    await expect(async () => {
      const link = (await shopMenu()).getByRole('link', { name: new RegExp(name) });
      await expect(link).toBeVisible({ timeout: 1_000 });
      await expect(link).not.toContainText('Coming soon', { timeout: 1_000 });
    }).toPass({ timeout: 20_000 });

    // A description added later shows on its page.
    await page.getByRole('button', { name: `Edit: ${name}` }).click();
    await page.getByRole('dialog').locator('[name="uz-description"]').fill('Yangi tavsif matni.');
    await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await eventually(store, `/en/${slug}`, () =>
      expect(visible(store.getByText('Yangi tavsif matni.'))).toBeVisible({ timeout: 1_000 }),
    );

    // Switched off: gone from the menu and its page.
    await page.getByRole('button', { name: `Edit: ${name}` }).click();
    await page.getByRole('dialog').getByRole('checkbox', { name: 'Active' }).uncheck();
    await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await eventually(store, `/en/${slug}`, () =>
      expect(visible(store.getByRole('heading', { name: 'Page not found' }))).toBeVisible({
        timeout: 1_000,
      }),
    );
    const menu = await shopMenu();
    await expect(menu.getByRole('link', { name: new RegExp(name) })).toHaveCount(0);
    await store.context().close();
  });

  test('a new collection joins the menu with its first product, added in the product editor', async ({
    page,
    browser,
  }) => {
    await signInAsAdmin(page);
    const store = await storefront(browser);
    const id = Date.now().toString(36);
    const name = `Yangi kolleksiya ${id}`;
    await page.goto('/en/admin/collections');
    await page.getByRole('button', { name: 'New collection' }).click();
    await page.getByRole('dialog').locator('[name="uz-name"]').fill(name);
    await page.getByRole('dialog').getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    const collectionsMenu = async () => {
      await store.goto('/en');
      await store.getByRole('button', { name: 'Collections', exact: true }).click();
      return store.locator('[id$="-collections"]');
    };
    // Without products it waits outside the menus (shoppers see only what is for sale).
    await expect(
      (await collectionsMenu()).getByRole('link', { name: new RegExp(name) }),
    ).toHaveCount(0);

    // A product put in the collection from the product editor appears on its page and in the menu.
    const slug = `e2e-coll-${id}`;
    const own = await ownCategory(page, id);
    const productId = await publishProduct(page.request, product(slug, own.id), PICTURES.lake);
    await page.goto(`/en/admin/products/${productId}`);
    await page.getByRole('checkbox', { name }).check();
    await visible(page.getByRole('button', { name: 'Save', exact: true })).click();
    await expect(visible(page.getByText('Saved', { exact: true }))).toBeVisible();
    await eventually(store, `/en/collections/yangi-kolleksiya-${id}`, () =>
      expect(visible(store.getByRole('link', { name: `Sinov choyi ${slug}` }))).toBeVisible({
        timeout: 1_000,
      }),
    );
    // With a product the collection is in the menu (menus show no counts).
    await expect(async () => {
      const menu = await collectionsMenu();
      await expect(menu.getByRole('link', { name, exact: true })).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 20_000 });

    // Tidy up for the other journeys: the collection and the category are switched off.
    const collections = (await (await page.request.get(`${API}/admin/collections`)).json()) as {
      id: string;
      slug: string;
    }[];
    const collection = collections.find((entry) => entry.slug === `yangi-kolleksiya-${id}`)!;
    const off = await page.request.put(`${API}/admin/collections/${collection.id}`, {
      data: {
        slug: collection.slug,
        position: 0,
        isActive: false,
        illustrationKey: null,
        translations: { uz: { name }, ru: null, en: null },
      },
    });
    expect(off.status()).toBe(200);
    await own.retire();
    await store.context().close();
  });

  test('product edits and stock reach the product page, listings and search', async ({
    page,
    browser,
  }) => {
    await signInAsAdmin(page);
    const store = await storefront(browser);
    const id = Date.now().toString(36);
    const slug = `e2e-edit-${id}`;
    const own = await ownCategory(page, id);
    const productId = await publishProduct(page.request, product(slug, own.id), PICTURES.sprig);

    // Price and short description changed in the editor.
    await page.goto(`/en/admin/products/${productId}`);
    await field(page, 'Price').fill('61500');
    await field(page, /^Short description/).fill('Yangilangan qisqa tavsif.');
    await visible(page.getByRole('button', { name: 'Save', exact: true })).click();
    await expect(visible(page.getByText('Saved', { exact: true }))).toBeVisible();
    await eventually(store, `/products/${slug}`, () =>
      expect(visible(store.getByText('Yangilangan qisqa tavsif.'))).toBeVisible({
        timeout: 1_000,
      }),
    );
    // Uzbek groups thousands with a no-break space.
    await expect(visible(store.getByRole('main').getByText(/61\s500/))).toBeVisible();
    await eventually(store, `/en/search?q=${slug}`, () =>
      expect(visible(store.getByRole('link', { name: `Sinov choyi ${slug}` }))).toBeVisible({
        timeout: 1_000,
      }),
    );
    await expect(visible(store.getByText(/61,500 UZS/))).toBeVisible();

    // Stock taken out: sold out on its page; back in: on sale again.
    const sku = `${slug.toUpperCase()}-100`;
    const adjust = async (direction: 'Stock in (+)' | 'Stock out (−)', quantity: string) => {
      await page.goto(`/en/admin/inventory?q=${sku}`);
      await visible(page.getByRole('button', { name: 'Adjust stock' })).click();
      const dialog = page.getByRole('dialog');
      // The choices are drawn as cards over visually hidden radios: press the card.
      await dialog
        .locator('label')
        .filter({ hasText: direction.slice(0, 9) })
        .click();
      await expect(dialog.getByRole('radio', { name: direction })).toBeChecked();
      await dialog.getByLabel('Quantity').fill(quantity);
      await dialog
        .getByRole('button', {
          name: direction === 'Stock in (+)' ? 'Save stock in' : 'Save stock out',
        })
        .click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    };
    await adjust('Stock out (−)', '6');
    await eventually(store, `/en/products/${slug}`, () =>
      expect(visible(store.getByText(/Sold out|Out of stock/))).toBeVisible({ timeout: 1_000 }),
    );
    await adjust('Stock in (+)', '4');
    await eventually(store, `/en/products/${slug}`, () =>
      expect(store.getByRole('button', { name: /^Add to bag · / })).toBeEnabled({ timeout: 1_000 }),
    );
    await own.retire();
    await store.context().close();
  });

  test('a characteristic renamed in its template shows on the category filters', async ({
    page,
    browser,
  }) => {
    await signInAsAdmin(page);
    const store = await storefront(browser);
    const id = Date.now().toString(36);
    const request = page.request;
    // A template with one choice characteristic, a category using it, and a product with a value.
    const created = await request.post(`${API}/admin/product-types`, {
      data: {
        key: `e2e-sweets-${id}`,
        isActive: true,
        position: 40,
        brewingGuide: false,
        translations: { uz: { name: `Shirinlik ${id}` }, ru: null, en: { name: `Sweets ${id}` } },
        attributes: [
          {
            key: `filling-${id}`,
            kind: 'SELECT',
            isRequired: false,
            isFilterable: true,
            isSearchable: true,
            isVisible: true,
            translations: { uz: { label: 'Ichi' }, ru: null, en: { label: 'Filling' } },
            options: [
              {
                key: 'nut',
                translations: { uz: { label: 'Yongʻoq' }, ru: null, en: { label: 'Nut' } },
              },
            ],
          },
        ],
      },
    });
    expect(created.status()).toBe(201);
    const type = (await created.json()) as {
      id: string;
      attributes: { id: string; options: { id: string }[] }[];
    };
    const category = await request.post(`${API}/admin/categories`, {
      data: {
        slug: `e2e-sweets-${id}`,
        position: 80,
        isActive: true,
        illustrationKey: null,
        parentId: null,
        productTypeId: type.id,
        translations: {
          uz: { name: `Shirinliklar ${id}` },
          ru: null,
          en: { name: `Sweets ${id}` },
        },
      },
    });
    expect(category.status()).toBe(201);
    const { id: sweetsId } = (await category.json()) as { id: string };
    await publishProduct(
      request,
      product(`e2e-sweet-${id}`, sweetsId, {
        format: 'OTHER',
        productTypeId: type.id,
        attributes: [
          { attributeId: type.attributes[0]!.id, optionIds: [type.attributes[0]!.options[0]!.id] },
        ],
      }),
      PICTURES.terraces,
    );
    // A second sweet without a filling: a filter is offered only when one of its choices narrows
    // the listing (ADR-051), and with one product holding the only value it would not.
    await publishProduct(
      request,
      product(`e2e-sweet-plain-${id}`, sweetsId, { format: 'OTHER', productTypeId: type.id }),
      PICTURES.terraces,
    );
    await eventually(store, `/en/e2e-sweets-${id}`, () =>
      expect(visible(store.getByRole('group', { name: 'Filling' }))).toBeVisible({
        timeout: 1_000,
      }),
    );

    // Renamed in the admin's template editor.
    await page.goto('/en/admin/product-types');
    await page.getByRole('button', { name: `Edit: Sweets ${id}` }).click();
    const sheet = page.getByRole('dialog');
    const english = sheet.locator('input[name$=".label-en"]').first();
    await expect(english).toHaveValue('Filling');
    await english.fill('Centre');
    await sheet.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await eventually(store, `/en/e2e-sweets-${id}`, () =>
      expect(visible(store.getByRole('group', { name: 'Centre' }))).toBeVisible({ timeout: 1_000 }),
    );
    const off = await request.put(`${API}/admin/categories/${sweetsId}`, {
      data: {
        slug: `e2e-sweets-${id}`,
        position: 80,
        isActive: false,
        illustrationKey: null,
        parentId: null,
        productTypeId: type.id,
        translations: {
          uz: { name: `Shirinliklar ${id}` },
          ru: null,
          en: { name: `Sweets ${id}` },
        },
      },
    });
    expect(off.status()).toBe(200);
    await store.context().close();
  });
});

test.describe('what visitors send reaches the admin area', () => {
  test('messages, subscriptions, accounts, orders and staff', async ({ page, browser }) => {
    test.setTimeout(120_000);
    const visitor = await storefront(browser);
    const id = Date.now().toString(36);

    // A message from the contact page.
    await visitor.goto('/en/contact');
    const form = visitor.getByRole('main');
    await visible(form.getByLabel(/^Your name/)).fill('Propagation Visitor');
    await visible(form.getByLabel(/^Email/)).fill(`visitor-${id}@example.test`);
    await visible(form.getByLabel(/^Message/)).fill('A question about gift boxes for a wedding.');
    await visible(form.getByRole('button', { name: 'Send message', exact: true })).click();
    await expect(visible(visitor.getByText('Your message has been sent'))).toBeVisible();

    // A newsletter subscription from the footer.
    const footer = visitor.getByRole('contentinfo');
    await footer.getByLabel('Email').fill(`subscriber-${id}@example.test`);
    await footer.getByRole('button', { name: 'Subscribe' }).click();
    await expect(footer.getByText('Thank you! You are subscribed.')).toBeVisible();

    // A guest order (its status page is shown to the customer).
    await visitor.goto('/en/products/classic-black-tea');
    await visitor.getByRole('button', { name: /^Add to bag · / }).click();
    await visible(
      visitor.getByRole('dialog', { name: 'Your bag' }).getByRole('link', { name: 'Checkout' }),
    ).click();
    const checkout = visitor.getByRole('main');
    await visible(checkout.getByLabel('Full name')).fill('Propagation Buyer');
    await visible(checkout.getByLabel('Phone number')).fill('90 444 55 66');
    await visible(checkout.getByLabel('Region')).selectOption('UZ-TK');
    await visible(checkout.getByLabel('City or district')).fill('Tashkent');
    await visible(checkout.getByLabel(/^Address/)).fill('Propagation street 7');
    await checkout.getByRole('radio', { name: /Cash on delivery/ }).check();
    await checkout.getByRole('checkbox', { name: /terms of use/ }).check();
    await checkout.getByRole('button', { name: /^Place order · / }).click();
    await expect(visitor).toHaveURL(/\/en\/orders\/TRN-/);
    const orderPage = visitor.url();
    const number = new URL(orderPage).pathname.split('/').pop() ?? '';

    // A customer account.
    const customer = await storefront(browser);
    await customer.goto('/en/account/register');
    const main = customer.getByRole('main');
    await visible(main.getByLabel('First name')).fill('Propagation');
    await visible(main.getByLabel('Email')).fill(`customer-${id}@example.test`);
    await visible(main.getByLabel(/^Password$/)).fill(`pw-${id}-e2e-only`);
    await visible(main.getByLabel('Repeat password')).fill(`pw-${id}-e2e-only`);
    await main.getByRole('button', { name: 'Create account' }).click();
    await expect(customer).toHaveURL(/\/en\/account$/);

    await signInAsAdmin(page);
    await page.goto('/en/admin/inquiries');
    await expect(visible(page.getByText(`visitor-${id}@example.test`))).toBeVisible();
    // Staff take it in hand: status and an internal note are kept.
    const inquiry = page
      .getByRole('main')
      .locator('li')
      .filter({ hasText: `visitor-${id}@example.test` });
    await inquiry.getByLabel('Status').selectOption('IN_PROGRESS');
    await inquiry.getByLabel(/^Internal note/).fill('Called back about wedding boxes.');
    await inquiry.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(async () => {
      await page.reload();
      const saved = page
        .getByRole('main')
        .locator('li')
        .filter({ hasText: `visitor-${id}@example.test` });
      await expect(saved.getByLabel('Status')).toHaveValue('IN_PROGRESS', { timeout: 1_000 });
      await expect(saved.getByLabel(/^Internal note/)).toHaveValue(
        'Called back about wedding boxes.',
      );
    }).toPass({ timeout: 15_000 });
    await page.goto('/en/admin/newsletter');
    await expect(visible(page.getByText(`subscriber-${id}@example.test`))).toBeVisible();
    await page.goto(`/en/admin/customers?q=customer-${id}`);
    await expect(visible(page.getByText(`customer-${id}@example.test`))).toBeVisible();
    await page.getByRole('link', { name: 'Propagation' }).click();
    await expect(page).toHaveURL(/\/en\/admin\/customers\/[0-9a-f-]{36}$/);
    await expect(visible(page.getByText(`customer-${id}@example.test`))).toBeVisible();

    // The order is confirmed in the admin area; the customer's order page says so.
    await page.goto(`/en/admin/orders?q=${number}`);
    await page.getByRole('link', { name: number }).click();
    await visible(page.getByRole('main').getByRole('button', { name: 'Confirm order' })).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm order' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(async () => {
      await visitor.goto(orderPage);
      await expect(visible(visitor.getByText('Confirmed'))).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 20_000 });

    // A staff member added in the admin area can sign in, with a manager's menu.
    await page.goto('/en/admin/staff');
    await page.getByRole('button', { name: 'Add staff member' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/^First name/).fill('Manager');
    await dialog.getByLabel(/^E-mail/).fill(`manager-${id}@example.test`);
    await dialog.getByLabel(/^Temporary password/).fill(`mgr-${id}-e2e-only`);
    await dialog.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(visible(page.getByText(`manager-${id}@example.test`))).toBeVisible();
    const manager = await storefront(browser);
    await manager.goto('/en/account/login?next=/admin');
    await visible(manager.getByRole('main').getByLabel('Email')).fill(`manager-${id}@example.test`);
    await visible(manager.getByRole('main').getByLabel('Password')).fill(`mgr-${id}-e2e-only`);
    await manager.getByRole('main').getByRole('button', { name: 'Sign in' }).click();
    await expect(manager).toHaveURL(/\/en\/admin$/);
    // (The Orders link carries the number of new orders when there are any.)
    await expect(visible(manager.getByRole('link', { name: /^Orders\b/ }))).toBeVisible();
    await expect(manager.getByRole('link', { name: 'Staff', exact: true })).toHaveCount(0);

    // The activity log records it all.
    await page.goto('/en/admin/audit');
    await expect(visible(page.getByText(/staff/i))).toBeVisible();
    await visitor.context().close();
    await customer.context().close();
    await manager.context().close();
  });
});
