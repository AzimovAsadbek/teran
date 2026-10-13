import type { OrderDto } from '@teran/contracts';
import type { Prisma } from '../generated/prisma/client.js';
import { asIllustrationKey, toImageDto } from '../catalog/catalog.mapper.js';
import { toMoney } from '../common/money.js';

export const orderInclude = {
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

export function toOrderDto(order: OrderWithItems): OrderDto {
  return {
    number: order.number,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt.toISOString(),
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
