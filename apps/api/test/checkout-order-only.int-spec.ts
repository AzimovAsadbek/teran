import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { placedOrderSchema } from '@teran/contracts';
import { createTestApp, signInShopper, type TestApp } from './helpers/app.js';
import {
  createCategory,
  createDeliveryMethod,
  createProduct,
  createUser,
  resetDatabase,
  TEST_PASSWORD,
} from './helpers/fixtures.js';

vi.hoisted(() =>
  Object.assign(process.env, {
    CHECKOUT_DELIVERY_ENABLED: 'false',
    PAYMENT_PROVIDER_MODE: 'live',
    PAYMENT_METHODS_ENABLED: 'CLICK,PAYME,CASH_ON_DELIVERY',
    PAYME_MERCHANT_ID: 'testmerchant00000000000a',
    PAYME_KEY: 'order-only-test-cashbox',
    PAYME_CHECK_IP: 'false',
    PAYME_FISCAL_MODE: 'items',
    CLICK_SERVICE_ID: '12345',
    CLICK_MERCHANT_ID: '67890',
    CLICK_SECRET_KEY: 'order-only-test-click',
    CLICK_MERCHANT_USER_ID: '10001',
    CLICK_COMMISSION_TIN: '123456789',
    CLICK_FISCAL_MODE: 'items',
    CLICK_DELIVERY_MXIK: '',
    CLICK_DELIVERY_PACKAGE_CODE: '',
    CLICK_DELIVERY_VAT_PERCENT: '',
  }),
);

const API = '/api/v1';
const mxik = '00902001001000000';
const legacyAddress = {
  methodCode: 'courier',
  regionCode: 'UZ-TK',
  city: 'Toshkent',
  addressLine: 'Example street 1',
};
const checkout = (paymentMethod: string) => ({
  paymentMethod,
  idempotencyKey: randomUUID(),
  locale: 'uz',
  customer: { name: 'Test Buyer', phone: '+998901234567' },
  acceptTerms: true,
  expectedTotal: '120000.00',
});

describe('checkout without delivery', () => {
  let ctx: TestApp;
  let variantId: string;
  const agent = () => request.agent(ctx.app.getHttpServer());
  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(async () => {
    await ctx.close();
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    const category = await createCategory(ctx.prisma, 'tea');
    await createDeliveryMethod(ctx.prisma, {
      code: 'courier',
      price: '25000',
      freeFromAmount: '150000',
    });
    const product = await createProduct(ctx.prisma, {
      categoryId: category.id,
      variants: [{ price: '60000', stock: 10 }],
    });
    variantId = product.variants[0]!.id;
    await ctx.prisma.productVariant.update({
      where: { id: variantId },
      data: { fiscalMxik: mxik, fiscalPackageCode: '1653256', fiscalVatPercent: 12 },
    });
  });

  it('preserves the guest bag, quotes just the goods and rejects a stale total without a reservation', async () => {
    const buyer = agent();
    expect((await buyer.get(API + '/checkout/options?locale=uz').expect(200)).body).toMatchObject({
      deliveryEnabled: false,
      deliveryMethods: [],
      paymentMethods: ['CLICK', 'PAYME'],
    });
    const added = await buyer
      .post(API + '/cart/items')
      .send({ variantId, quantity: 2 })
      .expect(201);
    expect(added.body).toMatchObject({ deliveryEnabled: false, deliveryHint: null, itemCount: 2 });
    await buyer
      .post(API + '/checkout/orders')
      .send(checkout('PAYME'))
      .expect(401);
    await signInShopper(ctx, buyer);
    expect((await buyer.get(API + '/checkout/quote?locale=uz').expect(200)).body).toMatchObject({
      subtotal: '120000.00',
      deliveryFee: '0.00',
      total: '120000.00',
    });
    const rejected = await buyer
      .post(API + '/checkout/orders')
      .send({ ...checkout('CLICK'), delivery: legacyAddress, expectedTotal: '145000.00' })
      .expect(409);
    expect(rejected.body).toMatchObject({ code: 'PRICE_CHANGED', details: { total: '120000.00' } });
    await buyer
      .post(API + '/checkout/orders')
      .send(checkout('CASH_ON_DELIVERY'))
      .expect(422);
    expect(await ctx.prisma.order.count()).toBe(0);
    expect(await ctx.prisma.inventoryMovement.count()).toBe(0);
    expect(
      (await ctx.prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } }))
        .stockQuantity,
    ).toBe(10);
  });

  it.each(['PAYME', 'CLICK'] as const)(
    'bills exactly the goods on %s, stores no address, and clears the bag once',
    async (method) => {
      const buyer = await signInShopper(ctx);
      await buyer
        .post(API + '/cart/items')
        .send({ variantId, quantity: 2 })
        .expect(201);
      const payload = {
        ...checkout(method),
        ...(method === 'CLICK' ? { delivery: legacyAddress, saveAddress: true } : {}),
      };
      const placed = placedOrderSchema.parse(
        (
          await buyer
            .post(API + '/checkout/orders')
            .send(payload)
            .expect(201)
        ).body,
      );
      expect(placed.order).toMatchObject({
        subtotal: '120000.00',
        total: '120000.00',
        deliveryFee: '0.00',
        deliveryMethodName: null,
        city: null,
        regionCode: null,
        addressLine: null,
      });
      const again = await buyer
        .post(API + '/checkout/orders')
        .send(payload)
        .expect(201);
      expect(again.body.order.number).toBe(placed.order.number);
      expect((await buyer.get(API + '/cart').expect(200)).body.itemCount).toBe(0);
      expect(await ctx.prisma.customerAddress.count()).toBe(0);
      expect(await ctx.prisma.inventoryMovement.count()).toBe(1);
      const payment = await ctx.prisma.payment.findFirstOrThrow();
      const redirect = new URL(placed.payment!.redirectUrl!);
      if (method === 'PAYME') {
        expect(Buffer.from(redirect.pathname.slice(1), 'base64').toString()).toContain(
          'a=12000000;',
        );
        const response = await buyer
          .post(API + '/payments/payme')
          .auth('Paycom', 'order-only-test-cashbox')
          .send({
            id: 1,
            method: 'CheckPerformTransaction',
            params: { amount: 12000000, account: { order_id: placed.order.number } },
          })
          .expect(200);
        expect(response.body.result.allow).toBe(true);
        expect(response.body.result.detail).not.toHaveProperty('shipping');
        expect(response.body.result.detail.items).toEqual([
          expect.objectContaining({
            code: mxik,
            package_code: '1653256',
            count: 2,
            price: 6000000,
            vat_percent: 12,
          }),
        ]);
      } else {
        expect(Number(redirect.searchParams.get('amount'))).toBe(120000);
        expect(payment.fiscalPayload).toMatchObject({
          received_card: 12000000,
          items: [
            expect.objectContaining({
              SPIC: mxik,
              PackageCode: '1653256',
              Amount: 2000,
              Price: 12000000,
            }),
          ],
        });
      }
    },
  );

  it('completes an order directly from processing without recording a shipment', async () => {
    const buyer = await signInShopper(ctx);
    await buyer
      .post(API + '/cart/items')
      .send({ variantId, quantity: 2 })
      .expect(201);
    const placed = placedOrderSchema.parse(
      (
        await buyer
          .post(API + '/checkout/orders')
          .send(checkout('PAYME'))
          .expect(201)
      ).body,
    );
    const rpc = (method: string, params: Record<string, unknown>) =>
      buyer
        .post(API + '/payments/payme')
        .auth('Paycom', 'order-only-test-cashbox')
        .send({ id: 1, method, params });
    const transaction = '545ce4275ae16100271c001f';
    const created = await rpc('CreateTransaction', {
      id: transaction,
      time: Date.now(),
      amount: 12000000,
      account: { order_id: placed.order.number },
    });
    expect(created.body.result.state).toBe(1);
    expect((await rpc('PerformTransaction', { id: transaction })).body.result.state).toBe(2);
    const staff = agent();
    const operator = await createUser(ctx.prisma, 'MANAGER');
    await staff
      .post(API + '/auth/login')
      .send({ email: operator.email, password: TEST_PASSWORD })
      .expect(200);
    const path = API + '/admin/orders/' + placed.order.number;
    const detail = (await staff.get(path).expect(200)).body;
    expect(detail.paymentStatus).toBe('PAID');
    if (detail.status === 'PENDING')
      await staff
        .post(path + '/status')
        .send({ status: 'CONFIRMED' })
        .expect(201);
    const processing = await staff
      .post(path + '/status')
      .send({ status: 'PROCESSING' })
      .expect(201);
    expect(processing.body.allowedTransitions).toEqual(['DELIVERED', 'CANCELLED']);
    await staff
      .post(path + '/status')
      .send({ status: 'SHIPPED' })
      .expect(409);
    const completed = await staff
      .post(path + '/status')
      .send({ status: 'DELIVERED' })
      .expect(201);
    expect(completed.body.status).toBe('DELIVERED');
    expect((await ctx.prisma.order.findFirstOrThrow()).shippedAt).toBeNull();
  });
});
