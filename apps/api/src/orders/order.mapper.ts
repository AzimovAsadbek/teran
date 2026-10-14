import type { OrderDto } from '@teran/contracts';
import type { Prisma } from '../generated/prisma/client.js';
import { asIllustrationKey, toImageDto } from '../catalog/catalog.mapper.js';
import { toMoney } from '../common/money.js';
import {
  PAYMENT_NOT_COMPLETED,
  isAwaitingOnlinePayment,
  paymentDeadline,
} from '../payments/payments.service.js';

export const orderInclude = {
  events: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { fromStatus: true, toStatus: true, createdAt: true },
  },
  payments: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      method: true,
      provider: true,
      status: true,
      amount: true,
      currency: true,
      expiresAt: true,
      confirmedAt: true,
      failureCode: true,
      createdAt: true,
    },
  },
  items: {
    orderBy: { id: 'asc' },
    include: {
      variant: {
        select: {
          product: {
            select: { illustrationKey: true, images: { orderBy: { position: 'asc' }, take: 1 } },
          },
        },
      },
    },
  },
} satisfies Prisma.OrderInclude;

export type OrderWithItems = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

/**
 * The order as its customer sees it: purchase-time snapshots and totals (never recomputed from
 * today's prices), status changes without staff notes, and payment attempts without provider
 * internals.
 */
export function toOrderDto(order: OrderWithItems, now: Date = new Date()): OrderDto {
  const awaitingPayment = isAwaitingOnlinePayment(order, now);
  return {
    number: order.number,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt.toISOString(),
    events: order.events
      .filter((event) => event.fromStatus !== event.toStatus)
      .map((event) => ({ status: event.toStatus, at: event.createdAt.toISOString() })),
    payments: order.payments.map((payment) => ({
      method: payment.method,
      status: payment.status,
      amount: toMoney(payment.amount),
      currency: payment.currency,
      demo: payment.provider === 'DEMO',
      createdAt: payment.createdAt.toISOString(),
      paidAt: payment.confirmedAt?.toISOString() ?? null,
      failureCode: payment.failureCode,
    })),
    awaitingPayment,
    paymentDueAt: awaitingPayment ? (paymentDeadline(order)?.toISOString() ?? null) : null,
    cancelReason:
      order.status === 'CANCELLED'
        ? order.cancelReason === PAYMENT_NOT_COMPLETED
          ? 'payment_not_completed'
          : 'store'
        : null,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    deliveryMethodName: order.deliveryMethodName,
    regionCode: order.regionCode,
    city: order.city,
    addressLine: order.addressLine,
    landmark: order.landmark,
    note: order.customerNote,
    items: order.items.map((item) => {
      const product = item.variant?.product;
      const image = product?.images[0];
      return {
        productName: item.productName,
        productSlug: item.productSlug,
        format: item.format,
        sku: item.sku,
        weightGrams: item.weightGrams,
        unitCount: item.unitCount,
        unitPrice: toMoney(item.unitPrice),
        quantity: item.quantity,
        lineTotal: toMoney(item.lineTotal),
        image: image ? toImageDto(image, item.productName) : null,
        illustrationKey: asIllustrationKey(product?.illustrationKey ?? null),
      };
    }),
    subtotal: toMoney(order.subtotal),
    deliveryFee: toMoney(order.deliveryFee),
    discountTotal: toMoney(order.discountTotal),
    total: toMoney(order.total),
    currency: order.currency,
  };
}
