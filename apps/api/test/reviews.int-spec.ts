import { randomUUID } from 'node:crypto';
import request from 'supertest';
import {
  myReviewSchema,
  productListSchema,
  productReviewsSchema,
  productSummarySchema,
  type AdminReviewDto,
  type Paginated,
} from '@teran/contracts';
import { Prisma } from '../src/generated/prisma/client.js';
import { createTestApp, type TestApp } from './helpers/app.js';
import {
  TEST_PASSWORD,
  createCategory,
  createProduct,
  createUser,
  resetDatabase,
} from './helpers/fixtures.js';

const API = '/api/v1';

describe('product ratings and reviews (ADR-042)', () => {
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
  });

  const agent = () => request.agent(ctx.app.getHttpServer());

  async function signedIn(role: 'CUSTOMER' | 'MANAGER' = 'CUSTOMER', firstName = 'Aziza') {
    const user = await createUser(ctx.prisma, role);
    await ctx.prisma.user.update({
      where: { id: user.id },
      data: { firstName, lastName: 'karimova' },
    });
    const browser = agent();
    await browser
      .post(`${API}/auth/login`)
      .send({ email: user.email, password: TEST_PASSWORD })
      .expect(200);
    return { agent: browser, user };
  }

  async function tea() {
    return createProduct(ctx.prisma, { categoryId, variants: [{ price: '45000', stock: 10 }] });
  }

  /** A delivered order of the product for the user, as the shop would have recorded it. */
  async function delivered(userId: string, variantId: string) {
    await ctx.prisma.order.create({
      data: {
        number: `TRN-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`,
        status: 'DELIVERED',
        paymentMethod: 'CASH_ON_DELIVERY',
        locale: 'uz',
        userId,
        customerName: 'Aziza Karimova',
        customerPhone: '+998901234567',
        deliveryMethodName: 'Kuryer',
        regionCode: 'UZ-TK',
        city: 'Toshkent',
        subtotal: new Prisma.Decimal('45000'),
        deliveryFee: new Prisma.Decimal('0'),
        total: new Prisma.Decimal('45000'),
        idempotencyKey: randomUUID(),
        accessTokenHash: 'test',
        items: {
          create: {
            variantId,
            productName: 'Test tea',
            productSlug: 'test-tea',
            sku: 'SKU',
            unitPrice: new Prisma.Decimal('45000'),
            quantity: 1,
            lineTotal: new Prisma.Decimal('45000'),
          },
        },
      },
    });
  }

  async function summaryOf(slug: string) {
    const list = productListSchema.parse(
      (await request(ctx.app.getHttpServer()).get(`${API}/catalog/products`).expect(200)).body,
    );
    return productSummarySchema.parse(list.items.find((item) => item.slug === slug));
  }

  it('lets a customer rate a product once, shows it at once and keeps the average', async () => {
    const product = await tea();
    const first = await signedIn('CUSTOMER', 'Aziza');
    const second = await signedIn('CUSTOMER', 'Bobur');
    // Guests read reviews but cannot write one.
    await agent()
      .put(`${API}/catalog/products/${product.slug}/reviews/mine`)
      .send({ rating: 5 })
      .expect(401);
    expect((await summaryOf(product.slug)).rating).toBeNull();

    const saved = myReviewSchema.parse(
      (
        await first.agent
          .put(`${API}/catalog/products/${product.slug}/reviews/mine?locale=ru`)
          .send({ rating: 5, comment: '  Очень вкусный чай.  ' })
          .expect(200)
      ).body,
    );
    expect(saved).toMatchObject({
      rating: 5,
      comment: 'Очень вкусный чай.',
      authorName: 'Aziza K.',
      locale: 'ru',
      status: 'PUBLISHED',
      verifiedPurchase: false,
    });
    await second.agent
      .put(`${API}/catalog/products/${product.slug}/reviews/mine`)
      .send({ rating: 4, comment: '' })
      .expect(200);
    expect((await summaryOf(product.slug)).rating).toEqual({ average: 4.5, count: 2 });

    // Saving again replaces the customer's review instead of adding one.
    await first.agent
      .put(`${API}/catalog/products/${product.slug}/reviews/mine`)
      .send({ rating: 3 })
      .expect(200);
    const page = productReviewsSchema.parse(
      (await agent().get(`${API}/catalog/products/${product.slug}/reviews`).expect(200)).body,
    );
    expect(page.total).toBe(2);
    expect(page.summary).toEqual({ average: 3.5, count: 2, stars: [0, 1, 1, 0, 0] });
    expect(page.items.map((review) => review.authorName).sort()).toEqual(['Aziza K.', 'Bobur K.']);
    expect(page.items.find((review) => review.authorName === 'Bobur K.')?.comment).toBeNull();

    // The customer reads and deletes their own.
    const mine = (
      await first.agent.get(`${API}/catalog/products/${product.slug}/reviews/mine`).expect(200)
    ).body as { review: unknown };
    expect(myReviewSchema.parse(mine.review).rating).toBe(3);
    await first.agent.delete(`${API}/catalog/products/${product.slug}/reviews/mine`).expect(204);
    expect((await summaryOf(product.slug)).rating).toEqual({ average: 4, count: 1 });
    expect(
      (await first.agent.get(`${API}/catalog/products/${product.slug}/reviews/mine`).expect(200))
        .body,
    ).toEqual({ review: null });
  });

  it('marks a review from a customer who received the product, and refuses bad input', async () => {
    const product = await tea();
    const { agent: customer, user } = await signedIn();
    await delivered(user.id, product.variants[0]!.id);
    const saved = myReviewSchema.parse(
      (
        await customer
          .put(`${API}/catalog/products/${product.slug}/reviews/mine`)
          .send({ rating: 5 })
          .expect(200)
      ).body,
    );
    expect(saved.verifiedPurchase).toBe(true);

    await customer
      .put(`${API}/catalog/products/${product.slug}/reviews/mine`)
      .send({ rating: 6 })
      .expect(400);
    await customer
      .put(`${API}/catalog/products/${product.slug}/reviews/mine`)
      .send({ rating: 2.5 })
      .expect(400);
    await customer
      .put(`${API}/catalog/products/${product.slug}/reviews/mine`)
      .send({ rating: 4, comment: 'x'.repeat(1001) })
      .expect(400);
    // A product shoppers cannot see takes no reviews.
    const draft = await createProduct(ctx.prisma, {
      categoryId,
      status: 'DRAFT',
      variants: [{ price: '45000', stock: 10 }],
    });
    await customer
      .put(`${API}/catalog/products/${draft.slug}/reviews/mine`)
      .send({ rating: 5 })
      .expect(404);
    await agent().get(`${API}/catalog/products/${draft.slug}/reviews`).expect(404);
  });

  it('does not let staff rate products, and lets them hide, show and delete reviews', async () => {
    const product = await tea();
    const staff = await signedIn('MANAGER');
    await staff.agent
      .put(`${API}/catalog/products/${product.slug}/reviews/mine`)
      .send({ rating: 5 })
      .expect(403);

    const { agent: customer } = await signedIn();
    await customer
      .put(`${API}/catalog/products/${product.slug}/reviews/mine`)
      .send({ rating: 1, comment: 'Spam spam spam' })
      .expect(200);
    const list = (await staff.agent.get(`${API}/admin/reviews`).expect(200))
      .body as Paginated<AdminReviewDto>;
    expect(list.items).toHaveLength(1);
    const review = list.items[0]!;
    expect(review).toMatchObject({
      status: 'PUBLISHED',
      rating: 1,
      product: { slug: product.slug },
    });
    // Customers cannot reach the admin list.
    await customer.get(`${API}/admin/reviews`).expect(403);

    await staff.agent
      .patch(`${API}/admin/reviews/${review.id}`)
      .send({ status: 'HIDDEN' })
      .expect(204);
    expect((await summaryOf(product.slug)).rating).toBeNull();
    expect(
      productReviewsSchema.parse(
        (await agent().get(`${API}/catalog/products/${product.slug}/reviews`).expect(200)).body,
      ).total,
    ).toBe(0);
    // The author still sees it, marked hidden; saving again keeps it hidden.
    await customer
      .put(`${API}/catalog/products/${product.slug}/reviews/mine`)
      .send({ rating: 2 })
      .expect(200);
    const mine = (
      await customer.get(`${API}/catalog/products/${product.slug}/reviews/mine`).expect(200)
    ).body as { review: unknown };
    expect(myReviewSchema.parse(mine.review).status).toBe('HIDDEN');
    expect((await summaryOf(product.slug)).rating).toBeNull();

    await staff.agent
      .patch(`${API}/admin/reviews/${review.id}`)
      .send({ status: 'PUBLISHED' })
      .expect(204);
    expect((await summaryOf(product.slug)).rating).toEqual({ average: 2, count: 1 });

    await staff.agent.delete(`${API}/admin/reviews/${review.id}`).expect(204);
    expect((await summaryOf(product.slug)).rating).toBeNull();
    await staff.agent.delete(`${API}/admin/reviews/${review.id}`).expect(404);
    const actions = await ctx.prisma.auditLog.findMany({
      where: { entityType: 'ProductReview', entityId: review.id },
      orderBy: { createdAt: 'asc' },
      select: { action: true },
    });
    expect(actions.map((entry) => entry.action)).toEqual([
      'review.hide',
      'review.show',
      'review.delete',
    ]);
  });
});
