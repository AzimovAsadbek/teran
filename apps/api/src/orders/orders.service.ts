import { createHmac } from 'node:crypto';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  buildPaginated,
  type CheckoutPayload,
  type CheckoutQuoteDto,
  type CheckoutQuoteInput,
  type Locale,
  type OrderDto,
  type Paginated,
  type PlacedOrderDto,
} from '@teran/contracts';
import type { Request } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import type { Env } from '../config/env.js';
import { digestsEqual, generateOrderNumber, sha256 } from '../common/crypto.js';
import { ApiException } from '../common/errors/api-exception.js';
import { uniqueConstraintName } from '../common/prisma-errors.js';
import { ZERO, toMoney } from '../common/money.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CartService, type OrderableLine } from '../cart/cart.service.js';
import { DeliveryService } from '../delivery/delivery.service.js';
import { MailService } from '../mail/mail.service.js';
import { orderConfirmationEmail } from '../mail/templates.js';
import { RevalidationService } from '../revalidation/revalidation.service.js';
import { orderInclude, toOrderDto, type OrderWithItems } from './order.mapper.js';

const MAX_NUMBER_ATTEMPTS = 3;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private readonly appSecret: string;
  private readonly enabledPayments: readonly string[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly cart: CartService,
    private readonly delivery: DeliveryService,
    private readonly mail: MailService,
    private readonly revalidation: RevalidationService,
    config: ConfigService<Env, true>,
  ) {
    this.appSecret = config.get('APP_SECRET', { infer: true });
    this.enabledPayments = config.get('PAYMENT_METHODS_ENABLED', { infer: true });
  }

  /**
   * The guest order-status token is derived from the client's idempotency key, so an idempotent
   * replay returns the same working link without the raw token ever being stored.
   */
  private accessTokenFor(idempotencyKey: string): string {
    return createHmac('sha256', this.appSecret)
      .update(`order-access:${idempotencyKey}`)
      .digest('base64url');
  }

  async quote(request: Request, input: CheckoutQuoteInput): Promise<CheckoutQuoteDto> {
    const cart = await this.cart.findCart(request);
    if (!cart) throw ApiException.badRequest('CART_EMPTY', 'The cart is empty');
    const lines = await this.cart.orderableLines(cart.id, input.locale, this.prisma);
    const subtotal = lines.reduce(
      (sum, line) => sum.plus(line.unitPrice.times(line.quantity)),
      ZERO,
    );
    const delivery = await this.delivery.quote(
      input.methodCode,
      input.regionCode,
      subtotal,
      input.locale,
    );
    return {
      subtotal: toMoney(subtotal),
      deliveryFee: toMoney(delivery.fee),
      discountTotal: toMoney(ZERO),
      total: toMoney(subtotal.plus(delivery.fee)),
      currency: 'UZS',
    };
  }

  async placeOrder(request: Request, payload: CheckoutPayload): Promise<PlacedOrderDto> {
    if (!this.enabledPayments.includes(payload.paymentMethod)) {
      throw new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'PAYMENT_METHOD_UNAVAILABLE',
        'This payment method is not available',
      );
    }

    // Idempotent replay: the same submission never creates a second order.
    const previous = await this.findByIdempotencyKey(payload.idempotencyKey);
    if (previous) return this.placedResponse(previous, payload.idempotencyKey);

    const cart = await this.cart.findCart(request);
    if (!cart) throw ApiException.badRequest('CART_EMPTY', 'The cart is empty');

    for (let attempt = 1; ; attempt++) {
      try {
        const order = await this.prisma.$transaction(
          (tx) => this.createOrder(tx, cart.id, payload, request.auth?.userId ?? null),
          { timeout: 15_000 },
        );
        this.logger.log(
          { orderNumber: order.number, total: order.total.toString() },
          'Order placed',
        );
        this.revalidation.notify('catalog');
        void this.sendConfirmation(order, payload.locale, payload.idempotencyKey);
        return this.placedResponse(order, payload.idempotencyKey);
      } catch (error) {
        const target = uniqueConstraintName(error);
        if (target?.includes('idempotencyKey')) {
          // A concurrent duplicate submission won the race; return its order.
          const raced = await this.findByIdempotencyKey(payload.idempotencyKey);
          if (raced) return this.placedResponse(raced, payload.idempotencyKey);
        }
        if (target?.includes('number') && attempt < MAX_NUMBER_ATTEMPTS) continue;
        throw error;
      }
    }
  }

  async findForGuest(number: string, token: string): Promise<OrderDto> {
    const order = await this.prisma.order.findUnique({ where: { number }, include: orderInclude });
    // Same response for "no such order" and "wrong token": order numbers reveal nothing.
    if (!order || !digestsEqual(order.accessTokenHash, sha256(token))) {
      throw ApiException.notFound('Order not found');
    }
    return toOrderDto(order);
  }

  async listForCustomer(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<Paginated<OrderDto>> {
    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where: { userId } }),
      this.prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: orderInclude,
      }),
    ]);
    return buildPaginated(orders.map(toOrderDto), total, page, pageSize);
  }

  async findForCustomer(userId: string, number: string): Promise<OrderDto> {
    const order = await this.prisma.order.findFirst({
      where: { number, userId },
      include: orderInclude,
    });
    if (!order) throw ApiException.notFound('Order not found');
    return toOrderDto(order);
  }

  private findByIdempotencyKey(idempotencyKey: string): Promise<OrderWithItems | null> {
    return this.prisma.order.findUnique({ where: { idempotencyKey }, include: orderInclude });
  }

  private placedResponse(order: OrderWithItems, idempotencyKey: string): PlacedOrderDto {
    return { order: toOrderDto(order), accessToken: this.accessTokenFor(idempotencyKey) };
  }

  private async createOrder(
    tx: Prisma.TransactionClient,
    cartId: string,
    payload: CheckoutPayload,
    userId: string | null,
  ): Promise<OrderWithItems> {
    const lines = await this.cart.orderableLines(cartId, payload.locale, tx);
    const reserved = await this.reserveStock(tx, lines);
    const subtotal = reserved.reduce(
      (sum, line) => sum.plus(line.unitPrice.times(line.quantity)),
      ZERO,
    );

    const delivery = await this.delivery.quote(
      payload.delivery.methodCode,
      payload.delivery.regionCode,
      subtotal,
      payload.locale,
      tx,
    );
    if (delivery.requiresAddress && !payload.delivery.addressLine) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_FAILED',
        'A delivery address is required',
        {
          issues: [{ path: 'delivery.addressLine', code: 'required', message: 'required' }],
        },
      );
    }

    const total = subtotal.plus(delivery.fee);
    if (
      payload.expectedTotal !== undefined &&
      !total.equals(new Prisma.Decimal(payload.expectedTotal))
    ) {
      // Prices changed after the customer reviewed the order: roll back and let them confirm.
      throw ApiException.conflict('PRICE_CHANGED', 'The order total has changed', {
        total: toMoney(total),
      });
    }

    const order = await tx.order.create({
      data: {
        number: generateOrderNumber(),
        paymentMethod: payload.paymentMethod,
        locale: payload.locale,
        userId,
        customerName: payload.customer.name,
        customerPhone: payload.customer.phone,
        customerEmail: payload.customer.email ?? null,
        deliveryMethodId: delivery.methodId,
        deliveryMethodName: delivery.methodName,
        regionCode: payload.delivery.regionCode,
        city: payload.delivery.city,
        addressLine: payload.delivery.addressLine ?? null,
        landmark: payload.delivery.landmark ?? null,
        customerNote: payload.note ?? null,
        subtotal,
        deliveryFee: delivery.fee,
        discountTotal: ZERO,
        total,
        idempotencyKey: payload.idempotencyKey,
        accessTokenHash: sha256(this.accessTokenFor(payload.idempotencyKey)),
        items: {
          create: reserved.map((line) => ({
            variantId: line.variantId,
            productName: line.productName,
            productSlug: line.productSlug,
            sku: line.sku,
            weightGrams: line.weightGrams,
            unitCount: line.unitCount,
            unitPrice: line.unitPrice,
            quantity: line.quantity,
            lineTotal: line.unitPrice.times(line.quantity),
          })),
        },
        events: { create: { toStatus: 'PENDING', note: 'Order placed' } },
        payments: { create: { method: payload.paymentMethod, amount: total } },
      },
      include: orderInclude,
    });

    await tx.inventoryMovement.createMany({
      data: reserved.map((line) => ({
        variantId: line.variantId,
        delta: -line.quantity,
        quantityAfter: line.stockAfter,
        reason: 'ORDER_PLACED' as const,
        orderId: order.id,
      })),
    });
    await tx.cartItem.deleteMany({ where: { cartId } });
    return order;
  }

  /**
   * Atomically decrements stock for every line. The conditional update only matches while enough
   * stock remains, so two concurrent orders can never oversell the last units. Prices are taken
   * from the locked row, never from the client.
   */
  private async reserveStock(
    tx: Prisma.TransactionClient,
    lines: OrderableLine[],
  ): Promise<(OrderableLine & { stockAfter: number })[]> {
    const reserved: (OrderableLine & { stockAfter: number })[] = [];
    for (const line of lines) {
      try {
        const variant = await tx.productVariant.update({
          where: { id: line.variantId, isActive: true, stockQuantity: { gte: line.quantity } },
          data: { stockQuantity: { decrement: line.quantity } },
          select: { stockQuantity: true, price: true },
        });
        reserved.push({ ...line, unitPrice: variant.price, stockAfter: variant.stockQuantity });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
          throw ApiException.conflict(
            'INSUFFICIENT_STOCK',
            'Not enough stock to complete the order',
            {
              sku: line.sku,
            },
          );
        }
        throw error;
      }
    }
    return reserved;
  }

  private async sendConfirmation(
    order: OrderWithItems,
    locale: Locale,
    idempotencyKey: string,
  ): Promise<void> {
    if (!order.customerEmail || !this.mail.isEnabled) return;
    try {
      const link = this.mail.webUrl(
        locale,
        `/orders/${order.number}?token=${encodeURIComponent(this.accessTokenFor(idempotencyKey))}`,
      );
      await this.mail.send({
        to: order.customerEmail,
        ...orderConfirmationEmail(locale, {
          number: order.number,
          total: `${toMoney(order.total)} ${order.currency}`,
          link,
        }),
      });
    } catch (error) {
      this.logger.warn(
        { err: error, orderNumber: order.number },
        'Order confirmation e-mail failed',
      );
    }
  }
}
