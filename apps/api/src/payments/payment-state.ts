import { createHmac } from 'node:crypto';
import {
  canTransitionPayment,
  PAYMENT_STATUS_TRANSITIONS,
  type PaymentStatus,
} from '@teran/contracts';
import type { Prisma } from '../generated/prisma/client.js';
import { ApiException } from '../common/errors/api-exception.js';
import { uniqueConstraintName } from '../common/prisma-errors.js';

/** Statuses of an attempt that can still be paid; at most one per order (unique index). */
export const OPEN_PAYMENT_STATUSES = [
  'PENDING',
  'REQUIRES_ACTION',
  'PROCESSING',
] as const satisfies readonly PaymentStatus[];

/** Statuses meaning money was taken (possibly returned since). */
export const SETTLED_PAYMENT_STATUSES = [
  'PAID',
  'REFUND_PENDING',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
] as const satisfies readonly PaymentStatus[];

/** The insert violated "at most one open attempt per order" (a concurrent attempt won). */
export function isOpenAttemptConflict(error: unknown): boolean {
  const name = uniqueConstraintName(error);
  return name !== null && (name.includes('one_open_attempt') || name.includes('orderId'));
}

export function isOpenPayment(status: PaymentStatus): boolean {
  return (OPEN_PAYMENT_STATUSES as readonly PaymentStatus[]).includes(status);
}

export function isSettledPayment(status: PaymentStatus): boolean {
  return (SETTLED_PAYMENT_STATUSES as readonly PaymentStatus[]).includes(status);
}

/** Who caused a payment status change (stored on PaymentEvent). */
export type PaymentEventSource = 'customer' | 'provider' | 'staff' | 'system' | 'demo';

export interface TransitionOptions {
  source: PaymentEventSource;
  /** Provider method or reason, e.g. "PerformTransaction" or "EXPIRED". */
  detail?: string;
  actorUserId?: string | null;
  failureCode?: string;
  /** Extra columns to set in the same conditional update (e.g. the provider reference). */
  data?: Prisma.PaymentUpdateManyMutationInput;
  now?: Date;
}

interface PaymentRef {
  id: string;
  orderId: string;
  status: PaymentStatus;
}

/**
 * Moves one payment attempt along PAYMENT_STATUS_TRANSITIONS, records the change in PaymentEvent
 * and mirrors the order's payment status. The update only applies while the attempt is still in
 * the status the caller read, so two concurrent callbacks (or a callback racing the expiry job)
 * can never both apply. Returns false when the attempt had already moved on.
 */
export async function transitionPayment(
  tx: Prisma.TransactionClient,
  payment: PaymentRef,
  to: PaymentStatus,
  options: TransitionOptions,
): Promise<boolean> {
  if (!canTransitionPayment(payment.status, to)) {
    throw ApiException.conflict(
      'INVALID_STATUS_TRANSITION',
      `A payment cannot go from ${payment.status} to ${to}`,
      { from: payment.status, allowed: PAYMENT_STATUS_TRANSITIONS[payment.status] },
    );
  }
  const now = options.now ?? new Date();
  const updated = await tx.payment.updateMany({
    where: { id: payment.id, status: payment.status },
    data: {
      status: to,
      ...(to === 'PAID' ? { confirmedAt: now } : {}),
      ...(options.failureCode !== undefined ? { failureCode: options.failureCode } : {}),
      ...options.data,
    },
  });
  if (updated.count === 0) return false;
  await tx.paymentEvent.create({
    data: {
      paymentId: payment.id,
      fromStatus: payment.status,
      toStatus: to,
      source: options.source,
      detail: options.detail ?? null,
      actorUserId: options.actorUserId ?? null,
      createdAt: now,
    },
  });
  await mirrorOrderPaymentStatus(tx, payment.orderId);
  return true;
}

/** Order.paymentStatus always shows the status of the order's latest payment attempt. */
export async function mirrorOrderPaymentStatus(
  tx: Prisma.TransactionClient,
  orderId: string,
): Promise<void> {
  const latest = await tx.payment.findFirst({
    where: { orderId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { status: true },
  });
  if (latest) {
    await tx.order.update({ where: { id: orderId }, data: { paymentStatus: latest.status } });
  }
}

/**
 * Secret for an attempt's return and demo-page links, derived from the server secret so an
 * idempotent checkout replay can rebuild the same link; only its SHA-256 is stored.
 */
export function paymentAccessToken(appSecret: string, paymentId: string): string {
  return createHmac('sha256', appSecret).update(`payment-access:${paymentId}`).digest('base64url');
}
