import { Injectable } from '@nestjs/common';
import {
  buildPaginated,
  ratingAverage,
  reviewAuthorName,
  type AdminReviewDto,
  type AdminReviewListQuery,
  type Locale,
  type MyReviewDto,
  type Paginated,
  type ProductReviewsDto,
  type PublicReviewDto,
  type ReviewStatus,
} from '@teran/contracts';
import { pageArgs, type Actor } from '../admin/admin-support.js';
import { AuditService } from '../audit/audit.service.js';
import type { RequestAuth } from '../auth/auth.types.js';
import { visibleProductWhere } from '../catalog/product-visibility.js';
import { pickTranslation } from '../common/i18n.js';
import { ApiException } from '../common/errors/api-exception.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RevalidationService } from '../revalidation/revalidation.service.js';

const AUTHOR = { select: { firstName: true, lastName: true } } as const;

type ReviewRow = Prisma.ProductReviewGetPayload<{ include: { user: typeof AUTHOR } }>;

function toPublicReview(row: ReviewRow): PublicReviewDto {
  return {
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    authorName: reviewAuthorName(row.user.firstName, row.user.lastName),
    verifiedPurchase: row.verifiedPurchase,
    locale: row.locale,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toMyReview(row: ReviewRow): MyReviewDto {
  return { ...toPublicReview(row), status: row.status };
}

/**
 * Product ratings and reviews (ADR-042). A signed-in customer rates a visible product 1 to 5
 * stars with an optional comment, once (saving again replaces it, a hidden review staying
 * hidden); it shows at once. Staff hide, show or delete reviews. Each change recounts the
 * product's published reviews into `ratingCount` / `ratingSum` in the same transaction, with the
 * product row locked so two reviews saved together cannot both miss each other, and asks the
 * storefront to refresh its catalogue (cards show the average).
 */
@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly revalidation: RevalidationService,
  ) {}

  /** A product shoppers can see, by slug; reviews of anything else answer 404. */
  private async visibleProductId(slug: string): Promise<string> {
    const product = await this.prisma.product.findFirst({
      where: { slug, ...visibleProductWhere() },
      select: { id: true },
    });
    if (!product) throw ApiException.notFound('Product not found');
    return product.id;
  }

  /** A page of a product's published reviews, newest first, and how its stars spread. */
  async list(slug: string, page: number, pageSize: number): Promise<ProductReviewsDto> {
    const productId = await this.visibleProductId(slug);
    const where = { productId, status: 'PUBLISHED' } satisfies Prisma.ProductReviewWhereInput;
    const [rows, groups] = await Promise.all([
      this.prisma.productReview.findMany({
        where,
        include: { user: AUTHOR },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...pageArgs(page, pageSize),
      }),
      this.prisma.productReview.groupBy({ by: ['rating'], where, _count: { _all: true } }),
    ]);
    const stars = [5, 4, 3, 2, 1].map(
      (value) => groups.find((group) => group.rating === value)?._count._all ?? 0,
    );
    const count = stars.reduce((sum, value) => sum + value, 0);
    const sum = stars.reduce((total, value, index) => total + value * (5 - index), 0);
    return {
      ...buildPaginated(rows.map(toPublicReview), count, page, pageSize),
      summary: { average: ratingAverage(sum, count), count, stars },
    };
  }

  /** The customer's own review of a product, hidden or not; null when they have none. */
  async mine(userId: string, slug: string): Promise<MyReviewDto | null> {
    const productId = await this.visibleProductId(slug);
    const row = await this.prisma.productReview.findUnique({
      where: { productId_userId: { productId, userId } },
      include: { user: AUTHOR },
    });
    return row ? toMyReview(row) : null;
  }

  /** Saves the customer's review (a new one, or theirs replaced), in the visitor's language. */
  async save(
    auth: RequestAuth,
    slug: string,
    input: { rating: number; comment: string | null },
    locale: Locale,
  ): Promise<MyReviewDto> {
    const productId = await this.visibleProductId(slug);
    const verifiedPurchase = await this.hasDelivered(auth.userId, productId);
    const data = { rating: input.rating, comment: input.comment, locale, verifiedPurchase };
    const saved = await this.prisma.$transaction(async (tx) => {
      await this.lockProduct(tx, productId);
      const row = await tx.productReview.upsert({
        where: { productId_userId: { productId, userId: auth.userId } },
        create: { productId, userId: auth.userId, ...data },
        update: data,
        include: { user: AUTHOR },
      });
      await this.refreshTotals(tx, productId);
      return row;
    });
    this.revalidation.notify('catalog');
    return toMyReview(saved);
  }

  /** Deletes the customer's own review of a product (nothing happens when there is none). */
  async remove(userId: string, slug: string): Promise<void> {
    const productId = await this.visibleProductId(slug);
    const deleted = await this.prisma.$transaction(async (tx) => {
      await this.lockProduct(tx, productId);
      const { count } = await tx.productReview.deleteMany({ where: { productId, userId } });
      if (count > 0) await this.refreshTotals(tx, productId);
      return count;
    });
    if (deleted > 0) this.revalidation.notify('catalog');
  }

  // ─── Staff ────────────────────────────────────────────────────────────────

  /** Every review, newest first, optionally only published or hidden ones. */
  async adminList(query: AdminReviewListQuery): Promise<Paginated<AdminReviewDto>> {
    const where = { status: query.status } satisfies Prisma.ProductReviewWhereInput;
    const [total, rows] = await Promise.all([
      this.prisma.productReview.count({ where }),
      this.prisma.productReview.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...pageArgs(query.page, query.pageSize),
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          product: {
            select: {
              id: true,
              slug: true,
              translations: { select: { locale: true, name: true } },
            },
          },
        },
      }),
    ]);
    const items = rows.map((row): AdminReviewDto => ({
      id: row.id,
      rating: row.rating,
      comment: row.comment,
      status: row.status,
      verifiedPurchase: row.verifiedPurchase,
      locale: row.locale,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      product: {
        id: row.product.id,
        slug: row.product.slug,
        name: pickTranslation(row.product.translations, 'uz')?.name ?? row.product.slug,
      },
      customer: {
        id: row.user.id,
        name: [row.user.firstName, row.user.lastName].filter(Boolean).join(' '),
        email: row.user.email,
      },
    }));
    return buildPaginated(items, total, query.page, query.pageSize);
  }

  /** Hides a review from the site or shows it again. */
  async setStatus(id: string, status: ReviewStatus, actor: Actor): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const review = await tx.productReview.findUnique({
        where: { id },
        select: { productId: true, status: true },
      });
      if (!review) throw ApiException.notFound('Review not found');
      if (review.status === status) return;
      await this.lockProduct(tx, review.productId);
      await tx.productReview.update({ where: { id }, data: { status } });
      await this.refreshTotals(tx, review.productId);
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: status === 'HIDDEN' ? 'review.hide' : 'review.show',
          entityType: 'ProductReview',
          entityId: id,
          metadata: { productId: review.productId },
          ipAddress: actor.ipAddress,
        },
        tx,
      );
    });
    this.revalidation.notify('catalog');
  }

  /** Deletes a review for good (spam, abuse); its stars leave the product's average. */
  async adminRemove(id: string, actor: Actor): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const review = await tx.productReview.findUnique({
        where: { id },
        select: { productId: true, rating: true, comment: true, userId: true },
      });
      if (!review) throw ApiException.notFound('Review not found');
      await this.lockProduct(tx, review.productId);
      await tx.productReview.delete({ where: { id } });
      await this.refreshTotals(tx, review.productId);
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: 'review.delete',
          entityType: 'ProductReview',
          entityId: id,
          // What was removed, for the record.
          metadata: {
            productId: review.productId,
            userId: review.userId,
            rating: review.rating,
            comment: review.comment,
          },
          ipAddress: actor.ipAddress,
        },
        tx,
      );
    });
    this.revalidation.notify('catalog');
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** The customer has a delivered order with one of the product's pack sizes. */
  private async hasDelivered(userId: string, productId: string): Promise<boolean> {
    const item = await this.prisma.orderItem.findFirst({
      where: { order: { userId, status: 'DELIVERED' }, variant: { productId } },
      select: { id: true },
    });
    return item !== null;
  }

  /** Serialises review changes per product until the transaction ends. */
  private async lockProduct(tx: Prisma.TransactionClient, productId: string): Promise<void> {
    await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${productId}::uuid FOR UPDATE`;
  }

  /**
   * Recounts the product's published reviews into its totals. Raw SQL so the product's
   * `updatedAt` (its own edits) does not move when customers rate it.
   */
  private async refreshTotals(tx: Prisma.TransactionClient, productId: string): Promise<void> {
    await tx.$executeRaw`
      UPDATE "Product" AS p
      SET "ratingCount" = t.count, "ratingSum" = t.sum
      FROM (
        SELECT count(*)::int AS count, coalesce(sum(r.rating), 0)::int AS sum
        FROM "ProductReview" AS r
        WHERE r."productId" = ${productId}::uuid AND r.status = 'PUBLISHED'
      ) AS t
      WHERE p.id = ${productId}::uuid`;
  }
}
