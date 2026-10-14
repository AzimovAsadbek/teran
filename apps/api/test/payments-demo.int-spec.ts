import { randomUUID } from 'node:crypto';
import request from 'supertest';
import {
  checkoutOptionsSchema,
  demoPaymentSchema,
  orderSchema,
  paymentReturnSchema,
  paymentSessionSchema,
  placedOrderSchema,
} from '@teran/contracts';
import { PaymentsService, PROCESSING_GRACE_MS } from '../src/payments/payments.service.js';
import { createTestApp, type TestApp } from './helpers/app.js';
import {
  TEST_PASSWORD,
  createCategory,
  createDeliveryMethod,
  createProduct,
  createUser,
  resetDatabase,
} from './helpers/fixtures.js';

// This suite runs the API in payment demo mode (simulated provider, every method enabled).
vi.hoisted(() => {
  Object.assign(process.env, {
    PAYMENT_PROVIDER_MODE: 'demo',
    PAYMENT_METHODS_ENABLED: 'CASH_ON_DELIVERY,CLICK,PAYME,CARD',
  });
});

const API = '/api/v1';

function checkoutBody(overrides: Record<string, unknown> = {}) {
  return {
    idempotencyKey: randomUUID(),
    locale: 'uz',
    customer: { name: 'Dilnoza Karimova', phone: '+998 90 123 45 67' },
    delivery: {
      methodCode: 'courier',
      regionCode: 'UZ-TK',
      city: 'Toshkent',
      addressLine: '12-uy',
    },
    paymentMethod: 'CLICK',
    acceptTerms: true,
    ...overrides,
  };
}

/** The secret from a demo payment page path ("/payments/demo/<token>"). */
function tokenOf(redirectUrl: string | null): string {
  const match = /\/payments\/demo\/([A-Za-z0-9_-]+)$/.exec(redirectUrl ?? '');
  if (!match) throw new Error(`Not a demo payment link: ${redirectUrl}`);
  return match[1]!;
}

describe('payments in demo mode', () => {
  let ctx: TestApp;
  let payments: PaymentsService;
  let variantId: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    payments = ctx.app.get(PaymentsService);
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

  async function placeOrder(body: Record<string, unknown> = {}, browser = agent()) {
    await browser.post(`${API}/cart/items`).send({ variantId, quantity: 2 }).expect(201);
    const response = await browser
      .post(`${API}/checkout/orders`)
      .send(checkoutBody(body))
      .expect(201);
    return { browser, placed: placedOrderSchema.parse(response.body) };
  }

  async function guestOrder(number: string, token: string) {
    return orderSchema.parse(
      (
        await agent()
          .get(`${API}/orders/${number}?token=${encodeURIComponent(token)}`)
          .expect(200)
      ).body,
    );
  }

  async function demo(token: string, outcome: 'success' | 'failure' | 'cancel' | 'pending') {
    return demoPaymentSchema.parse(
      (await agent().post(`${API}/payments/demo`).send({ token, outcome }).expect(200)).body,
    );
  }

  it('offers every enabled method as a clearly simulated demo option', async () => {
    const options = checkoutOptionsSchema.parse(
      (await agent().get(`${API}/checkout/options`).expect(200)).body,
    );
    expect(options.paymentOptions).toEqual([
      { method: 'CASH_ON_DELIVERY', availability: 'live' },
      { method: 'CLICK', availability: 'demo' },
      { method: 'PAYME', availability: 'demo' },
      { method: 'CARD', availability: 'demo' },
    ]);
    expect(options.onlinePaymentWindowMinutes).toBe(30);
  });

  it('places an online order awaiting payment, reserves stock and sends to the demo page', async () => {
    const { placed } = await placeOrder();
    expect(placed.payment).toMatchObject({
      status: 'REQUIRES_ACTION',
      method: 'CLICK',
      demo: true,
    });
    expect(placed.order).toMatchObject({
      paymentStatus: 'REQUIRES_ACTION',
      awaitingPayment: true,
      total: '145000.00',
    });
    expect(placed.order.paymentDueAt).not.toBeNull();
    const variant = await ctx.prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    expect(variant.stockQuantity).toBe(3);

    const page = demoPaymentSchema.parse(
      (
        await agent()
          .get(`${API}/payments/demo?token=${tokenOf(placed.payment!.redirectUrl)}`)
          .expect(200)
      ).body,
    );
    expect(page).toMatchObject({
      orderNumber: placed.order.number,
      amount: '145000.00',
      currency: 'UZS',
      status: 'REQUIRES_ACTION',
    });
  });

  it('answers a repeated checkout with the same order and payment, never a second one', async () => {
    const browser = agent();
    await browser.post(`${API}/cart/items`).send({ variantId, quantity: 1 }).expect(201);
    const body = checkoutBody();
    const first = placedOrderSchema.parse(
      (await browser.post(`${API}/checkout/orders`).send(body).expect(201)).body,
    );
    const again = placedOrderSchema.parse(
      (await browser.post(`${API}/checkout/orders`).send(body).expect(201)).body,
    );
    expect(again.order.number).toBe(first.order.number);
    expect(again.payment?.redirectUrl).toBe(first.payment?.redirectUrl);
    expect(await ctx.prisma.payment.count()).toBe(1);
  });

  it('does not mark anything paid when the customer only returns from the payment page', async () => {
    const { placed } = await placeOrder();
    const token = tokenOf(placed.payment!.redirectUrl);
    const landing = paymentReturnSchema.parse(
      (await agent().get(`${API}/payments/return?token=${token}`).expect(200)).body,
    );
    expect(landing).toMatchObject({
      orderNumber: placed.order.number,
      paymentStatus: 'REQUIRES_ACTION',
      awaitingPayment: true,
    });
    // The guest return link leads to the order page with the order's own secret.
    expect(landing.orderPath).toBe(
      `/orders/${placed.order.number}?token=${encodeURIComponent(placed.accessToken)}`,
    );
    expect((await guestOrder(placed.order.number, placed.accessToken)).paymentStatus).toBe(
      'REQUIRES_ACTION',
    );
  });

  it('records a failed payment, lets the customer retry with another method, then pays', async () => {
    const { placed } = await placeOrder();
    const failed = await demo(tokenOf(placed.payment!.redirectUrl), 'failure');
    expect(failed.status).toBe('FAILED');
    let order = await guestOrder(placed.order.number, placed.accessToken);
    expect(order).toMatchObject({
      paymentStatus: 'FAILED',
      awaitingPayment: true,
      status: 'PENDING',
    });

    // A failed payment never becomes paid by repeating the outcome.
    expect((await demo(tokenOf(placed.payment!.redirectUrl), 'success')).status).toBe('FAILED');

    const retry = paymentSessionSchema.parse(
      (
        await agent()
          .post(`${API}/orders/${placed.order.number}/payments`)
          .send({ method: 'PAYME', locale: 'ru', token: placed.accessToken })
          .expect(201)
      ).body,
    );
    expect(retry).toMatchObject({ method: 'PAYME', status: 'REQUIRES_ACTION', demo: true });
    expect(retry.redirectUrl).toMatch(/^\/ru\/payments\/demo\//);
    // Asking again while that attempt is waiting returns the same attempt.
    const same = paymentSessionSchema.parse(
      (
        await agent()
          .post(`${API}/orders/${placed.order.number}/payments`)
          .send({ method: 'PAYME', locale: 'ru', token: placed.accessToken })
          .expect(201)
      ).body,
    );
    expect(same.redirectUrl).toBe(retry.redirectUrl);

    expect((await demo(tokenOf(retry.redirectUrl), 'success')).status).toBe('PAID');
    order = await guestOrder(placed.order.number, placed.accessToken);
    expect(order).toMatchObject({
      paymentStatus: 'PAID',
      paymentMethod: 'PAYME',
      awaitingPayment: false,
    });
    expect(order.payments.map((payment) => [payment.method, payment.status, payment.demo])).toEqual(
      [
        ['CLICK', 'FAILED', true],
        ['PAYME', 'PAID', true],
      ],
    );

    // Paid: no further attempt can be started, and a second success changes nothing.
    await agent()
      .post(`${API}/orders/${placed.order.number}/payments`)
      .send({ method: 'CLICK', token: placed.accessToken })
      .expect(409);
    expect((await demo(tokenOf(retry.redirectUrl), 'success')).status).toBe('PAID');
    expect(await ctx.prisma.payment.count({ where: { status: 'PAID' } })).toBe(1);
  });

  it('applies the cancel and pending outcomes deterministically', async () => {
    const first = (await placeOrder()).placed;
    expect((await demo(tokenOf(first.payment!.redirectUrl), 'cancel')).status).toBe('CANCELLED');

    const second = (await placeOrder({}, agent())).placed;
    const token = tokenOf(second.payment!.redirectUrl);
    expect((await demo(token, 'pending')).status).toBe('PROCESSING');
    expect((await demo(token, 'pending')).status).toBe('PROCESSING');
    expect((await demo(token, 'success')).status).toBe('PAID');
  });

  it('lets only the order’s owner or link holder start a payment', async () => {
    const owner = await createUser(ctx.prisma, 'CUSTOMER', 'owner@example.com');
    const other = await createUser(ctx.prisma, 'CUSTOMER', 'other@example.com');
    const browser = agent();
    await browser
      .post(`${API}/auth/login`)
      .send({ email: owner.email, password: TEST_PASSWORD })
      .expect(200);
    const { placed } = await placeOrder({}, browser);

    const intruder = agent();
    await intruder
      .post(`${API}/auth/login`)
      .send({ email: other.email, password: TEST_PASSWORD })
      .expect(200);
    await intruder
      .post(`${API}/orders/${placed.order.number}/payments`)
      .send({ method: 'CLICK' })
      .expect(404);
    await agent()
      .post(`${API}/orders/${placed.order.number}/payments`)
      .send({ method: 'CLICK', token: 'x'.repeat(43) })
      .expect(404);
    await browser
      .post(`${API}/orders/${placed.order.number}/payments`)
      .send({ method: 'CARD' })
      .expect(201);

    // The return page of an account order points to the account's order page.
    const landing = paymentReturnSchema.parse(
      (
        await agent()
          .get(`${API}/payments/return?token=${tokenOf(placed.payment!.redirectUrl)}`)
          .expect(200)
      ).body,
    );
    expect(landing.orderPath).toBe(`/account/orders/${placed.order.number}`);
  });

  it('allows at most one open attempt per order in the database', async () => {
    const { placed } = await placeOrder();
    const order = await ctx.prisma.order.findUniqueOrThrow({
      where: { number: placed.order.number },
    });
    await expect(
      ctx.prisma.payment.create({
        data: {
          orderId: order.id,
          method: 'CLICK',
          provider: 'DEMO',
          status: 'REQUIRES_ACTION',
          amount: order.total,
        },
      }),
    ).rejects.toThrow();
    // Concurrent restarts: one attempt is open afterwards.
    await Promise.allSettled(
      ['CARD', 'PAYME', 'CARD'].map((method) =>
        agent()
          .post(`${API}/orders/${placed.order.number}/payments`)
          .send({ method, token: placed.accessToken }),
      ),
    );
    expect(
      await ctx.prisma.payment.count({
        where: { orderId: order.id, status: { in: ['PENDING', 'REQUIRES_ACTION', 'PROCESSING'] } },
      }),
    ).toBe(1);
  });

  it('expires an abandoned payment, cancels the order and returns the stock', async () => {
    const { placed } = await placeOrder();
    const order = await ctx.prisma.order.findUniqueOrThrow({
      where: { number: placed.order.number },
    });
    await ctx.prisma.payment.updateMany({
      where: { orderId: order.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    expect(await payments.expireOverdue()).toEqual({ expired: 1, cancelledOrders: 1 });
    const view = await guestOrder(placed.order.number, placed.accessToken);
    expect(view).toMatchObject({
      status: 'CANCELLED',
      paymentStatus: 'EXPIRED',
      awaitingPayment: false,
      cancelReason: 'payment_not_completed',
    });
    const variant = await ctx.prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    expect(variant.stockQuantity).toBe(5);
    expect(
      await ctx.prisma.inventoryMovement.count({
        where: { orderId: order.id, reason: 'ORDER_CANCELLED' },
      }),
    ).toBe(1);

    // Too late: the demo page and a new attempt are refused; running the job again changes nothing.
    await agent()
      .post(`${API}/payments/demo`)
      .send({ token: tokenOf(placed.payment!.redirectUrl), outcome: 'success' })
      .expect(200)
      .expect((response) => expect(response.body.status).toBe('EXPIRED'));
    await agent()
      .post(`${API}/orders/${placed.order.number}/payments`)
      .send({ method: 'CLICK', token: placed.accessToken })
      .expect(409);
    expect(await payments.expireOverdue()).toEqual({ expired: 0, cancelledOrders: 0 });
  });

  it('gives a payment that is being processed a grace period before expiring it', async () => {
    const { placed } = await placeOrder();
    await demo(tokenOf(placed.payment!.redirectUrl), 'pending');
    const order = await ctx.prisma.order.findUniqueOrThrow({
      where: { number: placed.order.number },
    });
    await ctx.prisma.payment.updateMany({
      where: { orderId: order.id },
      data: { expiresAt: new Date(Date.now() - PROCESSING_GRACE_MS / 2) },
    });
    expect(await payments.expireOverdue()).toEqual({ expired: 0, cancelledOrders: 0 });
    await ctx.prisma.payment.updateMany({
      where: { orderId: order.id },
      data: { expiresAt: new Date(Date.now() - PROCESSING_GRACE_MS - 1000) },
    });
    expect(await payments.expireOverdue()).toEqual({ expired: 1, cancelledOrders: 1 });
  });

  it('never processes real provider callbacks in demo mode', async () => {
    const payme = await agent()
      .post(`${API}/payments/payme`)
      .set('Content-Type', 'application/json')
      .send({ id: 1, method: 'CheckPerformTransaction', params: {} })
      .expect(200);
    expect(payme.body.error.code).toBe(-32504);
    const click = await agent()
      .post(`${API}/payments/click/prepare`)
      .type('form')
      .send({ click_trans_id: '1' })
      .expect(200);
    expect(click.body.error).toBe(-8);
  });

  it('shows staff every attempt, marked as demonstration, and records a refund', async () => {
    const { placed } = await placeOrder();
    await demo(tokenOf(placed.payment!.redirectUrl), 'success');
    const admin = await createUser(ctx.prisma, 'ADMIN', 'admin@example.com');
    const staff = agent();
    await staff
      .post(`${API}/auth/login`)
      .send({ email: admin.email, password: TEST_PASSWORD })
      .expect(200);

    const detail = (await staff.get(`${API}/admin/orders/${placed.order.number}`).expect(200))
      .body as {
      canRecordRefund: boolean;
      payments: {
        provider: string;
        status: string;
        events: { source: string; toStatus: string }[];
      }[];
    };
    expect(detail.canRecordRefund).toBe(true);
    expect(detail.payments).toHaveLength(1);
    expect(detail.payments[0]).toMatchObject({ provider: 'DEMO', status: 'PAID' });
    expect(detail.payments[0]!.events.map((event) => [event.source, event.toStatus])).toEqual([
      ['customer', 'REQUIRES_ACTION'],
      ['demo', 'PAID'],
    ]);

    const refunded = (
      await staff
        .post(`${API}/admin/orders/${placed.order.number}/refunds`)
        .send({ note: 'Customer changed their mind' })
        .expect(201)
    ).body as { paymentStatus: string; canRecordRefund: boolean };
    expect(refunded).toMatchObject({ paymentStatus: 'REFUNDED', canRecordRefund: false });
    expect((await guestOrder(placed.order.number, placed.accessToken)).paymentStatus).toBe(
      'REFUNDED',
    );

    // Customers cannot reach the staff action.
    const customer = await createUser(ctx.prisma);
    const shopper = agent();
    await shopper
      .post(`${API}/auth/login`)
      .send({ email: customer.email, password: TEST_PASSWORD })
      .expect(200);
    await shopper
      .post(`${API}/admin/orders/${placed.order.number}/refunds`)
      .send({ note: 'Please refund me' })
      .expect(403);
  });

  it('cancelling the order in the admin closes the open attempt and restocks', async () => {
    const { placed } = await placeOrder();
    const admin = await createUser(ctx.prisma, 'ADMIN', 'admin2@example.com');
    const staff = agent();
    await staff
      .post(`${API}/auth/login`)
      .send({ email: admin.email, password: TEST_PASSWORD })
      .expect(200);
    await staff
      .post(`${API}/admin/orders/${placed.order.number}/status`)
      .send({ status: 'CANCELLED', note: 'Internal: suspected duplicate' })
      .expect(201);
    const view = await guestOrder(placed.order.number, placed.accessToken);
    expect(view).toMatchObject({
      status: 'CANCELLED',
      paymentStatus: 'CANCELLED',
      cancelReason: 'store',
    });
    // The staff note stays internal.
    expect(JSON.stringify(view)).not.toContain('suspected duplicate');
    expect((await demo(tokenOf(placed.payment!.redirectUrl), 'success')).status).toBe('CANCELLED');
    const variant = await ctx.prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    expect(variant.stockQuantity).toBe(5);
  });
});
