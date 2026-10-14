/**
 * Loads the demonstration activity (demo-activity.ts): customers, orders with their full history,
 * enquiries and newsletter subscribers. Requires the demo catalogue.
 *
 * Orders are written the way checkout and the admin area write them: purchase-time snapshots,
 * stock reserved with a conditional update and recorded in the inventory ledger, one cash payment,
 * a status event for every step and stock returned when an order is cancelled. Cash is marked as
 * collected only where staff would have recorded it; nothing is ever marked as paid online.
 *
 * Insert-only and keyed (order number, e-mail, company), so re-running changes nothing.
 */
import { createHash, randomBytes } from 'node:crypto';
import { Prisma, type PrismaClient } from '../../src/generated/prisma/client.js';
import {
  DEMO_CONTACT_INQUIRIES,
  DEMO_CUSTOMERS,
  DEMO_ORDERS,
  DEMO_SOURCE,
  DEMO_SUBSCRIBERS,
  DEMO_TIMELINE,
  DEMO_WHOLESALE_INQUIRIES,
  type DemoOrder,
} from './demo-activity.js';
import { DAY_MS } from './catalogue.js';

const HOUR_MS = 3_600_000;

/**
 * Stored instead of a password hash. It is not a valid Argon2 hash, so verification always fails
 * and demo customers can never sign in: there is no shared demo password to leak.
 */
export const DISABLED_PASSWORD_HASH = '!demo-account:sign-in-disabled';

export interface ActivityReport {
  customers: number;
  orders: number;
  contactInquiries: number;
  wholesaleInquiries: number;
  subscribers: number;
  /** Orders that could not be created (missing products or not enough stock). */
  skipped: string[];
}

class SkipOrder extends Error {}

const at = (now: Date, hoursAgo: number, plusHours = 0) =>
  new Date(now.getTime() - hoursAgo * HOUR_MS + plusHours * HOUR_MS);

async function seedCustomers(prisma: PrismaClient, now: Date): Promise<number> {
  let created = 0;
  for (const customer of DEMO_CUSTOMERS) {
    const existing = await prisma.user.findUnique({
      where: { email: customer.email },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.user.create({
      data: {
        email: customer.email,
        passwordHash: DISABLED_PASSWORD_HASH,
        role: 'CUSTOMER',
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        locale: customer.locale,
        createdAt: new Date(now.getTime() - customer.joinedDaysAgo * DAY_MS),
      },
    });
    created += 1;
  }
  return created;
}

interface StatusStep {
  from: DemoOrder['status'] | null;
  to: DemoOrder['status'];
  at: Date;
  paymentStatus?: 'PAID' | 'CANCELLED';
  note?: string;
}

/** The status history of a demo order, oldest first (see DEMO_TIMELINE). */
export function orderHistory(order: DemoOrder, placedAt: Date): StatusStep[] {
  const after = (hours: number) => new Date(placedAt.getTime() + hours * HOUR_MS);
  const steps: StatusStep[] = [{ from: null, to: 'PENDING', at: placedAt, note: 'Order placed' }];
  if (order.status === 'CANCELLED') {
    const from = order.cancelled?.from ?? 'PENDING';
    if (from === 'CONFIRMED') {
      steps.push({ from: 'PENDING', to: 'CONFIRMED', at: after(DEMO_TIMELINE.CONFIRMED) });
    }
    steps.push({
      from,
      to: 'CANCELLED',
      at: after(DEMO_TIMELINE.CANCELLED[from]),
      paymentStatus: 'CANCELLED',
      note: order.cancelled?.reason,
    });
    return steps;
  }
  const path = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;
  const last = order.status === 'PENDING' ? -1 : path.indexOf(order.status);
  for (let index = 0; index <= last; index++) {
    const to = path[index]!;
    const hours =
      to === 'DELIVERED' ? DEMO_TIMELINE.DELIVERED[order.delivery.method] : DEMO_TIMELINE[to];
    steps.push({ from: index === 0 ? 'PENDING' : path[index - 1]!, to, at: after(hours) });
  }
  if (order.status === 'DELIVERED' && order.paid) {
    const delivered = steps[steps.length - 1]!.at;
    steps.push({
      from: 'DELIVERED',
      to: 'DELIVERED',
      at: new Date(delivered.getTime() + DEMO_TIMELINE.PAID_AFTER_DELIVERY * HOUR_MS),
      paymentStatus: 'PAID',
    });
  }
  return steps;
}

async function createOrder(prisma: PrismaClient, order: DemoOrder, now: Date): Promise<void> {
  const placedAt = at(now, order.ageHours);
  const history = orderHistory(order, placedAt);
  const final = history[history.length - 1]!;
  const stepAt = (status: DemoOrder['status']) => history.find((step) => step.to === status)?.at;
  const paidAt = history.find((step) => step.paymentStatus === 'PAID')?.at ?? null;
  const cancelled = order.status === 'CANCELLED';

  const customer =
    typeof order.customer === 'string'
      ? await prisma.user.findUnique({ where: { email: order.customer } })
      : null;
  if (typeof order.customer === 'string' && !customer) {
    throw new SkipOrder(`customer ${order.customer} not found`);
  }
  const contact =
    typeof order.customer === 'string'
      ? {
          name: [customer!.firstName, customer!.lastName].filter(Boolean).join(' '),
          phone: customer!.phone ?? '',
          email: customer!.email,
        }
      : { ...order.customer, email: order.customer.email ?? null };

  const method = await prisma.deliveryMethod.findUnique({
    where: { code: order.delivery.method },
    include: { translations: true },
  });
  if (!method) throw new SkipOrder(`delivery method ${order.delivery.method} not found`);
  const methodName =
    method.translations.find((translation) => translation.locale === order.locale)?.name ??
    method.code;

  await prisma.$transaction(async (tx) => {
    const lines = [];
    for (const item of order.items) {
      const variant = await tx.productVariant.findUnique({
        where: { sku: item.sku },
        include: { product: { include: { translations: true } } },
      });
      if (!variant) throw new SkipOrder(`variant ${item.sku} not found`);
      // Same conditional decrement as checkout: never below zero.
      const reserved = await tx.productVariant.updateMany({
        where: { id: variant.id, stockQuantity: { gte: item.quantity } },
        data: { stockQuantity: { decrement: item.quantity } },
      });
      if (reserved.count === 0) throw new SkipOrder(`not enough stock for ${item.sku}`);
      const name =
        variant.product.translations.find((translation) => translation.locale === order.locale)
          ?.name ?? variant.product.slug;
      lines.push({ item, variant, name, stockAfter: variant.stockQuantity - item.quantity });
    }

    const subtotal = lines.reduce(
      (sum, line) => sum.plus(line.variant.price.times(line.item.quantity)),
      new Prisma.Decimal(0),
    );
    const isFree =
      method.freeFromAmount !== null && subtotal.greaterThanOrEqualTo(method.freeFromAmount);
    const deliveryFee = isFree ? new Prisma.Decimal(0) : method.price;
    const total = subtotal.plus(deliveryFee);

    const created = await tx.order.create({
      data: {
        number: order.number,
        status: order.status,
        paymentStatus: cancelled ? 'CANCELLED' : paidAt ? 'PAID' : 'PENDING',
        paymentMethod: 'CASH_ON_DELIVERY',
        locale: order.locale,
        userId: customer?.id ?? null,
        customerName: contact.name,
        customerPhone: contact.phone,
        customerEmail: contact.email,
        deliveryMethodId: method.id,
        deliveryMethodName: methodName,
        regionCode: order.delivery.regionCode,
        city: order.delivery.city,
        addressLine: order.delivery.addressLine,
        landmark: order.delivery.landmark ?? null,
        customerNote: order.note ?? null,
        subtotal,
        deliveryFee,
        discountTotal: 0,
        total,
        idempotencyKey: `demo-seed:${order.number}`,
        // Nobody holds the token for a demo order's status link.
        accessTokenHash: createHash('sha256').update(randomBytes(32)).digest('hex'),
        cancelReason: order.cancelled?.reason ?? null,
        confirmedAt: stepAt('CONFIRMED') ?? null,
        shippedAt: stepAt('SHIPPED') ?? null,
        deliveredAt: stepAt('DELIVERED') ?? null,
        cancelledAt: stepAt('CANCELLED') ?? null,
        createdAt: placedAt,
        updatedAt: final.at,
        items: {
          create: lines.map(({ item, variant, name }) => ({
            variantId: variant.id,
            productName: name,
            productSlug: variant.product.slug,
            format: variant.product.format,
            sku: variant.sku,
            weightGrams: variant.weightGrams,
            unitCount: variant.unitCount,
            unitPrice: variant.price,
            quantity: item.quantity,
            lineTotal: variant.price.times(item.quantity),
          })),
        },
        events: {
          create: history.map((step) => ({
            fromStatus: step.from,
            toStatus: step.to,
            paymentStatus: step.paymentStatus ?? null,
            note: step.note ?? null,
            createdAt: step.at,
          })),
        },
        payments: {
          create: {
            method: 'CASH_ON_DELIVERY',
            status: cancelled ? 'CANCELLED' : paidAt ? 'PAID' : 'PENDING',
            amount: total,
            confirmedAt: paidAt,
            createdAt: placedAt,
            updatedAt: paidAt ?? final.at,
          },
        },
      },
    });

    await tx.inventoryMovement.createMany({
      data: lines.map(({ item, variant, stockAfter }) => ({
        variantId: variant.id,
        delta: -item.quantity,
        quantityAfter: stockAfter,
        reason: 'ORDER_PLACED' as const,
        orderId: created.id,
        createdAt: placedAt,
      })),
    });

    if (cancelled) {
      for (const { item, variant } of lines) {
        const restocked = await tx.productVariant.update({
          where: { id: variant.id },
          data: { stockQuantity: { increment: item.quantity } },
          select: { stockQuantity: true },
        });
        await tx.inventoryMovement.create({
          data: {
            variantId: variant.id,
            delta: item.quantity,
            quantityAfter: restocked.stockQuantity,
            reason: 'ORDER_CANCELLED',
            orderId: created.id,
            createdAt: stepAt('CANCELLED') ?? final.at,
          },
        });
      }
    }
  });
}

async function seedOrders(
  prisma: PrismaClient,
  now: Date,
): Promise<{ created: number; skipped: string[] }> {
  let created = 0;
  const skipped: string[] = [];
  // Oldest first, so the inventory ledger reads in date order.
  const ordered = [...DEMO_ORDERS].sort((a, b) => b.ageHours - a.ageHours);
  for (const order of ordered) {
    const existing = await prisma.order.findUnique({
      where: { number: order.number },
      select: { id: true },
    });
    if (existing) continue;
    try {
      await createOrder(prisma, order, now);
      created += 1;
    } catch (error) {
      if (!(error instanceof SkipOrder)) throw error;
      skipped.push(`${order.number}: ${error.message}`);
    }
  }
  return { created, skipped };
}

async function seedInquiries(
  prisma: PrismaClient,
  now: Date,
): Promise<{ contact: number; wholesale: number }> {
  let contact = 0;
  for (const inquiry of DEMO_CONTACT_INQUIRIES) {
    const existing = await prisma.contactInquiry.findFirst({
      where: { name: inquiry.name, subject: inquiry.subject },
      select: { id: true },
    });
    if (existing) continue;
    const createdAt = at(now, inquiry.ageHours);
    const handled = inquiry.status === 'RESOLVED' || inquiry.status === 'SPAM';
    await prisma.contactInquiry.create({
      data: {
        name: inquiry.name,
        email: inquiry.email ?? null,
        phone: inquiry.phone ?? null,
        subject: inquiry.subject,
        message: inquiry.message,
        locale: inquiry.locale,
        status: inquiry.status,
        internalNote: inquiry.internalNote ?? null,
        handledAt: handled ? at(now, inquiry.ageHours, 20) : null,
        createdAt,
      },
    });
    contact += 1;
  }

  let wholesale = 0;
  for (const inquiry of DEMO_WHOLESALE_INQUIRIES) {
    const existing = await prisma.wholesaleInquiry.findFirst({
      where: { companyName: inquiry.companyName },
      select: { id: true },
    });
    if (existing) continue;
    const handled = inquiry.status === 'RESOLVED' || inquiry.status === 'SPAM';
    await prisma.wholesaleInquiry.create({
      data: {
        companyName: inquiry.companyName,
        contactName: inquiry.contactName,
        phone: inquiry.phone,
        email: inquiry.email ?? null,
        businessType: inquiry.businessType,
        regionCode: inquiry.regionCode,
        city: inquiry.city,
        monthlyVolume: inquiry.monthlyVolume,
        message: inquiry.message,
        locale: inquiry.locale,
        status: inquiry.status,
        internalNote: inquiry.internalNote ?? null,
        handledAt: handled ? at(now, inquiry.ageHours, 26) : null,
        createdAt: at(now, inquiry.ageHours),
      },
    });
    wholesale += 1;
  }
  return { contact, wholesale };
}

async function seedSubscribers(prisma: PrismaClient, now: Date): Promise<number> {
  let created = 0;
  for (const subscriber of DEMO_SUBSCRIBERS) {
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: subscriber.email },
      select: { id: true },
    });
    if (existing) continue;
    const unsubscribed = subscriber.unsubscribedDaysAgo !== undefined;
    await prisma.newsletterSubscriber.create({
      data: {
        email: subscriber.email,
        locale: subscriber.locale,
        status: unsubscribed ? 'UNSUBSCRIBED' : 'SUBSCRIBED',
        source: DEMO_SOURCE,
        subscribedAt: new Date(now.getTime() - subscriber.subscribedDaysAgo * DAY_MS),
        unsubscribedAt: unsubscribed
          ? new Date(now.getTime() - subscriber.unsubscribedDaysAgo! * DAY_MS)
          : null,
      },
    });
    created += 1;
  }
  return created;
}

export async function seedActivity(
  prisma: PrismaClient,
  now = new Date(),
): Promise<ActivityReport> {
  const customers = await seedCustomers(prisma, now);
  const orders = await seedOrders(prisma, now);
  const inquiries = await seedInquiries(prisma, now);
  const subscribers = await seedSubscribers(prisma, now);
  return {
    customers,
    orders: orders.created,
    contactInquiries: inquiries.contact,
    wholesaleInquiries: inquiries.wholesale,
    subscribers,
    skipped: orders.skipped,
  };
}
