import { Injectable } from '@nestjs/common';
import {
  buildPaginated,
  type AccountOrderFilter,
  type AccountOrderListItem,
  type AccountProfileDto,
  type AccountSessionDto,
  type AccountSummaryDto,
  type CurrentUserDto,
  type Locale,
  type OrderDto,
  type OrderStatus,
  type Paginated,
  type PurchasedProductDto,
  type ReorderResultDto,
} from '@teran/contracts';
import type { Request, Response } from 'express';
import { asIllustrationKey, toImageDto } from '../catalog/catalog.mapper.js';
import { isProductPublic } from '../cart/cart-line.js';
import { CartService } from '../cart/cart.service.js';
import { ApiException } from '../common/errors/api-exception.js';
import { localeChain, pickTranslation } from '../common/i18n.js';
import { toMoney } from '../common/money.js';
import { uniqueConstraintName } from '../common/prisma-errors.js';
import type { Prisma } from '../generated/prisma/client.js';
import { orderInclude, toOrderDto } from '../orders/order.mapper.js';
import { isAwaitingOnlinePayment } from '../payments/payments.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SessionService } from '../auth/session.service.js';
import { verifyPassword } from '../auth/password.js';
import { toCurrentUser } from '../auth/auth.service.js';
import type { RequestAuth } from '../auth/auth.types.js';

const ACTIVE_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'];

const FILTERS: Record<AccountOrderFilter, Prisma.OrderWhereInput> = {
  all: {},
  active: { status: { in: ACTIVE_STATUSES } },
  completed: { status: 'DELIVERED' },
  cancelled: { status: 'CANCELLED' },
};

/** Purchased products are aggregated from at most this many recent order lines. */
const PURCHASE_HISTORY_LINES = 500;

const listSelect = {
  number: true,
  createdAt: true,
  status: true,
  paymentStatus: true,
  paymentMethod: true,
  total: true,
  currency: true,
  items: { select: { quantity: true } },
  payments: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { provider: true, status: true, expiresAt: true },
  },
} satisfies Prisma.OrderSelect;

type ListRow = Prisma.OrderGetPayload<{ select: typeof listSelect }>;

function toListItem(row: ListRow, now: Date): AccountOrderListItem {
  return {
    number: row.number,
    createdAt: row.createdAt.toISOString(),
    status: row.status,
    paymentStatus: row.paymentStatus,
    paymentMethod: row.paymentMethod,
    total: toMoney(row.total),
    currency: row.currency,
    itemCount: row.items.reduce((sum, item) => sum + item.quantity, 0),
    needsAttention: isAwaitingOnlinePayment(row, now),
  };
}

/** Shortens a User-Agent header to "Browser, System" for the list of signed-in devices. */
export function describeDevice(userAgent: string | null): string | null {
  if (!userAgent) return null;
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /OPR\//.test(userAgent)
      ? 'Opera'
      : /YaBrowser\//.test(userAgent)
        ? 'Yandex Browser'
        : /Firefox\//.test(userAgent)
          ? 'Firefox'
          : /Chrome\//.test(userAgent)
            ? 'Chrome'
            : /Safari\//.test(userAgent)
              ? 'Safari'
              : null;
  const system = /iPhone|iPad/.test(userAgent)
    ? 'iOS'
    : /Android/.test(userAgent)
      ? 'Android'
      : /Windows/.test(userAgent)
        ? 'Windows'
        : /Mac OS X/.test(userAgent)
          ? 'macOS'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : null;
  const parts = [browser, system].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

/**
 * The customer's own account area. Every query is scoped by the signed-in user's id; nothing here
 * accepts a user id from the request.
 */
@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cart: CartService,
    private readonly sessions: SessionService,
  ) {}

  async summary(userId: string): Promise<AccountSummaryDto> {
    const now = new Date();
    const [user, ordersCount, activeOrdersCount, addressesCount, recent, pending] =
      await Promise.all([
        this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { createdAt: true } }),
        this.prisma.order.count({ where: { userId } }),
        this.prisma.order.count({ where: { userId, ...FILTERS.active } }),
        this.prisma.customerAddress.count({ where: { userId } }),
        this.prisma.order.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: listSelect,
        }),
        this.prisma.order.findMany({
          where: { userId, status: 'PENDING', paymentMethod: { not: 'CASH_ON_DELIVERY' } },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: listSelect,
        }),
      ]);
    return {
      ordersCount,
      activeOrdersCount,
      addressesCount,
      memberSince: user.createdAt.toISOString(),
      recentOrders: recent.map((row) => toListItem(row, now)),
      attentionOrders: pending
        .filter((row) => isAwaitingOnlinePayment(row, now))
        .map((row) => toListItem(row, now)),
    };
  }

  async orders(
    userId: string,
    filter: AccountOrderFilter,
    page: number,
    pageSize: number,
  ): Promise<Paginated<OrderDto>> {
    const where = { userId, ...FILTERS[filter] };
    const [total, rows] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: orderInclude,
      }),
    ]);
    const now = new Date();
    return buildPaginated(
      rows.map((row) => toOrderDto(row, now)),
      total,
      page,
      pageSize,
    );
  }

  /**
   * Products the customer has bought (cancelled orders excluded), newest first, with whether the
   * same pack can be bought again today. Names and sizes are the purchase-time snapshots unless
   * the product still exists, in which case today's name in the requested language is shown.
   */
  async purchases(userId: string, locale: Locale): Promise<PurchasedProductDto[]> {
    const lines = await this.prisma.orderItem.findMany({
      where: { order: { userId, status: { not: 'CANCELLED' } } },
      orderBy: [{ order: { createdAt: 'desc' } }, { id: 'asc' }],
      take: PURCHASE_HISTORY_LINES,
      select: {
        sku: true,
        productName: true,
        productSlug: true,
        format: true,
        weightGrams: true,
        unitCount: true,
        quantity: true,
        orderId: true,
        order: { select: { createdAt: true } },
        variant: {
          select: {
            isActive: true,
            stockQuantity: true,
            product: {
              select: {
                slug: true,
                status: true,
                publishedAt: true,
                illustrationKey: true,
                translations: {
                  where: { locale: { in: localeChain(locale) } },
                  select: { locale: true, name: true },
                },
                images: { orderBy: { position: 'asc' }, take: 1 },
              },
            },
          },
        },
      },
    });

    const now = new Date();
    const bySku = new Map<string, { dto: PurchasedProductDto; orders: Set<string> }>();
    for (const line of lines) {
      const entry = bySku.get(line.sku);
      if (entry) {
        entry.dto.totalQuantity += line.quantity;
        entry.orders.add(line.orderId);
        entry.dto.ordersCount = entry.orders.size;
        continue;
      }
      const variant = line.variant;
      const product = variant?.product;
      const name = product
        ? (pickTranslation(product.translations, locale)?.name ?? line.productName)
        : line.productName;
      const image = product?.images[0];
      bySku.set(line.sku, {
        orders: new Set([line.orderId]),
        dto: {
          productSlug: product?.slug ?? line.productSlug,
          productName: name,
          sku: line.sku,
          format: line.format,
          weightGrams: line.weightGrams,
          unitCount: line.unitCount,
          totalQuantity: line.quantity,
          ordersCount: 1,
          lastOrderedAt: line.order.createdAt.toISOString(),
          image: image ? toImageDto(image, name) : null,
          illustrationKey: asIllustrationKey(product?.illustrationKey ?? null),
          available: Boolean(
            variant &&
            product &&
            variant.isActive &&
            variant.stockQuantity > 0 &&
            isProductPublic(product, now),
          ),
        },
      });
    }
    return [...bySku.values()].map((entry) => entry.dto);
  }

  /** Puts an earlier order's items back in the cart at today's prices. Never places an order. */
  async reorder(
    request: Request,
    response: Response,
    userId: string,
    number: string,
    locale: Locale,
  ): Promise<ReorderResultDto> {
    const order = await this.prisma.order.findFirst({
      where: { number, userId },
      select: {
        items: { orderBy: { id: 'asc' }, select: { variantId: true, sku: true, quantity: true } },
      },
    });
    if (!order) throw ApiException.notFound('Order not found');
    return this.cart.addOrderItems(request, response, order.items, locale);
  }

  async profile(userId: string): Promise<AccountProfileDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        locale: true,
        createdAt: true,
        isActive: true,
      },
    });
    return {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      locale: user.locale,
      memberSince: user.createdAt.toISOString(),
      isActive: user.isActive,
    };
  }

  async sessionsFor(auth: RequestAuth): Promise<AccountSessionDto[]> {
    const rows = await this.sessions.listForUser(auth.userId);
    return rows.map((row) => ({
      current: row.id === auth.sessionId,
      createdAt: row.createdAt.toISOString(),
      lastSeenAt: row.lastSeenAt.toISOString(),
      device: describeDevice(row.userAgent),
    }));
  }

  async signOutOtherDevices(auth: RequestAuth): Promise<{ revoked: number }> {
    return { revoked: await this.sessions.destroyOthers(auth.userId, auth.sessionId) };
  }

  /**
   * Changes the sign-in e-mail after re-checking the current password. Other devices are signed
   * out, as after a password change; this one stays signed in.
   */
  async changeEmail(
    auth: RequestAuth,
    input: { newEmail: string; currentPassword: string },
  ): Promise<CurrentUserDto> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: auth.userId } });
    if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
      throw ApiException.badRequest('INVALID_CREDENTIALS', 'The current password is not correct');
    }
    if (user.email === input.newEmail) return toCurrentUser(user);
    try {
      const updated = await this.prisma.user.update({
        where: { id: user.id },
        data: { email: input.newEmail },
      });
      await this.sessions.destroyOthers(user.id, auth.sessionId);
      return toCurrentUser(updated);
    } catch (error) {
      if (uniqueConstraintName(error)?.includes('email')) {
        throw ApiException.conflict('EMAIL_TAKEN', 'An account with this e-mail already exists');
      }
      throw error;
    }
  }
}
