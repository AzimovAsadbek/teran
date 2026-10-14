import { createHash, timingSafeEqual } from 'node:crypto';
import type { ClickSettings } from '../payment-config.js';

/**
 * Click SHOP API protocol details, as documented at https://docs.click.uz (payment button, SHOP API
 * requests and errors). See docs/architecture/payments.md for how they map onto TERAN's payments.
 */

export const CLICK_PAY_URL = 'https://my.click.uz/services/pay';

export const ClickAction = { PREPARE: 0, COMPLETE: 1 } as const;

/** States of a ClickTransaction row. */
export const ClickState = { PREPARED: 0, COMPLETED: 1, CANCELLED: -1 } as const;

/** Merchant answers defined by the SHOP API (`error` / `error_note`). */
export const ClickAnswer = {
  SUCCESS: { error: 0, note: 'Success' },
  SIGN_CHECK_FAILED: { error: -1, note: 'SIGN CHECK FAILED!' },
  INCORRECT_AMOUNT: { error: -2, note: 'Incorrect parameter amount' },
  ACTION_NOT_FOUND: { error: -3, note: 'Action not found' },
  ALREADY_PAID: { error: -4, note: 'Already paid' },
  USER_NOT_FOUND: { error: -5, note: 'User does not exist' },
  TRANSACTION_NOT_FOUND: { error: -6, note: 'Transaction does not exist' },
  UPDATE_FAILED: { error: -7, note: 'Failed to update user' },
  BAD_REQUEST: { error: -8, note: 'Error in request from click' },
  TRANSACTION_CANCELLED: { error: -9, note: 'Transaction cancelled' },
} as const;

export type ClickAnswerCode = (typeof ClickAnswer)[keyof typeof ClickAnswer];

/** A Prepare or Complete request, with every value kept as the exact string Click sent. */
export interface ClickRequest {
  clickTransId: string;
  serviceId: string;
  clickPaydocId: string;
  merchantTransId: string;
  /** Complete only. */
  merchantPrepareId: string | null;
  amount: string;
  action: string;
  error: string;
  signTime: string;
  signString: string;
}

const DIGITS = /^\d{1,19}$/;
const SIGNED_INTEGER = /^-?\d{1,10}$/;
const AMOUNT = /^\d{1,12}(?:\.\d{1,4})?$/;

function field(body: Record<string, unknown>, name: string): string | null {
  const value = body[name];
  return typeof value === 'string' ? value : null;
}

/** Reads a form-encoded Prepare or Complete request; null when a required field is missing or malformed. */
export function parseClickRequest(body: unknown, complete: boolean): ClickRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const values = body as Record<string, unknown>;
  const request: ClickRequest = {
    clickTransId: field(values, 'click_trans_id') ?? '',
    serviceId: field(values, 'service_id') ?? '',
    clickPaydocId: field(values, 'click_paydoc_id') ?? '',
    merchantTransId: field(values, 'merchant_trans_id') ?? '',
    merchantPrepareId: complete ? (field(values, 'merchant_prepare_id') ?? '') : null,
    amount: field(values, 'amount') ?? '',
    action: field(values, 'action') ?? '',
    error: field(values, 'error') ?? '',
    signTime: field(values, 'sign_time') ?? '',
    signString: field(values, 'sign_string') ?? '',
  };
  const valid =
    DIGITS.test(request.clickTransId) &&
    DIGITS.test(request.serviceId) &&
    DIGITS.test(request.clickPaydocId) &&
    request.merchantTransId.length > 0 &&
    request.merchantTransId.length <= 64 &&
    AMOUNT.test(request.amount) &&
    SIGNED_INTEGER.test(request.action) &&
    SIGNED_INTEGER.test(request.error) &&
    request.signTime.length > 0 &&
    request.signTime.length <= 32 &&
    /^[0-9a-fA-F]{32}$/.test(request.signString) &&
    (!complete || /^\d{1,10}$/.test(request.merchantPrepareId ?? ''));
  return valid ? request : null;
}

/**
 * sign_string = md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id
 *                   [+ merchant_prepare_id, Complete only] + amount + action + sign_time),
 * computed over the exact strings received.
 */
export function clickSignature(request: ClickRequest, secretKey: string): string {
  const parts = [
    request.clickTransId,
    request.serviceId,
    secretKey,
    request.merchantTransId,
    ...(request.merchantPrepareId !== null ? [request.merchantPrepareId] : []),
    request.amount,
    request.action,
    request.signTime,
  ];
  return createHash('md5').update(parts.join(''), 'utf8').digest('hex');
}

export function isClickSignatureValid(request: ClickRequest, settings: ClickSettings): boolean {
  const expected = Buffer.from(clickSignature(request, settings.secretKey), 'utf8');
  const given = Buffer.from(request.signString.toLowerCase(), 'utf8');
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/**
 * Click's hosted payment page: the customer pays there (Uzcard and Humo cards per Click's merchant
 * documentation) and is sent back to `return_url`. `transaction_param` is the TERAN order number,
 * which Click sends back as merchant_trans_id.
 */
export function clickPaymentUrl(
  settings: ClickSettings,
  params: { orderNumber: string; amount: string; returnUrl: string },
): string {
  const query = new URLSearchParams({
    service_id: settings.serviceId,
    merchant_id: settings.merchantId,
    amount: params.amount,
    transaction_param: params.orderNumber,
    return_url: params.returnUrl,
  });
  return `${CLICK_PAY_URL}?${query.toString()}`;
}
