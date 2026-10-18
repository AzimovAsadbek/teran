import { randomUUID } from 'node:crypto';
import request from 'supertest';
import {
  categoryPageSchema,
  categorySchema,
  orderSchema,
  placedOrderSchema,
  productDetailSchema,
  productListSchema,
  type AdminProductType,
  type ProductTypeUpsertInput,
  type ProductUpsertInput,
  type TaxonomyUpsertInput,
  type UserRole,
} from '@teran/contracts';
import { createTestApp, type TestApp } from './helpers/app.js';
import {
  TEST_PASSWORD,
  createDeliveryMethod,
  createUser,
  resetDatabase,
} from './helpers/fixtures.js';
import { createProductViaAdmin } from './helpers/publishing.js';

const API = '/api/v1';

function taxonomy(slug: string, overrides: Partial<TaxonomyUpsertInput> = {}): TaxonomyUpsertInput {
  return {
    slug,
    position: 0,
    isActive: true,
    illustrationKey: null,
    parentId: null,
    translations: { uz: { name: `${slug} uz` }, ru: { name: `${slug} ru` }, en: null },
    ...overrides,
  };
}

/** A product type no seed or frontend code knows about, created through the admin API only. */
const COFFEE_TYPE: ProductTypeUpsertInput = {
  key: 'coffee',
  isActive: true,
  position: 1,
  translations: { uz: { name: 'Qahva' }, ru: { name: 'Кофе' }, en: { name: 'Coffee' } },
  attributes: [
    {
      key: 'roast-level',
      kind: 'SELECT',
      unit: undefined,
      isRequired: true,
      isFilterable: true,
      isSearchable: true,
      isVisible: true,
      translations: { uz: { label: 'Qovurish' }, ru: { label: 'Обжарка' }, en: null },
      options: [
        { key: 'light', translations: { uz: { label: 'Yengil' }, ru: null, en: null } },
        { key: 'medium', translations: { uz: { label: 'Oʻrtacha' }, ru: null, en: null } },
        { key: 'dark', translations: { uz: { label: 'Toʻq' }, ru: { label: 'Тёмная' }, en: null } },
      ],
    },
    {
      key: 'decaf',
      kind: 'BOOLEAN',
      unit: undefined,
      isRequired: false,
      isFilterable: true,
      isSearchable: false,
      isVisible: true,
      translations: { uz: { label: 'Kofeinsiz' }, ru: null, en: null },
      options: [],
    },
    {
      key: 'net-weight',
      kind: 'NUMBER',
      unit: 'g',
      isRequired: false,
      isFilterable: true,
      isSearchable: false,
      isVisible: true,
      translations: { uz: { label: 'Ogʻirligi' }, ru: null, en: null },
      options: [],
    },
  ],
};

function product(
  slug: string,
  categoryId: string,
  overrides: Partial<ProductUpsertInput> = {},
): ProductUpsertInput {
  return {
    slug,
    status: 'ACTIVE',
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
    translations: { uz: { name: `${slug} nomi` }, ru: null, en: null },
    variants: [
      {
        sku: slug.toUpperCase(),
        weightGrams: 250,
        unitCount: null,
        price: '50000',
        compareAtPrice: null,
        lowStockThreshold: 2,
        barcode: null,
        isActive: true,
        initialStock: 10,
      },
    ],
    ...overrides,
  };
}

describe('multi-category catalogue', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    await createDeliveryMethod(ctx.prisma, { code: 'courier', price: '25000' });
  });

  const server = () => ctx.app.getHttpServer();
  const anonymous = () => request(server());

  async function signedIn(role: UserRole) {
    const user = await createUser(ctx.prisma, role);
    const agent = request.agent(server());
    await agent
      .post(`${API}/auth/login`)
      .send({ email: user.email, password: TEST_PASSWORD })
      .expect(200);
    return agent;
  }

  async function categories() {
    const response = await anonymous().get(`${API}/catalog/categories?locale=uz`).expect(200);
    return categorySchema.array().parse(response.body);
  }

  async function page(path: string) {
    return categoryPageSchema.parse(
      (await anonymous().get(`${API}/catalog/category-page?path=${path}&locale=uz`).expect(200))
        .body,
    );
  }

  /** Coffee in a new top-level category, next to Tea → Green tea, all through the admin API. */
  async function setUpShop() {
    const admin = await signedIn('ADMIN');
    const create = async (input: TaxonomyUpsertInput) =>
      (await admin.post(`${API}/admin/categories`).send(input).expect(201)).body as { id: string };
    const tea = await create(taxonomy('tea'));
    const green = await create(taxonomy('green-tea', { parentId: tea.id }));
    const coffee = await create(taxonomy('coffee', { position: 1 }));
    const coffeeType = (
      await admin.post(`${API}/admin/product-types`).send(COFFEE_TYPE).expect(201)
    ).body as AdminProductType;
    const attribute = (key: string) => coffeeType.attributes.find((entry) => entry.key === key)!;
    const option = (key: string) =>
      attribute('roast-level').options.find((entry) => entry.key === key)!.id;
    const coffeeProduct = (slug: string, roast: string, decaf: boolean, grams: number) =>
      product(slug, coffee.id, {
        format: 'ACCESSORY',
        productTypeId: coffeeType.id,
        attributes: [
          { attributeId: attribute('roast-level').id, optionIds: [option(roast)] },
          { attributeId: attribute('decaf').id, boolean: decaf },
          { attributeId: attribute('net-weight').id, number: grams },
        ],
      });
    const ids: Record<string, string> = {};
    for (const payload of [
      coffeeProduct('dark-espresso', 'dark', false, 250),
      coffeeProduct('dark-decaf', 'dark', true, 500),
      coffeeProduct('light-filter', 'light', false, 250),
      product('sencha', green.id),
    ]) {
      ids[payload.slug] = await createProductViaAdmin(admin, payload);
    }
    return { admin, tea, green, coffee, coffeeType, ids };
  }

  it('shows a new category without frontend changes, only while it is active', async () => {
    const { admin, coffee } = await setUpShop();
    let list = await categories();
    expect(list.map((entry) => [entry.path, entry.parentSlug, entry.productCount])).toEqual([
      ['tea', null, 1],
      ['tea/green-tea', 'tea', 1],
      ['coffee', null, 3],
    ]);

    await admin
      .put(`${API}/admin/categories/${coffee.id}`)
      .send(taxonomy('coffee', { position: 1, isActive: false }))
      .expect(200);
    list = await categories();
    expect(list.map((entry) => entry.slug)).toEqual(['tea', 'green-tea']);
    await anonymous().get(`${API}/catalog/category-page?path=coffee`).expect(404);
    const hidden = productListSchema.parse(
      (await anonymous().get(`${API}/catalog/products?category=coffee`).expect(200)).body,
    );
    expect(hidden.total).toBe(0);
  });

  it('resolves category pages, lists subcategory products under the parent, and redirects moved addresses', async () => {
    const { admin, tea, green } = await setUpShop();
    const teaPage = await page('tea');
    expect(teaPage).toMatchObject({
      type: 'category',
      category: { slug: 'tea', path: 'tea', productCount: 1 },
      parent: null,
      breadcrumbs: [{ slug: 'tea', path: 'tea' }],
    });
    if (teaPage.type !== 'category') throw new Error('expected a category page');
    expect(teaPage.subcategories.map((entry) => entry.path)).toEqual(['tea/green-tea']);
    expect(
      productListSchema
        .parse((await anonymous().get(`${API}/catalog/products?category=tea`).expect(200)).body)
        .items.map((item) => [item.slug, item.category.path]),
    ).toEqual([['sencha', 'tea/green-tea']]);

    // The old flat address of a subcategory leads to its full path.
    expect(await page('green-tea')).toEqual({ type: 'redirect', path: 'tea/green-tea' });
    // A wrong parent in the path is corrected.
    expect(await page('coffee/green-tea')).toEqual({ type: 'redirect', path: 'tea/green-tea' });

    // Renaming keeps the old address working.
    await admin
      .put(`${API}/admin/categories/${green.id}`)
      .send(taxonomy('green-teas', { parentId: tea.id }))
      .expect(200);
    expect(await page('tea/green-tea')).toEqual({ type: 'redirect', path: 'tea/green-teas' });
    expect(await page('green-tea')).toEqual({ type: 'redirect', path: 'tea/green-teas' });
    expect((await page('tea/green-teas')).type).toBe('category');
    await anonymous().get(`${API}/catalog/category-page?path=no-such-category`).expect(404);
  });

  it('enforces reserved addresses and the two-level tree on the server', async () => {
    const { admin, tea, green } = await setUpShop();
    const reserved = await admin
      .post(`${API}/admin/categories`)
      .send(taxonomy('checkout'))
      .expect(400);
    expect(reserved.body.issues).toEqual([
      expect.objectContaining({ path: 'slug', code: 'reserved_slug' }),
    ]);
    const third = await admin
      .post(`${API}/admin/categories`)
      .send(taxonomy('matcha', { parentId: green.id }))
      .expect(400);
    expect(third.body.issues[0].code).toBe('parent_not_top_level');
    const coffee = await categories();
    const coffeeId = coffee.find((entry) => entry.slug === 'coffee')!.id;
    const nested = await admin
      .put(`${API}/admin/categories/${tea.id}`)
      .send(taxonomy('tea', { parentId: coffeeId }))
      .expect(400);
    expect(nested.body.issues[0].code).toBe('has_children');
    const removing = await admin.delete(`${API}/admin/categories/${tea.id}`).expect(409);
    expect(removing.body.details).toMatchObject({ children: 1 });
  });

  it('filters by typed attributes with facets and pagination', async () => {
    await setUpShop();
    const list = async (query: string) =>
      productListSchema.parse(
        (
          await anonymous()
            .get(`${API}/catalog/products?category=coffee&locale=uz${query}`)
            .expect(200)
        ).body,
      );

    const all = await list('');
    const roast = all.facets.attributes.find((facet) => facet.key === 'roast-level')!;
    expect(roast.options).toEqual([
      { key: 'light', label: 'Yengil', count: 1 },
      { key: 'dark', label: 'Toʻq', count: 2 },
    ]);
    expect(all.facets.attributes.find((facet) => facet.key === 'net-weight')?.range).toEqual({
      min: '250',
      max: '500',
    });

    const dark = await list('&attr.roast-level=dark&pageSize=1&page=2&sort=newest');
    expect(dark).toMatchObject({ total: 2, totalPages: 2, page: 2 });
    expect(dark.items).toHaveLength(1);
    // The selected filter's own options keep their counts, so another roast can be added.
    expect(
      dark.facets.attributes.find((facet) => facet.key === 'roast-level')?.options,
    ).toHaveLength(2);
    // Other facets narrow to the selection.
    expect(dark.facets.attributes.find((facet) => facet.key === 'decaf')?.options).toEqual([
      { key: 'true', label: 'true', count: 1 },
      { key: 'false', label: 'false', count: 1 },
    ]);

    expect(
      (await list('&attr.roast-level=dark&attr.decaf=true')).items.map((item) => item.slug),
    ).toEqual(['dark-decaf']);
    expect((await list('&attr.net-weight=300~')).items.map((item) => item.slug)).toEqual([
      'dark-decaf',
    ]);
    expect((await list('&attr.roast-level=dark,light')).total).toBe(3);
    // An attribute that does not exist is ignored rather than failing the page.
    expect((await list('&attr.unknown-thing=x')).total).toBe(3);
    await anonymous().get(`${API}/catalog/products?attr.roast-level=DROP TABLE`).expect(400);
  });

  it('validates attribute values against the product type and requires them to publish', async () => {
    const { admin, coffee, coffeeType } = await setUpShop();
    const roast = coffeeType.attributes.find((entry) => entry.key === 'roast-level')!;
    const decaf = coffeeType.attributes.find((entry) => entry.key === 'decaf')!;

    // Publishing is refused with everything that is missing: the image and the roast level.
    const missing = await admin
      .post(`${API}/admin/products`)
      .send(product('no-roast', coffee.id, { productTypeId: coffeeType.id, attributes: [] }))
      .expect(422);
    expect(missing.body).toMatchObject({
      code: 'PUBLICATION_BLOCKED',
      details: { missing: ['mainImage', 'requiredAttributes'] },
    });
    expect(missing.body.details.attributes).toHaveLength(1);
    // A draft may be incomplete.
    await admin
      .post(`${API}/admin/products`)
      .send(product('no-roast', coffee.id, { status: 'DRAFT', productTypeId: coffeeType.id }))
      .expect(201);

    const wrongOption = await admin
      .post(`${API}/admin/products`)
      .send(
        product('bad-option', coffee.id, {
          productTypeId: coffeeType.id,
          attributes: [
            { attributeId: roast.id, optionIds: [roast.options[0]!.id, roast.options[1]!.id] },
          ],
        }),
      )
      .expect(400);
    expect(wrongOption.body.issues[0].code).toBe('single_option_only');
    const foreign = await admin
      .post(`${API}/admin/products`)
      .send(
        product('no-type', coffee.id, { attributes: [{ attributeId: decaf.id, boolean: true }] }),
      )
      .expect(400);
    expect(foreign.body.code).toBe('BAD_REQUEST');
  });

  it('shows typed attributes, breadcrumbs and the product type on the product page', async () => {
    await setUpShop();
    const detail = productDetailSchema.parse(
      (await anonymous().get(`${API}/catalog/products/dark-decaf?locale=ru`).expect(200)).body,
    );
    expect(detail.productType).toEqual({ key: 'coffee', name: 'Кофе' });
    expect(detail.breadcrumbs).toEqual([{ slug: 'coffee', name: 'coffee ru', path: 'coffee' }]);
    expect(
      detail.attributes.map((entry) => [
        entry.key,
        entry.label,
        entry.options,
        entry.boolean,
        entry.number,
      ]),
    ).toEqual([
      ['roast-level', 'Обжарка', [{ key: 'dark', label: 'Тёмная' }], null, null],
      ['decaf', 'Kofeinsiz', [], true, null],
      ['net-weight', 'Ogʻirligi', [], null, '500'],
    ]);
    const sencha = productDetailSchema.parse(
      (await anonymous().get(`${API}/catalog/products/sencha`).expect(200)).body,
    );
    expect(sencha.breadcrumbs.map((entry) => entry.path)).toEqual(['tea', 'tea/green-tea']);
    expect(sencha.attributes).toEqual([]);
  });

  it('protects product types and attributes that products use', async () => {
    const { admin, coffeeType } = await setUpShop();
    await admin.delete(`${API}/admin/product-types/${coffeeType.id}`).expect(409);

    const withoutRoast = {
      ...COFFEE_TYPE,
      attributes: COFFEE_TYPE.attributes
        .filter((entry) => entry.key !== 'roast-level')
        .map((entry) => ({
          ...entry,
          id: coffeeType.attributes.find((current) => current.key === entry.key)!.id,
        })),
    };
    const removed = await admin
      .put(`${API}/admin/product-types/${coffeeType.id}`)
      .send(withoutRoast)
      .expect(400);
    expect(removed.body.issues).toEqual([
      expect.objectContaining({ code: 'attribute_in_use', message: 'roast-level' }),
    ]);

    // Another type cannot reuse a key with a different kind (filters address attributes by key).
    const conflicting = await admin
      .post(`${API}/admin/product-types`)
      .send({
        ...COFFEE_TYPE,
        key: 'sweets',
        attributes: [{ ...COFFEE_TYPE.attributes[2]!, key: 'decaf' }],
      })
      .expect(400);
    expect(conflicting.body.issues[0].code).toBe('kind_conflict');
  });

  it('keeps a default product type per category and brewing fields to the types that have them', async () => {
    const { admin, coffee, coffeeType, ids } = await setUpShop();
    const honeyInput: ProductTypeUpsertInput = {
      key: 'honey',
      isActive: true,
      position: 2,
      translations: { uz: { name: 'Asal' }, ru: null, en: { name: 'Honey' } },
      attributes: [],
    };
    // A type has no brewing guidance unless asked, and a save that leaves the setting out keeps it.
    const honey = (await admin.post(`${API}/admin/product-types`).send(honeyInput).expect(201))
      .body as AdminProductType;
    expect([coffeeType.brewingGuide, honey.brewingGuide]).toEqual([false, false]);
    const brewed = await admin
      .put(`${API}/admin/product-types/${honey.id}`)
      .send({ ...honeyInput, brewingGuide: true })
      .expect(200);
    expect(brewed.body.brewingGuide).toBe(true);
    const kept = await admin
      .put(`${API}/admin/product-types/${honey.id}`)
      .send(honeyInput)
      .expect(200);
    expect(kept.body.brewingGuide).toBe(true);

    // The category's default type: set, kept when a save leaves it out, cleared with null.
    const set = await admin
      .put(`${API}/admin/categories/${coffee.id}`)
      .send(taxonomy('coffee', { position: 1, productTypeId: coffeeType.id }))
      .expect(200);
    expect(set.body.productTypeId).toBe(coffeeType.id);
    const unchanged = await admin
      .put(`${API}/admin/categories/${coffee.id}`)
      .send(taxonomy('coffee', { position: 1 }))
      .expect(200);
    expect(unchanged.body.productTypeId).toBe(coffeeType.id);
    const unknown = await admin
      .post(`${API}/admin/categories`)
      .send(taxonomy('sweets', { productTypeId: randomUUID() }))
      .expect(400);
    expect(unknown.body.issues).toEqual([
      expect.objectContaining({ path: 'productTypeId', code: 'type_not_found' }),
    ]);
    const sweets = (
      await admin
        .post(`${API}/admin/categories`)
        .send(taxonomy('sweets', { productTypeId: honey.id }))
        .expect(201)
    ).body as { id: string; productTypeId: string | null };
    expect(sweets.productTypeId).toBe(honey.id);
    // Removing an unused type leaves the categories that defaulted to it without a default.
    await admin.delete(`${API}/admin/product-types/${honey.id}`).expect(204);
    const listed = (await admin.get(`${API}/admin/categories`).expect(200)).body as {
      id: string;
      productTypeId: string | null;
    }[];
    expect(listed.find((entry) => entry.id === sweets.id)?.productTypeId).toBeNull();
    const cleared = await admin
      .put(`${API}/admin/categories/${coffee.id}`)
      .send(taxonomy('coffee', { position: 1, productTypeId: null }))
      .expect(200);
    expect(cleared.body.productTypeId).toBeNull();

    // A product none of the tea formats fits is listed, but "Other" is no format filter.
    const saved = (await admin.get(`${API}/admin/products/${ids['light-filter']}`).expect(200))
      .body as { variants: { id: string }[] };
    const roast = coffeeType.attributes.find((entry) => entry.key === 'roast-level')!;
    await admin
      .put(`${API}/admin/products/${ids['light-filter']}`)
      .send(
        product('light-filter', coffee.id, {
          format: 'OTHER',
          productTypeId: coffeeType.id,
          attributes: [
            {
              attributeId: roast.id,
              optionIds: [roast.options.find((entry) => entry.key === 'light')!.id],
            },
          ],
          variants: [
            {
              id: saved.variants[0]!.id,
              sku: 'LIGHT-FILTER',
              weightGrams: 250,
              unitCount: null,
              price: '50000',
              compareAtPrice: null,
              lowStockThreshold: 2,
              barcode: null,
              isActive: true,
            },
          ],
        }),
      )
      .expect(200);
    const listing = productListSchema.parse(
      (await anonymous().get(`${API}/catalog/products?category=coffee&locale=uz`).expect(200)).body,
    );
    expect(listing.total).toBe(3);
    expect(listing.facets.formats).toEqual([{ value: 'ACCESSORY', count: 2 }]);
    const detail = productDetailSchema.parse(
      (await anonymous().get(`${API}/catalog/products/light-filter?locale=uz`).expect(200)).body,
    );
    expect(detail.format).toBe('OTHER');
  });

  it('refuses catalogue changes from anyone but staff', async () => {
    const customer = await signedIn('CUSTOMER');
    for (const [method, path] of [
      ['post', 'admin/categories'],
      ['post', 'admin/product-types'],
      ['post', 'admin/products'],
    ] as const) {
      await anonymous()[method](`${API}/${path}`).send({}).expect(401);
      await customer[method](`${API}/${path}`).send({}).expect(403);
    }
  });

  it('sells across categories in one cart and keeps purchase-time snapshots', async () => {
    const { admin, ids, coffee } = await setUpShop();
    // A collection spanning categories.
    const collection = (
      await admin.post(`${API}/admin/collections`).send(taxonomy('morning')).expect(201)
    ).body as {
      id: string;
    };
    for (const slug of ['dark-espresso', 'sencha']) {
      const current = (await admin.get(`${API}/admin/products/${ids[slug]}`).expect(200))
        .body as ProductUpsertInput & {
        variants: (ProductUpsertInput['variants'][number] & { id: string })[];
      };
      await admin
        .put(`${API}/admin/products/${ids[slug]}`)
        .send({ ...current, collectionIds: [collection.id] })
        .expect(200);
    }
    const morning = productListSchema.parse(
      (await anonymous().get(`${API}/catalog/products?collection=morning`).expect(200)).body,
    );
    expect(morning.items.map((item) => item.category.slug).sort()).toEqual(['coffee', 'green-tea']);

    const shopper = request.agent(server());
    const variants = await ctx.prisma.productVariant.findMany({
      where: { sku: { in: ['DARK-ESPRESSO', 'SENCHA'] } },
    });
    for (const variant of variants) {
      await shopper
        .post(`${API}/cart/items`)
        .send({ variantId: variant.id, quantity: 2 })
        .expect(201);
    }
    const placed = placedOrderSchema.parse(
      (
        await shopper
          .post(`${API}/checkout/orders`)
          .send({
            idempotencyKey: randomUUID(),
            locale: 'uz',
            customer: { name: 'Mixed', phone: '+998901234567' },
            delivery: {
              methodCode: 'courier',
              regionCode: 'UZ-TK',
              city: 'Toshkent',
              addressLine: '1-uy',
            },
            paymentMethod: 'CASH_ON_DELIVERY',
            acceptTerms: true,
          })
          .expect(201)
      ).body,
    );
    expect(placed.order.items.map((item) => item.sku).sort()).toEqual(['DARK-ESPRESSO', 'SENCHA']);
    expect(placed.order.total).toBe('225000.00');

    // Later: renamed, repriced, archived, moved. The order still shows what was bought.
    const espresso = (await admin.get(`${API}/admin/products/${ids['dark-espresso']}`).expect(200))
      .body as ProductUpsertInput;
    await admin
      .put(`${API}/admin/products/${ids['dark-espresso']}`)
      .send({
        ...espresso,
        slug: 'espresso-dark-roast',
        status: 'ARCHIVED',
        categoryId: coffee.id,
        translations: { uz: { name: 'Yangi nom' }, ru: null, en: null },
        variants: espresso.variants.map((variant) => ({ ...variant, price: '99000' })),
      })
      .expect(200);
    const order = orderSchema.parse(
      (
        await anonymous()
          .get(
            `${API}/orders/${placed.order.number}?token=${encodeURIComponent(placed.accessToken)}`,
          )
          .expect(200)
      ).body,
    );
    const line = order.items.find((item) => item.sku === 'DARK-ESPRESSO')!;
    expect(line).toMatchObject({
      productName: 'dark-espresso nomi',
      unitPrice: '50000.00',
      lineTotal: '100000.00',
    });
    expect(order.total).toBe('225000.00');

    // The renamed product's old address is redirected (while the product is visible).
    const archived = (await admin.get(`${API}/admin/products/${ids['dark-espresso']}`).expect(200))
      .body as ProductUpsertInput;
    await admin
      .put(`${API}/admin/products/${ids['dark-espresso']}`)
      .send({ ...archived, status: 'ACTIVE' })
      .expect(200);
    expect(
      (await anonymous().get(`${API}/catalog/redirects/products/dark-espresso`).expect(200)).body,
    ).toEqual({ slug: 'espresso-dark-roast' });
    await anonymous().get(`${API}/catalog/redirects/products/never-existed`).expect(404);
  });

  it('keeps gift-set stock independent of the teas inside', async () => {
    const { admin, green, tea } = await setUpShop();
    const gifts = (
      await admin
        .post(`${API}/admin/categories`)
        .send(taxonomy('gift-sets', { position: 2 }))
        .expect(201)
    ).body as { id: string };
    await createProductViaAdmin(
      admin,
      product('green-gift', gifts.id, {
        format: 'GIFT_SET',
        variants: [{ ...product('x', gifts.id).variants[0]!, sku: 'GIFT-1', initialStock: 3 }],
      }),
    );
    const gift = await ctx.prisma.productVariant.findUniqueOrThrow({ where: { sku: 'GIFT-1' } });
    const sencha = await ctx.prisma.productVariant.findUniqueOrThrow({ where: { sku: 'SENCHA' } });
    const shopper = request.agent(server());
    await shopper.post(`${API}/cart/items`).send({ variantId: gift.id, quantity: 3 }).expect(201);
    await shopper
      .post(`${API}/checkout/orders`)
      .send({
        idempotencyKey: randomUUID(),
        locale: 'uz',
        customer: { name: 'Gift', phone: '+998901234567' },
        delivery: {
          methodCode: 'courier',
          regionCode: 'UZ-TK',
          city: 'Toshkent',
          addressLine: '1-uy',
        },
        paymentMethod: 'CASH_ON_DELIVERY',
        acceptTerms: true,
      })
      .expect(201);
    expect(
      (await ctx.prisma.productVariant.findUniqueOrThrow({ where: { id: gift.id } })).stockQuantity,
    ).toBe(0);
    expect(
      (await ctx.prisma.productVariant.findUniqueOrThrow({ where: { id: sencha.id } }))
        .stockQuantity,
    ).toBe(sencha.stockQuantity);
    // Sold out: no more can be added.
    await shopper.post(`${API}/cart/items`).send({ variantId: gift.id, quantity: 1 }).expect(409);
    expect(green.id).not.toBe(tea.id);
  });

  it('publishes category paths in the sitemap and search suggestions', async () => {
    const { admin, tea } = await setUpShop();
    // Without products, a category or collection waits: it is in neither until it has some.
    await admin
      .post(`${API}/admin/categories`)
      .send(taxonomy('green-gifts', { position: 2 }))
      .expect(201);
    await admin
      .post(`${API}/admin/categories`)
      .send(taxonomy('green-oolong', { parentId: tea.id }))
      .expect(201);
    await admin.post(`${API}/admin/collections`).send(taxonomy('green-picks')).expect(201);
    const sitemap = (await anonymous().get(`${API}/catalog/sitemap`).expect(200)).body as {
      categories: { slug: string; path: string }[];
      collections: { slug: string }[];
    };
    expect(sitemap.categories.map((entry) => entry.path).sort()).toEqual([
      'coffee',
      'tea',
      'tea/green-tea',
    ]);
    expect(sitemap.collections).toEqual([]);
    const suggestions = (
      await anonymous().get(`${API}/catalog/search/suggest?q=green&locale=uz`).expect(200)
    ).body as { categories: { path: string }[] };
    expect(suggestions.categories).toEqual([expect.objectContaining({ path: 'tea/green-tea' })]);
  });
});
