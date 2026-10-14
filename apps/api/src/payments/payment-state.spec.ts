import { PAYMENT_STATUSES, canTransitionPayment, type PaymentStatus } from '@teran/contracts';
import { isAwaitingOnlinePayment, paymentDeadline } from './payments.service.js';
import { isOpenPayment, isSettledPayment, paymentAccessToken } from './payment-state.js';

describe('payment state machine', () => {
  it('never leaves a terminal status', () => {
    for (const terminal of ['FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED'] as const) {
      for (const to of PAYMENT_STATUSES) expect(canTransitionPayment(terminal, to)).toBe(false);
    }
  });

  it('reaches PAID only from an open attempt, and refunds only after PAID', () => {
    const paidFrom = PAYMENT_STATUSES.filter((from) => canTransitionPayment(from, 'PAID'));
    expect(paidFrom.sort()).toEqual(['PENDING', 'PROCESSING', 'REFUND_PENDING', 'REQUIRES_ACTION']);
    const refundedFrom = PAYMENT_STATUSES.filter((from) => canTransitionPayment(from, 'REFUNDED'));
    expect(refundedFrom.sort()).toEqual(['PAID', 'PARTIALLY_REFUNDED', 'REFUND_PENDING']);
    // A failed payment can never silently become paid.
    expect(canTransitionPayment('FAILED', 'PAID')).toBe(false);
    expect(canTransitionPayment('EXPIRED', 'PAID')).toBe(false);
  });

  it('classifies open and settled attempts', () => {
    const open: PaymentStatus[] = ['PENDING', 'REQUIRES_ACTION', 'PROCESSING'];
    for (const status of PAYMENT_STATUSES) {
      expect(isOpenPayment(status)).toBe(open.includes(status));
    }
    expect(isSettledPayment('PAID')).toBe(true);
    expect(isSettledPayment('REFUNDED')).toBe(true);
    expect(isSettledPayment('FAILED')).toBe(false);
  });

  it('derives a stable, attempt-specific link secret', () => {
    const secret = 's'.repeat(40);
    expect(paymentAccessToken(secret, 'a')).toBe(paymentAccessToken(secret, 'a'));
    expect(paymentAccessToken(secret, 'a')).not.toBe(paymentAccessToken(secret, 'b'));
    expect(paymentAccessToken(secret, 'a')).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});

describe('awaiting an online payment', () => {
  const now = new Date('2026-10-14T12:00:00Z');
  const future = new Date('2026-10-14T12:20:00Z');
  const past = new Date('2026-10-14T11:59:00Z');

  it('requires a pending order, an online method, no settled attempt and an open window', () => {
    const base = {
      status: 'PENDING' as const,
      paymentMethod: 'CLICK' as const,
      payments: [{ provider: 'CLICK' as const, status: 'FAILED' as const, expiresAt: future }],
    };
    expect(isAwaitingOnlinePayment(base, now)).toBe(true);
    expect(paymentDeadline(base)).toEqual(future);
    expect(isAwaitingOnlinePayment({ ...base, status: 'CONFIRMED' }, now)).toBe(false);
    expect(isAwaitingOnlinePayment({ ...base, paymentMethod: 'CASH_ON_DELIVERY' }, now)).toBe(
      false,
    );
    expect(
      isAwaitingOnlinePayment(
        { ...base, payments: [{ provider: 'CLICK', status: 'PAID', expiresAt: future }] },
        now,
      ),
    ).toBe(false);
    expect(
      isAwaitingOnlinePayment(
        { ...base, payments: [{ provider: 'CLICK', status: 'REQUIRES_ACTION', expiresAt: past }] },
        now,
      ),
    ).toBe(false);
  });
});
