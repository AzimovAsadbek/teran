import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import request from 'supertest';
import type {
  AdminAuditEntry,
  AdminOrderDetail,
  AdminProductDetail,
  Paginated,
  ProductUpsertInput,
  UserRole,
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

function productPayload(
  categoryId: string,
  overrides: Partial<ProductUpsertInput> = {},
): ProductUpsertInput {
  return {
    slug: 'admin-test-tea',
    status: 'ACTIVE',
    categoryId,
    format: 'LOOSE_LEAF',
    isFeatured: false,
    caffeineLevel: null,
    brewTempCelsius: 90,
    brewTimeMinSeconds: 120,
    brewTimeMaxSeconds: 240,
    brewAmountGrams: 2.5,
    illustrationKey: 'green',
    collectionIds: [],
    translations: {
      uz: { name: 'Sinov choyi', shortDescription: 'Qisqa tavsif' },
      ru: { name: 'Тестовый чай' },
      en: null,
    },
    variants: [
      {
        sku: 'TST-100',
        weightGrams: 100,
        unitCount: null,
        price: '40000',
        compareAtPrice: null,
        lowStockThreshold: 3,
        barcode: null,
        isActive: true,
        initialStock: 12,
      },
      {
        sku: 'TST-250',
        weightGrams: 250,
        unitCount: null,
        price: '90000',
        compareAtPrice: null,
        lowStockThreshold: 3,
        barcode: null,
        isActive: true,
        initialStock: 4,
      },
    ],
    ...overrides,
  };
}

async function png(size: number): Promise<Buffer> {
  return sharp({
    create: { width: size, height: size, channels: 3, background: { r: 30, g: 90, b: 50 } },
  })
    .png()
    .toBuffer();
}

describe('admin API', () => {
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

  const server = () => ctx.app.getHttpServer();

  async function signedIn(role: UserRole) {
    const user = await createUser(ctx.prisma, role);
    const agent = request.agent(server());
    await agent
      .post(`${API}/auth/login`)
      .send({ email: user.email, password: TEST_PASSWORD })
      .expect(200);
    return { agent, user };
  }

  async function placeOrder(variantId: string, quantity: number): Promise<string> {
    const shopper = request.agent(server());
    await shopper.post(`${API}/cart/items?locale=uz`).send({ variantId, quantity }).expect(201);
    const placed = await shopper
      .post(`${API}/checkout/orders`)
      .send({
        idempotencyKey: randomUUID(),
        locale: 'uz',
        customer: { name: 'Admin Test', phone: '+998 90 123 45 67' },
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
    return (placed.body as { order: { number: string } }).order.number;
  }

  describe('authorisation', () => {
    it('requires a staff session and the right role', async () => {
      await request(server()).get(`${API}/admin/dashboard`).expect(401);

      const customer = await signedIn('CUSTOMER');
      const forbidden = await customer.agent.get(`${API}/admin/dashboard`).expect(403);
      expect(forbidden.body).toMatchObject({ code: 'FORBIDDEN' });
      await customer.agent.get(`${API}/admin/orders`).expect(403);

      const manager = await signedIn('MANAGER');
      await manager.agent.get(`${API}/admin/dashboard`).expect(200);
      await manager.agent.get(`${API}/admin/products`).expect(200);
      // Administrator-only areas: staff, settings, delivery prices, personal-data exports, audit.
      await manager.agent.get(`${API}/admin/staff`).expect(403);
      await manager.agent.put(`${API}/admin/settings/contact`).send({}).expect(403);
      await manager.agent.get(`${API}/admin/newsletter/export.csv`).expect(403);
      await manager.agent.get(`${API}/admin/reports/orders.csv`).expect(403);
      await manager.agent.get(`${API}/admin/audit`).expect(403);

      const admin = await signedIn('ADMIN');
      await admin.agent.get(`${API}/admin/staff`).expect(200);
      await admin.agent.get(`${API}/admin/audit`).expect(200);
    });

    it('rejects cross-site writes even with a valid staff session', async () => {
      const { agent } = await signedIn('ADMIN');
      const response = await agent
        .post(`${API}/admin/products`)
        .set('Origin', 'https://evil.example')
        .send(productPayload(categoryId))
        .expect(403);
      expect(response.body).toMatchObject({ code: 'INVALID_ORIGIN' });
    });
  });

  describe('catalogue', () => {
    it('creates, publishes, edits and deactivates variants without losing history', async () => {
      const { agent } = await signedIn('MANAGER');
      const created = await agent
        .post(`${API}/admin/products`)
        .send(productPayload(categoryId))
        .expect(201);
      const product = created.body as AdminProductDetail;
      expect(product.variants.map((variant) => variant.stockQuantity)).toEqual([12, 4]);
      expect(product.translations.en).toBeNull();
      expect(product.publishedAt).not.toBeNull();

      const publicView = await request(server())
        .get(`${API}/catalog/products/admin-test-tea?locale=ru`)
        .expect(200);
      expect(publicView.body).toMatchObject({ name: 'Тестовый чай' });
      // English falls back to Uzbek.
      const english = await request(server())
        .get(`${API}/catalog/products/admin-test-tea?locale=en`)
        .expect(200);
      expect(english.body).toMatchObject({ name: 'Sinov choyi' });

      const [first] = product.variants;
      const updated = await agent
        .put(`${API}/admin/products/${product.id}`)
        .send(
          productPayload(categoryId, {
            variants: [
              {
                id: first!.id,
                sku: 'TST-100',
                weightGrams: 100,
                unitCount: null,
                price: '42000',
                compareAtPrice: '45000',
                lowStockThreshold: 3,
                barcode: null,
                isActive: true,
              },
            ],
          }),
        )
        .expect(200);
      const edited = updated.body as AdminProductDetail;
      expect(edited.variants).toHaveLength(2);
      expect(edited.variants.find((variant) => variant.sku === 'TST-250')?.isActive).toBe(false);
      expect(edited.variants.find((variant) => variant.sku === 'TST-100')).toMatchObject({
        price: '42000.00',
        stockQuantity: 12,
      });

      const ledger = await ctx.prisma.inventoryMovement.findMany({
        where: { variant: { productId: product.id } },
      });
      expect(ledger.map((entry) => entry.reason)).toEqual(['INITIAL_STOCK', 'INITIAL_STOCK']);

      const duplicate = await agent
        .post(`${API}/admin/products`)
        .send(productPayload(categoryId))
        .expect(409);
      expect(duplicate.body).toMatchObject({ code: 'CONFLICT' });
    });

    it('validates uploads by decoding them, not by trusting the file name', async () => {
      const { agent } = await signedIn('MANAGER');
      const product = (
        await agent.post(`${API}/admin/products`).send(productPayload(categoryId)).expect(201)
      ).body as AdminProductDetail;

      const uploaded = await agent
        .post(`${API}/admin/products/${product.id}/images`)
        .attach('file', await png(400), { filename: 'tea.png', contentType: 'image/png' })
        .expect(201);
      const withImage = uploaded.body as AdminProductDetail;
      expect(withImage.images).toHaveLength(1);
      expect(withImage.images[0]?.widths).toEqual([320]);

      // sharp identifies AVIF as "heif" with AV1 compression; it is accepted like the others.
      const avif = await sharp({
        create: { width: 700, height: 500, channels: 3, background: { r: 200, g: 150, b: 60 } },
      })
        .avif()
        .toBuffer();
      const withAvif = (
        await agent
          .post(`${API}/admin/products/${product.id}/images`)
          .attach('file', avif, { filename: 'tea.avif', contentType: 'image/avif' })
          .expect(201)
      ).body as AdminProductDetail;
      expect(withAvif.images.map((image) => image.widths)).toEqual([[320], [320, 640]]);

      await agent
        .post(`${API}/admin/products/${product.id}/images`)
        .attach('file', Buffer.from('<?php echo 1; ?>'), {
          filename: 'tea.png',
          contentType: 'image/png',
        })
        .expect(415);
      await agent
        .post(`${API}/admin/products/${product.id}/images`)
        .attach('file', await png(80), { filename: 'tiny.png', contentType: 'image/png' })
        .expect(400);

      const removed = await agent
        .delete(`${API}/admin/products/${product.id}/images/${withImage.images[0]!.id}`)
        .expect(200);
      expect((removed.body as AdminProductDetail).images).toHaveLength(1);
    });

    it('never lets an adjustment take stock below zero', async () => {
      const { agent } = await signedIn('MANAGER');
      const product = await createProduct(ctx.prisma, {
        categoryId,
        variants: [{ price: '30000', stock: 3 }],
      });
      const variantId = product.variants[0]!.id;

      const refused = await agent
        .post(`${API}/admin/inventory/${variantId}/adjustments`)
        .send({ delta: -5, reason: 'MANUAL_ADJUSTMENT', note: 'Breakage' })
        .expect(409);
      expect(refused.body).toMatchObject({ code: 'INSUFFICIENT_STOCK' });

      await agent
        .post(`${API}/admin/inventory/${variantId}/adjustments`)
        .send({ delta: 7, reason: 'RESTOCK' })
        .expect(201);
      const movements = await agent
        .get(`${API}/admin/inventory/${variantId}/movements`)
        .expect(200);
      expect(movements.body.items[0]).toMatchObject({
        delta: 7,
        quantityAfter: 10,
        reason: 'RESTOCK',
        actorName: 'Test',
      });
    });
  });

  describe('orders', () => {
    it('follows the allowed transitions and restocks on cancellation', async () => {
      const { agent } = await signedIn('MANAGER');
      const product = await createProduct(ctx.prisma, {
        categoryId,
        variants: [{ price: '30000', stock: 10 }],
      });
      const variantId = product.variants[0]!.id;
      const number = await placeOrder(variantId, 3);
      expect(
        (await ctx.prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } }))
          .stockQuantity,
      ).toBe(7);

      const skipped = await agent
        .post(`${API}/admin/orders/${number}/status`)
        .send({ status: 'SHIPPED' })
        .expect(409);
      expect(skipped.body).toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });

      const confirmed = await agent
        .post(`${API}/admin/orders/${number}/status`)
        .send({ status: 'CONFIRMED' })
        .expect(201);
      expect((confirmed.body as AdminOrderDetail).allowedTransitions).toEqual([
        'PROCESSING',
        'CANCELLED',
      ]);

      await agent
        .post(`${API}/admin/orders/${number}/status`)
        .send({ status: 'CANCELLED' })
        .expect(400);
      const cancelled = await agent
        .post(`${API}/admin/orders/${number}/status`)
        .send({ status: 'CANCELLED', note: 'Customer asked to cancel' })
        .expect(201);
      expect(cancelled.body).toMatchObject({
        status: 'CANCELLED',
        paymentStatus: 'CANCELLED',
        cancelReason: 'Customer asked to cancel',
      });
      expect(
        (await ctx.prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } }))
          .stockQuantity,
      ).toBe(10);
      const restock = await ctx.prisma.inventoryMovement.findFirst({
        where: { variantId, reason: 'ORDER_CANCELLED' },
      });
      expect(restock).toMatchObject({ delta: 3, quantityAfter: 10 });

      await agent.post(`${API}/admin/orders/${number}/payments`).send({}).expect(409);
    });

    it('marks cash orders paid only when staff record the payment', async () => {
      const { agent, user } = await signedIn('MANAGER');
      const product = await createProduct(ctx.prisma, {
        categoryId,
        variants: [{ price: '30000', stock: 10 }],
      });
      const number = await placeOrder(product.variants[0]!.id, 1);

      for (const status of ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']) {
        await agent.post(`${API}/admin/orders/${number}/status`).send({ status }).expect(201);
      }
      const delivered = (await agent.get(`${API}/admin/orders/${number}`).expect(200))
        .body as AdminOrderDetail;
      expect(delivered).toMatchObject({
        status: 'DELIVERED',
        paymentStatus: 'PENDING',
        canRecordPayment: true,
      });

      const paid = (
        await agent
          .post(`${API}/admin/orders/${number}/payments`)
          .send({ note: 'Cash received' })
          .expect(201)
      ).body as AdminOrderDetail;
      expect(paid).toMatchObject({ paymentStatus: 'PAID', canRecordPayment: false });
      const payment = await ctx.prisma.payment.findFirstOrThrow({ where: { order: { number } } });
      expect(payment).toMatchObject({ status: 'PAID', confirmedById: user.id });
      expect(payment.amount.toFixed(2)).toBe('55000.00');
    });
  });

  describe('staff and settings', () => {
    it('keeps at least one administrator and signs deactivated staff out', async () => {
      const { agent, user } = await signedIn('ADMIN');
      const selfDemotion = await agent
        .patch(`${API}/admin/staff/${user.id}`)
        .send({ role: 'MANAGER', isActive: true })
        .expect(409);
      expect(selfDemotion.body).toMatchObject({ code: 'CONFLICT' });

      const manager = await signedIn('MANAGER');
      await manager.agent.get(`${API}/admin/dashboard`).expect(200);
      await agent
        .patch(`${API}/admin/staff/${manager.user.id}`)
        .send({ role: 'MANAGER', isActive: false })
        .expect(200);
      await manager.agent.get(`${API}/admin/dashboard`).expect(401);
    });

    it('stores validated contact settings and shows only filled-in channels', async () => {
      const { agent } = await signedIn('ADMIN');
      await agent
        .put(`${API}/admin/settings/contact`)
        .send({
          phone: '+998 71 000 00 00',
          email: 'hello@example.com',
          telegram: null,
          instagram: null,
          address: null,
          workingHours: null,
        })
        .expect(200);
      const settings = await request(server()).get(`${API}/content/settings?locale=uz`).expect(200);
      expect(settings.body.contact).toMatchObject({
        phone: '+998 71 000 00 00',
        email: 'hello@example.com',
        telegram: null,
      });
    });

    it('exports subscribers with working unsubscribe links', async () => {
      const { agent } = await signedIn('ADMIN');
      await request(server())
        .post(`${API}/newsletter/subscribe`)
        .send({ email: 'reader@example.com', locale: 'ru' })
        .expect(202);

      const csv = await agent.get(`${API}/admin/newsletter/export.csv`).expect(200);
      expect(csv.headers['content-type']).toContain('text/csv');
      const match =
        /http:\/\/localhost:3000\/ru\/newsletter\/unsubscribe\?id=([0-9a-f-]+)&token=([\w-]+)/.exec(
          csv.text,
        );
      expect(match).not.toBeNull();
      const [, id, token] = match!;

      await request(server())
        .post(`${API}/newsletter/unsubscribe`)
        .send({ id, token: `${token}x` })
        .expect(400);
      await request(server()).post(`${API}/newsletter/unsubscribe`).send({ id, token }).expect(202);
      const subscriber = await ctx.prisma.newsletterSubscriber.findUniqueOrThrow({
        where: { email: 'reader@example.com' },
      });
      expect(subscriber.status).toBe('UNSUBSCRIBED');

      const audit = (await agent.get(`${API}/admin/audit`).expect(200))
        .body as Paginated<AdminAuditEntry>;
      expect(audit.items.map((entry) => entry.action)).toContain('newsletter.export');
    });
  });
});
