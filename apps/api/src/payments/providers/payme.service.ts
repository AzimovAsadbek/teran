import { acceptPaymeReceipt } from './payme-receipt.js';
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

function orderNumberFromAccount(account: unknown): string {
  const number = isRecord(account) ? account[PAYME_ACCOUNT_FIELD] : undefined;
  if (typeof number !== 'string' || !ORDER_NUMBER.test(number)) {
    throw new PaymeError(-31050, PAYME_ACCOUNT_FIELD);
  }
  return number;
}

const transactionInclude = {
  payment: {
    select: {
      id: true,
      orderId: true,
      status: true,
      order: { select: { number: true, status: true } },
    },
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
      case 'SetFiscalData':
        return acceptPaymeReceipt(this.prisma, params);
      default:
        throw new PaymeError(-32601, method);
    }
  }

  // ─── Methods ──────────────────────────────────────────────────────────────

  private async checkPerformTransaction(params: Record<string, unknown>) {
    const amount = paymeInteger(params.amount);
    if (amount === null) throw new PaymeError(-31001);
    const order = await this.payableOrder(orderNumberFromAccount(params.account), amount);
    const detail = order.payments.at(-1)?.fiscalPayload;
    return detail ? { allow: true, detail } : { allow: true };
  }

  private async createTransaction(params: Record<string, unknown>) {
    const paymeId = paymeTransactionId(params.id);
    const time = paymeInteger(params.time);
    const amount = paymeInteger(params.amount);
    if (paymeId === null || time === null) throw new PaymeError(-32600);
    if (amount === null) throw new PaymeError(-31001);

    const number = orderNumberFromAccount(params.account);
    const existing = await this.findTransaction(paymeId);
    if (existing) return this.repeatCreate(existing, number, amount);

    const now = Date.now();
    if (BigInt(now) - time >= BigInt(PAYME_TIMEOUT_MS)) throw new PaymeError(-31008);

    try {
      const transaction = await this.prisma.$transaction(async (tx) => {
        // Competing callbacks must see the transaction that first reserved this order.
        await tx.$queryRaw`SELECT id FROM "Order" WHERE number = ${number} FOR UPDATE`;
        const repeated = await this.findTransaction(paymeId, tx);
        if (repeated) return repeated;
        const order = await this.payableOrder(number, amount, tx);
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
          include: transactionInclude,
        });
      });
      return this.repeatCreate(transaction, number, amount);
    } catch (error) {
      // The same CreateTransaction arrived twice at once: answer with the stored transaction.
      if (uniqueConstraintName(error)?.includes('paymeId')) {
        const raced = await this.findTransaction(paymeId);
        if (raced) return this.repeatCreate(raced, number, amount);
      }
      if (isOpenAttemptConflict(error)) throw new PaymeError(-31008);
      throw error;
    }
  }

  private async repeatCreate(transaction: TransactionRow, number: string, amount: bigint) {
    if (transaction.payment.order.number !== number)
      throw new PaymeError(-31051, PAYME_ACCOUNT_FIELD);
    if (transaction.amount !== amount) throw new PaymeError(-31001);
    transaction = await this.reconcileIfNeeded(transaction);
    if (transaction.state !== PaymeState.CREATED) throw new PaymeError(-31008);
    return {
      create_time: Number(transaction.createTime),
      transaction: transaction.id,
      state: transaction.state,
    };
  }

  private async performTransaction(params: Record<string, unknown>) {
    const paymeId = paymeTransactionId(params.id);
    if (paymeId === null) throw new PaymeError(-32600);
    const row = await this.prisma.$transaction(async (tx) => {
      const current = await this.lockTransaction(tx, paymeId);
      if (current.state === PaymeState.PERFORMED) return current;
      if (current.state !== PaymeState.CREATED) return null;
      const moved = await transitionPayment(tx, current.payment, 'PAID', {
        source: 'provider',
        detail: 'PerformTransaction',
      });
      if (!moved) throw new PaymeError(-31008);
      return tx.paymeTransaction.update({
        where: { id: current.id },
        data: { state: PaymeState.PERFORMED, performTime: BigInt(Date.now()) },
      });
    });
    // A timeout discovered under the lock must commit before answering Payme.
    if (!row) throw new PaymeError(-31008);
    return this.performedAnswer(row);
  }

  private async cancelTransaction(params: Record<string, unknown>) {
    const paymeId = paymeTransactionId(params.id);
    const reason = params.reason;
    if (paymeId === null || typeof reason !== 'number' || !Number.isInteger(reason))
      throw new PaymeError(-32600);
    const row = await this.prisma.$transaction(async (tx) => {
      const current = await this.lockTransaction(tx, paymeId);
      if (current.state === PaymeState.CREATED) return this.cancelCreated(tx, current, reason);
      if (current.state !== PaymeState.PERFORMED) return current;
      if (current.payment.status === 'PAID' || current.payment.status === 'REFUND_PENDING') {
        await transitionPayment(tx, current.payment, 'REFUNDED', {
          source: 'provider',
          detail: 'CancelTransaction',
          failureCode: `PAYME_REASON_${reason}`,
        });
      }
      return tx.paymeTransaction.update({
        where: { id: current.id },
        data: { state: PaymeState.CANCELLED_AFTER_PERFORM, cancelTime: BigInt(Date.now()), reason },
      });
    });
    return this.cancelledAnswer(row);
  }

  private async checkTransaction(params: Record<string, unknown>) {
    const paymeId = paymeTransactionId(params.id);
    if (paymeId === null) throw new PaymeError(-32600);
    const stored = await this.findTransaction(paymeId);
    if (!stored) throw new PaymeError(-31003);
    const transaction = await this.reconcileIfNeeded(stored);
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
    // A statement may arrive before the expiry worker, including for attempts from older releases.
    for (const [i, row] of rows.entries()) {
      if (this.cancellationDue(row) !== null) rows[i] = await this.reconcileIfNeeded(row);
    }
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
  private async payableOrder(
    number: string,
    amount: bigint,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    const order = await db.order.findUnique({
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
          select: {
            provider: true,
            status: true,
            expiresAt: true,
            fiscalPayload: true,
            paymeTransactions: {
              where: { state: PaymeState.CREATED },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });
    if (!order) throw new PaymeError(-31050, PAYME_ACCOUNT_FIELD);
    if (
      order.paymentMethod !== 'PAYME' ||
      order.currency !== 'UZS' ||
      order.payments.some(
        (payment) => isSettledPayment(payment.status) || payment.paymeTransactions.length > 0,
      ) ||
      !isAwaitingOnlinePayment(order, new Date())
    ) {
      throw new PaymeError(-31051, PAYME_ACCOUNT_FIELD);
    }
    if (!order.total.times(100).equals(new Prisma.Decimal(amount.toString()))) {
      throw new PaymeError(-31001);
    }
    return order;
  }

  private findTransaction(
    paymeId: string,
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<TransactionRow | null> {
    return db.paymeTransaction.findUnique({
      where: { paymeId },
      include: transactionInclude,
    });
  }

  /** Serialize Payme decisions with the expiry worker and with other callbacks for this payment. */
  private async lockTransaction(
    tx: Prisma.TransactionClient,
    paymeId: string,
  ): Promise<TransactionRow> {
    await tx.$queryRaw`SELECT p.id FROM "Payment" p
      JOIN "PaymeTransaction" t ON t."paymentId" = p.id
      WHERE t."paymeId" = ${paymeId} FOR UPDATE OF p`;
    const row = await this.findTransaction(paymeId, tx);
    if (!row) throw new PaymeError(-31003);
    const reason = this.cancellationDue(row);
    return reason === null ? row : this.cancelCreated(tx, row, reason);
  }

  private cancellationDue(row: TransactionRow): number | null {
    if (row.state !== PaymeState.CREATED) return null;
    if (
      row.payment.status === 'EXPIRED' ||
      BigInt(Date.now()) - row.paymeTime >= BigInt(PAYME_TIMEOUT_MS)
    )
      return PaymeReason.TIMEOUT;
    if (row.payment.status !== 'PROCESSING' || row.payment.order.status === 'CANCELLED')
      return PaymeReason.EXECUTION_ERROR;
    return null;
  }

  private async reconcileIfNeeded(row: TransactionRow) {
    return this.cancellationDue(row) === null
      ? row
      : this.prisma.$transaction((tx) => this.lockTransaction(tx, row.paymeId));
  }

  private async cancelCreated(tx: Prisma.TransactionClient, row: TransactionRow, reason: number) {
    if (isOpenPayment(row.payment.status)) {
      await transitionPayment(
        tx,
        row.payment,
        reason === PaymeReason.TIMEOUT ? 'EXPIRED' : 'CANCELLED',
        {
          source: 'provider',
          detail: 'CancelTransaction',
          failureCode: `PAYME_REASON_${reason}`,
        },
      );
    }
    return tx.paymeTransaction.update({
      where: { id: row.id },
      data: { state: PaymeState.CANCELLED, cancelTime: BigInt(Date.now()), reason },
      include: transactionInclude,
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
