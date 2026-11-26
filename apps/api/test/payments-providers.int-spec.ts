import { createHash, randomUUID } from 'node:crypto';
import request from 'supertest';
import {
  checkoutOptionsSchema,
  orderSchema,
  placedOrderSchema,
  type AdminProductDetail,
} from '@teran/contracts';
import { ClickFiscalService } from '../src/payments/providers/click-fiscal.service.js';
import { PaymentsService } from '../src/payments/payments.service.js';
import { createTestApp, signInShopper, type TestApp } from './helpers/app.js';
import {
  createCategory,
  createDeliveryMethod,
  createProduct,
  createUser,
  resetDatabase,
  TEST_PASSWORD,
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
    PAYME_FISCAL_MODE: 'items',
    CLICK_FISCAL_MODE: 'items',
    CLICK_MERCHANT_USER_ID: '10001',
    CLICK_COMMISSION_TIN: '123456789',
    CLICK_DELIVERY_MXIK: '00000000000000002',
    CLICK_DELIVERY_PACKAGE_CODE: '0002',
    CLICK_DELIVERY_VAT_PERCENT: '0',
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
    const category = await createCategory(ctx.prisma, 'tea');
    await createDeliveryMethod(ctx.prisma, { code: 'courier', price: '25000' });
    const product = await createProduct(ctx.prisma, {
      categoryId: category.id,
      variants: [{ price: '60000', stock: 10 }],
    });
    variantId = product.variants[0]!.id;
    await ctx.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        fiscalMxik: '00000000000000001',
        fiscalPackageCode: '0001',
        fiscalVatPercent: 12,
      },
    });
  });

  const agent = () => request.agent(ctx.app.getHttpServer());

  it('requires complete fiscal details before staff publish a product for itemized online sales', async () => {
    const category = await createCategory(ctx.prisma, 'teaware');
    const product = await createProduct(ctx.prisma, { categoryId: category.id });
    await ctx.prisma.productImage.create({
      data: {
        productId: product.id,
        storageKey: 'test-cup-picture',
        width: 320,
        height: 320,
        widths: [320],
      },
    });
    const operator = await createUser(ctx.prisma, 'MANAGER');
    const staff = agent();
    await staff
      .post(API + '/auth/login')
      .send({ email: operator.email, password: TEST_PASSWORD })
      .expect(200);
    const path = API + '/admin/products/' + product.id;
    const stored = (await staff.get(path).expect(200)).body as AdminProductDetail;
    const enable = { ...stored, saleMode: 'ONLINE' };
    const refused = await staff.put(path).send(enable).expect(422);
    expect(refused.body).toMatchObject({
      code: 'FISCAL_DATA_MISSING',
      details: { sku: stored.variants[0]!.sku, reason: 'missing_fiscal_fields' },
    });
    expect((await staff.get(path)).body.saleMode).toBe('CATEGORY');
    const fiscal = { mxik: '00000000000000003', packageCode: '0003', vatPercent: 0 };
    const variant = { ...stored.variants[0]!, fiscal };
    const tooLong = await staff
      .put(path)
      .send({
        ...enable,
        variants: [{ ...variant, fiscal: { ...fiscal, packageCode: '1'.repeat(21) } }],
      })
      .expect(422);
    expect(tooLong.body.details.reason).toBe('click_package_length');
    await staff
      .put(path)
      .send({ ...enable, variants: [variant] })
      .expect(200);
    expect(
      (await agent().get(API + '/catalog/products/' + product.slug)).body.onlineOrderable,
    ).toBe(true);
    await staff
      .put(path)
      .send({ ...stored, saleMode: 'CONTACT' })
      .expect(200);
    expect(
      (await agent().get(API + '/catalog/products/' + product.slug)).body.onlineOrderable,
    ).toBe(false);
  });

  async function placeOrder(method: 'PAYME' | 'CLICK', secondVariantId?: string) {
    const browser = await signInShopper(ctx);
    await browser.post(`${API}/cart/items`).send({ variantId, quantity: 1 }).expect(201);
    if (secondVariantId) {
      await browser
        .post(`${API}/cart/items`)
        .send({ variantId: secondVariantId, quantity: 2 })
        .expect(201);
    }
    return placedOrderSchema.parse(
      (await browser.post(`${API}/checkout/orders`).send(checkoutBody(method)).expect(201)).body,
    );
  }

  async function placeMixedOrder(method: 'PAYME' | 'CLICK') {
    const ceramics = await createCategory(ctx.prisma, 'ceramics');
    const cup = await createProduct(ctx.prisma, {
      categoryId: ceramics.id,
      name: 'Cup',
      saleMode: 'ONLINE',
      variants: [{ price: '32000', stock: 6 }],
    });
    const id = cup.variants[0]!.id;
    await ctx.prisma.productVariant.update({
      where: { id },
      data: {
        weightGrams: null,
        unitCount: 1,
        fiscalMxik: '00000000000000003',
        fiscalPackageCode: '0003',
        fiscalVatPercent: 0,
      },
    });
    const placed = await placeOrder(method, id);
    expect(placed.order.total).toBe('149000.00');
    // The receipt must still describe the actual sale after staff change the catalogue.
    await ctx.prisma.product.update({
      where: { id: cup.id },
      data: {
        saleMode: 'CONTACT',
        variants: {
          update: { where: { id }, data: { price: '90000', fiscalPackageCode: '0009' } },
        },
      },
    });
    return placed;
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

  it.each(['PAYME', 'CLICK'])(
    'rolls back stock and keeps the cart when %s fiscal data is missing',
    async (method) => {
      await ctx.prisma.productVariant.update({
        where: { id: variantId },
        data: { fiscalMxik: null, fiscalPackageCode: null, fiscalVatPercent: null },
      });
      const browser = await signInShopper(ctx);
      await browser.post(`${API}/cart/items`).send({ variantId, quantity: 1 }).expect(201);
      const failed = await browser
        .post(`${API}/checkout/orders`)
        .send(checkoutBody(method))
        .expect(422);
      expect(failed.body.code).toBe('FISCAL_DATA_MISSING');
      expect(await ctx.prisma.order.count()).toBe(0);
      expect(await ctx.prisma.cartItem.count()).toBe(1);
      expect(
        (await ctx.prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } }))
          .stockQuantity,
      ).toBe(10);
    },
  );

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
    const browser = await signInShopper(ctx);
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

    it('returns the purchased price, quantity, MXIK and packaging for each product in a mixed order', async () => {
      const placed = await placeMixedOrder('PAYME');
      const checked = await rpc('CheckPerformTransaction', {
        amount: tiyin(placed),
        account: { order_id: placed.order.number },
      });
      expect(checked.result).toMatchObject({
        allow: true,
        detail: {
          shipping: { price: 2500000 },
          items: expect.arrayContaining([
            expect.objectContaining({
              code: '00000000000000001',
              package_code: '0001',
              count: 1,
              vat_percent: 12,
              price: 6000000,
            }),
            expect.objectContaining({
              code: '00000000000000003',
              package_code: '0003',
              count: 2,
              vat_percent: 0,
              price: 3200000,
            }),
          ]),
        },
      });
      expect(checked.result?.detail).toHaveProperty('items.length', 2);
    });

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
      expect(
        (await rpc('SetFiscalData', { id: 'x', type: 'PERFORM', fiscal_data: {} })).error?.code,
      ).toBe(-32602);
    });

    it('stores sale and refund receipts independently across concurrent and delayed callbacks', async () => {
      const placed = await placeOrder('PAYME');
      const id = '5e730e8e0b852a417aa49001';
      const data = {
        receipt_id: 121,
        status_code: 0,
        message: 'accepted',
        terminal_id: 'EP01',
        fiscal_sign: '1002',
        date: '20261126090000',
        qr_code_url: 'https://ofd.soliq.uz/epi?r=121',
      };
      const receipt = { id, type: 'PERFORM', fiscal_data: data };
      expect((await rpc('SetFiscalData', receipt)).error?.code).toBe(-32001);
      await rpc('CreateTransaction', {
        id,
        time: Date.now(),
        amount: tiyin(placed),
        account: { order_id: placed.order.number },
      });
      await rpc('PerformTransaction', { id });
      const failed = { ...receipt, fiscal_data: { ...data, status_code: 1, qr_code_url: '' } };
      expect((await rpc('SetFiscalData', failed)).result).toEqual({ success: true });
      const delivered = await Promise.all([
        rpc('SetFiscalData', receipt),
        rpc('SetFiscalData', receipt),
      ]);
      expect(delivered.every((answer) => answer.result?.success)).toBe(true);
      await rpc('SetFiscalData', failed);
      expect(
        (await rpc('SetFiscalData', { ...receipt, fiscal_data: { ...data, receipt_id: 999 } }))
          .error?.code,
      ).toBe(-32602);
      await rpc('CancelTransaction', { id, reason: 5 });
      await rpc('SetFiscalData', {
        ...receipt,
        type: 'CANCEL',
        fiscal_data: { ...data, receipt_id: '122', qr_code_url: 'https://ofd.soliq.uz/epi?r=122' },
      });
      expect((await orderView(placed)).payments[0]?.receipts).toEqual([
        { operation: 'PERFORM', url: data.qr_code_url },
        { operation: 'CANCEL', url: 'https://ofd.soliq.uz/epi?r=122' },
      ]);
      expect(await ctx.prisma.fiscalReceipt.count()).toBe(2);
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
      expect(ok.result).toMatchObject({
        allow: true,
        detail: {
          receipt_type: 0,
          shipping: { price: 2500000 },
          items: [
            {
              price: 6000000,
              count: 1,
              code: '00000000000000001',
              package_code: '0001',
              vat_percent: 12,
            },
          ],
        },
      });
      await ctx.prisma.productVariant.update({
        where: { id: variantId },
        data: { fiscalPackageCode: '0003', price: '65000' },
      });
      expect(
        (
          await rpc('CheckPerformTransaction', {
            amount: tiyin(placed),
            account: { order_id: placed.order.number },
          })
        ).result,
      ).toEqual(ok.result);

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
      const [created, concurrentRepeat] = await Promise.all([
        rpc('CreateTransaction', create),
        rpc('CreateTransaction', create),
      ]);
      expect(created.result).toMatchObject({ state: 1 });
      expect(concurrentRepeat.result).toEqual(created.result);
      expect((await orderView(placed)).paymentStatus).toBe('PROCESSING');
      const restart = await agent()
        .post(`${API}/orders/${placed.order.number}/payments`)
        .send({
          method: 'CLICK',
          token: placed.accessToken,
          locale: 'uz',
        })
        .expect(409);
      expect(restart.body.code).toBe('PAYMENT_IN_PROGRESS');
      expect(await ctx.prisma.payment.count()).toBe(1);

      // A second Payme transaction for the same order while the first is open.
      const second = await rpc('CreateTransaction', { ...create, id: '5e730e8e0b852a417aa49cec' });
      expect(second.error).toMatchObject({ code: -31051, data: 'order_id' });
      expect((await rpc('CheckPerformTransaction', create)).error).toMatchObject({
        code: -31051,
        data: 'order_id',
      });

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

    it('reserves a one-time order for only one of two concurrent Payme transactions', async () => {
      const placed = await placeOrder('PAYME');
      const params = {
        account: { order_id: placed.order.number },
        time: Date.now(),
        amount: tiyin(placed),
      };
      const attempts = await Promise.all(
        ['bbbbbbbbbbbbbbbbbbbbbb21', 'bbbbbbbbbbbbbbbbbbbbbb22'].map((id) =>
          rpc('CreateTransaction', { ...params, id }),
        ),
      );
      expect(attempts.filter((attempt) => attempt.result?.state === 1)).toHaveLength(1);
      expect(attempts.filter((attempt) => attempt.error).map((attempt) => attempt.error)).toEqual([
        expect.objectContaining({ code: -31051, data: 'order_id' }),
      ]);
      expect(await ctx.prisma.paymeTransaction.count()).toBe(1);
      expect((await orderView(placed)).paymentStatus).toBe('PROCESSING');
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

    it('answers concurrent CLICK retries from the same payment and queues one receipt', async () => {
      const placed = await placeOrder('CLICK');
      const request = prepareBody(placed.order.number, '85000.00');
      const [a, b] = await Promise.all([post('prepare', request), post('prepare', request)]);
      expect(a.error).toBe(0);
      expect(b).toEqual(a);
      const complete = completeBody(request, a.merchant_prepare_id!);
      const replies = await Promise.all([post('complete', complete), post('complete', complete)]);
      expect(replies.map((result) => result.error).sort()).toEqual([-4, 0]);
      expect(await ctx.prisma.clickTransaction.count({ where: { fiscalState: 'QUEUED' } })).toBe(1);
      expect((await orderView(placed)).paymentStatus).toBe('PAID');
    });

    it('submits one mixed-product CLICK receipt and recovers its QR after a lost response', async () => {
      const placed = await placeMixedOrder('CLICK');
      const body = prepareBody(placed.order.number, placed.order.total);
      const prepare = await post('prepare', body);
      const complete = completeBody(body, prepare.merchant_prepare_id!);
      expect((await post('complete', complete)).error).toBe(0);
      expect((await post('complete', complete)).error).toBe(-4);
      const worker = ctx.app.get(ClickFiscalService);
      const qr = 'https://ofd.soliq.uz/epi?r=101';
      const send = vi
        .spyOn(globalThis, 'fetch')
        .mockRejectedValueOnce(new Error('response lost'))
        .mockResolvedValueOnce(
          Response.json({ paymentId: Number(body.click_trans_id), qrCodeURL: qr }),
        );
      try {
        await Promise.all([worker.processDue(), worker.processDue()]);
        expect(send).toHaveBeenCalledTimes(1);
        const call = send.mock.calls[0]!;
        expect(call[0]).toMatch(/\/submit_items$/);
        const sentBody = call[1]?.body;
        if (typeof sentBody !== 'string') throw new Error('Expected a JSON body');
        const payload = JSON.parse(sentBody);
        expect(payload).toMatchObject({
          service_id: 12345,
          payment_id: Number(body.click_trans_id),
          received_card: 14900000,
          items: expect.arrayContaining([
            expect.objectContaining({
              SPIC: '00000000000000001',
              PackageCode: '0001',
              GoodPrice: 6000000,
              Price: 6000000,
              Amount: 1000,
              VATPercent: 12,
              VAT: 642857,
              CommissionInfo: { TIN: '123456789' },
            }),
            expect.objectContaining({
              SPIC: '00000000000000003',
              PackageCode: '0003',
              GoodPrice: 3200000,
              Price: 6400000,
              Amount: 2000,
              VATPercent: 0,
              VAT: 0,
            }),
            expect.objectContaining({
              SPIC: '00000000000000002',
              PackageCode: '0002',
              Price: 2500000,
              VATPercent: 0,
              VAT: 0,
            }),
          ]),
        });
        expect(payload.items).toHaveLength(3);
        const auth = new Headers(call[1]?.headers).get('Auth')!.split(':');
        expect(auth[1]).toBe(
          createHash('sha1')
            .update(auth[2] + CLICK_SECRET)
            .digest('hex'),
        );
        await worker.processDue(new Date(Date.now() + 600_000));
        expect(send).toHaveBeenCalledTimes(2);
        expect(send.mock.calls[1]![0]).toMatch(new RegExp('/' + body.click_trans_id + '$'));
        expect((await orderView(placed)).payments[0]?.receipts).toEqual([
          { operation: 'PERFORM', url: qr },
        ]);
      } finally {
        send.mockRestore();
      }
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
