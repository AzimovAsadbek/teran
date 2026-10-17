import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createTestApp, type TestApp } from './helpers/app.js';
import {
  createCategory,
  createDeliveryMethod,
  createProduct,
  resetDatabase,
} from './helpers/fixtures.js';

// The API as deployed while the storefront takes orders by phone: online ordering is closed.
vi.hoisted(() => {
  Object.assign(process.env, { CHECKOUT_ENABLED: 'false' });
});

const API = '/api/v1';

describe('online ordering switched off (CHECKOUT_ENABLED unset)', () => {
  let ctx: TestApp;
  let variantId: string;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    const category = await createCategory(ctx.prisma);
    await createDeliveryMethod(ctx.prisma, { code: 'courier', price: '25000' });
    const product = await createProduct(ctx.prisma, {
      categoryId: category.id,
      variants: [{ price: '60000', stock: 5 }],
    });
    variantId = product.variants[0]!.id;
  });

  const agent = () => request.agent(ctx.app.getHttpServer());

  it('refuses to fill a cart, place an order or start a payment, and leaves stock alone', async () => {
    const browser = agent();
    const added = await browser
      .post(`${API}/cart/items`)
      .send({ variantId, quantity: 2 })
      .expect(503);
    expect(added.body.code).toBe('FEATURE_DISABLED');

    const placed = await browser
      .post(`${API}/checkout/orders`)
      .send({
        idempotencyKey: randomUUID(),
        locale: 'uz',
        customer: { name: 'Dilnoza Karimova', phone: '+998 90 123 45 67' },
        delivery: {
          methodCode: 'courier',
          regionCode: 'UZ-TK',
          city: 'Toshkent',
          addressLine: '12-uy',
        },
        paymentMethod: 'CASH_ON_DELIVERY',
        acceptTerms: true,
      })
      .expect(503);
    expect(placed.body.code).toBe('FEATURE_DISABLED');

    await browser
      .post(`${API}/payments/demo`)
      .send({ token: 'x'.repeat(43), outcome: 'success' })
      .expect(503);
    await browser.post(`${API}/orders/TRN-AAAAAAAA/payments`).send({}).expect(503);

    expect(await ctx.prisma.order.count()).toBe(0);
    const variant = await ctx.prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    expect(variant.stockQuantity).toBe(5);
  });

  it('still answers reads: the catalogue, an empty cart and the checkout options', async () => {
    await agent().get(`${API}/catalog/products?locale=uz`).expect(200);
    const cart = await agent().get(`${API}/cart?locale=uz`).expect(200);
    expect(cart.body.lines).toEqual([]);
    await agent().get(`${API}/checkout/options?locale=uz`).expect(200);
  });
});
