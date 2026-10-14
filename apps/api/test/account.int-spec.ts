import { randomUUID } from 'node:crypto';
import request from 'supertest';
import {
  accountSessionSchema,
  accountSummarySchema,
  addressSchema,
  cartSchema,
  placedOrderSchema,
  purchasedProductSchema,
  reorderResultSchema,
} from '@teran/contracts';
import { createTestApp, type TestApp } from './helpers/app.js';
import {
  TEST_PASSWORD,
  createCategory,
  createDeliveryMethod,
  createProduct,
  createUser,
  resetDatabase,
} from './helpers/fixtures.js';

const API = '/api/v1';

function address(overrides: Record<string, unknown> = {}) {
  return {
    label: 'Uy',
    recipientName: 'Dilnoza Karimova',
    phone: '+998 90 123 45 67',
    regionCode: 'UZ-TK',
    city: 'Toshkent',
    addressLine: 'Yunusobod, 12-uy',
    ...overrides,
  };
}

describe('customer account, persistent cart and cart migration', () => {
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
    await createDeliveryMethod(ctx.prisma, { code: 'courier', price: '25000' });
  });

  const agent = () => request.agent(ctx.app.getHttpServer());

  async function signIn(email: string) {
    const browser = agent();
    await browser.post(`${API}/auth/login`).send({ email, password: TEST_PASSWORD }).expect(200);
    return browser;
  }

  async function cartOf(browser: ReturnType<typeof agent>) {
    return cartSchema.parse((await browser.get(`${API}/cart`).expect(200)).body);
  }

  describe('guest cart migration', () => {
    it('keeps the guest cart when registering, with server prices', async () => {
      const product = await createProduct(ctx.prisma, {
        categoryId,
        variants: [{ price: '45000', stock: 10 }],
      });
      const visitor = agent();
      await visitor
        .post(`${API}/cart/items`)
        .send({ variantId: product.variants[0]!.id, quantity: 2 })
        .expect(201);

      // The price changes while the item sits in the cart: the cart shows today's price.
      await ctx.prisma.productVariant.update({
        where: { id: product.variants[0]!.id },
        data: { price: '47000' },
      });
      await visitor
        .post(`${API}/auth/register`)
        .send({
          email: 'new.customer@example.com',
          password: TEST_PASSWORD,
          firstName: 'Aziza',
          locale: 'uz',
        })
        .expect(201);

      const cart = await cartOf(visitor);
      expect(cart.itemCount).toBe(2);
      expect(cart.subtotal).toBe('94000.00');
      const user = await ctx.prisma.user.findUniqueOrThrow({
        where: { email: 'new.customer@example.com' },
      });
      expect(await ctx.prisma.cart.count({ where: { userId: user.id } })).toBe(1);
    });

    it('merges the guest cart into the account cart on login: combined, capped, no duplicates', async () => {
      const customer = await createUser(ctx.prisma, 'CUSTOMER', 'merge@example.com');
      const shared = await createProduct(ctx.prisma, {
        categoryId,
        variants: [{ price: '10000', stock: 5 }],
      });
      const onlyAccount = await createProduct(ctx.prisma, { categoryId });
      const onlyGuest = await createProduct(ctx.prisma, { categoryId });

      // An earlier visit left items in the account's cart.
      const earlier = await signIn(customer.email);
      await earlier
        .post(`${API}/cart/items`)
        .send({ variantId: shared.variants[0]!.id, quantity: 3 })
        .expect(201);
      await earlier
        .post(`${API}/cart/items`)
        .send({ variantId: onlyAccount.variants[0]!.id, quantity: 1 })
        .expect(201);

      // Now, on another device, as a guest.
      const device = agent();
      await device
        .post(`${API}/cart/items`)
        .send({ variantId: shared.variants[0]!.id, quantity: 4 })
        .expect(201);
      await device
        .post(`${API}/cart/items`)
        .send({ variantId: onlyGuest.variants[0]!.id, quantity: 2 })
        .expect(201);
      await device
        .post(`${API}/auth/login`)
        .send({ email: customer.email, password: TEST_PASSWORD })
        .expect(200);

      const cart = await cartOf(device);
      const quantities = Object.fromEntries(
        cart.lines.map((line) => [line.variantId, line.quantity]),
      );
      expect(quantities).toEqual({
        [shared.variants[0]!.id]: 5, // 4 + 3, capped at the 5 in stock
        [onlyGuest.variants[0]!.id]: 2,
        [onlyAccount.variants[0]!.id]: 1,
      });
      // The device's lines come first, then the ones that were only on the account.
      expect(cart.lines.map((line) => line.variantId)).toEqual([
        shared.variants[0]!.id,
        onlyGuest.variants[0]!.id,
        onlyAccount.variants[0]!.id,
      ]);
      expect(await ctx.prisma.cart.count({ where: { userId: customer.id } })).toBe(1);
    });

    it('signing in twice does not merge twice', async () => {
      const customer = await createUser(ctx.prisma, 'CUSTOMER', 'twice@example.com');
      const product = await createProduct(ctx.prisma, { categoryId });
      const earlier = await signIn(customer.email);
      await earlier
        .post(`${API}/cart/items`)
        .send({ variantId: product.variants[0]!.id, quantity: 2 })
        .expect(201);

      const device = agent();
      await device
        .post(`${API}/cart/items`)
        .send({ variantId: product.variants[0]!.id, quantity: 1 })
        .expect(201);
      for (let attempt = 0; attempt < 2; attempt++) {
        await device
          .post(`${API}/auth/login`)
          .send({ email: customer.email, password: TEST_PASSWORD })
          .expect(200);
      }
      expect((await cartOf(device)).itemCount).toBe(3);
    });

    it('never shows or hands over a cart to someone who is not its owner (shared device)', async () => {
      const alice = await createUser(ctx.prisma, 'CUSTOMER', 'alice@example.com');
      const bob = await createUser(ctx.prisma, 'CUSTOMER', 'bob@example.com');
      const product = await createProduct(ctx.prisma, { categoryId });

      const device = await signIn(alice.email);
      await device
        .post(`${API}/cart/items`)
        .send({ variantId: product.variants[0]!.id, quantity: 2 })
        .expect(201);
      // Alice's session ends but the cart cookie stays (expired session, closed tab...).
      await ctx.prisma.session.deleteMany({ where: { userId: alice.id } });

      // The next person on the device sees an empty cart...
      expect((await cartOf(device)).itemCount).toBe(0);
      // ...and signing in as Bob does not take Alice's cart.
      await device
        .post(`${API}/auth/login`)
        .send({ email: bob.email, password: TEST_PASSWORD })
        .expect(200);
      expect((await cartOf(device)).itemCount).toBe(0);
      expect(await ctx.prisma.cart.count({ where: { userId: alice.id } })).toBe(1);
      expect(await ctx.prisma.cart.count({ where: { userId: bob.id } })).toBe(0);

      // Alice gets her cart back when she signs in again, on any device.
      const later = await signIn(alice.email);
      expect((await cartOf(later)).itemCount).toBe(2);
    });

    it('clears a dead session cookie so the browser stops presenting it', async () => {
      const customer = await createUser(ctx.prisma);
      const browser = await signIn(customer.email);
      await ctx.prisma.session.deleteMany({ where: { userId: customer.id } });
      const response = await browser.get(`${API}/auth/me`).expect(401);
      expect((response.headers['set-cookie'] as unknown as string[]).join(';')).toMatch(
        /teran_session=;/,
      );
    });

    it('cannot modify another visitor’s cart line by id', async () => {
      const product = await createProduct(ctx.prisma, { categoryId });
      const owner = agent();
      const cart = cartSchema.parse(
        (
          await owner
            .post(`${API}/cart/items`)
            .send({ variantId: product.variants[0]!.id, quantity: 1 })
            .expect(201)
        ).body,
      );
      const customer = await createUser(ctx.prisma);
      const intruder = await signIn(customer.email);
      await intruder
        .post(`${API}/cart/items`)
        .send({ variantId: product.variants[0]!.id })
        .expect(201);
      await intruder
        .patch(`${API}/cart/items/${cart.lines[0]!.id}`)
        .send({ quantity: 5 })
        .expect(404);
      expect((await cartOf(owner)).lines[0]!.quantity).toBe(1);
    });
  });

  describe('account area', () => {
    it('requires a session for every account route', async () => {
      const anonymous = agent();
      for (const path of ['summary', 'orders', 'purchases', 'addresses', 'sessions', 'profile']) {
        await anonymous.get(`${API}/account/${path}`).expect(401);
      }
    });

    it('manages the address book: default, ownership and limits', async () => {
      const alice = await createUser(ctx.prisma, 'CUSTOMER', 'alice@example.com');
      const bob = await createUser(ctx.prisma, 'CUSTOMER', 'bob@example.com');
      const a = await signIn(alice.email);
      const b = await signIn(bob.email);

      const home = addressSchema.parse(
        (await a.post(`${API}/account/addresses`).send(address()).expect(201)).body,
      );
      // The first address becomes the default; the phone is normalised.
      expect(home).toMatchObject({ isDefault: true, phone: '+998901234567' });
      const office = addressSchema.parse(
        (
          await a
            .post(`${API}/account/addresses`)
            .send(address({ label: 'Ofis', addressLine: 'Chilonzor, 5-uy', isDefault: true }))
            .expect(201)
        ).body,
      );
      expect(office.isDefault).toBe(true);
      let list = (await a.get(`${API}/account/addresses`).expect(200)).body as {
        id: string;
        isDefault: boolean;
      }[];
      expect(list.filter((entry) => entry.isDefault).map((entry) => entry.id)).toEqual([office.id]);

      // Bob can neither see, change, default nor delete Alice's address.
      expect((await b.get(`${API}/account/addresses`).expect(200)).body).toEqual([]);
      await b
        .put(`${API}/account/addresses/${home.id}`)
        .send(address({ city: 'Samarqand' }))
        .expect(404);
      await b.post(`${API}/account/addresses/${home.id}/default`).expect(404);
      await b.delete(`${API}/account/addresses/${home.id}`).expect(404);

      // Validation: Uzbek phone and region codes.
      const invalid = await a
        .post(`${API}/account/addresses`)
        .send(address({ phone: '12345', regionCode: 'XX' }))
        .expect(400);
      expect(invalid.body.code).toBe('VALIDATION_FAILED');

      // Deleting the default makes the newest remaining address the default.
      list = (await a.delete(`${API}/account/addresses/${office.id}`).expect(200)).body as {
        id: string;
        isDefault: boolean;
      }[];
      expect(list).toEqual([expect.objectContaining({ id: home.id, isDefault: true })]);

      for (let index = 0; index < 9; index++) {
        await a
          .post(`${API}/account/addresses`)
          .send(address({ addressLine: `Address ${index}` }))
          .expect(201);
      }
      await a
        .post(`${API}/account/addresses`)
        .send(address({ addressLine: 'One too many' }))
        .expect(409);
    });

    it('shows truthful account data and keeps every customer to their own orders', async () => {
      const alice = await createUser(ctx.prisma, 'CUSTOMER', 'alice@example.com');
      const bob = await createUser(ctx.prisma, 'CUSTOMER', 'bob@example.com');
      const product = await createProduct(ctx.prisma, {
        categoryId,
        variants: [{ sku: 'TEA-1', price: '30000', stock: 10 }],
      });
      const a = await signIn(alice.email);
      const b = await signIn(bob.email);

      const empty = accountSummarySchema.parse(
        (await a.get(`${API}/account/summary`).expect(200)).body,
      );
      expect(empty).toMatchObject({ ordersCount: 0, activeOrdersCount: 0, addressesCount: 0 });
      expect(empty.recentOrders).toEqual([]);

      await a
        .post(`${API}/cart/items`)
        .send({ variantId: product.variants[0]!.id, quantity: 2 })
        .expect(201);
      const placed = placedOrderSchema.parse(
        (
          await a
            .post(`${API}/checkout/orders`)
            .send({
              idempotencyKey: randomUUID(),
              locale: 'uz',
              customer: { name: 'Alice', phone: '+998901234567' },
              delivery: {
                methodCode: 'courier',
                regionCode: 'UZ-TK',
                city: 'Toshkent',
                addressLine: 'Mirobod, 3-uy',
              },
              paymentMethod: 'CASH_ON_DELIVERY',
              saveAddress: true,
              acceptTerms: true,
            })
            .expect(201)
        ).body,
      );
      const number = placed.order.number;
      expect(placed.payment).toBeNull();

      const summary = accountSummarySchema.parse(
        (await a.get(`${API}/account/summary`).expect(200)).body,
      );
      expect(summary).toMatchObject({ ordersCount: 1, activeOrdersCount: 1, addressesCount: 1 });
      expect(summary.recentOrders[0]).toMatchObject({
        number,
        itemCount: 2,
        needsAttention: false,
      });

      const orders = (await a.get(`${API}/account/orders?status=active`).expect(200)).body as {
        items: { number: string }[];
        total: number;
      };
      expect(orders.items.map((order) => order.number)).toEqual([number]);
      expect((await a.get(`${API}/account/orders?status=cancelled`).expect(200)).body.total).toBe(
        0,
      );
      await a.get(`${API}/account/orders?status=everything`).expect(400);

      // Bob: no access to Alice's order by number, nor through reorder.
      await b.get(`${API}/account/orders/${number}`).expect(404);
      await b.post(`${API}/account/orders/${number}/reorder`).expect(404);
      expect((await b.get(`${API}/account/orders`).expect(200)).body.total).toBe(0);
      expect((await b.get(`${API}/account/purchases`).expect(200)).body).toEqual([]);

      const purchases = (await a.get(`${API}/account/purchases`).expect(200)).body as unknown[];
      expect(purchases.map((entry) => purchasedProductSchema.parse(entry))).toEqual([
        expect.objectContaining({
          sku: 'TEA-1',
          totalQuantity: 2,
          ordersCount: 1,
          available: true,
        }),
      ]);

      // Customer-facing order data never includes staff notes or internal ids.
      const detail = (await a.get(`${API}/account/orders/${number}`).expect(200)).body as Record<
        string,
        unknown
      >;
      expect(detail).not.toHaveProperty('id');
      expect(JSON.stringify(detail)).not.toContain('Order placed');
      expect(detail.events).toEqual([{ status: 'PENDING', at: expect.any(String) }]);
    });

    it('reorders at today’s prices and stock, without placing an order', async () => {
      const customer = await createUser(ctx.prisma);
      const kept = await createProduct(ctx.prisma, {
        categoryId,
        variants: [{ sku: 'KEPT', price: '20000', stock: 10 }],
      });
      const scarce = await createProduct(ctx.prisma, {
        categoryId,
        variants: [{ sku: 'SCARCE', price: '20000', stock: 10 }],
      });
      const retired = await createProduct(ctx.prisma, {
        categoryId,
        variants: [{ sku: 'RETIRED', price: '20000', stock: 10 }],
      });
      const browser = await signIn(customer.email);
      for (const [product, quantity] of [
        [kept, 2],
        [scarce, 3],
        [retired, 1],
      ] as const) {
        await browser
          .post(`${API}/cart/items`)
          .send({ variantId: product.variants[0]!.id, quantity })
          .expect(201);
      }
      const placed = placedOrderSchema.parse(
        (
          await browser
            .post(`${API}/checkout/orders`)
            .send({
              idempotencyKey: randomUUID(),
              locale: 'uz',
              customer: { name: 'Test', phone: '+998901234567' },
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

      // Since then: a price rise, little stock left, and a product taken off sale.
      await ctx.prisma.productVariant.update({
        where: { id: kept.variants[0]!.id },
        data: { price: '25000' },
      });
      await ctx.prisma.productVariant.update({
        where: { id: scarce.variants[0]!.id },
        data: { stockQuantity: 1 },
      });
      await ctx.prisma.product.update({ where: { id: retired.id }, data: { status: 'ARCHIVED' } });
      const ordersBefore = await ctx.prisma.order.count();

      const result = reorderResultSchema.parse(
        (await browser.post(`${API}/account/orders/${placed.order.number}/reorder`).expect(200))
          .body,
      );
      expect(result.added).toEqual(['KEPT', 'SCARCE']);
      expect(result.skipped).toEqual([
        { sku: 'SCARCE', reason: 'limited' },
        { sku: 'RETIRED', reason: 'unavailable' },
      ]);
      expect(result.cart.subtotal).toBe('70000.00'); // 2 × 25 000 + 1 × 20 000
      expect(await ctx.prisma.order.count()).toBe(ordersBefore);

      // The order itself still shows what was paid then.
      const order = (await browser.get(`${API}/account/orders/${placed.order.number}`).expect(200))
        .body as {
        items: { sku: string; unitPrice: string }[];
      };
      expect(order.items.find((item) => item.sku === 'KEPT')?.unitPrice).toBe('20000.00');
    });

    it('re-authenticates before changing the e-mail and signs out other devices', async () => {
      const customer = await createUser(ctx.prisma, 'CUSTOMER', 'old@example.com');
      await createUser(ctx.prisma, 'CUSTOMER', 'taken@example.com');
      const phone = await signIn(customer.email);
      const laptop = await signIn(customer.email);

      const sessions = (await laptop.get(`${API}/account/sessions`).expect(200)).body as unknown[];
      expect(
        sessions.map((entry) => accountSessionSchema.parse(entry)).filter((entry) => entry.current),
      ).toHaveLength(1);
      expect(JSON.stringify(sessions)).not.toMatch(/"id"|tokenHash|ipAddress/);

      const wrong = await laptop
        .post(`${API}/account/email`)
        .send({ newEmail: 'new@example.com', currentPassword: 'not-the-password' })
        .expect(400);
      expect(wrong.body.code).toBe('INVALID_CREDENTIALS');
      const taken = await laptop
        .post(`${API}/account/email`)
        .send({ newEmail: 'taken@example.com', currentPassword: TEST_PASSWORD })
        .expect(409);
      expect(taken.body.code).toBe('EMAIL_TAKEN');

      await laptop
        .post(`${API}/account/email`)
        .send({ newEmail: 'new@example.com', currentPassword: TEST_PASSWORD })
        .expect(200);
      await laptop.get(`${API}/auth/me`).expect(200);
      await phone.get(`${API}/auth/me`).expect(401);
      await agent()
        .post(`${API}/auth/login`)
        .send({ email: 'new@example.com', password: TEST_PASSWORD })
        .expect(200);
    });

    it('signs out every other device on request', async () => {
      const customer = await createUser(ctx.prisma);
      const first = await signIn(customer.email);
      const second = await signIn(customer.email);
      const response = await second.post(`${API}/account/sessions/revoke-others`).expect(200);
      expect(response.body).toEqual({ revoked: 1 });
      await first.get(`${API}/auth/me`).expect(401);
      await second.get(`${API}/auth/me`).expect(200);
    });
  });
});
