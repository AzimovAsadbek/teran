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
import { releaseOrderStock } from '../orders/order-stock.js';
import { transitionPayment } from '../payments/payment-state.js';
import { PaymentsService } from '../payments/payments.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RevalidationService } from '../revalidation/revalidation.service.js';
import { pageArgs, tashkentDayBoundary, type Actor } from './admin-support.js';

type ListQuery = z.output<typeof adminOrderListQuerySchema>;

const listSelect = {
  id: true,
  number: true,
  status: true,
  paymentStatus: true,
  paymentMethod: true,
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
    paymentMethod: row.paymentMethod,
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
    private readonly payments: PaymentsService,
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
        payments: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          include: { events: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } },
        },
      },
    });
    if (!order) throw ApiException.notFound('Order not found');
    const actorIds = [
      ...new Set(
        order.payments.flatMap((payment) =>
          payment.events.flatMap((event) => (event.actorUserId ? [event.actorUserId] : [])),
        ),
      ),
    ];
    const actors = actorIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const actorById = new Map(actors.map((actor) => [actor.id, actor]));
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
      canRecordRefund: this.refundablePayment(order.payments) !== undefined,
      payments: order.payments.map((payment) => ({
        id: payment.id,
        method: payment.method,
        provider: payment.provider,
        status: payment.status,
        amount: toMoney(payment.amount),
        currency: payment.currency,
        providerReference: payment.providerReference,
        failureCode: payment.failureCode,
        expiresAt: payment.expiresAt?.toISOString() ?? null,
        confirmedAt: payment.confirmedAt?.toISOString() ?? null,
        createdAt: payment.createdAt.toISOString(),
        events: payment.events.map((event) => ({
          id: event.id,
          fromStatus: event.fromStatus,
          toStatus: event.toStatus,
          source: event.source,
          detail: event.detail,
          actorName: actorName(
            event.actorUserId ? (actorById.get(event.actorUserId) ?? null) : null,
          ),
          createdAt: event.createdAt.toISOString(),
        })),
      })),
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
          ...(cancelling ? { cancelReason: input.note ?? null } : {}),
        },
      });
      if (updated.count === 0) {
        throw ApiException.conflict(
          'CONFLICT',
          'The order was changed by someone else. Reload and try again.',
        );
      }

      let paymentStatus: typeof order.paymentStatus | null = null;
      if (cancelling) {
        // Unpaid attempts end with the order; a provider confirmation arriving later is refused.
        await this.payments.closeOpenAttempts(tx, order.id, 'staff', actor.userId);
        const after = await tx.order.findUniqueOrThrow({
          where: { id: order.id },
          select: { paymentStatus: true },
        });
        if (after.paymentStatus !== order.paymentStatus) paymentStatus = after.paymentStatus;
        restocked = await releaseOrderStock(tx, order, actor.userId);
      }

      await tx.orderStatusEvent.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: target,
          ...(paymentStatus ? { paymentStatus } : {}),
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
      const pending = await tx.payment.findFirst({
        where: { orderId: order.id, status: 'PENDING', method: order.paymentMethod },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: { id: true, orderId: true, status: true },
      });
      const confirmation = { amount: order.total, confirmedById: actor.userId };
      if (pending) {
        const moved = await transitionPayment(tx, pending, 'PAID', {
          source: 'staff',
          detail: 'Cash received',
          actorUserId: actor.userId,
          data: confirmation,
        });
        if (!moved) {
          throw ApiException.conflict(
            'CONFLICT',
            'The order was changed by someone else. Reload and try again.',
          );
        }
      } else {
        // Orders from before payment attempts were recorded may lack the cash attempt.
        const created = await this.payments.createAttempt(tx, {
          orderId: order.id,
          method: order.paymentMethod,
          provider: 'CASH',
          amount: order.total,
          currency: order.currency,
          status: 'PENDING',
          expiresAt: null,
          source: 'staff',
          detail: 'Cash payment recorded',
        });
        await transitionPayment(tx, created, 'PAID', {
          source: 'staff',
          detail: 'Cash received',
          actorUserId: actor.userId,
          data: confirmation,
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

  /**
   * Records that a paid order's money was returned to the customer: cash handed back, a Click
   * reversal made in the Click merchant cabinet, or a simulated demo payment. Payme refunds are
   * made in the Payme cabinet and arrive by themselves (CancelTransaction), so they are not
   * recorded by hand.
   */
  async recordRefund(number: string, note: string, actor: Actor): Promise<AdminOrderDetail> {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { number },
        select: {
          id: true,
          status: true,
          total: true,
          payments: {
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            select: { id: true, orderId: true, status: true, provider: true, amount: true },
          },
        },
      });
      if (!order) throw ApiException.notFound('Order not found');
      const payment = this.refundablePayment(order.payments);
      if (!payment) {
        throw ApiException.conflict('CONFLICT', 'There is no paid payment to refund');
      }
      const moved = await transitionPayment(tx, payment, 'REFUNDED', {
        source: 'staff',
        detail: 'Refund recorded',
        actorUserId: actor.userId,
      });
      if (!moved) {
        throw ApiException.conflict(
          'CONFLICT',
          'The order was changed by someone else. Reload and try again.',
        );
      }
      await tx.orderStatusEvent.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: order.status,
          paymentStatus: 'REFUNDED',
          note,
          actorUserId: actor.userId,
        },
      });
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: 'order.payment.refund',
          entityType: 'Order',
          entityId: order.id,
          metadata: { number, amount: toMoney(payment.amount), provider: payment.provider },
          ipAddress: actor.ipAddress,
        },
        tx,
      );
    });
    return this.get(number);
  }

  private refundablePayment<
    T extends { status: string; provider: 'CASH' | 'DEMO' | 'CLICK' | 'PAYME' },
  >(payments: readonly T[]): T | undefined {
    return payments.find((payment) => payment.status === 'PAID' && payment.provider !== 'PAYME');
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
