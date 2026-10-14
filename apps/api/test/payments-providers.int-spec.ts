import { createHash, randomUUID } from 'node:crypto';
import request from 'supertest';
import { checkoutOptionsSchema, orderSchema, placedOrderSchema } from '@teran/contracts';
import { PaymentsService } from '../src/payments/payments.service.js';
import { createTestApp, type TestApp } from './helpers/app.js';
import {
  createCategory,
  createDeliveryMethod,
  createProduct,
  resetDatabase,
} from './helpers/fixtures.js';

// Live mode with TEST-ONLY credentials: they exist only in this test process, never in any
// configuration file, and no request leaves the machine (provider calls are simulated below,
// following the documented protocols).
const PAYME_KEY = 'test-only-payme-cashbox-key-0001';
const CLICK_SECRET = 'test-only-click-secret-0001';
vi.hoisted(() => {
  Object.assign(process.env, {
    PAYMENT_PROVIDER_MODE: 'live',
    PAYMENT_METHODS_ENABLED: 'CASH_ON_DELIVERY,CLICK,PAYME,CARD',
    PAYME_MERCHANT_ID: 'testmerchant00000000000a',
    PAYME_KEY: 'test-only-payme-cashbox-key-0001',
    // Requests in tests come from 127.0.0.1, not from Payme's address range.
    PAYME_CHECK_IP: 'false',
    CLICK_SERVICE_ID: '12345',
    CLICK_MERCHANT_ID: '67890',
    CLICK_SECRET_KEY: 'test-only-click-secret-0001',
  });
});

const API = '/api/v1';

function checkoutBody(paymentMethod: string) {
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
    paymentMethod,
    acceptTerms: true,
  };
}

describe('payment providers (live mode, simulated provider calls)', () => {
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
      variants: [{ price: '60000', stock: 10 }],
    });
    variantId = product.variants[0]!.id;
  });

  const agent = () => request.agent(ctx.app.getHttpServer());

  async function placeOrder(method: 'PAYME' | 'CLICK') {
    const browser = agent();
    await browser.post(`${API}/cart/items`).send({ variantId, quantity: 1 }).expect(201);
    return placedOrderSchema.parse(
      (await browser.post(`${API}/checkout/orders`).send(checkoutBody(method)).expect(201)).body,
    );
  }

  async function orderView(placed: { order: { number: string }; accessToken: string }) {
    return orderSchema.parse(
      (
        await agent()
          .get(
            `${API}/orders/${placed.order.number}?token=${encodeURIComponent(placed.accessToken)}`,
          )
          .expect(200)
      ).body,
    );
  }

  it('offers Click and Payme as live and keeps cards unavailable without a card gateway', async () => {
    const options = checkoutOptionsSchema.parse(
      (await agent().get(`${API}/checkout/options`).expect(200)).body,
    );
    expect(options.paymentOptions).toEqual([
      { method: 'CASH_ON_DELIVERY', availability: 'live' },
      { method: 'CLICK', availability: 'live' },
      { method: 'PAYME', availability: 'live' },
      { method: 'CARD', availability: 'unavailable' },
    ]);
    const browser = agent();
    await browser.post(`${API}/cart/items`).send({ variantId, quantity: 1 }).expect(201);
    const refused = await browser
      .post(`${API}/checkout/orders`)
      .send(checkoutBody('CARD'))
      .expect(422);
    expect(refused.body.code).toBe('PAYMENT_METHOD_UNAVAILABLE');
    expect(await ctx.prisma.order.count()).toBe(0);
  });

  describe('Payme Merchant API', () => {
    const auth = `Basic ${Buffer.from(`Paycom:${PAYME_KEY}`).toString('base64')}`;
    let rpcId = 0;
    async function rpc(method: string, params: Record<string, unknown>, authorization = auth) {
      const response = await agent()
        .post(`${API}/payments/payme`)
        .set('Authorization', authorization)
        .set('Content-Type', 'text/json; charset=UTF-8')
        .send(JSON.stringify({ id: ++rpcId, method, params }))
        .expect(200);
      return response.body as {
        id: number;
        result?: Record<string, unknown>;
        error?: { code: number; message: Record<string, string>; data?: string };
      };
    }
    const tiyin = (placed: { order: { total: string } }) =>
      Math.round(Number(placed.order.total) * 100);

    it('sends the customer to Payme checkout with the order, amount in tiyin and return link', async () => {
      const placed = await placeOrder('PAYME');
      const url = placed.payment!.redirectUrl!;
      expect(url.startsWith('https://checkout.paycom.uz/')).toBe(true);
      const params = Buffer.from(url.split('/').at(-1)!, 'base64').toString();
      expect(params).toMatch(
        new RegExp(
          `^m=testmerchant00000000000a;ac\\.order_id=${placed.order.number};a=8500000;l=uz;c=http://localhost:3000/payments/return/[A-Za-z0-9_-]+$`,
        ),
      );
    });

    it('rejects calls without the cashbox key and malformed requests', async () => {
      expect((await rpc('CheckTransaction', { id: 'x' }, 'Basic bm9wZTpub3Bl')).error?.code).toBe(
        -32504,
      );
      const unauthenticated = await agent()
        .post(`${API}/payments/payme`)
        .set('Content-Type', 'application/json')
        .send({ id: 1, method: 'CheckTransaction', params: { id: 'x' } })
        .expect(200);
      expect(unauthenticated.body.error.code).toBe(-32504);
      const unparsable = await agent()
        .post(`${API}/payments/payme`)
        .set('Authorization', auth)
        .set('Content-Type', 'text/json')
        .send('{"id": 1, "method": ')
        .expect(200);
      expect(unparsable.body.error.code).toBe(-32700);
      expect((await rpc('ChangeEverything', {})).error).toMatchObject({
        code: -32601,
        data: 'ChangeEverything',
      });
      // Fiscal receipts are not implemented, so nothing pretends to store them.
      expect(
        (await rpc('SetFiscalData', { id: 'x', type: 'PERFORM', fiscal_data: {} })).error?.code,
      ).toBe(-32601);
    });

    it('validates the order and the amount before a transaction exists', async () => {
      const placed = await placeOrder('PAYME');
      const unknown = await rpc('CheckPerformTransaction', {
        amount: tiyin(placed),
        account: { order_id: 'TRN-ZZZZZZZZ' },
      });
      expect(unknown.error).toMatchObject({ code: -31050, data: 'order_id' });
      expect(Object.keys(unknown.error!.message).sort()).toEqual(['en', 'ru', 'uz']);
      const wrongAmount = await rpc('CheckPerformTransaction', {
        amount: tiyin(placed) - 100,
        account: { order_id: placed.order.number },
      });
      expect(wrongAmount.error?.code).toBe(-31001);
      const ok = await rpc('CheckPerformTransaction', {
        amount: tiyin(placed),
        account: { order_id: placed.order.number },
      });
      expect(ok.result).toEqual({ allow: true });

      // An order placed for Click cannot be paid through Payme.
      const click = await placeOrder('CLICK');
      expect(
        (
          await rpc('CheckPerformTransaction', {
            amount: tiyin(click),
            account: { order_id: click.order.number },
          })
        ).error?.code,
      ).toBe(-31051);
    });

    it('creates, performs and refunds a transaction, answering repeated calls identically', async () => {
      const placed = await placeOrder('PAYME');
      const paymeId = '5e730e8e0b852a417aa49ceb';
      const create = {
        id: paymeId,
        time: Date.now(),
        amount: tiyin(placed),
        account: { order_id: placed.order.number },
      };
      const created = await rpc('CreateTransaction', create);
      expect(created.result).toMatchObject({ state: 1 });
      expect(await rpc('CreateTransaction', create)).toMatchObject({ result: created.result });
      expect((await orderView(placed)).paymentStatus).toBe('PROCESSING');

      // A second Payme transaction for the same order while the first is open.
      const second = await rpc('CreateTransaction', { ...create, id: '5e730e8e0b852a417aa49cec' });
      expect(second.error?.code).toBe(-31008);

      const performed = await rpc('PerformTransaction', { id: paymeId });
      expect(performed.result).toMatchObject({
        transaction: created.result!.transaction,
        state: 2,
      });
      expect(await rpc('PerformTransaction', { id: paymeId })).toMatchObject({
        result: performed.result,
      });
      let order = await orderView(placed);
      expect(order).toMatchObject({ paymentStatus: 'PAID', awaitingPayment: false });
      expect(order.payments[0]).toMatchObject({ method: 'PAYME', status: 'PAID', demo: false });

      const checked = await rpc('CheckTransaction', { id: paymeId });
      expect(checked.result).toMatchObject({
        state: 2,
        reason: null,
        cancel_time: 0,
        perform_time: performed.result!.perform_time,
      });

      // A refund made in the Payme cabinet arrives as CancelTransaction on the performed transaction.
      const refunded = await rpc('CancelTransaction', { id: paymeId, reason: 5 });
      expect(refunded.result).toMatchObject({ state: -2 });
      expect(await rpc('CancelTransaction', { id: paymeId, reason: 5 })).toMatchObject({
        result: refunded.result,
      });
      order = await orderView(placed);
      expect(order.paymentStatus).toBe('REFUNDED');

      const statement = await rpc('GetStatement', {
        from: create.time - 1000,
        to: create.time + 1000,
      });
      expect(statement.result?.transactions).toEqual([
        expect.objectContaining({
          id: paymeId,
          amount: tiyin(placed),
          account: { order_id: placed.order.number },
          state: -2,
          reason: 5,
        }),
      ]);
    });

    it('cancels an unperformed transaction and lets the customer try again', async () => {
      const placed = await placeOrder('PAYME');
      const base = {
        time: Date.now(),
        amount: tiyin(placed),
        account: { order_id: placed.order.number },
      };
      await rpc('CreateTransaction', { ...base, id: 'aaaaaaaaaaaaaaaaaaaaaaa1' });
      const cancelled = await rpc('CancelTransaction', {
        id: 'aaaaaaaaaaaaaaaaaaaaaaa1',
        reason: 3,
      });
      expect(cancelled.result).toMatchObject({ state: -1 });
      expect(
        (await rpc('PerformTransaction', { id: 'aaaaaaaaaaaaaaaaaaaaaaa1' })).error?.code,
      ).toBe(-31008);
      expect(await orderView(placed)).toMatchObject({
        paymentStatus: 'CANCELLED',
        awaitingPayment: true,
      });

      // A new transaction for the same order is accepted and can be paid.
      await rpc('CreateTransaction', { ...base, id: 'aaaaaaaaaaaaaaaaaaaaaaa2' });
      expect(
        (await rpc('PerformTransaction', { id: 'aaaaaaaaaaaaaaaaaaaaaaa2' })).result?.state,
      ).toBe(2);
      const order = await orderView(placed);
      expect(order.payments.map((payment) => payment.status)).toEqual(['CANCELLED', 'PAID']);
      expect(await ctx.prisma.payment.count({ where: { status: 'PAID' } })).toBe(1);
    });

    it('refuses to perform a transaction for an order whose payment window has ended', async () => {
      const placed = await placeOrder('PAYME');
      await rpc('CreateTransaction', {
        id: 'bbbbbbbbbbbbbbbbbbbbbbb1',
        time: Date.now(),
        amount: tiyin(placed),
        account: { order_id: placed.order.number },
      });
      await ctx.prisma.payment.updateMany({
        data: { expiresAt: new Date(Date.now() - 60 * 60_000) },
      });
      await ctx.app.get(PaymentsService).expireOverdue();

      expect(
        (await rpc('PerformTransaction', { id: 'bbbbbbbbbbbbbbbbbbbbbbb1' })).error?.code,
      ).toBe(-31008);
      expect(
        (await rpc('CheckTransaction', { id: 'bbbbbbbbbbbbbbbbbbbbbbb1' })).result,
      ).toMatchObject({
        state: -1,
        reason: 4,
      });
      expect(await orderView(placed)).toMatchObject({
        status: 'CANCELLED',
        paymentStatus: 'EXPIRED',
      });
    });

    it('reports unknown transactions', async () => {
      for (const method of ['PerformTransaction', 'CheckTransaction']) {
        expect((await rpc(method, { id: 'cccccccccccccccccccccccc' })).error?.code).toBe(-31003);
      }
      expect(
        (await rpc('CancelTransaction', { id: 'cccccccccccccccccccccccc', reason: 1 })).error?.code,
      ).toBe(-31003);
    });
  });

  describe('Click SHOP API', () => {
    let clickTransId = 2_100_000_000;
    const signTime = '2026-10-14 12:00:00';
    const md5 = (text: string) => createHash('md5').update(text).digest('hex');

    function prepareBody(
      orderNumber: string,
      amount: string,
      overrides: Record<string, string> = {},
    ) {
      const body: Record<string, string> = {
        click_trans_id: String(++clickTransId),
        service_id: '12345',
        click_paydoc_id: String(clickTransId + 1_000_000_000),
        merchant_trans_id: orderNumber,
        amount,
        action: '0',
        error: '0',
        error_note: 'Success',
        sign_time: signTime,
        ...overrides,
      };
      body.sign_string = md5(
        `${body.click_trans_id}${body.service_id}${CLICK_SECRET}${body.merchant_trans_id}${body.amount}${body.action}${body.sign_time}`,
      );
      return body;
    }

    function completeBody(
      prepared: Record<string, string>,
      prepareId: number,
      overrides: Record<string, string> = {},
    ) {
      const body: Record<string, string> = {
        ...prepared,
        action: '1',
        merchant_prepare_id: String(prepareId),
        ...overrides,
      };
      body.sign_string = md5(
        `${body.click_trans_id}${body.service_id}${CLICK_SECRET}${body.merchant_trans_id}${body.merchant_prepare_id}${body.amount}${body.action}${body.sign_time}`,
      );
      return body;
    }

    async function post(path: 'prepare' | 'complete', body: Record<string, string>) {
      const response = await agent()
        .post(`${API}/payments/click/${path}`)
        .type('form')
        .send(body)
        .expect(200);
      return response.body as {
        error: number;
        error_note: string;
        merchant_prepare_id?: number;
        merchant_confirm_id?: number;
      };
    }

    it('sends the customer to Click with the order number and amount', async () => {
      const placed = await placeOrder('CLICK');
      const url = new URL(placed.payment!.redirectUrl!);
      expect(url.origin + url.pathname).toBe('https://my.click.uz/services/pay');
      expect(url.searchParams.get('transaction_param')).toBe(placed.order.number);
      expect(url.searchParams.get('amount')).toBe('85000.00');
      expect(url.searchParams.get('return_url')).toMatch(
        /^http:\/\/localhost:3000\/payments\/return\//,
      );
    });

    it('rejects bad signatures, unknown orders, wrong amounts and wrong actions', async () => {
      const placed = await placeOrder('CLICK');
      const good = prepareBody(placed.order.number, '85000.00');
      expect((await post('prepare', { ...good, sign_string: md5('forged') })).error).toBe(-1);
      expect((await post('prepare', { click_trans_id: '1' })).error).toBe(-8);
      expect((await post('prepare', prepareBody('TRN-ZZZZZZZZ', '85000.00'))).error).toBe(-5);
      expect((await post('prepare', prepareBody(placed.order.number, '84000.00'))).error).toBe(-2);
      expect(
        (await post('prepare', prepareBody(placed.order.number, '85000.00', { action: '1' })))
          .error,
      ).toBe(-3);
      expect((await orderView(placed)).paymentStatus).toBe('REQUIRES_ACTION');
    });

    it('prepares and completes a payment once, answering repeats as Click documents', async () => {
      const placed = await placeOrder('CLICK');
      const prepare = prepareBody(placed.order.number, '85000.00');
      const prepared = await post('prepare', prepare);
      expect(prepared).toMatchObject({ error: 0, error_note: 'Success' });
      const prepareId = prepared.merchant_prepare_id!;
      expect(await post('prepare', prepare)).toMatchObject({
        error: 0,
        merchant_prepare_id: prepareId,
      });
      expect((await orderView(placed)).paymentStatus).toBe('PROCESSING');

      expect((await post('complete', completeBody(prepare, prepareId + 999))).error).toBe(-6);
      const complete = completeBody(prepare, prepareId);
      expect(await post('complete', complete)).toMatchObject({
        error: 0,
        merchant_confirm_id: prepareId,
      });
      expect(await orderView(placed)).toMatchObject({
        paymentStatus: 'PAID',
        awaitingPayment: false,
      });
      expect((await post('complete', complete)).error).toBe(-4);
      // A new Prepare for a paid order.
      expect((await post('prepare', prepareBody(placed.order.number, '85000.00'))).error).toBe(-4);
      expect(await ctx.prisma.payment.count({ where: { status: 'PAID' } })).toBe(1);
    });

    it('records a payment Click reports as failed and never completes it', async () => {
      const placed = await placeOrder('CLICK');
      const prepare = prepareBody(placed.order.number, '85000.00');
      const prepareId = (await post('prepare', prepare)).merchant_prepare_id!;
      const failed = completeBody(prepare, prepareId, {
        error: '-5017',
        error_note: 'Insufficient funds',
      });
      expect((await post('complete', failed)).error).toBe(-9);
      expect((await post('complete', completeBody(prepare, prepareId))).error).toBe(-9);
      expect(await orderView(placed)).toMatchObject({
        paymentStatus: 'FAILED',
        awaitingPayment: true,
      });
    });

    it('cancels a completion that arrives after the payment window ended', async () => {
      const placed = await placeOrder('CLICK');
      const prepare = prepareBody(placed.order.number, '85000.00');
      const prepareId = (await post('prepare', prepare)).merchant_prepare_id!;
      await ctx.prisma.payment.updateMany({
        data: { expiresAt: new Date(Date.now() - 60 * 60_000) },
      });
      await ctx.app.get(PaymentsService).expireOverdue();
      expect((await post('complete', completeBody(prepare, prepareId))).error).toBe(-9);
      expect(await orderView(placed)).toMatchObject({
        status: 'CANCELLED',
        paymentStatus: 'EXPIRED',
      });
    });
  });
});
