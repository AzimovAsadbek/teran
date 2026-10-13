import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { cartSchema, placedOrderSchema } from '@teran/contracts';
import { createTestApp, type TestApp } from './helpers/app.js';
import {
  createCategory,
  createDeliveryMethod,
  createProduct,
  resetDatabase,
} from './helpers/fixtures.js';

const API = '/api/v1';

function checkoutBody(overrides: Record<string, unknown> = {}) {
  return {
    idempotencyKey: randomUUID(),
    locale: 'uz',
    customer: { name: 'Dilnoza Karimova', phone: '+998 90 123 45 67' },
    delivery: {
      methodCode: 'courier',
      regionCode: 'UZ-TK',
      city: 'Yunusobod',
      addressLine: '12-uy',
    },
    paymentMethod: 'CASH_ON_DELIVERY',
    acceptTerms: true,
    ...overrides,
  };
}

describe('cart and checkout', () => {
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
    categoryId = (await createCategory(ctx.prisma)).id;
    await createDeliveryMethod(ctx.prisma, {
      code: 'courier',
      price: '25000',
      freeFromAmount: '300000',
    });
  });

  const agent = () => request.agent(ctx.app.getHttpServer());

  it('adds items, re-prices on the server and reports the cart contract', async () => {
    const product = await createProduct(ctx.prisma, {
      categoryId,
      variants: [{ price: '45000', stock: 10 }],
    });
    const shopper = agent();

    const response = await shopper
      .post(`${API}/cart/items`)
      .send({ variantId: product.variants[0]!.id, quantity: 3 })
      .expect(201);
    const cart = cartSchema.parse(response.body);
    expect(cart.itemCount).toBe(3);
    expect(cart.subtotal).toBe('135000.00');
    expect(cart.isCheckoutReady).toBe(true);
    expect(cart.deliveryHint).toMatchObject({
      freeFromAmount: '300000.00',
      remaining: '165000.00',
    });

    const cookie = response.headers['set-cookie'] as unknown as string[];
    expect(cookie.join(';')).toMatch(/teran_cart=.+HttpOnly/i);
    expect(cookie.join(';')).toMatch(/SameSite=Lax/i);
  });

  it('caps quantities at available stock and rejects adding beyond it', async () => {
    const product = await createProduct(ctx.prisma, {
      categoryId,
      variants: [{ price: '10000', stock: 2 }],
    });
    const shopper = agent();
    const variantId = product.variants[0]!.id;

    await shopper.post(`${API}/cart/items`).send({ variantId, quantity: 5 }).expect(201);
    const cart = cartSchema.parse((await shopper.get(`${API}/cart`).expect(200)).body);
    expect(cart.lines[0]!.quantity).toBe(2);

    const again = await shopper
      .post(`${API}/cart/items`)
      .send({ variantId, quantity: 1 })
      .expect(409);
    expect(again.body.code).toBe('INSUFFICIENT_STOCK');

    const update = await shopper
      .patch(`${API}/cart/items/${cart.lines[0]!.id}`)
      .send({ quantity: 3 })
      .expect(409);
    expect(update.body.details).toMatchObject({ available: 2 });
  });

  it('refuses drafts, archived products and inactive variants', async () => {
    const draft = await createProduct(ctx.prisma, { categoryId, status: 'DRAFT' });
    const inactive = await createProduct(ctx.prisma, {
      categoryId,
      variants: [{ price: '1000', stock: 5, isActive: false }],
    });
    const shopper = agent();
    for (const variantId of [draft.variants[0]!.id, inactive.variants[0]!.id]) {
      const response = await shopper
        .post(`${API}/cart/items`)
        .send({ variantId, quantity: 1 })
        .expect(404);
      expect(response.body.code).toBe('CART_ITEM_UNAVAILABLE');
    }
  });

  it('cannot touch another customer’s cart line', async () => {
    const product = await createProduct(ctx.prisma, { categoryId });
    const owner = agent();
    const intruder = agent();
    const cart = cartSchema.parse(
      (
        await owner
          .post(`${API}/cart/items`)
          .send({ variantId: product.variants[0]!.id })
          .expect(201)
      ).body,
    );
    await intruder
      .post(`${API}/cart/items`)
      .send({ variantId: product.variants[0]!.id })
      .expect(201);

    await intruder.delete(`${API}/cart/items/${cart.lines[0]!.id}`).expect(200);
    const ownerCart = cartSchema.parse((await owner.get(`${API}/cart`).expect(200)).body);
    expect(ownerCart.lines).toHaveLength(1);
  });

  it('places an order with server-side totals, ignoring client-supplied prices', async () => {
    const product = await createProduct(ctx.prisma, {
      categoryId,
      variants: [{ price: '45000', stock: 10 }],
    });
    const shopper = agent();
    await shopper
      .post(`${API}/cart/items`)
      .send({ variantId: product.variants[0]!.id, quantity: 2 })
      .expect(201);

    const response = await shopper
      .post(`${API}/checkout/orders`)
      .send(checkoutBody({ subtotal: '1.00', total: '1.00', items: [{ price: '1' }] }))
      .expect(201);
    const placed = placedOrderSchema.parse(response.body);
    expect(placed.order.subtotal).toBe('90000.00');
    expect(placed.order.deliveryFee).toBe('25000.00');
    expect(placed.order.total).toBe('115000.00');
    expect(placed.order.customerPhone).toBe('+998901234567');
    expect(placed.order.number).toMatch(/^TRN-[0-9A-Z]{8}$/);

    const variant = await ctx.prisma.productVariant.findUniqueOrThrow({
      where: { id: product.variants[0]!.id },
    });
    expect(variant.stockQuantity).toBe(8);
    const movements = await ctx.prisma.inventoryMovement.findMany({
      where: { variantId: variant.id },
    });
    expect(movements).toEqual([
      expect.objectContaining({ delta: -2, quantityAfter: 8, reason: 'ORDER_PLACED' }),
    ]);

    const cart = cartSchema.parse((await shopper.get(`${API}/cart`).expect(200)).body);
    expect(cart.lines).toHaveLength(0);
  });

  it('applies free delivery from the configured threshold', async () => {
    const product = await createProduct(ctx.prisma, {
      categoryId,
      variants: [{ price: '150000', stock: 10 }],
    });
    const shopper = agent();
    await shopper
      .post(`${API}/cart/items`)
      .send({ variantId: product.variants[0]!.id, quantity: 2 })
      .expect(201);
    const quote = await shopper
      .get(`${API}/checkout/quote?locale=uz&methodCode=courier&regionCode=UZ-TK`)
      .expect(200);
    expect(quote.body).toMatchObject({
      subtotal: '300000.00',
      deliveryFee: '0.00',
      total: '300000.00',
    });
  });

  it('is idempotent: repeating a submission returns the same order and link', async () => {
    const product = await createProduct(ctx.prisma, {
      categoryId,
      variants: [{ price: '45000', stock: 10 }],
    });
    const shopper = agent();
    await shopper
      .post(`${API}/cart/items`)
      .send({ variantId: product.variants[0]!.id, quantity: 1 })
      .expect(201);
    const body = checkoutBody();

    const first = placedOrderSchema.parse(
      (await shopper.post(`${API}/checkout/orders`).send(body).expect(201)).body,
    );
    const second = placedOrderSchema.parse(
      (await shopper.post(`${API}/checkout/orders`).send(body).expect(201)).body,
    );
    expect(second.order.number).toBe(first.order.number);
    expect(second.accessToken).toBe(first.accessToken);
    expect(await ctx.prisma.order.count()).toBe(1);
  });

  it('creates exactly one order when duplicate submissions race', async () => {
    const product = await createProduct(ctx.prisma, {
      categoryId,
      variants: [{ price: '45000', stock: 10 }],
    });
    const shopper = agent();
    await shopper
      .post(`${API}/cart/items`)
      .send({ variantId: product.variants[0]!.id, quantity: 1 })
      .expect(201);
    const body = checkoutBody();

    const responses = await Promise.all(
      Array.from({ length: 4 }, () => shopper.post(`${API}/checkout/orders`).send(body)),
    );
    const numbers = new Set(
      responses
        .filter((res) => res.status === 201)
        .map((res) => (res.body as { order: { number: string } }).order.number),
    );
    expect(numbers.size).toBe(1);
    expect(await ctx.prisma.order.count()).toBe(1);
    const variant = await ctx.prisma.productVariant.findUniqueOrThrow({
      where: { id: product.variants[0]!.id },
    });
    expect(variant.stockQuantity).toBe(9);
  });

  it('never oversells the last unit when two customers check out at once', async () => {
    const product = await createProduct(ctx.prisma, {
      categoryId,
      variants: [{ price: '45000', stock: 1 }],
    });
    const alice = agent();
    const bob = agent();
    for (const shopper of [alice, bob]) {
      await shopper
        .post(`${API}/cart/items`)
        .send({ variantId: product.variants[0]!.id, quantity: 1 })
        .expect(201);
    }

    const results = await Promise.all([
      alice.post(`${API}/checkout/orders`).send(checkoutBody()),
      bob.post(`${API}/checkout/orders`).send(checkoutBody()),
    ]);
    const statuses = results.map((res) => res.status).sort();
    expect(statuses).toEqual([201, 409]);
    expect(results.find((res) => res.status === 409)?.body.code).toBe('INSUFFICIENT_STOCK');

    const variant = await ctx.prisma.productVariant.findUniqueOrThrow({
      where: { id: product.variants[0]!.id },
    });
    expect(variant.stockQuantity).toBe(0);
    expect(await ctx.prisma.order.count()).toBe(1);
  });

  it('rejects the order and keeps stock when the reviewed total is out of date', async () => {
    const product = await createProduct(ctx.prisma, {
      categoryId,
      variants: [{ price: '45000', stock: 10 }],
    });
    const shopper = agent();
    await shopper
      .post(`${API}/cart/items`)
      .send({ variantId: product.variants[0]!.id, quantity: 1 })
      .expect(201);

    const response = await shopper
      .post(`${API}/checkout/orders`)
      .send(checkoutBody({ expectedTotal: '1000.00' }))
      .expect(409);
    expect(response.body).toMatchObject({ code: 'PRICE_CHANGED', details: { total: '70000.00' } });
    const variant = await ctx.prisma.productVariant.findUniqueOrThrow({
      where: { id: product.variants[0]!.id },
    });
    expect(variant.stockQuantity).toBe(10);
    expect(await ctx.prisma.order.count()).toBe(0);
  });

  it('enforces delivery coverage, address requirements and enabled payment methods', async () => {
    const product = await createProduct(ctx.prisma, { categoryId });
    const shopper = agent();
    await shopper
      .post(`${API}/cart/items`)
      .send({ variantId: product.variants[0]!.id })
      .expect(201);

    const wrongRegion = await shopper
      .post(`${API}/checkout/orders`)
      .send(
        checkoutBody({
          delivery: {
            methodCode: 'courier',
            regionCode: 'UZ-SA',
            city: 'Samarqand',
            addressLine: '1',
          },
        }),
      )
      .expect(422);
    expect(wrongRegion.body.code).toBe('DELIVERY_METHOD_UNAVAILABLE');

    const noAddress = await shopper
      .post(`${API}/checkout/orders`)
      .send(
        checkoutBody({
          delivery: { methodCode: 'courier', regionCode: 'UZ-TK', city: 'Toshkent' },
        }),
      )
      .expect(400);
    expect(noAddress.body.issues[0].path).toBe('delivery.addressLine');

    const unknownPayment = await shopper
      .post(`${API}/checkout/orders`)
      .send(checkoutBody({ paymentMethod: 'BITCOIN' }))
      .expect(400);
    expect(unknownPayment.body.code).toBe('VALIDATION_FAILED');
    expect(await ctx.prisma.order.count()).toBe(0);
  });

  it('validates checkout input with field-level issues', async () => {
    const response = await agent()
      .post(`${API}/checkout/orders`)
      .send(checkoutBody({ customer: { name: 'A', phone: '123' }, acceptTerms: false }))
      .expect(400);
    const paths = (response.body.issues as { path: string }[]).map((issue) => issue.path);
    expect(paths).toEqual(
      expect.arrayContaining(['customer.name', 'customer.phone', 'acceptTerms']),
    );
  });

  it('serves guest order status only with the secret token', async () => {
    const product = await createProduct(ctx.prisma, { categoryId });
    const shopper = agent();
    await shopper
      .post(`${API}/cart/items`)
      .send({ variantId: product.variants[0]!.id })
      .expect(201);
    const placed = placedOrderSchema.parse(
      (await shopper.post(`${API}/checkout/orders`).send(checkoutBody()).expect(201)).body,
    );

    const found = await request(ctx.app.getHttpServer())
      .get(`${API}/orders/${placed.order.number}`)
      .query({ token: placed.accessToken })
      .expect(200);
    expect(found.body.number).toBe(placed.order.number);
    expect(found.headers['cache-control']).toBe('private, no-store');

    const wrong = await request(ctx.app.getHttpServer())
      .get(`${API}/orders/${placed.order.number}`)
      .query({ token: 'x'.repeat(43) })
      .expect(404);
    expect(wrong.body.code).toBe('NOT_FOUND');
  });

  it('refuses checkout with an empty cart', async () => {
    const response = await agent().post(`${API}/checkout/orders`).send(checkoutBody()).expect(400);
    expect(response.body.code).toBe('CART_EMPTY');
  });
});
