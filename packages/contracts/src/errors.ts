/** Stable machine-readable error codes returned in `ApiErrorBody.code`. */
export const ERROR_CODES = [
  'VALIDATION_FAILED',
  'BAD_REQUEST',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'INVALID_ORIGIN',
  'INVALID_CREDENTIALS',
  'ACCOUNT_LOCKED',
  'EMAIL_TAKEN',
  'INVALID_TOKEN',
  'FEATURE_DISABLED',
  'CART_EMPTY',
  'CART_ITEM_UNAVAILABLE',
  'INSUFFICIENT_STOCK',
  'PRICE_CHANGED',
  'DELIVERY_METHOD_UNAVAILABLE',
  'PAYMENT_METHOD_UNAVAILABLE',
  'INVALID_STATUS_TRANSITION',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ValidationIssue {
  /** Dotted path of the offending field, e.g. "customer.phone". */
  path: string;
  /** Zod issue code or a custom key such as "invalid_phone". */
  code: string;
  message: string;
}

export interface ApiErrorBody {
  statusCode: number;
  code: ErrorCode;
  message: string;
  issues?: ValidationIssue[];
  /** Extra structured context (e.g. which cart lines lack stock). */
  details?: Record<string, unknown>;
  requestId?: string;
}
