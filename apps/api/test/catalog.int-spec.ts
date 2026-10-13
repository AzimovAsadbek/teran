import request from 'supertest';
import { productDetailSchema, productListSchema } from '@teran/contracts';
import { createTestApp, type TestApp } from './helpers/app.js';
import { createCategory, createProduct, resetDatabase } from './helpers/fixtures.js';

const API = '/api/v1';

describe('catalogue', () => {
  let ctx: TestApp;
  let categoryId: string;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    categoryId = (await createCategory(ctx.prisma, 'green-tea')).id;
  });

  const get = (path: string) => request(ctx.app.getHttpServer()).get(`${API}${path}`);

  it('only lists active, published products with an active variant', async () => {
    const visible = await createProduct(ctx.prisma, { categoryId, slug: 'visible-tea' });
    await createProduct(ctx.prisma, { categoryId, slug: 'draft-tea', status: 'DRAFT' });
    await createProduct(ctx.prisma, { categoryId, slug: 'archived-tea', status: 'ARCHIVED' });
    await createProduct(ctx.prisma, {
      categoryId,
      slug: 'future-tea',
      publishedAt: new Date(Date.now() + 86_400_000),
    });
    await createProduct(ctx.prisma, {
      categoryId,
      slug: 'no-variant-tea',
      variants: [{ price: '1000', stock: 5, isActive: false }],
    });

    const list = productListSchema.parse((await get('/catalog/products').expect(200)).body);
    expect(list.items.map((item) => item.slug)).toEqual([visible.slug]);

    for (const hidden of ['draft-tea', 'archived-tea', 'future-tea', 'no-variant-tea']) {
      await get(`/catalog/products/${hidden}`).expect(404);
    }
  });

  it('filters by stock and sorts by the lowest active price', async () => {
    await createProduct(ctx.prisma, {
      categoryId,
      slug: 'expensive',
      variants: [{ price: '90000', stock: 3 }],
    });
    await createProduct(ctx.prisma, {
      categoryId,
      slug: 'cheap',
      variants: [
        { price: '20000', stock: 3 },
        { price: '60000', stock: 3 },
      ],
    });
    await createProduct(ctx.prisma, {
      categoryId,
      slug: 'sold-out',
      variants: [{ price: '10000', stock: 0 }],
    });

    const ascending = productListSchema.parse(
      (await get('/catalog/products?sort=price_asc').expect(200)).body,
    );
    expect(ascending.items.map((item) => item.slug)).toEqual(['sold-out', 'cheap', 'expensive']);
    expect(ascending.items[1]?.priceFrom).toBe('20000.00');

    const inStock = productListSchema.parse(
      (await get('/catalog/products?inStock=true&sort=price_desc').expect(200)).body,
    );
    expect(inStock.items.map((item) => item.slug)).toEqual(['expensive', 'cheap']);

    const priced = productListSchema.parse(
      (await get('/catalog/products?minPrice=15000&maxPrice=50000').expect(200)).body,
    );
    expect(priced.items.map((item) => item.slug)).toEqual(['cheap']);
  });

  it('matches Uzbek text regardless of the apostrophe character used', async () => {
    await createProduct(ctx.prisma, { categoryId, slug: 'mountain', name: 'Togʻ giyohlari' });
    for (const query of ['togʻ', "tog'", 'TOG‘', 'giyoh']) {
      const list = productListSchema.parse(
        (await get(`/catalog/products?q=${encodeURIComponent(query)}`).expect(200)).body,
      );
      expect(list.items.map((item) => item.slug)).toEqual(['mountain']);
    }
  });

  it('returns the detail contract with stock levels and capped quantities', async () => {
    await createProduct(ctx.prisma, {
      categoryId,
      slug: 'detail-tea',
      variants: [
        { price: '45000', stock: 100 },
        { price: '80000', stock: 3 },
        { price: '95000', stock: 0 },
      ],
    });
    const detail = productDetailSchema.parse(
      (await get('/catalog/products/detail-tea?locale=ru').expect(200)).body,
    );
    expect(detail.variants.map((variant) => [variant.stockLevel, variant.maxQuantity])).toEqual([
      ['in_stock', 20],
      ['low_stock', 3],
      ['out_of_stock', 0],
    ]);
    expect(detail.defaultVariant?.price).toBe('45000.00');
    expect(detail.ingredients).toBeNull();
  });

  it('rejects malformed queries with a validation error', async () => {
    const response = await get('/catalog/products?pageSize=1000&sort=random').expect(400);
    expect(response.body.code).toBe('VALIDATION_FAILED');
    expect((response.body.issues as { path: string }[]).map((issue) => issue.path)).toEqual(
      expect.arrayContaining(['pageSize', 'sort']),
    );
  });

  it('marks catalogue responses as publicly cacheable', async () => {
    const response = await get('/catalog/categories').expect(200);
    expect(response.headers['cache-control']).toContain('public');
  });
});
