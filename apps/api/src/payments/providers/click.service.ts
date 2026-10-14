import { Injectable, Logger } from '@nestjs/common';
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
  ClickAction,
  ClickAnswer,
  ClickState,
  isClickSignatureValid,
  parseClickRequest,
  type ClickAnswerCode,
  type ClickRequest,
} from './click-protocol.js';

const ORDER_NUMBER = /^TRN-[0-9A-Z]{8}$/;
/** Click compares amounts in sum; its own reference implementation allows this difference. */
const AMOUNT_TOLERANCE = new Prisma.Decimal('0.01');

export interface ClickResponse {
  click_trans_id: number | null;
  merchant_trans_id: string | null;
  merchant_prepare_id?: number | null;
  merchant_confirm_id?: number | null;
  error: number;
  error_note: string;
}

/**
 * Click SHOP API endpoints (Prepare and Complete, form-encoded POSTs from Click), as documented at
 * https://docs.click.uz/shop-api/requests.
 *
 * - Every request is authenticated by its MD5 sign_string over the received values and the
 *   secret key; a wrong signature gets -1 and changes nothing.
 * - Amounts are compared with the order total; the order number is merchant_trans_id.
 * - A payment is marked paid only by a signed Complete without an error; returning from Click's
 *   page proves nothing.
 * - Repeated requests get the stored answer (ClickTransaction): -4 once completed, -9 once
 *   cancelled.
 */
@Injectable()
export class ClickService {
  private readonly logger = new Logger(ClickService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: PaymentConfig,
    private readonly payments: PaymentsService,
  ) {}

  async prepare(body: unknown): Promise<ClickResponse> {
    const request = parseClickRequest(body, false);
    const verified = this.verify(request, ClickAction.PREPARE);
    if ('answer' in verified) return verified.answer;
    const { click } = verified;
    try {
      return await this.handlePrepare(click);
    } catch (error) {
      this.logger.error({ err: error }, 'Click Prepare failed');
      return this.answer(click, ClickAnswer.UPDATE_FAILED);
    }
  }

  async complete(body: unknown): Promise<ClickResponse> {
    const request = parseClickRequest(body, true);
    const verified = this.verify(request, ClickAction.COMPLETE);
    if ('answer' in verified) return verified.answer;
    const { click } = verified;
    try {
      return await this.handleComplete(click);
    } catch (error) {
      this.logger.error({ err: error }, 'Click Complete failed');
      return this.answer(click, ClickAnswer.UPDATE_FAILED);
    }
  }

  // ─── Prepare ──────────────────────────────────────────────────────────────

  private async handlePrepare(click: ClickRequest): Promise<ClickResponse> {
    const clickTransId = BigInt(click.clickTransId);
    const existing = await this.prisma.clickTransaction.findUnique({ where: { clickTransId } });
    if (existing) return this.repeatPrepare(click, existing);

    const order = await this.findOrder(click.merchantTransId);
    if (!order) return this.answer(click, ClickAnswer.USER_NOT_FOUND);
    if (order.payments.some((payment) => isSettledPayment(payment.status))) {
      return this.answer(click, ClickAnswer.ALREADY_PAID);
    }
    // Click reports a failed or cancelled payment with a negative error.
    if (Number(click.error) < 0 || !this.isPayable(order)) {
      return this.answer(click, ClickAnswer.TRANSACTION_CANCELLED);
    }
    if (!this.amountMatches(click.amount, order.total)) {
      return this.answer(click, ClickAnswer.INCORRECT_AMOUNT);
    }

    try {
      const prepared = await this.prisma.$transaction(async (tx) => {
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
          open.provider === 'CLICK' &&
          open.providerReference === null &&
          open.status !== 'PROCESSING'
        ) {
          payment = open;
        } else {
          // A new Click payment replaces an earlier, unfinished one (it can no longer complete).
          if (open) await this.payments.closeAttempt(tx, open, 'CANCELLED', 'provider', 'REPLACED');
          payment = await this.payments.createAttempt(tx, {
            orderId: order.id,
            method: 'CLICK',
            provider: 'CLICK',
            amount: order.total,
            currency: order.currency,
            status: 'REQUIRES_ACTION',
            expiresAt: paymentDeadline(order),
            source: 'provider',
            detail: 'Prepare',
          });
        }
        const moved = await transitionPayment(tx, payment, 'PROCESSING', {
          source: 'provider',
          detail: 'Prepare',
          data: { providerReference: click.clickTransId },
        });
        if (!moved) throw new Error('Payment changed during Click Prepare');
        return tx.clickTransaction.create({
          data: {
            clickTransId,
            clickPaydocId: BigInt(click.clickPaydocId),
            paymentId: payment.id,
            amount: new Prisma.Decimal(click.amount),
            state: ClickState.PREPARED,
          },
        });
      });
      return this.answer(click, ClickAnswer.SUCCESS, { merchant_prepare_id: prepared.prepareId });
    } catch (error) {
      if (uniqueConstraintName(error)?.includes('clickTransId')) {
        const raced = await this.prisma.clickTransaction.findUnique({ where: { clickTransId } });
        if (raced) return this.repeatPrepare(click, raced);
      }
      if (isOpenAttemptConflict(error)) {
        return this.answer(click, ClickAnswer.TRANSACTION_CANCELLED);
      }
      throw error;
    }
  }

  private repeatPrepare(
    click: ClickRequest,
    existing: { prepareId: number; state: number },
  ): ClickResponse {
    if (existing.state === ClickState.COMPLETED)
      return this.answer(click, ClickAnswer.ALREADY_PAID);
    if (existing.state === ClickState.CANCELLED) {
      return this.answer(click, ClickAnswer.TRANSACTION_CANCELLED);
    }
    return this.answer(click, ClickAnswer.SUCCESS, { merchant_prepare_id: existing.prepareId });
  }

  // ─── Complete ─────────────────────────────────────────────────────────────

  private async handleComplete(click: ClickRequest): Promise<ClickResponse> {
    const order = await this.findOrder(click.merchantTransId);
    if (!order) return this.answer(click, ClickAnswer.USER_NOT_FOUND);
    const prepareId = Number(click.merchantPrepareId);
    const transaction = await this.prisma.clickTransaction.findUnique({
      where: { prepareId },
      include: { payment: { select: { id: true, orderId: true, status: true } } },
    });
    if (
      !transaction ||
      transaction.clickTransId !== BigInt(click.clickTransId) ||
      transaction.payment.orderId !== order.id
    ) {
      return this.answer(click, ClickAnswer.TRANSACTION_NOT_FOUND);
    }
    const confirm = { merchant_confirm_id: transaction.prepareId };

    if (transaction.state === ClickState.CANCELLED) {
      return this.answer(click, ClickAnswer.TRANSACTION_CANCELLED, confirm);
    }

    const clickError = Number(click.error);
    if (clickError < 0) {
      // Click reports that the payment failed (or was reversed): record it and answer -9.
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.clickTransaction.updateMany({
          where: { prepareId, state: { in: [ClickState.PREPARED, ClickState.COMPLETED] } },
          data: { state: ClickState.CANCELLED, clickError },
        });
        if (updated.count === 0) return;
        const payment = await tx.payment.findUniqueOrThrow({
          where: { id: transaction.paymentId },
          select: { id: true, orderId: true, status: true },
        });
        if (isOpenPayment(payment.status)) {
          await transitionPayment(tx, payment, 'FAILED', {
            source: 'provider',
            detail: 'Complete with error',
            failureCode: `CLICK_${clickError}`,
          });
        } else if (payment.status === 'PAID') {
          await transitionPayment(tx, payment, 'REFUNDED', {
            source: 'provider',
            detail: 'Complete with error after confirmation',
            failureCode: `CLICK_${clickError}`,
          });
        }
      });
      return this.answer(click, ClickAnswer.TRANSACTION_CANCELLED, confirm);
    }

    if (transaction.state === ClickState.COMPLETED) {
      return this.answer(click, ClickAnswer.ALREADY_PAID, confirm);
    }
    if (
      !this.amountMatches(click.amount, transaction.amount) ||
      !this.amountMatches(click.amount, order.total)
    ) {
      return this.answer(click, ClickAnswer.INCORRECT_AMOUNT, confirm);
    }

    const completed = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: transaction.paymentId },
        select: { id: true, orderId: true, status: true, order: { select: { status: true } } },
      });
      const moved =
        payment.status === 'PROCESSING' &&
        payment.order.status !== 'CANCELLED' &&
        (await transitionPayment(tx, payment, 'PAID', { source: 'provider', detail: 'Complete' }));
      const updated = await tx.clickTransaction.updateMany({
        where: { prepareId, state: ClickState.PREPARED },
        data: { state: moved ? ClickState.COMPLETED : ClickState.CANCELLED },
      });
      if (moved && updated.count === 0) throw new Error('Click transaction changed meanwhile');
      return moved;
    });
    // The attempt expired, was replaced or the order was cancelled: Click must not keep the money.
    if (!completed) return this.answer(click, ClickAnswer.TRANSACTION_CANCELLED, confirm);
    return this.answer(click, ClickAnswer.SUCCESS, confirm);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Structure, configuration, signature, service and action checks shared by both requests. */
  private verify(
    request: ClickRequest | null,
    action: number,
  ): { click: ClickRequest } | { answer: ClickResponse } {
    const settings = this.config.click;
    if (!request || !settings) return { answer: this.answer(request, ClickAnswer.BAD_REQUEST) };
    if (!isClickSignatureValid(request, settings)) {
      return { answer: this.answer(request, ClickAnswer.SIGN_CHECK_FAILED) };
    }
    if (request.serviceId !== settings.serviceId) {
      return { answer: this.answer(request, ClickAnswer.BAD_REQUEST) };
    }
    if (Number(request.action) !== action) {
      return { answer: this.answer(request, ClickAnswer.ACTION_NOT_FOUND) };
    }
    return { click: request };
  }

  private findOrder(number: string) {
    if (!ORDER_NUMBER.test(number)) return Promise.resolve(null);
    return this.prisma.order.findUnique({
      where: { number },
      select: {
        id: true,
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
  }

  private isPayable(order: NonNullable<Awaited<ReturnType<ClickService['findOrder']>>>): boolean {
    return (
      order.paymentMethod === 'CLICK' &&
      order.currency === 'UZS' &&
      isAwaitingOnlinePayment(order, new Date())
    );
  }

  private amountMatches(received: string, expected: Prisma.Decimal): boolean {
    return new Prisma.Decimal(received).minus(expected).abs().lessThan(AMOUNT_TOLERANCE);
  }

  private answer(
    request: ClickRequest | null,
    code: ClickAnswerCode,
    extra: Partial<Pick<ClickResponse, 'merchant_prepare_id' | 'merchant_confirm_id'>> = {},
  ): ClickResponse {
    const transId = request ? Number(request.clickTransId) : null;
    return {
      click_trans_id: transId !== null && Number.isSafeInteger(transId) ? transId : null,
      merchant_trans_id: request?.merchantTransId ?? null,
      ...extra,
      error: code.error,
      error_note: code.note,
    };
  }
}
