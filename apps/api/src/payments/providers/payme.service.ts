import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { Prisma, type PaymentStatus } from '../../generated/prisma/client.js';
import { uniqueConstraintName } from '../../common/prisma-errors.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PaymentConfig } from '../payment-config.js';
import {
  isOpenAttemptConflict,
  isOpenPayment,
  isSettledPayment,
  transitionPayment,
} from '../payment-state.js';
import { PaymentsService, isAwaitingOnlinePayment, paymentDeadline } from '../payments.service.js';
import {
  PAYME_ACCOUNT_FIELD,
  PAYME_TIMEOUT_MS,
  PaymeError,
  PaymeReason,
  PaymeState,
  isPaymeAddress,
  isPaymeAuthorized,
  isRecord,
  paymeError,
  paymeInteger,
  paymeTransactionId,
  type PaymeResponse,
} from './payme-protocol.js';

/** Marker set by the body reader when a Payme request is not valid JSON. */
export const UNPARSABLE_BODY = Symbol('unparsable-body');

const ORDER_NUMBER = /^TRN-[0-9A-Z]{8}$/;

const transactionInclude = {
  payment: {
    select: { id: true, orderId: true, status: true, order: { select: { number: true } } },
  },
} satisfies Prisma.PaymeTransactionInclude;

type TransactionRow = Prisma.PaymeTransactionGetPayload<{ include: typeof transactionInclude }>;

/**
 * Payme Merchant API endpoint (JSON-RPC 2.0 over HTTPS, called by Payme). Implements
 * CheckPerformTransaction, CreateTransaction, PerformTransaction, CancelTransaction,
 * CheckTransaction and GetStatement as documented at https://developer.help.paycom.uz.
 *
 * - Every call is authenticated with the cashbox key (Basic auth) and, by default, Payme's
 *   documented address range; anything else gets -32504.
 * - Amounts are compared in tiyin with the order total; the order number is the account.
 * - Repeated calls get the same answer, stored in PaymeTransaction.
 * - An order is only marked paid by PerformTransaction; returning from Payme's page proves nothing.
 */
@Injectable()
export class PaymeService {
  private readonly logger = new Logger(PaymeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: PaymentConfig,
    private readonly payments: PaymentsService,
  ) {}

  async handle(request: Request): Promise<PaymeResponse> {
    const body: unknown = request.body;
    const id =
      isRecord(body) && (typeof body.id === 'number' || typeof body.id === 'string')
        ? body.id
        : null;
    const settings = this.config.payme;
    try {
      if (!settings) throw new PaymeError(-32504);
      if (settings.checkIp && !isPaymeAddress(request.ip)) throw new PaymeError(-32504);
      if (!isPaymeAuthorized(request.headers.authorization, settings)) throw new PaymeError(-32504);
      if (body === UNPARSABLE_BODY) throw new PaymeError(-32700);
      if (!isRecord(body) || typeof body.method !== 'string' || !isRecord(body.params)) {
        throw new PaymeError(-32600);
      }
      const result = await this.dispatch(body.method, body.params);
      return { jsonrpc: '2.0', id, result };
    } catch (error) {
      if (error instanceof PaymeError) return paymeError(id, error);
      this.logger.error({ err: error }, 'Payme request failed');
      return paymeError(id, new PaymeError(-32400));
    }
  }

  private dispatch(
    method: string,
    params: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    switch (method) {
      case 'CheckPerformTransaction':
        return this.checkPerformTransaction(params);
      case 'CreateTransaction':
        return this.createTransaction(params);
      case 'PerformTransaction':
        return this.performTransaction(params);
      case 'CancelTransaction':
        return this.cancelTransaction(params);
      case 'CheckTransaction':
        return this.checkTransaction(params);
      case 'GetStatement':
        return this.getStatement(params);
      default:
        // Includes SetFiscalData: fiscal receipts are not implemented, so nothing is acknowledged.
        throw new PaymeError(-32601, method);
    }
  }

  // ─── Methods ──────────────────────────────────────────────────────────────

  private async checkPerformTransaction(params: Record<string, unknown>) {
    const amount = paymeInteger(params.amount);
    if (amount === null) throw new PaymeError(-31001);
    await this.payableOrder(params.account, amount);
    return { allow: true };
  }

  private async createTransaction(params: Record<string, unknown>) {
    const paymeId = paymeTransactionId(params.id);
    const time = paymeInteger(params.time);
    const amount = paymeInteger(params.amount);
    if (paymeId === null || time === null) throw new PaymeError(-32600);
    if (amount === null) throw new PaymeError(-31001);

    const existing = await this.findTransaction(paymeId);
    if (existing) return this.repeatCreate(existing);

    const now = Date.now();
    if (BigInt(now) - time >= BigInt(PAYME_TIMEOUT_MS)) throw new PaymeError(-31008);
    const order = await this.payableOrder(params.account, amount);

    const active = await this.prisma.paymeTransaction.findFirst({
      where: { payment: { orderId: order.id }, state: PaymeState.CREATED },
      select: { id: true },
    });
    // One Payme transaction at a time per order (Payme's sandbox expects -31008 here).
    if (active) throw new PaymeError(-31008);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const open = await tx.payment.findFirst({
          where: {
            orderId: order.id,
            status: { in: ['PENDING', 'REQUIRES_ACTION', 'PROCESSING'] },
          },
          select: {
            id: true,
            orderId: true,
            status: true,
            provider: true,
            providerReference: true,
          },
        });
        let payment: { id: string; orderId: string; status: PaymentStatus };
        if (
          open &&
          open.provider === 'PAYME' &&
          open.providerReference === null &&
          open.status !== 'PROCESSING'
        ) {
          payment = open;
        } else {
          if (open) await this.payments.closeAttempt(tx, open, 'CANCELLED', 'provider', 'REPLACED');
          const attempt = await this.payments.createAttempt(tx, {
            orderId: order.id,
            method: 'PAYME',
            provider: 'PAYME',
            amount: order.total,
            currency: order.currency,
            status: 'REQUIRES_ACTION',
            expiresAt: paymentDeadline(order),
            source: 'provider',
            detail: 'CreateTransaction',
          });
          payment = { id: attempt.id, orderId: attempt.orderId, status: 'REQUIRES_ACTION' };
        }
        const moved = await transitionPayment(tx, payment, 'PROCESSING', {
          source: 'provider',
          detail: 'CreateTransaction',
          data: { providerReference: paymeId },
        });
        if (!moved) throw new PaymeError(-31008);
        return tx.paymeTransaction.create({
          data: {
            paymeId,
            paymentId: payment.id,
            amount,
            paymeTime: time,
            createTime: BigInt(now),
            state: PaymeState.CREATED,
          },
        });
      });
      return {
        create_time: Number(created.createTime),
        transaction: created.id,
        state: created.state,
      };
    } catch (error) {
      // The same CreateTransaction arrived twice at once: answer with the stored transaction.
      if (uniqueConstraintName(error)?.includes('paymeId')) {
        const raced = await this.findTransaction(paymeId);
        if (raced) return this.repeatCreate(raced);
      }
      if (isOpenAttemptConflict(error)) throw new PaymeError(-31008);
      throw error;
    }
  }

  private async repeatCreate(transaction: TransactionRow) {
    if (transaction.state !== PaymeState.CREATED) throw new PaymeError(-31008);
    if (this.isTimedOut(transaction)) {
      await this.cancelCreated(transaction, PaymeReason.TIMEOUT);
      throw new PaymeError(-31008);
    }
    return {
      create_time: Number(transaction.createTime),
      transaction: transaction.id,
      state: transaction.state,
    };
  }

  private async performTransaction(params: Record<string, unknown>) {
    const paymeId = paymeTransactionId(params.id);
    if (paymeId === null) throw new PaymeError(-32600);
    const transaction = await this.findTransaction(paymeId);
    if (!transaction) throw new PaymeError(-31003);

    if (transaction.state === PaymeState.PERFORMED) return this.performedAnswer(transaction);
    if (transaction.state !== PaymeState.CREATED) throw new PaymeError(-31008);
    if (this.isTimedOut(transaction)) {
      await this.cancelCreated(transaction, PaymeReason.TIMEOUT);
      throw new PaymeError(-31008);
    }

    const outcome = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: transaction.paymentId },
        select: { id: true, orderId: true, status: true, order: { select: { status: true } } },
      });
      // The attempt expired, was replaced or the order was cancelled meanwhile: refuse the charge.
      if (payment.status !== 'PROCESSING' || payment.order.status === 'CANCELLED') {
        const reason: number =
          payment.status === 'EXPIRED' ? PaymeReason.TIMEOUT : PaymeReason.EXECUTION_ERROR;
        return { kind: 'refused', reason } as const;
      }
      const moved = await transitionPayment(tx, payment, 'PAID', {
        source: 'provider',
        detail: 'PerformTransaction',
      });
      if (!moved) return { kind: 'refused', reason: PaymeReason.EXECUTION_ERROR } as const;
      const updated = await tx.paymeTransaction.updateMany({
        where: { id: transaction.id, state: PaymeState.CREATED },
        data: { state: PaymeState.PERFORMED, performTime: BigInt(Date.now()) },
      });
      if (updated.count === 0) throw new PaymeError(-31008);
      const row = await tx.paymeTransaction.findUniqueOrThrow({ where: { id: transaction.id } });
      return { kind: 'performed', row } as const;
    });

    if (outcome.kind === 'refused') {
      await this.cancelCreated(transaction, outcome.reason);
      throw new PaymeError(-31008);
    }
    return this.performedAnswer(outcome.row);
  }

  private async cancelTransaction(params: Record<string, unknown>) {
    const paymeId = paymeTransactionId(params.id);
    const reason =
      typeof params.reason === 'number' && Number.isInteger(params.reason) ? params.reason : null;
    if (paymeId === null || reason === null) throw new PaymeError(-32600);
    const transaction = await this.findTransaction(paymeId);
    if (!transaction) throw new PaymeError(-31003);

    if (transaction.state === PaymeState.CREATED) {
      const cancelled = await this.cancelCreated(transaction, reason);
      return this.cancelledAnswer(cancelled);
    }
    if (transaction.state === PaymeState.PERFORMED) {
      // A refund made by TERAN staff in the Payme merchant cabinet.
      const refunded = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.paymeTransaction.updateMany({
          where: { id: transaction.id, state: PaymeState.PERFORMED },
          data: {
            state: PaymeState.CANCELLED_AFTER_PERFORM,
            cancelTime: BigInt(Date.now()),
            reason,
          },
        });
        if (updated.count > 0) {
          const payment = await tx.payment.findUniqueOrThrow({
            where: { id: transaction.paymentId },
            select: { id: true, orderId: true, status: true },
          });
          if (payment.status === 'PAID' || payment.status === 'REFUND_PENDING') {
            await transitionPayment(tx, payment, 'REFUNDED', {
              source: 'provider',
              detail: 'CancelTransaction',
              failureCode: `PAYME_REASON_${reason}`,
            });
          }
        }
        return tx.paymeTransaction.findUniqueOrThrow({ where: { id: transaction.id } });
      });
      return this.cancelledAnswer(refunded);
    }
    return this.cancelledAnswer(transaction);
  }

  private async checkTransaction(params: Record<string, unknown>) {
    const paymeId = paymeTransactionId(params.id);
    if (paymeId === null) throw new PaymeError(-32600);
    const transaction = await this.findTransaction(paymeId);
    if (!transaction) throw new PaymeError(-31003);
    return {
      create_time: Number(transaction.createTime),
      perform_time: Number(transaction.performTime),
      cancel_time: Number(transaction.cancelTime),
      transaction: transaction.id,
      state: transaction.state,
      reason: transaction.reason,
    };
  }

  private async getStatement(params: Record<string, unknown>) {
    const from = paymeInteger(params.from);
    const to = paymeInteger(params.to);
    if (from === null || to === null) throw new PaymeError(-32600);
    const rows = await this.prisma.paymeTransaction.findMany({
      where: { paymeTime: { gte: from, lte: to } },
      orderBy: { paymeTime: 'asc' },
      include: transactionInclude,
    });
    return {
      transactions: rows.map((row) => ({
        id: row.paymeId,
        time: Number(row.paymeTime),
        amount: Number(row.amount),
        account: { [PAYME_ACCOUNT_FIELD]: row.payment.order.number },
        create_time: Number(row.createTime),
        perform_time: Number(row.performTime),
        cancel_time: Number(row.cancelTime),
        transaction: row.id,
        state: row.state,
        reason: row.reason,
        receivers: null,
      })),
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * The order named by the account, if it can be paid with Payme now and the amount (tiyin)
   * equals its total: -31050 unknown order, -31051 not payable, -31001 wrong amount.
   */
  private async payableOrder(account: unknown, amount: bigint) {
    const number = isRecord(account) ? account[PAYME_ACCOUNT_FIELD] : undefined;
    if (typeof number !== 'string' || !ORDER_NUMBER.test(number)) {
      throw new PaymeError(-31050, PAYME_ACCOUNT_FIELD);
    }
    const order = await this.prisma.order.findUnique({
      where: { number },
      select: {
        id: true,
        number: true,
        status: true,
        paymentMethod: true,
        total: true,
        currency: true,
        payments: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: { provider: true, status: true, expiresAt: true },
        },
      },
    });
    if (!order) throw new PaymeError(-31050, PAYME_ACCOUNT_FIELD);
    if (
      order.paymentMethod !== 'PAYME' ||
      order.currency !== 'UZS' ||
      order.payments.some((payment) => isSettledPayment(payment.status)) ||
      !isAwaitingOnlinePayment(order, new Date())
    ) {
      throw new PaymeError(-31051, PAYME_ACCOUNT_FIELD);
    }
    if (!order.total.times(100).equals(new Prisma.Decimal(amount.toString()))) {
      throw new PaymeError(-31001);
    }
    return order;
  }

  private findTransaction(paymeId: string): Promise<TransactionRow | null> {
    return this.prisma.paymeTransaction.findUnique({
      where: { paymeId },
      include: transactionInclude,
    });
  }

  private isTimedOut(transaction: { createTime: bigint }): boolean {
    return BigInt(Date.now()) - transaction.createTime >= BigInt(PAYME_TIMEOUT_MS);
  }

  /** Cancels a created (not performed) transaction and its open attempt. */
  private async cancelCreated(transaction: TransactionRow, reason: number) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.paymeTransaction.updateMany({
        where: { id: transaction.id, state: PaymeState.CREATED },
        data: { state: PaymeState.CANCELLED, cancelTime: BigInt(Date.now()), reason },
      });
      if (updated.count > 0) {
        const payment = await tx.payment.findUniqueOrThrow({
          where: { id: transaction.paymentId },
          select: { id: true, orderId: true, status: true },
        });
        if (isOpenPayment(payment.status)) {
          await transitionPayment(tx, payment, 'CANCELLED', {
            source: 'provider',
            detail: 'CancelTransaction',
            failureCode: `PAYME_REASON_${reason}`,
          });
        }
      }
      return tx.paymeTransaction.findUniqueOrThrow({ where: { id: transaction.id } });
    });
  }

  private performedAnswer(transaction: { id: string; performTime: bigint; state: number }) {
    return {
      transaction: transaction.id,
      perform_time: Number(transaction.performTime),
      state: transaction.state,
    };
  }

  private cancelledAnswer(transaction: { id: string; cancelTime: bigint; state: number }) {
    return {
      transaction: transaction.id,
      cancel_time: Number(transaction.cancelTime),
      state: transaction.state,
    };
  }
}
