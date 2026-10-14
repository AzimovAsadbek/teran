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
import { DEMO_COLLECTIONS, DEMO_PRODUCTS, EARLIER_DEMO_COPY } from '../prisma/seed/demo-catalog.js';
import { removeDemoData } from '../prisma/seed/remove.js';
import { createTestApp, type TestApp } from './helpers/app.js';
import { createProduct, createUser, resetDatabase } from './helpers/fixtures.js';

const API = '/api/v1';
const uploadsDir = join(tmpdir(), 'teran-demo-seed-test');

describe('demo seed', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
    // Images are skipped (emblem: null): rendering is covered by running the seed itself.
    await seedCatalogue(ctx.prisma, { uploadsDir, emblem: null });
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
    const catalogue = await seedCatalogue(ctx.prisma, { uploadsDir, emblem: null });
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

  it('updates identifier products seeded before the packs once, and leaves edited ones alone', async () => {
    const prisma = ctx.prisma;
    const oolong = await prisma.category.findUniqueOrThrow({ where: { slug: 'oolong' } });
    const premium = await prisma.collection.findUniqueOrThrow({ where: { slug: 'teran-premium' } });
    const earlier = EARLIER_DEMO_COPY.collections['teran-premium']!;

    // XC2025 as an earlier seed wrote it: an oolong with invented copy and a 100 g pack.
    const xc = await prisma.product.findUniqueOrThrow({ where: { slug: 'teran-xc2025' } });
    await prisma.product.update({
      where: { id: xc.id },
      data: { categoryId: oolong.id, isFeatured: false, brewTempCelsius: 85 },
    });
    await prisma.productTranslation.update({
      where: { productId_locale: { productId: xc.id, locale: 'uz' } },
      data: { description: `XC2025. ${EARLIER_DEMO_COPY.identifierMarker} ulun choyi sifatida.` },
    });
    await prisma.productVariant.update({
      where: { sku: 'TRN-XC2025-400' },
      data: { sku: 'TRN-XC2025-100', weightGrams: 100 },
    });
    // G8810 edited in the admin since (no earlier demo copy): must stay as it is.
    const g = await prisma.product.findUniqueOrThrow({ where: { slug: 'teran-g8810' } });
    await prisma.product.update({ where: { id: g.id }, data: { categoryId: oolong.id } });
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

    const report = await seedCatalogue(prisma, { uploadsDir, emblem: null });
    expect(report).toEqual({ products: 0, articles: 0, structure: 2 });

    const updated = await prisma.product.findUniqueOrThrow({
      where: { id: xc.id },
      include: { category: true, variants: true, translations: true },
    });
    expect(updated.category.slug).toBe('green-tea');
    expect(updated.isFeatured).toBe(true);
    expect(updated.brewTempCelsius).toBe(90);
    expect(
      updated.variants.map((variant) => [variant.sku, variant.weightGrams, variant.isActive]),
    ).toEqual(
      expect.arrayContaining([
        ['TRN-XC2025-100', 100, false],
        ['TRN-XC2025-400', 400, true],
      ]),
    );
    const uz = updated.translations.find((translation) => translation.locale === 'uz')!;
    expect(uz.description).toMatch(/400 g qadoqda/);
    expect(uz.origin).toBe('Xitoy');
    expect(Number(updated.minPrice)).toBe(189000);

    const untouched = await prisma.product.findUniqueOrThrow({
      where: { id: g.id },
      include: { category: true, translations: { where: { locale: 'uz' } } },
    });
    expect(untouched.category.slug).toBe('oolong');
    expect(untouched.translations[0]!.description).toBe('Admin yozgan tavsif.');

    const texts = await prisma.collectionTranslation.findMany({
      where: { collectionId: premium.id },
    });
    const text = (locale: string) => texts.find((entry) => entry.locale === locale)?.description;
    const current = DEMO_COLLECTIONS.find((item) => item.slug === 'teran-premium')!.description;
    expect(text('en')).toBe(current.en);
    expect(text('ru')).toBe('Текст владельца.');

    // Once only.
    expect(await seedCatalogue(prisma, { uploadsDir, emblem: null })).toEqual({
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

    await seedCatalogue(prisma, { uploadsDir, emblem: null });
    const activity = await seedActivity(prisma);
    expect(activity.orders).toBe(DEMO_ORDERS.length);
    expect(activity.skipped).toEqual([]);
  });
});
