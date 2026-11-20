import { Injectable } from '@nestjs/common';
import {
  buildPaginated,
  MEDIA_KINDS,
  ORDER_STATUSES,
  type AdminAuditEntry,
  type AdminBadges,
  type AdminDashboard,
  type OrderStatus,
  type Paginated,
  type SalesDay,
} from '@teran/contracts';
import { AuditService } from '../audit/audit.service.js';
import { toMoney, ZERO } from '../common/money.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { pageArgs, csvCell, tashkentToday, toCsv, type Actor } from './admin-support.js';
import { visibleProductWhere } from '../catalog/product-visibility.js';
import { VISIBLE_MEDIA_WHERE } from '../content/media.service.js';
import { inventoryRowSelect, toInventoryRow } from './inventory.service.js';
import {
  orderListFilter,
  orderListSelect,
  toOrderListItem,
  type OrderFilters,
} from './orders.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const SALES_DAYS = 30;
const EXPORT_BATCH = 500;

/** Calendar date in Tashkent for an instant. */
function tashkentDate(instant: Date): string {
  return new Date(instant.getTime() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Overview for staff. "Order value" figures cover every order that is not cancelled, delivery
   * included; payment status is shown separately because cash is collected on delivery.
   */
  async dashboard(): Promise<AdminDashboard> {
    const today = tashkentToday();
    const since = new Date(today.getTime() - (SALES_DAYS - 1) * DAY_MS);
    const counted = { createdAt: { gte: since }, status: { not: 'CANCELLED' as const } };

    const [
      ordersToday,
      awaiting,
      aggregate,
      contactNew,
      wholesaleNew,
      lowStock,
      recent,
      daily,
      top,
    ] = await Promise.all([
      this.prisma.order.count({ where: { createdAt: { gte: today } } }),
      this.prisma.order.count({ where: { status: 'PENDING' } }),
      this.prisma.order.aggregate({
        where: counted,
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.contactInquiry.count({ where: { status: 'NEW' } }),
      this.prisma.wholesaleInquiry.count({ where: { status: 'NEW' } }),
      this.prisma.productVariant.findMany({
        where: {
          isActive: true,
          stockQuantity: { lte: this.prisma.productVariant.fields.lowStockThreshold },
        },
        select: inventoryRowSelect,
        orderBy: [{ stockQuantity: 'asc' }, { sku: 'asc' }],
        take: 8,
      }),
      this.prisma.order.findMany({
        select: orderListSelect,
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.$queryRaw<{ day: string; orders: number; revenue: string }[]>`
          SELECT to_char((o."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM-DD') AS day,
                 count(*)::int AS orders,
                 coalesce(sum(o.total), 0)::text AS revenue
          FROM "Order" o
          WHERE o."createdAt" >= ${since} AND o.status <> 'CANCELLED'
          GROUP BY 1
          ORDER BY 1`,
      this.prisma.$queryRaw<{ name: string; quantity: number; revenue: string }[]>`
          SELECT coalesce(pt.name, max(oi."productName")) AS name,
                 sum(oi.quantity)::int AS quantity,
                 sum(oi."lineTotal")::text AS revenue
          FROM "OrderItem" oi
          JOIN "Order" o ON o.id = oi."orderId"
          LEFT JOIN "Product" p ON p.slug = oi."productSlug"
          LEFT JOIN "ProductTranslation" pt ON pt."productId" = p.id AND pt.locale = 'uz'
          WHERE o."createdAt" >= ${since} AND o.status <> 'CANCELLED'
          GROUP BY oi."productSlug", pt.name
          ORDER BY quantity DESC, revenue DESC
          LIMIT 5`,
    ]);

    const site = await this.siteCounts(today);
    const revenue = aggregate._sum.total ?? ZERO;
    const orders = aggregate._count._all;
    const byDay = new Map(daily.map((row) => [row.day, row]));
    const salesByDay: SalesDay[] = Array.from({ length: SALES_DAYS }, (_unused, index) => {
      const date = tashkentDate(new Date(since.getTime() + index * DAY_MS));
      const row = byDay.get(date);
      return { date, orders: row?.orders ?? 0, revenue: toMoney(row?.revenue ?? '0') };
    });

    return {
      currency: 'UZS',
      ordersToday,
      ordersAwaitingAction: awaiting,
      revenueLast30Days: toMoney(revenue),
      ordersLast30Days: orders,
      // Whole sums: tiyin are not used in practice.
      averageOrderValue: toMoney(orders > 0 ? revenue.dividedBy(orders).toDecimalPlaces(0) : ZERO),
      newInquiries: contactNew + wholesaleNew,
      lowStock: lowStock.map(toInventoryRow),
      recentOrders: recent.map(toOrderListItem),
      salesByDay,
      topProducts: top.map((row) => ({
        productName: row.name,
        quantity: row.quantity,
        revenue: toMoney(row.revenue),
      })),
      site,
    };
  }

  /**
   * What the site shows now. While the shop takes orders by phone (ADR-027) these are the numbers
   * the dashboard leads with: the catalogue, the gallery, the journal and the customers' reviews.
   */
  private async siteCounts(today: Date): Promise<AdminDashboard['site']> {
    const now = new Date();
    const [productsOnSale, products, media, articles, reviews, reviewsThisWeek] = await Promise.all(
      [
        this.prisma.product.count({ where: visibleProductWhere(now) }),
        this.prisma.product.count({ where: { status: { not: 'ARCHIVED' } } }),
        this.prisma.mediaItem.groupBy({
          by: ['kind'],
          where: VISIBLE_MEDIA_WHERE,
          _count: { _all: true },
        }),
        this.prisma.article.count({ where: { status: 'PUBLISHED', publishedAt: { lte: now } } }),
        this.prisma.productReview.count({ where: { status: 'PUBLISHED' } }),
        this.prisma.productReview.count({
          where: {
            status: 'PUBLISHED',
            createdAt: { gte: new Date(today.getTime() - 6 * DAY_MS) },
          },
        }),
      ],
    );
    const byKind = new Map(media.map((row) => [row.kind, row._count._all]));
    return {
      productsOnSale,
      products,
      media: Object.fromEntries(MEDIA_KINDS.map((kind) => [kind, byKind.get(kind) ?? 0])) as Record<
        (typeof MEDIA_KINDS)[number],
        number
      >,
      articles,
      reviews,
      reviewsThisWeek,
    };
  }

  /** Counts of the work waiting for staff (cheap enough to load with every admin page). */
  async badges(): Promise<AdminBadges> {
    const [byStatus, contact, wholesale, lowStock] = await Promise.all([
      this.prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.contactInquiry.count({ where: { status: 'NEW' } }),
      this.prisma.wholesaleInquiry.count({ where: { status: 'NEW' } }),
      this.prisma.productVariant.count({
        where: {
          isActive: true,
          stockQuantity: { lte: this.prisma.productVariant.fields.lowStockThreshold },
        },
      }),
    ]);
    const ordersByStatus = Object.fromEntries(
      ORDER_STATUSES.map((status) => [status, 0]),
    ) as Record<OrderStatus, number>;
    for (const row of byStatus) ordersByStatus[row.status] = row._count._all;
    return { ordersByStatus, newInquiries: { contact, wholesale }, lowStock };
  }

  /** Orders as CSV for accounting (contains personal data, hence administrators only). */
  async *exportOrders(query: OrderFilters, actor: Actor): AsyncGenerator<string> {
    const where = orderListFilter(query);
    const started = new Date();
    yield toCsv(
      [
        'number',
        'created_at_tashkent',
        'status',
        'payment_status',
        'payment_method',
        'customer_name',
        'customer_phone',
        'region',
        'city',
        'delivery_method',
        'items',
        'subtotal',
        'delivery_fee',
        'discount',
        'total',
      ],
      [],
    );
    let after: { id: string; createdAt: Date } | undefined;
    let count = 0;
    for (;;) {
      const rows = await this.prisma.order.findMany({
        where: {
          AND: [
            where,
            { createdAt: { lte: started } },
            ...(after
              ? [
                  {
                    OR: [
                      { createdAt: { gt: after.createdAt } },
                      { createdAt: after.createdAt, id: { gt: after.id } },
                    ],
                  },
                ]
              : []),
          ],
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: EXPORT_BATCH,
        select: {
          id: true,
          number: true,
          createdAt: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          customerName: true,
          customerPhone: true,
          regionCode: true,
          city: true,
          deliveryMethodName: true,
          subtotal: true,
          deliveryFee: true,
          discountTotal: true,
          total: true,
          items: { select: { quantity: true } },
        },
      });
      for (const row of rows) {
        yield [
          row.number,
          `${tashkentDate(row.createdAt)} ${new Date(row.createdAt.getTime() + 5 * 60 * 60 * 1000).toISOString().slice(11, 16)}`,
          row.status,
          row.paymentStatus,
          row.paymentMethod,
          row.customerName,
          row.customerPhone,
          row.regionCode,
          row.city,
          row.deliveryMethodName,
          row.items.reduce((sum, item) => sum + item.quantity, 0),
          toMoney(row.subtotal),
          toMoney(row.deliveryFee),
          toMoney(row.discountTotal),
          toMoney(row.total),
        ]
          .map(csvCell)
          .join(',') + '\r\n';
      }
      count += rows.length;
      if (rows.length < EXPORT_BATCH) break;
      const last = rows[rows.length - 1]!;
      after = { id: last.id, createdAt: last.createdAt };
    }
    await this.audit.record({
      actorUserId: actor.userId,
      action: 'orders.export',
      entityType: 'Order',
      metadata: {
        count,
        paymentStatus: query.paymentStatus ?? null,
        from: query.from ?? null,
        to: query.to ?? null,
        status: query.status ?? null,
      },
      ipAddress: actor.ipAddress,
    });
  }

  async auditLog(page: number, pageSize: number): Promise<Paginated<AdminAuditEntry>> {
    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        ...pageArgs(page, pageSize),
        include: { actor: { select: { firstName: true, lastName: true, email: true } } },
      }),
    ]);
    const items = rows.map((row): AdminAuditEntry => ({
      id: row.id,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      actorName: row.actor
        ? `${[row.actor.firstName, row.actor.lastName].filter(Boolean).join(' ')} (${row.actor.email})`
        : null,
      metadata: row.metadata,
      ipAddress: row.ipAddress,
      createdAt: row.createdAt.toISOString(),
    }));
    return buildPaginated(items, total, page, pageSize);
  }
}
