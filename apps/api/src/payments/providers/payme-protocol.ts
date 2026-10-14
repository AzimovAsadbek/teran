import { timingSafeEqual } from 'node:crypto';
import type { Locale } from '@teran/contracts';
import type { PaymeSettings } from '../payment-config.js';

/**
 * Payme Merchant API protocol details, as documented at https://developer.help.paycom.uz
 * (protocol, request/response format, errors, methods, data types). See
 * docs/architecture/payments.md for how they map onto TERAN's payments.
 */

/** Payme cancels a created transaction it has not performed after 12 hours. */
export const PAYME_TIMEOUT_MS = 43_200_000;

/** Account field configured in the Payme cashbox («реквизиты»): the TERAN order number. */
export const PAYME_ACCOUNT_FIELD = 'order_id';

/** Transaction states. */
export const PaymeState = {
  CREATED: 1,
  PERFORMED: 2,
  CANCELLED: -1,
  CANCELLED_AFTER_PERFORM: -2,
} as const;

/** Cancellation reasons TERAN sets itself (Payme's own reasons arrive with CancelTransaction). */
export const PaymeReason = { EXECUTION_ERROR: 3, TIMEOUT: 4 } as const;

type Messages = { ru: string; uz: string; en: string };

const MESSAGES = {
  '-32300': {
    ru: 'Метод запроса должен быть POST',
    uz: 'Soʻrov usuli POST boʻlishi kerak',
    en: 'The request method must be POST',
  },
  '-32700': { ru: 'Ошибка разбора JSON', uz: 'JSON tahlilida xato', en: 'JSON parse error' },
  '-32600': { ru: 'Неверный запрос', uz: 'Notoʻgʻri soʻrov', en: 'Invalid request' },
  '-32601': { ru: 'Метод не найден', uz: 'Usul topilmadi', en: 'Method not found' },
  '-32504': {
    ru: 'Недостаточно привилегий для выполнения метода',
    uz: 'Usulni bajarish uchun huquq yetarli emas',
    en: 'Insufficient privileges to perform this method',
  },
  '-32400': { ru: 'Системная ошибка', uz: 'Tizim xatosi', en: 'System error' },
  '-31001': { ru: 'Неверная сумма', uz: 'Notoʻgʻri summa', en: 'Incorrect amount' },
  '-31003': {
    ru: 'Транзакция не найдена',
    uz: 'Tranzaksiya topilmadi',
    en: 'Transaction not found',
  },
  '-31008': {
    ru: 'Невозможно выполнить операцию',
    uz: 'Amalni bajarib boʻlmaydi',
    en: 'Unable to perform the operation',
  },
  '-31050': { ru: 'Заказ не найден', uz: 'Buyurtma topilmadi', en: 'Order not found' },
  '-31051': {
    ru: 'Этот заказ нельзя оплатить',
    uz: 'Bu buyurtmani toʻlab boʻlmaydi',
    en: 'This order cannot be paid',
  },
} satisfies Record<`${PaymeErrorCode}`, Messages>;

export type PaymeErrorCode =
  -32300 | -32700 | -32600 | -32601 | -32504 | -32400 | -31001 | -31003 | -31008 | -31050 | -31051;

/** An error answered to Payme as a JSON-RPC error object (always with HTTP 200). */
export class PaymeError extends Error {
  constructor(
    readonly code: PaymeErrorCode,
    readonly data?: string,
  ) {
    super(`Payme error ${code}`);
  }

  get messages(): Messages {
    return MESSAGES[String(this.code) as keyof typeof MESSAGES];
  }
}

export interface PaymeResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: Record<string, unknown>;
  error?: { code: number; message: Messages; data?: string };
}

export function paymeError(id: PaymeResponse['id'], error: PaymeError): PaymeResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code: error.code,
      message: error.messages,
      ...(error.data !== undefined ? { data: error.data } : {}),
    },
  };
}

/**
 * Checks the `Authorization: Basic base64(login:key)` header Payme sends with every call, in
 * constant time.
 */
export function isPaymeAuthorized(header: string | undefined, settings: PaymeSettings): boolean {
  if (typeof header !== 'string' || !header.startsWith('Basic ')) return false;
  const expected = Buffer.from(`${settings.login}:${settings.key}`, 'utf8').toString('base64');
  const given = Buffer.from(header.slice('Basic '.length).trim(), 'utf8');
  const wanted = Buffer.from(expected, 'utf8');
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

/** Payme documents that it calls merchants only from 185.234.113.1–185.234.113.15. */
export function isPaymeAddress(ip: string | undefined): boolean {
  if (!ip) return false;
  const address = ip.startsWith('::ffff:') ? ip.slice('::ffff:'.length) : ip;
  const match = /^185\.234\.113\.(\d{1,3})$/.exec(address);
  if (!match) return false;
  const last = Number(match[1]);
  return last >= 1 && last <= 15;
}

/**
 * Link to Payme's hosted checkout (GET variant): the base64 of `key=value` pairs separated by
 * semicolons — m (merchant), ac.<field> (account), a (amount in tiyin), l (language), c (return
 * URL). The customer enters card details on Payme's page only.
 */
export function paymeCheckoutUrl(
  settings: PaymeSettings,
  params: { orderNumber: string; amountTiyin: bigint; locale: Locale; returnUrl: string },
): string {
  const pairs = [
    `m=${settings.merchantId}`,
    `ac.${PAYME_ACCOUNT_FIELD}=${params.orderNumber}`,
    `a=${params.amountTiyin.toString()}`,
    `l=${params.locale}`,
    `c=${params.returnUrl}`,
  ];
  return `${settings.checkoutUrl}/${Buffer.from(pairs.join(';'), 'utf8').toString('base64')}`;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A positive integer sent by Payme (amounts in tiyin, times in milliseconds). */
export function paymeInteger(value: unknown): bigint | null {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) return null;
  return BigInt(value);
}

/** Payme transaction ids are 24-character strings. */
export function paymeTransactionId(value: unknown): string | null {
  return typeof value === 'string' && /^[A-Za-z0-9]{1,64}$/.test(value) ? value : null;
}
