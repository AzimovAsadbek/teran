import { Injectable } from '@nestjs/common';
import {
  buildPaginated,
  canTransitionOrder,
  ORDER_STATUS_TRANSITIONS,
  type adminOrderListQuerySchema,
  type AdminOrderDetail,
  type AdminOrderListItem,
  type OrderStatus,
  type OrderStatusUpdateInput,
  type Paginated,
} from '@teran/contracts';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import { ApiException } from '../common/errors/api-exception.js';
import { toMoney } from '../common/money.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RevalidationService } from '../revalidation/revalidation.service.js';
import { pageArgs, tashkentDayBoundary, type Actor } from './admin-support.js';

type ListQuery = z.output<typeof adminOrderListQuerySchema>;

const listSelect = {
  id: true,
  number: true,
  status: true,
  paymentStatus: true,
  customerName: true,
  customerPhone: true,
  total: true,
  currency: true,
  createdAt: true,
  items: { select: { quantity: true } },
} satisfies Prisma.OrderSelect;

type ListRow = Prisma.OrderGetPayload<{ select: typeof listSelect }>;

export function toOrderListItem(row: ListRow): AdminOrderListItem {
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    paymentStatus: row.paymentStatus,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    itemCount: row.items.reduce((sum, item) => sum + item.quantity, 0),
    total: toMoney(row.total),
    currency: row.currency,
    createdAt: row.createdAt.toISOString(),
  };
}

export const orderListSelect = listSelect;

const STATUS_TIMESTAMPS: Partial<
  Record<OrderStatus, 'confirmedAt' | 'shippedAt' | 'deliveredAt' | 'cancelledAt'>
> = {
  CONFIRMED: 'confirmedAt',
  SHIPPED: 'shippedAt',
  DELIVERED: 'deliveredAt',
  CANCELLED: 'cancelledAt',
};

function actorName(actor: { firstName: string; lastName: string | null } | null): string | null {
  return actor ? [actor.firstName, actor.lastName].filter(Boolean).join(' ') : null;
}

@Injectable()
export class AdminOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly revalidation: RevalidationService,
  ) {}

  async list(query: ListQuery): Promise<Paginated<AdminOrderListItem>> {
    const search = query.q?.trim();
    const digits = search?.replace(/\D/g, '') ?? '';
    const where: Prisma.OrderWhereInput = {
      status: query.status,
      createdAt: {
        ...(query.from ? { gte: tashkentDayBoundary(query.from, 'start') } : {}),
        ...(query.to ? { lte: tashkentDayBoundary(query.to, 'end') } : {}),
      },
      ...(search
        ? {
            OR: [
              { number: { contains: search.toUpperCase() } },
              { customerName: { contains: search, mode: 'insensitive' } },
              { customerEmail: { contains: search.toLowerCase() } },
              ...(digits.length >= 4 ? [{ customerPhone: { contains: digits } }] : []),
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        select: listSelect,
        orderBy: { createdAt: 'desc' },
        ...pageArgs(query.page, query.pageSize),
      }),
    ]);
    return buildPaginated(rows.map(toOrderListItem), total, query.page, query.pageSize);
  }

  async get(number: string): Promise<AdminOrderDetail> {
    const order = await this.prisma.order.findUnique({
      where: { number },
      include: {
        items: { orderBy: { id: 'asc' } },
        user: { select: { email: true } },
        events: {
          orderBy: { createdAt: 'asc' },
          include: { actor: { select: { firstName: true, lastName: true } } },
        },
      },
    });
    if (!order) throw ApiException.notFound('Order not found');
    return {
      id: order.id,
      number: order.number,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      locale: order.locale,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      customerAccountEmail: order.user?.email ?? null,
      deliveryMethodName: order.deliveryMethodName,
      regionCode: order.regionCode,
      city: order.city,
      addressLine: order.addressLine,
      landmark: order.landmark,
      note: order.customerNote,
      cancelReason: order.cancelReason,
      items: order.items.map((item) => ({
        productName: item.productName,
        productSlug: item.productSlug,
        format: item.format,
        sku: item.sku,
        weightGrams: item.weightGrams,
        unitCount: item.unitCount,
        unitPrice: toMoney(item.unitPrice),
        quantity: item.quantity,
        lineTotal: toMoney(item.lineTotal),
      })),
      subtotal: toMoney(order.subtotal),
      deliveryFee: toMoney(order.deliveryFee),
      discountTotal: toMoney(order.discountTotal),
      total: toMoney(order.total),
      currency: order.currency,
      events: order.events.map((event) => ({
        id: event.id,
        fromStatus: event.fromStatus,
        toStatus: event.toStatus,
        paymentStatus: event.paymentStatus,
        note: event.note,
        actorName: actorName(event.actor),
        createdAt: event.createdAt.toISOString(),
      })),
      allowedTransitions: [...ORDER_STATUS_TRANSITIONS[order.status]],
      canRecordPayment: this.canRecordPayment(order),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  /**
   * Moves an order along ORDER_STATUS_TRANSITIONS. The update is conditional on the status the
   * staff member saw, so two people acting at once cannot both succeed. Cancelling returns every
   * line to stock (recorded in the ledger) and cancels the pending payment.
   */
  async updateStatus(
    number: string,
    input: OrderStatusUpdateInput,
    actor: Actor,
  ): Promise<AdminOrderDetail> {
    const target = input.status;
    let restocked = false;
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { number },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          items: { select: { variantId: true, quantity: true } },
        },
      });
      if (!order) throw ApiException.notFound('Order not found');
      if (!canTransitionOrder(order.status, target)) {
        throw ApiException.conflict(
          'INVALID_STATUS_TRANSITION',
          `An order cannot go from ${order.status} to ${target}`,
          {
            from: order.status,
            allowed: ORDER_STATUS_TRANSITIONS[order.status],
          },
        );
      }
      const cancelling = target === 'CANCELLED';
      const timestamp = STATUS_TIMESTAMPS[target];
      const updated = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data: {
          status: target,
          ...(timestamp ? { [timestamp]: new Date() } : {}),
          ...(cancelling
            ? {
                cancelReason: input.note ?? null,
                ...(order.paymentStatus === 'PENDING'
                  ? { paymentStatus: 'CANCELLED' as const }
                  : {}),
              }
            : {}),
        },
      });
      if (updated.count === 0) {
        throw ApiException.conflict(
          'CONFLICT',
          'The order was changed by someone else. Reload and try again.',
        );
      }

      if (cancelling) {
        if (order.paymentStatus === 'PENDING') {
          await tx.payment.updateMany({
            where: { orderId: order.id, status: 'PENDING' },
            data: { status: 'CANCELLED' },
          });
        }
        for (const item of order.items) {
          if (!item.variantId) continue;
          const variant = await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: { increment: item.quantity } },
            select: { stockQuantity: true },
          });
          await tx.inventoryMovement.create({
            data: {
              variantId: item.variantId,
              delta: item.quantity,
              quantityAfter: variant.stockQuantity,
              reason: 'ORDER_CANCELLED',
              orderId: order.id,
              actorUserId: actor.userId,
            },
          });
          restocked = true;
        }
      }

      await tx.orderStatusEvent.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: target,
          ...(cancelling && order.paymentStatus === 'PENDING'
            ? { paymentStatus: 'CANCELLED' as const }
            : {}),
          note: input.note ?? null,
          actorUserId: actor.userId,
        },
      });
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: 'order.status',
          entityType: 'Order',
          entityId: order.id,
          metadata: { number, from: order.status, to: target },
          ipAddress: actor.ipAddress,
        },
        tx,
      );
    });
    if (restocked) this.revalidation.notify('catalog');
    return this.get(number);
  }

  /**
   * Records that the courier collected the cash. This explicit staff confirmation is the only way a
   * cash-on-delivery order becomes PAID; delivery alone never marks an order as paid.
   */
  async recordPayment(
    number: string,
    note: string | undefined,
    actor: Actor,
  ): Promise<AdminOrderDetail> {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { number },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          total: true,
          currency: true,
        },
      });
      if (!order) throw ApiException.notFound('Order not found');
      if (!this.canRecordPayment(order)) {
        throw ApiException.conflict('CONFLICT', 'A payment cannot be recorded for this order');
      }
      const updated = await tx.order.updateMany({
        where: { id: order.id, paymentStatus: 'PENDING' },
        data: { paymentStatus: 'PAID' },
      });
      if (updated.count === 0) {
        throw ApiException.conflict(
          'CONFLICT',
          'The order was changed by someone else. Reload and try again.',
        );
      }
      const now = new Date();
      const pending = await tx.payment.findFirst({
        where: { orderId: order.id, status: 'PENDING', method: order.paymentMethod },
        select: { id: true },
      });
      const confirmation = {
        status: 'PAID' as const,
        amount: order.total,
        confirmedAt: now,
        confirmedById: actor.userId,
      };
      if (pending) {
        await tx.payment.update({ where: { id: pending.id }, data: confirmation });
      } else {
        await tx.payment.create({
          data: {
            orderId: order.id,
            method: order.paymentMethod,
            currency: order.currency,
            ...confirmation,
          },
        });
      }
      await tx.orderStatusEvent.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: order.status,
          paymentStatus: 'PAID',
          note: note ?? null,
          actorUserId: actor.userId,
        },
      });
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: 'order.payment.record',
          entityType: 'Order',
          entityId: order.id,
          metadata: { number, amount: toMoney(order.total) },
          ipAddress: actor.ipAddress,
        },
        tx,
      );
    });
    return this.get(number);
  }

  private canRecordPayment(order: {
    status: OrderStatus;
    paymentStatus: string;
    paymentMethod: string;
  }): boolean {
    return (
      order.paymentMethod === 'CASH_ON_DELIVERY' &&
      order.paymentStatus === 'PENDING' &&
      order.status !== 'CANCELLED'
    );
  }
}
