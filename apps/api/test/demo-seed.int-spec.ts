import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { DISABLED_PASSWORD_HASH, seedActivity } from '../prisma/seed/activity.js';
import { seedCatalogue } from '../prisma/seed/catalogue.js';
import {
  DEMO_CONTACT_INQUIRIES,
  DEMO_CUSTOMERS,
  DEMO_ORDERS,
  DEMO_SUBSCRIBERS,
  DEMO_WHOLESALE_INQUIRIES,
} from '../prisma/seed/demo-activity.js';
import {
  DEMO_CATEGORIES,
  DEMO_COLLECTIONS,
  DEMO_PRODUCTS,
  EARLIER_DEMO_COPY,
} from '../prisma/seed/demo-catalog.js';
import { removeDemoData } from '../prisma/seed/remove.js';
import { createTestApp, type TestApp } from './helpers/app.js';
import { createProduct, createUser, resetDatabase } from './helpers/fixtures.js';

const API = '/api/v1';
const uploadsDir = join(tmpdir(), 'teran-demo-seed-test');
/** As the end-to-end stack seeds: TERAN's teas and the generic test range. */
const withTests = { uploadsDir, emblem: null, testCatalogue: true } as const;

describe('demo seed', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
    // Images are skipped (emblem: null): rendering is covered by running the seed itself.
    await seedCatalogue(ctx.prisma, withTests);
    const activity = await seedActivity(ctx.prisma);
    expect(activity.skipped).toEqual([]);
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('loads every demo record', async () => {
    const prisma = ctx.prisma;
    expect(await prisma.product.count()).toBe(DEMO_PRODUCTS.length);
    expect(await prisma.order.count({ where: { number: { startsWith: 'TRN-DEMO' } } })).toBe(
      DEMO_ORDERS.length,
    );
    expect(await prisma.user.count({ where: { role: 'CUSTOMER' } })).toBe(DEMO_CUSTOMERS.length);
    expect(await prisma.contactInquiry.count()).toBe(DEMO_CONTACT_INQUIRIES.length);
    expect(await prisma.wholesaleInquiry.count()).toBe(DEMO_WHOLESALE_INQUIRIES.length);
    expect(await prisma.newsletterSubscriber.count()).toBe(DEMO_SUBSCRIBERS.length);
  });

  it('is idempotent: a second run adds nothing', async () => {
    const catalogue = await seedCatalogue(ctx.prisma, withTests);
    const activity = await seedActivity(ctx.prisma);
    expect(catalogue).toEqual({ products: 0, articles: 0, structure: 0 });
    expect(activity).toEqual({
      customers: 0,
      orders: 0,
      contactInquiries: 0,
      wholesaleInquiries: 0,
      subscribers: 0,
      skipped: [],
    });
  });

  it('brings TERAN products seeded before the owner described them up to date once, and leaves edited ones alone', async () => {
    const prisma = ctx.prisma;
    const black = await prisma.category.findUniqueOrThrow({ where: { slug: 'black-tea' } });
    const premium = await prisma.collection.findUniqueOrThrow({ where: { slug: 'teran-premium' } });
    const earlier = EARLIER_DEMO_COPY.collections['teran-premium']!.at(-1)!;

    // 8800 as an earlier seed wrote it: "HET8800", an invented black tea in 100 g packs.
    const het = await prisma.product.findUniqueOrThrow({ where: { slug: 'teran-8800' } });
    await prisma.product.update({
      where: { id: het.id },
      data: { slug: 'teran-het8800', categoryId: black.id, brewTempCelsius: 95 },
    });
    await prisma.productTranslation.update({
      where: { productId_locale: { productId: het.id, locale: 'uz' } },
      data: { description: `HET8800. ${EARLIER_DEMO_COPY.identifierMarker} qora choy sifatida.` },
    });
    await prisma.productVariant.update({
      where: { sku: 'TRN-8800-400' },
      data: { sku: 'TRN-HET8800-100', weightGrams: 100, barcode: null },
    });
    // 8009 with the pack-based demo copy, its old SKU, a discount and low stock.
    const pack = await prisma.product.findUniqueOrThrow({ where: { slug: 'teran-8009' } });
    await prisma.product.update({ where: { id: pack.id }, data: { slug: 'teran-std8009' } });
    await prisma.productTranslation.update({
      where: { productId_locale: { productId: pack.id, locale: 'uz' } },
      data: { description: `8009. ${EARLIER_DEMO_COPY.packMarker}; narx va qoldiq taxminiy.` },
    });
    await prisma.productVariant.update({
      where: { sku: 'TRN-8009-400' },
      data: { sku: 'TRN-STD8009-400', compareAtPrice: 199000 },
    });
    // G8810 edited in the admin since (no earlier demo copy): must stay as it is.
    const g = await prisma.product.findUniqueOrThrow({ where: { slug: 'teran-g8810' } });
    await prisma.product.update({ where: { id: g.id }, data: { categoryId: black.id } });
    await prisma.productTranslation.update({
      where: { productId_locale: { productId: g.id, locale: 'uz' } },
      data: { description: 'Admin yozgan tavsif.' },
    });
    // The collection text: English as the earlier seed wrote it, Russian edited by the owner.
    await prisma.collectionTranslation.update({
      where: { collectionId_locale: { collectionId: premium.id, locale: 'en' } },
      data: { description: earlier.en },
    });
    await prisma.collectionTranslation.update({
      where: { collectionId_locale: { collectionId: premium.id, locale: 'ru' } },
      data: { description: 'Текст владельца.' },
    });

    const report = await seedCatalogue(prisma, withTests);
    expect(report).toEqual({ products: 0, articles: 0, structure: 3 });

    const eight = await prisma.product.findUniqueOrThrow({
      where: { id: het.id },
      include: { category: true, variants: true, translations: true },
    });
    expect(eight.slug).toBe('teran-8800');
    expect(eight.category.slug).toBe('green-tea');
    expect([eight.brewTempCelsius, eight.brewTempMaxCelsius]).toEqual([85, 90]);
    expect([Number(eight.brewAmountGrams), Number(eight.brewAmountMaxGrams)]).toEqual([3, 5]);
    expect(
      eight.variants.map((variant) => [variant.sku, variant.weightGrams, variant.isActive]),
    ).toEqual(
      expect.arrayContaining([
        ['TRN-HET8800-100', 100, false],
        ['TRN-8800-400', 400, true],
      ]),
    );
    expect(eight.variants.find((variant) => variant.isActive)?.barcode).toBe('4780179230045');
    const uz = eight.translations.find((translation) => translation.locale === 'uz')!;
    expect(uz.name).toBe('TERAN 8800');
    expect(uz.description).toMatch(/400 g zip-paketda/);
    expect(uz.origin).toBe('Xitoy, Hunan');
    expect(
      await prisma.slugRedirect.findUnique({
        where: { entity_fromSlug: { entity: 'PRODUCT', fromSlug: 'teran-het8800' } },
      }),
    ).toMatchObject({ toId: het.id });

    // The same pack row, renamed: orders keep pointing at it; the discount is gone.
    const renamed = await prisma.productVariant.findUniqueOrThrow({
      where: { sku: 'TRN-8009-400' },
      include: { product: true },
    });
    expect(renamed.product.slug).toBe('teran-8009');
    expect(renamed.compareAtPrice).toBeNull();
    expect(renamed.stockQuantity).toBe(50);

    const untouched = await prisma.product.findUniqueOrThrow({
      where: { id: g.id },
      include: { category: true, translations: { where: { locale: 'uz' } } },
    });
    expect(untouched.category.slug).toBe('black-tea');
    expect(untouched.translations[0]!.description).toBe('Admin yozgan tavsif.');

    const texts = await prisma.collectionTranslation.findMany({
      where: { collectionId: premium.id },
    });
    const text = (locale: string) => texts.find((entry) => entry.locale === locale)?.description;
    const current = DEMO_COLLECTIONS.find((item) => item.slug === 'teran-premium')!.description;
    expect(text('en')).toBe(current.en);
    expect(text('ru')).toBe('Текст владельца.');

    // Once only.
    expect(await seedCatalogue(prisma, withTests)).toEqual({
      products: 0,
      articles: 0,
      structure: 0,
    });
  });

  it('archives the generic test range where the shop sells only its own teas', async () => {
    const prisma = ctx.prisma;
    // The previous test left G8810 in Black tea (an admin edit); the shop sells green tea only.
    const green = await prisma.category.findUniqueOrThrow({ where: { slug: 'green-tea' } });
    await prisma.product.update({
      where: { slug: 'teran-g8810' },
      data: { categoryId: green.id },
    });
    const later = { uploadsDir, emblem: null, testRangeRetiredAt: new Date(Date.now() + 60_000) };
    const report = await seedCatalogue(prisma, later);
    const testProducts = DEMO_PRODUCTS.filter((product) => product.testOnly);
    const testCategories = DEMO_CATEGORIES.filter((category) => category.testOnly);
    const testCollections = DEMO_COLLECTIONS.filter((collection) => collection.testOnly);
    expect(report.structure).toBe(
      testProducts.length + testCategories.length + testCollections.length,
    );
    const live = await prisma.product.findMany({
      where: { status: { not: 'ARCHIVED' } },
      select: { slug: true },
      orderBy: { slug: 'asc' },
    });
    expect(live.map((product) => product.slug)).toEqual(
      DEMO_PRODUCTS.filter((product) => !product.testOnly)
        .map((product) => product.slug)
        .sort(),
    );
    expect(
      await prisma.category.count({
        where: { slug: { in: testCategories.map((category) => category.slug) }, isActive: true },
      }),
    ).toBe(0);
    // Archived, not deleted: the demo orders still point at their packs.
    expect(await prisma.product.count()).toBe(DEMO_PRODUCTS.length);
    expect(await seedCatalogue(prisma, later)).toEqual({
      products: 0,
      articles: 0,
      structure: 0,
    });
  });

  it('keeps the inventory ledger in step with stock', async () => {
    const variants = await ctx.prisma.productVariant.findMany({
      include: { inventoryMovements: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } },
    });
    for (const variant of variants) {
      const movements = variant.inventoryMovements;
      const total = movements.reduce((sum, movement) => sum + movement.delta, 0);
      expect(total, variant.sku).toBe(variant.stockQuantity);
      if (movements.length > 0) {
        expect(movements.at(-1)!.quantityAfter, variant.sku).toBe(variant.stockQuantity);
      }
      expect(variant.stockQuantity).toBeGreaterThanOrEqual(0);
    }
  });

  it('writes orders like checkout: snapshots, totals, one cash payment, full history', async () => {
    const orders = await ctx.prisma.order.findMany({
      include: { items: true, payments: true, events: { orderBy: { createdAt: 'asc' } } },
    });
    for (const order of orders) {
      const lines = order.items.reduce((sum, item) => sum + Number(item.lineTotal), 0);
      expect(Number(order.subtotal), order.number).toBe(lines);
      expect(Number(order.total)).toBe(Number(order.subtotal) + Number(order.deliveryFee));
      expect(order.paymentMethod).toBe('CASH_ON_DELIVERY');
      expect(order.payments).toHaveLength(1);
      expect(order.payments[0]!.status).toBe(order.paymentStatus);
      expect(order.payments[0]!.providerReference).toBeNull();
      expect(order.events[0]!.toStatus).toBe('PENDING');
      const statusEvents = order.events.filter((event) => event.fromStatus !== event.toStatus);
      expect(statusEvents.at(-1)!.toStatus).toBe(order.status);
      expect(order.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
      if (order.paymentStatus === 'PAID') expect(order.status).toBe('DELIVERED');
    }
  });

  it('creates demo customers that cannot sign in', async () => {
    const customer = DEMO_CUSTOMERS[0]!;
    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { email: customer.email } });
    expect(user.passwordHash).toBe(DISABLED_PASSWORD_HASH);
    for (const password of ['', DISABLED_PASSWORD_HASH, 'demo-password-123']) {
      await request(ctx.app.getHttpServer())
        .post(`${API}/auth/login`)
        .send({ email: customer.email, password })
        .expect((response) => expect([400, 401]).toContain(response.status));
    }
  });

  it('removes only demo data, then loads it again', async () => {
    const prisma = ctx.prisma;
    const staff = await createUser(prisma, 'ADMIN', 'owner@example.org');
    const customer = await createUser(prisma, 'CUSTOMER', 'real.customer@example.org');
    const green = await prisma.category.findUniqueOrThrow({ where: { slug: 'green-tea' } });
    await createProduct(prisma, { categoryId: green.id, slug: 'owner-added-tea' });

    const report = await removeDemoData(prisma, uploadsDir);
    expect(report.orders).toBe(DEMO_ORDERS.length);
    expect(report.products).toBe(DEMO_PRODUCTS.length);
    expect(report.customers).toBe(DEMO_CUSTOMERS.length);
    // The owner's product keeps its category, and that category keeps its parent.
    expect(report.kept).toEqual(['category green-tea', 'category tea']);

    expect(await prisma.order.count()).toBe(0);
    expect(await prisma.product.findMany({ select: { slug: true } })).toEqual([
      { slug: 'owner-added-tea' },
    ]);
    expect(await prisma.user.findUnique({ where: { id: staff.id } })).not.toBeNull();
    expect(await prisma.user.findUnique({ where: { id: customer.id } })).not.toBeNull();
    expect(await prisma.deliveryMethod.count()).toBeGreaterThan(0);
    expect(await prisma.contactInquiry.count()).toBe(0);
    expect(await prisma.newsletterSubscriber.count()).toBe(0);

    await seedCatalogue(prisma, withTests);
    const activity = await seedActivity(prisma);
    expect(activity.orders).toBe(DEMO_ORDERS.length);
    expect(activity.skipped).toEqual([]);
  });
});
