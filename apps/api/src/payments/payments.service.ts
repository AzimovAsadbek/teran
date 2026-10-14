import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  isOnlinePaymentMethod,
  type DemoPaymentDto,
  type DemoPaymentOutcome,
  type Locale,
  type OrderStatus,
  type PaymentMethod,
  type PaymentProviderCode,
  type PaymentReturnDto,
  type PaymentSessionDto,
  type PaymentStatus,
  type StartPaymentInput,
} from '@teran/contracts';
import type { Env } from '../config/env.js';
import { Prisma } from '../generated/prisma/client.js';
import type { RequestAuth } from '../auth/auth.types.js';
import { digestsEqual, orderAccessToken, sha256 } from '../common/crypto.js';
import { ApiException } from '../common/errors/api-exception.js';
import { toMoney } from '../common/money.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RevalidationService } from '../revalidation/revalidation.service.js';
import { releaseOrderStock } from '../orders/order-stock.js';
import { PaymentConfig } from './payment-config.js';
import {
  OPEN_PAYMENT_STATUSES,
  SETTLED_PAYMENT_STATUSES,
  isOpenAttemptConflict,
  isOpenPayment,
  isSettledPayment,
  paymentAccessToken,
  transitionPayment,
  type PaymentEventSource,
} from './payment-state.js';
import { clickPaymentUrl } from './providers/click-protocol.js';
import { paymeCheckoutUrl } from './providers/payme-protocol.js';

/** Payment attempts allowed per order (retries and method changes included). */
export const MAX_PAYMENT_ATTEMPTS = 10;

/**
 * A provider transaction that is in progress when the payment window ends gets this much longer
 * before it is expired, so a customer who is paying at that moment is not cut off.
 */
export const PROCESSING_GRACE_MS = 15 * 60_000;

/** Internal Order.cancelReason for automatic cancellations (shown to customers as a code). */
export const PAYMENT_NOT_COMPLETED = 'PAYMENT_NOT_COMPLETED';

const paymentSelect = {
  id: true,
  orderId: true,
  method: true,
  provider: true,
  status: true,
  amount: true,
  currency: true,
  expiresAt: true,
  providerReference: true,
  createdAt: true,
} satisfies Prisma.PaymentSelect;

type PaymentRow = Prisma.PaymentGetPayload<{ select: typeof paymentSelect }>;

const orderSelect = {
  id: true,
  number: true,
  status: true,
  paymentMethod: true,
  userId: true,
  total: true,
  currency: true,
  locale: true,
  idempotencyKey: true,
  accessTokenHash: true,
  createdAt: true,
  payments: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: paymentSelect },
} satisfies Prisma.OrderSelect;

export type PaymentOrder = Prisma.OrderGetPayload<{ select: typeof orderSelect }>;

/**
 * Whether an order is waiting for an online payment that can still be made: it is pending, was
 * placed with an online method, nothing has been paid, and its payment window is open.
 */
interface OrderPaymentState {
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  /** Oldest first. */
  payments: readonly {
    provider: PaymentProviderCode;
    status: PaymentStatus;
    expiresAt: Date | null;
  }[];
}

/** End of the order's payment window (set when the first online attempt was created). */
export function paymentDeadline(order: Omit<OrderPaymentState, 'status'>): Date | null {
  if (!isOnlinePaymentMethod(order.paymentMethod)) return null;
  const online = order.payments.filter((payment) => payment.provider !== 'CASH');
  return online.at(-1)?.expiresAt ?? null;
}

export function isAwaitingOnlinePayment(order: OrderPaymentState, now: Date): boolean {
  if (order.status !== 'PENDING' || !isOnlinePaymentMethod(order.paymentMethod)) return false;
  if (order.payments.some((payment) => isSettledPayment(payment.status))) return false;
  const deadline = paymentDeadline(order);
  return deadline !== null && deadline.getTime() > now.getTime();
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly appSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidation: RevalidationService,
    readonly config: PaymentConfig,
    env: ConfigService<Env, true>,
  ) {
    this.appSecret = env.get('APP_SECRET', { infer: true });
  }

  // ─── Checkout ─────────────────────────────────────────────────────────────

  /**
   * Creates the first payment attempt of a new order, inside the order's transaction. Cash on
   * delivery stays PENDING until staff record the cash; an online attempt REQUIRES_ACTION from the
   * customer and expires with the payment window.
   */
  async createInitialAttempt(
    tx: Prisma.TransactionClient,
    order: { id: string; total: Prisma.Decimal; currency: string },
    method: PaymentMethod,
    now: Date,
  ): Promise<void> {
    const provider = this.requireProvider(method);
    const online = provider !== 'CASH';
    await this.createAttempt(tx, {
      orderId: order.id,
      method,
      provider,
      amount: order.total,
      currency: order.currency,
      status: online ? 'REQUIRES_ACTION' : 'PENDING',
      expiresAt: online ? new Date(now.getTime() + this.config.windowMs) : null,
      source: 'customer',
      detail: 'Order placed',
    });
  }

  /** The provider for a method that is selectable now, or PAYMENT_METHOD_UNAVAILABLE. */
  requireProvider(method: PaymentMethod): PaymentProviderCode {
    const provider = this.config.providerFor(method);
    if (!provider) {
      throw new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'PAYMENT_METHOD_UNAVAILABLE',
        'This payment method is not available',
      );
    }
    return provider;
  }

  /** Where to send the customer for the order's open online attempt; null for cash or when paid. */
  async sessionForOrder(orderId: string, locale: Locale): Promise<PaymentSessionDto | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: orderSelect,
    });
    if (!order) return null;
    const latest = order.payments.at(-1);
    if (!latest || latest.provider === 'CASH') return null;
    return this.session(order, latest, locale);
  }

  private session(order: PaymentOrder, payment: PaymentRow, locale: Locale): PaymentSessionDto {
    const open = isOpenPayment(payment.status) && isAwaitingOnlinePayment(order, new Date());
    return {
      status: payment.status,
      method: payment.method,
      demo: payment.provider === 'DEMO',
      redirectUrl: open ? this.redirectUrl(order, payment, locale) : null,
    };
  }

  private redirectUrl(order: PaymentOrder, payment: PaymentRow, locale: Locale): string | null {
    const token = paymentAccessToken(this.appSecret, payment.id);
    const returnUrl = this.config.webUrl(locale, `/payments/return/${token}`);
    switch (payment.provider) {
      case 'DEMO':
        return this.config.sitePath(locale, `/payments/demo/${token}`);
      case 'PAYME':
        return this.config.payme
          ? paymeCheckoutUrl(this.config.payme, {
              orderNumber: order.number,
              amountTiyin: BigInt(payment.amount.times(100).toFixed(0)),
              locale,
              returnUrl,
            })
          : null;
      case 'CLICK':
        return this.config.click
          ? clickPaymentUrl(this.config.click, {
              orderNumber: order.number,
              amount: payment.amount.toFixed(2),
              returnUrl,
            })
          : null;
      default:
        return null;
    }
  }

  // ─── Customer actions ─────────────────────────────────────────────────────

  /**
   * Starts a new payment attempt for an order that still awaits payment: after a failed or
   * cancelled attempt, or to switch between online methods. The order's owner (signed in) or the
   * holder of the guest order link may do this. Repeating the request while an attempt for the
   * same method is waiting returns that attempt instead of creating another.
   */
  async startPayment(
    number: string,
    input: StartPaymentInput & { locale: Locale },
    auth: RequestAuth | null | undefined,
  ): Promise<PaymentSessionDto> {
    const order = await this.prisma.order.findUnique({ where: { number }, select: orderSelect });
    if (!order || !this.mayAct(order, auth, input.token)) {
      throw ApiException.notFound('Order not found');
    }
    if (!isOnlinePaymentMethod(input.method)) {
      throw new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'PAYMENT_METHOD_UNAVAILABLE',
        'Choose an online payment method',
      );
    }
    const provider = this.requireProvider(input.method);
    const now = new Date();
    if (!isAwaitingOnlinePayment(order, now)) {
      throw ApiException.conflict('CONFLICT', 'This order is not awaiting an online payment');
    }
    const open = order.payments.find((payment) => isOpenPayment(payment.status));
    if (
      open &&
      open.provider === provider &&
      open.method === input.method &&
      open.status !== 'PROCESSING' &&
      open.providerReference === null
    ) {
      return this.session(order, open, input.locale);
    }
    if (order.payments.length >= MAX_PAYMENT_ATTEMPTS) {
      throw ApiException.conflict('CONFLICT', 'Too many payment attempts for this order');
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        if (open) await this.closeAttempt(tx, open, 'CANCELLED', 'customer', 'REPLACED');
        await this.createAttempt(tx, {
          orderId: order.id,
          method: input.method,
          provider,
          amount: order.total,
          currency: order.currency,
          status: 'REQUIRES_ACTION',
          expiresAt: paymentDeadline(order),
          source: 'customer',
          detail: open ? 'Payment restarted' : 'Payment started',
        });
        await tx.order.update({ where: { id: order.id }, data: { paymentMethod: input.method } });
      });
    } catch (error) {
      if (isOpenAttemptConflict(error)) {
        throw ApiException.conflict('CONFLICT', 'A payment for this order is already starting');
      }
      throw error;
    }
    const session = await this.sessionForOrder(order.id, input.locale);
    if (!session) throw ApiException.conflict('CONFLICT', 'The payment could not be started');
    return session;
  }

  /** Landing page after a provider's (or the demo) payment page: the order's state, never a guess. */
  async returnInfo(token: string): Promise<PaymentReturnDto> {
    const payment = await this.findByToken(token);
    const order = await this.prisma.order.findUnique({
      where: { id: payment.orderId },
      select: orderSelect,
    });
    if (!order) throw ApiException.notFound('Payment not found');
    return {
      orderNumber: order.number,
      paymentStatus: order.payments.at(-1)?.status ?? 'PENDING',
      awaitingPayment: isAwaitingOnlinePayment(order, new Date()),
      orderPath: this.orderPath(order),
    };
  }

  // ─── Demo provider ────────────────────────────────────────────────────────

  async demoView(token: string): Promise<DemoPaymentDto> {
    const payment = await this.findDemoPayment(token);
    return this.demoDto(payment.orderId, payment.id);
  }

  /**
   * Applies a simulated outcome chosen on the demo payment page. Deterministic: success → PAID,
   * failure → FAILED, cancel → CANCELLED, pending → PROCESSING. Nothing is sent anywhere and the
   * order and admin show the payment as a demonstration. An attempt that has already ended keeps
   * its status (a second click changes nothing).
   */
  async demoAction(token: string, outcome: DemoPaymentOutcome): Promise<DemoPaymentDto> {
    const payment = await this.findDemoPayment(token);
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.payment.findUniqueOrThrow({
        where: { id: payment.id },
        select: { id: true, orderId: true, status: true, expiresAt: true },
      });
      if (!isOpenPayment(current.status)) return;
      const order = await tx.order.findUniqueOrThrow({
        where: { id: current.orderId },
        select: { status: true },
      });
      const expired = current.expiresAt !== null && current.expiresAt.getTime() <= Date.now();
      if (order.status === 'CANCELLED' || expired) {
        throw ApiException.conflict('CONFLICT', 'The payment window for this order has ended');
      }
      const options = { source: 'demo' as const, detail: `Simulated ${outcome}` };
      switch (outcome) {
        case 'success':
          await transitionPayment(tx, current, 'PAID', options);
          break;
        case 'failure':
          await transitionPayment(tx, current, 'FAILED', {
            ...options,
            failureCode: 'DEMO_DECLINED',
          });
          break;
        case 'cancel':
          await transitionPayment(tx, current, 'CANCELLED', {
            ...options,
            failureCode: 'CUSTOMER_CANCELLED',
          });
          break;
        case 'pending':
          if (current.status !== 'PROCESSING') {
            await transitionPayment(tx, current, 'PROCESSING', options);
          }
          break;
      }
    });
    return this.demoDto(payment.orderId, payment.id);
  }

  private async findDemoPayment(token: string): Promise<PaymentRow> {
    if (this.config.mode !== 'demo') {
      throw ApiException.notFound('Demonstration payments are not enabled');
    }
    const payment = await this.findByToken(token);
    if (payment.provider !== 'DEMO') throw ApiException.notFound('Payment not found');
    return payment;
  }

  private async demoDto(orderId: string, paymentId: string): Promise<DemoPaymentDto> {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      select: orderSelect,
    });
    const payment = order.payments.find((candidate) => candidate.id === paymentId);
    if (!payment) throw ApiException.notFound('Payment not found');
    return {
      orderNumber: order.number,
      method: payment.method,
      status: payment.status,
      amount: toMoney(payment.amount),
      currency: payment.currency,
      expiresAt: payment.expiresAt?.toISOString() ?? null,
      returnPath: this.config.sitePath(
        order.locale,
        `/payments/return/${paymentAccessToken(this.appSecret, payment.id)}`,
      ),
    };
  }

  // ─── Shared by provider callbacks, staff actions and the expiry job ──────

  /**
   * Ends an open attempt (replaced, cancelled with the order, expired). A Click payment that was
   * prepared for it can no longer be completed. Throws CONFLICT if the attempt was paid meanwhile.
   */
  async closeAttempt(
    tx: Prisma.TransactionClient,
    payment: { id: string; orderId: string; status: PaymentStatus },
    to: 'CANCELLED' | 'EXPIRED',
    source: PaymentEventSource,
    failureCode: string,
    actorUserId: string | null = null,
  ): Promise<void> {
    const moved = await transitionPayment(tx, payment, to, {
      source,
      failureCode,
      detail: failureCode,
      actorUserId,
    });
    if (!moved) {
      throw ApiException.conflict(
        'CONFLICT',
        'The payment changed meanwhile. Reload and try again.',
      );
    }
    await tx.clickTransaction.updateMany({
      where: { paymentId: payment.id, state: 0 },
      data: { state: -1 },
    });
  }

  /** Cancels every open attempt of an order (the order itself is being cancelled). */
  async closeOpenAttempts(
    tx: Prisma.TransactionClient,
    orderId: string,
    source: PaymentEventSource,
    actorUserId: string | null,
  ): Promise<void> {
    const open = await tx.payment.findMany({
      where: { orderId, status: { in: [...OPEN_PAYMENT_STATUSES] } },
      select: { id: true, orderId: true, status: true },
    });
    for (const payment of open) {
      await this.closeAttempt(tx, payment, 'CANCELLED', source, 'ORDER_CANCELLED', actorUserId);
    }
  }

  async createAttempt(
    tx: Prisma.TransactionClient,
    attempt: {
      orderId: string;
      method: PaymentMethod;
      provider: PaymentProviderCode;
      amount: Prisma.Decimal;
      currency: string;
      status: PaymentStatus;
      expiresAt: Date | null;
      source: PaymentEventSource;
      detail: string;
      providerReference?: string;
    },
  ): Promise<{ id: string; orderId: string; status: PaymentStatus }> {
    const created = await tx.payment.create({
      data: {
        orderId: attempt.orderId,
        method: attempt.method,
        provider: attempt.provider,
        status: attempt.status,
        amount: attempt.amount,
        currency: attempt.currency,
        expiresAt: attempt.expiresAt,
        providerReference: attempt.providerReference ?? null,
      },
      select: { id: true, orderId: true, status: true },
    });
    if (attempt.provider !== 'CASH') {
      await tx.payment.update({
        where: { id: created.id },
        data: { accessTokenHash: sha256(paymentAccessToken(this.appSecret, created.id)) },
      });
    }
    await tx.paymentEvent.create({
      data: {
        paymentId: created.id,
        fromStatus: null,
        toStatus: attempt.status,
        source: attempt.source,
        detail: attempt.detail,
      },
    });
    await tx.order.update({
      where: { id: attempt.orderId },
      data: { paymentStatus: attempt.status },
    });
    return created;
  }

  /**
   * Expires online payments whose window has ended and cancels their orders when nothing else can
   * pay them, returning the reserved stock. Payments a provider is processing get a short grace
   * period. Idempotent and safe to run in several processes: every change is conditional.
   */
  async expireOverdue(now = new Date()): Promise<{ expired: number; cancelledOrders: number }> {
    const due = await this.prisma.payment.findMany({
      where: {
        provider: { not: 'CASH' },
        OR: [
          { status: { in: ['PENDING', 'REQUIRES_ACTION'] }, expiresAt: { lte: now } },
          {
            status: 'PROCESSING',
            expiresAt: { lte: new Date(now.getTime() - PROCESSING_GRACE_MS) },
          },
        ],
      },
      select: { id: true, orderId: true, status: true },
      orderBy: { expiresAt: 'asc' },
      take: 100,
    });

    let expired = 0;
    let cancelledOrders = 0;
    for (const payment of due) {
      try {
        const result = await this.prisma.$transaction(async (tx) => {
          const moved = await transitionPayment(tx, payment, 'EXPIRED', {
            source: 'system',
            detail: 'Payment window ended',
            failureCode: 'EXPIRED',
            now,
          });
          if (!moved) return { expired: false, cancelled: false, restocked: false };
          await tx.clickTransaction.updateMany({
            where: { paymentId: payment.id, state: 0 },
            data: { state: -1 },
          });
          const cancelled = await this.cancelUnpaidOrder(tx, payment.orderId, now);
          return { expired: true, ...cancelled };
        });
        if (result.expired) expired++;
        if (result.cancelled) cancelledOrders++;
        if (result.restocked) this.revalidation.notify('catalog');
      } catch (error) {
        this.logger.warn({ err: error, paymentId: payment.id }, 'Expiring a payment failed');
      }
    }
    if (expired > 0)
      this.logger.log({ expired, cancelledOrders }, 'Overdue online payments expired');
    return { expired, cancelledOrders };
  }

  private async cancelUnpaidOrder(
    tx: Prisma.TransactionClient,
    orderId: string,
    now: Date,
  ): Promise<{ cancelled: boolean; restocked: boolean }> {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        items: { select: { variantId: true, quantity: true } },
        payments: { select: { status: true } },
      },
    });
    // Staff have taken the order over, or another attempt may still pay it, or it is paid.
    if (order.status !== 'PENDING') return { cancelled: false, restocked: false };
    if (order.payments.some((payment) => isOpenPayment(payment.status))) {
      return { cancelled: false, restocked: false };
    }
    if (
      order.payments.some((payment) =>
        (SETTLED_PAYMENT_STATUSES as readonly PaymentStatus[]).includes(payment.status),
      )
    ) {
      return { cancelled: false, restocked: false };
    }
    const updated = await tx.order.updateMany({
      where: { id: order.id, status: 'PENDING' },
      data: { status: 'CANCELLED', cancelledAt: now, cancelReason: PAYMENT_NOT_COMPLETED },
    });
    if (updated.count === 0) return { cancelled: false, restocked: false };
    const restocked = await releaseOrderStock(tx, order, null);
    await tx.orderStatusEvent.create({
      data: {
        orderId: order.id,
        fromStatus: 'PENDING',
        toStatus: 'CANCELLED',
        paymentStatus: 'EXPIRED',
        note: 'Online payment not completed in time',
        createdAt: now,
      },
    });
    return { cancelled: true, restocked };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async findByToken(token: string): Promise<PaymentRow> {
    const payment = await this.prisma.payment.findUnique({
      where: { accessTokenHash: sha256(token) },
      select: paymentSelect,
    });
    if (!payment) throw ApiException.notFound('Payment not found');
    return payment;
  }

  private mayAct(
    order: PaymentOrder,
    auth: RequestAuth | null | undefined,
    token: string | undefined,
  ): boolean {
    if (auth && order.userId !== null && order.userId === auth.userId) return true;
    return token !== undefined && digestsEqual(order.accessTokenHash, sha256(token));
  }

  /** Order page path: the account page for an account order, the guest link otherwise. */
  orderPath(order: Pick<PaymentOrder, 'number' | 'userId' | 'locale' | 'idempotencyKey'>): string {
    if (order.userId !== null) {
      return this.config.sitePath(order.locale, `/account/orders/${order.number}`);
    }
    const token = orderAccessToken(this.appSecret, order.idempotencyKey);
    return this.config.sitePath(
      order.locale,
      `/orders/${order.number}?token=${encodeURIComponent(token)}`,
    );
  }
}
