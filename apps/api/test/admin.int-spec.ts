import './helpers/without-video-tools.js';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import request from 'supertest';
import {
  mediaItemSchema,
  type AdminAuditEntry,
  type AdminBadges,
  type AdminDashboard,
  type AdminMediaItem,
  type AdminOrderDetail,
  type AdminOrderListItem,
  type AdminProductDetail,
  type MediaUpsertInput,
  type Paginated,
  type ProductUpsertInput,
  type UserRole,
} from '@teran/contracts';
import type { Prisma } from '../src/generated/prisma/client.js';
import { createTestApp, type TestApp } from './helpers/app.js';
import { uploadFilm, waitForFilm } from './helpers/publishing.js';
import { TEST_ENV } from './test-env.js';
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
      await customer.agent.get(`${API}/admin/badges`).expect(403);

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

    it('counts what the site shows on the dashboard: products on sale, gallery, articles, reviews', async () => {
      await createProduct(ctx.prisma, { categoryId, slug: 'on-sale' });
      await createProduct(ctx.prisma, { categoryId, slug: 'draft-tea', status: 'DRAFT' });
      await createProduct(ctx.prisma, { categoryId, slug: 'old-tea', status: 'ARCHIVED' });
      const { agent } = await signedIn('MANAGER');
      const dashboard = (await agent.get(`${API}/admin/dashboard`).expect(200))
        .body as AdminDashboard;
      expect(dashboard.site).toEqual({
        productsOnSale: 1,
        products: 2,
        media: { PHOTO: 0, VIDEO: 0, SHORT: 0 },
        articles: 0,
        reviews: 0,
        reviewsThisWeek: 0,
      });
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
      // A new product has no image yet: publishing it straight away is refused, with the reason.
      const refused = await agent
        .post(`${API}/admin/products`)
        .send(productPayload(categoryId))
        .expect(422);
      expect(refused.body).toMatchObject({
        code: 'PUBLICATION_BLOCKED',
        details: { missing: ['mainImage'] },
      });
      const created = await agent
        .post(`${API}/admin/products`)
        .send(productPayload(categoryId, { status: 'DRAFT' }))
        .expect(201);
      const draft = created.body as AdminProductDetail;
      expect(draft.publishedAt).toBeNull();
      expect(draft.readiness.ready).toBe(false);
      expect(draft.readiness.items.find((item) => item.code === 'mainImage')).toMatchObject({
        ok: false,
        required: true,
      });
      await request(server()).get(`${API}/catalog/products/admin-test-tea?locale=uz`).expect(404);
      await agent
        .post(`${API}/admin/products/${draft.id}/images`)
        .attach('file', await png(400), { filename: 'tea.png', contentType: 'image/png' })
        .expect(201);
      const product = (
        await agent
          .put(`${API}/admin/products/${draft.id}`)
          .send(
            productPayload(categoryId, {
              variants: productPayload(categoryId).variants.map((variant, index) => ({
                ...variant,
                id: draft.variants[index]!.id,
              })),
            }),
          )
          .expect(200)
      ).body as AdminProductDetail;
      expect(product.variants.map((variant) => variant.stockQuantity)).toEqual([12, 4]);
      expect(product.translations.en).toBeNull();
      expect(product.publishedAt).not.toBeNull();
      expect(product.readiness.ready).toBe(true);

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
        .send(productPayload(categoryId, { status: 'DRAFT' }))
        .expect(409);
      expect(duplicate.body).toMatchObject({ code: 'CONFLICT' });
    });

    it('validates uploads by decoding them, not by trusting the file name', async () => {
      const { agent } = await signedIn('MANAGER');
      const product = (
        await agent
          .post(`${API}/admin/products`)
          .send(productPayload(categoryId, { status: 'DRAFT' }))
          .expect(201)
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
      expect(withAvif.images.map((image) => image.widths)).toEqual([[320], [320, 480, 640]]);

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

    it("shows a picture's film with it, and lets a new or deleted picture take the film along", async () => {
      const { agent } = await signedIn('MANAGER');
      const product = (
        await agent
          .post(`${API}/admin/products`)
          .send(productPayload(categoryId, { status: 'DRAFT', slug: 'film-test-tea' }))
          .expect(201)
      ).body as AdminProductDetail;
      const pictured = (
        await agent
          .post(`${API}/admin/products/${product.id}/images`)
          .attach('file', await png(400), { filename: 'cup.png', contentType: 'image/png' })
          .expect(201)
      ).body as AdminProductDetail;
      const imageId = pictured.images[0]!.id;
      const uploads = TEST_ENV.UPLOADS_DIR!;
      // A film as the import script stores it: the film, its cards' copy and where it moves.
      const attachFilm = async (name: string) => {
        const key = `products/${product.id}/${name}`;
        mkdirSync(join(uploads, key), { recursive: true });
        for (const file of ['video.mp4', 'card.mp4', 'mask.png']) {
          writeFileSync(join(uploads, key, file), 'x');
        }
        await ctx.prisma.productImage.update({
          where: { id: imageId },
          data: {
            videoKey: key,
            videoType: 'video/mp4',
            videoWidth: 1024,
            videoHeight: 1024,
            videoFiles: ['card', 'mask'],
          },
        });
        return key;
      };
      const first = await attachFilm('filmAAAAAAAA');
      const detail = (await agent.get(`${API}/admin/products/${product.id}`).expect(200))
        .body as AdminProductDetail;
      expect(detail.images[0]?.film).toEqual({
        src: `/uploads/${first}/video.mp4`,
        cardSrc: `/uploads/${first}/card.mp4`,
        mask: `/uploads/${first}/mask.png`,
        type: 'video/mp4',
        width: 1024,
        height: 1024,
      });

      // A new picture is not the film's first frame: the film goes, files and all.
      const replaced = (
        await agent
          .post(`${API}/admin/products/${product.id}/images/${imageId}/file`)
          .attach('file', await png(500), { filename: 'other.png', contentType: 'image/png' })
          .expect(201)
      ).body as AdminProductDetail;
      expect(replaced.images[0]?.film).toBeNull();
      expect(existsSync(join(uploads, first, 'video.mp4'))).toBe(false);

      // Deleting the picture deletes its film too.
      const second = await attachFilm('filmBBBBBBBB');
      await agent.delete(`${API}/admin/products/${product.id}/images/${imageId}`).expect(200);
      expect(existsSync(join(uploads, second, 'card.mp4'))).toBe(false);
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

    it('counts the work waiting for staff', async () => {
      const { agent } = await signedIn('MANAGER');
      const before = (await agent.get(`${API}/admin/badges`).expect(200)).body as AdminBadges;
      const product = await createProduct(ctx.prisma, {
        categoryId,
        variants: [{ price: '30000', stock: 1 }],
      });
      const number = await placeOrder(product.variants[0]!.id, 1);

      const after = (await agent.get(`${API}/admin/badges`).expect(200)).body as AdminBadges;
      expect(after.ordersByStatus.PENDING).toBe(before.ordersByStatus.PENDING + 1);
      // The only pack is sold out now, so it is at or below its low-stock level.
      expect(after.lowStock).toBe(before.lowStock + 1);
      expect(after.newInquiries).toEqual(before.newInquiries);

      // The list filters by payment status too (cash orders wait for payment until delivery).
      const unpaid = (
        await agent.get(`${API}/admin/orders?paymentStatus=PENDING&q=${number}`).expect(200)
      ).body as Paginated<AdminOrderListItem>;
      expect(unpaid.items.map((order) => order.number)).toEqual([number]);
      const paid = (
        await agent.get(`${API}/admin/orders?paymentStatus=PAID&q=${number}`).expect(200)
      ).body as Paginated<AdminOrderListItem>;
      expect(paid.items).toEqual([]);
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

    it("stores the store list and shows only the shown stores, in the visitor's language", async () => {
      const { agent } = await signedIn('ADMIN');
      const shop = {
        id: 'shop-chilonzor',
        name: 'TERAN Chilonzor',
        address: { uz: 'Bunyodkor shoh koʻchasi 12', ru: 'проспект Бунёдкор, 12', en: '' },
        hours: { uz: 'Du–Ju 9:00–18:00', ru: 'Пн–Пт 9:00–18:00', en: '' },
        phone: '+998 71 200 00 01',
        latitude: 41.2856,
        longitude: 69.2034,
        kinds: ['SHOP'],
        active: true,
      };
      const hidden = {
        ...shop,
        id: 'dealer-namangan',
        name: 'Hidden dealer',
        hours: null,
        phone: null,
        kinds: ['DEALER'],
        active: false,
      };
      await agent.put(`${API}/admin/settings/stores`).send([shop, hidden]).expect(200);

      const uz = await request(server()).get(`${API}/content/settings?locale=uz`).expect(200);
      expect(uz.body.stores).toEqual([
        {
          id: 'shop-chilonzor',
          name: 'TERAN Chilonzor',
          address: 'Bunyodkor shoh koʻchasi 12',
          hours: 'Du–Ju 9:00–18:00',
          phone: '+998 71 200 00 01',
          latitude: 41.2856,
          longitude: 69.2034,
          kinds: ['SHOP'],
          image: null,
        },
      ]);
      const ru = await request(server()).get(`${API}/content/settings?locale=ru`).expect(200);
      expect(ru.body.stores[0]).toMatchObject({
        address: 'проспект Бунёдкор, 12',
        hours: 'Пн–Пт 9:00–18:00',
      });
      // Without an English text the Uzbek one is shown.
      const en = await request(server()).get(`${API}/content/settings?locale=en`).expect(200);
      expect(en.body.stores[0]).toMatchObject({ address: 'Bunyodkor shoh koʻchasi 12' });

      // A place off the globe, a missing Uzbek address or an unknown kind is refused.
      await agent
        .put(`${API}/admin/settings/stores`)
        .send([{ ...shop, latitude: 123 }])
        .expect(400);
      await agent
        .put(`${API}/admin/settings/stores`)
        .send([{ ...shop, address: { uz: ' ', ru: '', en: '' } }])
        .expect(400);
      await agent
        .put(`${API}/admin/settings/stores`)
        .send([{ ...shop, kinds: ['KIOSK'] }])
        .expect(400);
      const manager = await signedIn('MANAGER');
      await manager.agent.put(`${API}/admin/settings/stores`).send([]).expect(403);

      await agent.put(`${API}/admin/settings/stores`).send([]).expect(200);
      const cleared = await request(server()).get(`${API}/content/settings?locale=uz`).expect(200);
      expect(cleared.body.stores).toEqual([]);
    });

    it("finds a store's address on the map, for administrators only", async () => {
      // OpenStreetMap's geocoder answers from here; every other request goes out as usual.
      const realFetch = globalThis.fetch;
      const asked: string[] = [];
      const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
        const url = input instanceof Request ? input.url : String(input);
        if (!url.startsWith('https://nominatim.openstreetmap.org/')) return realFetch(input, init);
        asked.push(url);
        return Response.json([
          { display_name: 'Toʻraqoʻrgʻon koʻchasi, Namangan', lat: '40.990448', lon: '71.641952' },
        ]);
      });
      try {
        const { agent } = await signedIn('ADMIN');
        const found = await agent
          .get(`${API}/admin/settings/stores/geocode`)
          .query({ q: 'Toʻraqoʻrgʻon koʻchasi, Namangan', locale: 'uz' })
          .expect(200);
        expect(found.body).toEqual({
          query: 'Toʻraqoʻrgʻon koʻchasi, Namangan',
          results: [
            {
              label: 'Toʻraqoʻrgʻon koʻchasi, Namangan',
              latitude: 40.990448,
              longitude: 71.641952,
            },
          ],
        });
        expect(found.headers['cache-control']).toContain('no-store');
        expect(new URL(asked[0]!).searchParams.get('countrycodes')).toBe('uz');

        // Too short to look up; managers and visitors may not.
        await agent.get(`${API}/admin/settings/stores/geocode`).query({ q: 'x' }).expect(400);
        const manager = await signedIn('MANAGER');
        await manager.agent
          .get(`${API}/admin/settings/stores/geocode`)
          .query({ q: 'Namangan' })
          .expect(403);
        await request(server())
          .get(`${API}/admin/settings/stores/geocode`)
          .query({ q: 'Namangan' })
          .expect(401);
        expect(asked).toHaveLength(1);
      } finally {
        spy.mockRestore();
      }
    });

    it('sets, replaces and removes page pictures, and refuses unknown places', async () => {
      const { agent } = await signedIn('ADMIN');
      const wide = await sharp({
        create: { width: 2400, height: 400, channels: 3, background: { r: 160, g: 210, b: 90 } },
      })
        .png()
        .toBuffer();
      const first = await agent
        .post(`${API}/admin/settings/visuals/banner:catalog`)
        .attach('file', wide, { filename: 'banner.png', contentType: 'image/png' })
        .attach('mobile', await png(800), { filename: 'phone.png', contentType: 'image/png' })
        .field('source', 'https://example.com/banner.png')
        .expect(201);
      const stored = first.body.visuals['banner:catalog'];
      expect(stored).toMatchObject({ source: 'https://example.com/banner.png' });
      // Wide pictures get renditions up to 5120 px, as far as their own width (2400 px here).
      expect(stored.image.widths).toEqual([320, 480, 640, 800, 960, 1080, 1280, 1600, 1920, 2400]);
      expect(stored.mobile.widths).toEqual([320, 480, 640, 800]);

      const settings = await request(server()).get(`${API}/content/settings?locale=uz`).expect(200);
      expect(settings.body.visuals['banner:catalog']).toMatchObject({
        image: { src: `/uploads/${stored.image.key}`, width: 2400, height: 400, alt: '' },
        mobile: { src: `/uploads/${stored.mobile.key}` },
      });

      // A new picture replaces the old one and its files; the phone crop stays.
      const replaced = await agent
        .post(`${API}/admin/settings/visuals/banner:catalog`)
        .attach('file', await png(600), { filename: 'other.png', contentType: 'image/png' })
        .expect(201);
      const uploads = TEST_ENV.UPLOADS_DIR!;
      expect(existsSync(join(uploads, stored.image.key, '320.webp'))).toBe(false);
      expect(replaced.body.visuals['banner:catalog'].mobile.key).toBe(stored.mobile.key);
      expect(existsSync(join(uploads, stored.mobile.key, '320.webp'))).toBe(true);

      // A film playing in the place (set by the import script) is replaced by a new picture too.
      const filmKey = `visuals/${randomUUID()}/film12345678`;
      mkdirSync(join(uploads, filmKey), { recursive: true });
      writeFileSync(join(uploads, filmKey, 'video.mp4'), 'film');
      const row = await ctx.prisma.siteSetting.findUniqueOrThrow({ where: { key: 'visuals' } });
      const withFilm = row.value as Record<string, Prisma.InputJsonObject>;
      withFilm['banner:catalog'] = {
        ...withFilm['banner:catalog'],
        video: { key: filmKey, type: 'video/mp4', width: 736, height: 414, widths: [3840, 1280] },
      };
      await ctx.prisma.siteSetting.update({ where: { key: 'visuals' }, data: { value: withFilm } });
      const playing = await request(server()).get(`${API}/content/settings?locale=uz`).expect(200);
      // Its copies at other widths are listed with it, narrowest first.
      expect(playing.body.visuals['banner:catalog'].video).toEqual({
        src: `/uploads/${filmKey}/video.mp4`,
        type: 'video/mp4',
        width: 736,
        height: 414,
        mask: null,
        focusX: 50,
        focusY: 50,
        sources: [
          { src: `/uploads/${filmKey}/video.mp4`, width: 736 },
          { src: `/uploads/${filmKey}/w1280.mp4`, width: 1280 },
          { src: `/uploads/${filmKey}/w3840.mp4`, width: 3840 },
        ],
      });
      const pictured = await agent
        .post(`${API}/admin/settings/visuals/banner:catalog`)
        .attach('file', await png(600), { filename: 'still.png', contentType: 'image/png' })
        .expect(201);
      expect(pictured.body.visuals['banner:catalog'].video).toBeNull();
      expect(existsSync(join(uploads, filmKey, 'video.mp4'))).toBe(false);

      // The phone crop on its own: replaced, then removed.
      const phone = await agent
        .post(`${API}/admin/settings/visuals/banner:catalog/mobile`)
        .attach('file', await png(700), { filename: 'phone2.png', contentType: 'image/png' })
        .expect(201);
      const newPhone = phone.body.visuals['banner:catalog'].mobile.key;
      expect(newPhone).not.toBe(stored.mobile.key);
      expect(existsSync(join(uploads, stored.mobile.key, '320.webp'))).toBe(false);
      await agent.delete(`${API}/admin/settings/visuals/banner:catalog/mobile`).expect(200);
      expect(existsSync(join(uploads, newPhone, '320.webp'))).toBe(false);
      await agent
        .post(`${API}/admin/settings/visuals/about.showcase/mobile`)
        .attach('file', await png(700), { filename: 'phone3.png', contentType: 'image/png' })
        .expect(400);

      await agent.delete(`${API}/admin/settings/visuals/banner:catalog`).expect(200);
      const cleared = await request(server()).get(`${API}/content/settings?locale=uz`).expect(200);
      expect(cleared.body.visuals).toEqual({});

      await agent
        .post(`${API}/admin/settings/visuals/home.hero`)
        .attach('file', await png(600), { filename: 'x.png', contentType: 'image/png' })
        .expect(400);
      await agent
        .post(`${API}/admin/settings/visuals/about.hero`)
        .attach('file', await png(80), { filename: 'tiny.png', contentType: 'image/png' })
        .expect(400);
      const manager = await signedIn('MANAGER');
      await manager.agent
        .post(`${API}/admin/settings/visuals/about.hero`)
        .attach('file', await png(600), { filename: 'x.png', contentType: 'image/png' })
        .expect(403);
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
  describe('media ("Lavhalar")', () => {
    function media(title: string, overrides: Partial<MediaUpsertInput> = {}): MediaUpsertInput {
      return {
        kind: 'PHOTO',
        status: 'DRAFT',
        isFeatured: true,
        videoDurationSeconds: null,
        translations: { uz: { title }, ru: null, en: { title: `${title} (en)` } },
        ...overrides,
      };
    }

    async function visible(query = '') {
      const response = await request(server())
        .get(`${API}/content/media?locale=en${query}`)
        .expect(200);
      return (response.body as Paginated<unknown>).items.map((item) => mediaItemSchema.parse(item));
    }

    /** The smallest file that starts like an MP4 (an ISO base media "ftyp" box). */
    const mp4 = Buffer.concat([
      Buffer.from([0, 0, 0, 0x18]),
      Buffer.from('ftypisom', 'latin1'),
      Buffer.from([0, 0, 2, 0]),
      Buffer.from('isomiso2', 'latin1'),
      Buffer.alloc(64),
    ]);

    it('publishes photographs and films only with their files, each kind in its own order', async () => {
      const { agent } = await signedIn('ADMIN');
      // A new item is a draft until its photograph exists.
      const blocked = await agent
        .post(`${API}/admin/media`)
        .send(media('Dawn', { status: 'PUBLISHED' }))
        .expect(422);
      expect(blocked.body).toMatchObject({
        code: 'PUBLICATION_BLOCKED',
        details: { missing: ['image'] },
      });
      const photo = (await agent.post(`${API}/admin/media`).send(media('Dawn')).expect(201))
        .body as AdminMediaItem;
      expect(photo).toMatchObject({ status: 'DRAFT', image: null, video: null, position: 0 });
      expect(photo.readiness.ready).toBe(false);
      const early = await agent
        .put(`${API}/admin/media/${photo.id}`)
        .send(media('Dawn', { status: 'PUBLISHED' }))
        .expect(422);
      expect(early.body.details).toEqual({ missing: ['image'] });
      await agent
        .post(`${API}/admin/media/${photo.id}/image`)
        .attach('file', await png(400), { filename: 'dawn.png', contentType: 'image/png' })
        .expect(201);
      const published = (
        await agent
          .put(`${API}/admin/media/${photo.id}`)
          .send(media('Dawn', { status: 'PUBLISHED' }))
          .expect(200)
      ).body as AdminMediaItem;
      expect(published.publishedAt).not.toBeNull();
      // Gallery pictures also keep their own width (ADR-056): 320 px, then the 400 px original.
      expect(published.image?.widths).toEqual([320, 400]);

      // A film needs its poster and a real MP4 or WebM file, never just a file name.
      const film = (
        await agent
          .post(`${API}/admin/media`)
          .send(media('Harvest', { kind: 'VIDEO', videoDurationSeconds: 95 }))
          .expect(201)
      ).body as AdminMediaItem;
      // Films are ordered among films: the first film comes first.
      expect(film.position).toBe(0);
      // A film never becomes a photograph (and the other way round).
      const switched = await agent
        .put(`${API}/admin/media/${film.id}`)
        .send(media('Harvest', { kind: 'PHOTO' }))
        .expect(409);
      expect(switched.body.details).toEqual({ reason: 'kind_fixed' });
      await agent
        .post(`${API}/admin/media/${film.id}/image`)
        .attach('file', await png(400), { filename: 'poster.png', contentType: 'image/png' })
        .expect(201);
      const filmPublish = media('Harvest', {
        kind: 'VIDEO',
        status: 'PUBLISHED',
        videoDurationSeconds: 95,
      });
      const noFile = await agent.put(`${API}/admin/media/${film.id}`).send(filmPublish).expect(422);
      expect(noFile.body.details).toEqual({ missing: ['video'] });
      // Handed over, then refused once read (ADR-062): the item says why.
      const page = Buffer.from('<html>not a film</html>'.padEnd(64));
      expect((await uploadFilm(agent, film.id, page)).status).toBe(202);
      expect((await waitForFilm(agent, film.id)).videoJob).toEqual({
        state: 'failed',
        percent: null,
        reason: 'unsupported_video',
      });
      // Sent in pieces, as the admin area sends a film of any size (ADR-061).
      const uploaded = await uploadFilm(agent, film.id, mp4, { pieceBytes: 40 });
      expect(uploaded.status).toBe(202);
      const withFile = await waitForFilm(agent, film.id);
      expect(withFile.videoJob).toBeNull();
      expect(withFile.video).toMatchObject({
        type: 'video/mp4',
        bytes: mp4.length,
        hasAudio: false,
      });
      await agent.put(`${API}/admin/media/${film.id}`).send(filmPublish).expect(200);

      // A second photograph comes first (the newest leads its list), then the photographs are
      // reordered (films keep their own order).
      const noon = (await agent.post(`${API}/admin/media`).send(media('Noon')).expect(201))
        .body as AdminMediaItem;
      expect(noon.position).toBe(0);
      await agent
        .post(`${API}/admin/media/${noon.id}/image`)
        .attach('file', await png(420), { filename: 'noon.png', contentType: 'image/png' })
        .expect(201);
      await agent
        .put(`${API}/admin/media/${noon.id}`)
        .send(media('Noon', { status: 'PUBLISHED' }))
        .expect(200);
      expect((await visible('&kind=PHOTO')).map((item) => item.title)).toEqual([
        'Noon (en)',
        'Dawn (en)',
      ]);
      await agent
        .put(`${API}/admin/media/order`)
        .send({ kind: 'PHOTO', ids: [noon.id, film.id] })
        .expect(400);
      const photos = (
        await agent
          .put(`${API}/admin/media/order`)
          .send({ kind: 'PHOTO', ids: [photo.id, noon.id] })
          .expect(200)
      ).body as AdminMediaItem[];
      expect(photos.map((item) => item.kind)).toEqual(['PHOTO', 'PHOTO']);
      expect((await visible('&kind=PHOTO')).map((item) => item.title)).toEqual([
        'Dawn (en)',
        'Noon (en)',
      ]);
      const films = await visible('&kind=VIDEO');
      expect(films.map((item) => item.title)).toEqual(['Harvest (en)']);
      expect(films[0]?.video).toMatchObject({
        type: 'video/mp4',
        durationSeconds: 95,
        hasAudio: false,
      });
      expect(films[0]?.video?.src).toMatch(/^\/uploads\/media\/.+\/video\.mp4$/);
      const videosOnly = (await agent.get(`${API}/admin/media?kind=VIDEO`).expect(200))
        .body as AdminMediaItem[];
      expect(videosOnly.map((item) => item.id)).toEqual([film.id]);

      // Unpublished again (or archived), an item disappears; deleted, its files go with it.
      await agent
        .put(`${API}/admin/media/${photo.id}`)
        .send(media('Dawn', { status: 'DRAFT' }))
        .expect(200);
      await agent
        .put(`${API}/admin/media/${noon.id}`)
        .send(media('Noon', { status: 'ARCHIVED' }))
        .expect(200);
      expect((await visible()).map((item) => item.title)).toEqual(['Harvest (en)']);
      const videoKey = (await ctx.prisma.mediaItem.findUniqueOrThrow({ where: { id: film.id } }))
        .videoKey!;
      expect(existsSync(join(TEST_ENV.UPLOADS_DIR!, videoKey, 'video.mp4'))).toBe(true);
      await agent.delete(`${API}/admin/media/${film.id}`).expect(204);
      expect(existsSync(join(TEST_ENV.UPLOADS_DIR!, videoKey, 'video.mp4'))).toBe(false);
      expect(await visible()).toEqual([]);

      const audit = (await agent.get(`${API}/admin/audit`).expect(200))
        .body as Paginated<AdminAuditEntry>;
      expect(audit.items.map((entry) => entry.action)).toEqual(
        expect.arrayContaining(['media.create', 'media.video', 'media.reorder', 'media.delete']),
      );
    });

    it('keeps shorts as a kind of their own: a film file, their own list and order (ADR-059)', async () => {
      const { agent } = await signedIn('ADMIN');
      const short = (
        await agent
          .post(`${API}/admin/media`)
          .send(media('Steam', { kind: 'SHORT' }))
          .expect(201)
      ).body as AdminMediaItem;
      expect(short).toMatchObject({ kind: 'SHORT', position: 0 });
      expect((await uploadFilm(agent, short.id, mp4)).status).toBe(202);
      expect((await waitForFilm(agent, short.id)).video).not.toBeNull();
      await agent
        .post(`${API}/admin/media/${short.id}/image`)
        .attach('file', await png(400), { filename: 'steam.png', contentType: 'image/png' })
        .expect(201);
      await agent
        .put(`${API}/admin/media/${short.id}`)
        .send(media('Steam', { kind: 'SHORT', status: 'PUBLISHED' }))
        .expect(200);

      // Listed as a short only, with its film; the home page's feed reads exactly this.
      const shorts = await visible('&kind=SHORT&featured=true');
      expect(shorts.map((item) => [item.title, item.kind])).toEqual([['Steam (en)', 'SHORT']]);
      expect(shorts[0]?.video).toMatchObject({ type: 'video/mp4' });
      expect(await visible('&kind=VIDEO')).toEqual([]);
      const adminShorts = (await agent.get(`${API}/admin/media?kind=SHORT`).expect(200))
        .body as AdminMediaItem[];
      expect(adminShorts.map((item) => item.id)).toEqual([short.id]);
      // Its order is its own: reordering shorts names shorts only.
      await agent
        .put(`${API}/admin/media/order`)
        .send({ kind: 'SHORT', ids: [short.id] })
        .expect(200);
      await agent.delete(`${API}/admin/media/${short.id}`).expect(204);
    });
  });
});
