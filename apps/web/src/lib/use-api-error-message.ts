'use client';

import { useTranslations } from 'next-intl';
import type { ApiError } from './api/errors';

const KNOWN_CODES = [
  'INSUFFICIENT_STOCK',
  'CART_ITEM_UNAVAILABLE',
  'CART_EMPTY',
  'PRICE_CHANGED',
  'DELIVERY_METHOD_UNAVAILABLE',
  'PAYMENT_METHOD_UNAVAILABLE',
  'INVALID_CREDENTIALS',
  'EMAIL_TAKEN',
  'INVALID_TOKEN',
  'FEATURE_DISABLED',
  'VALIDATION_FAILED',
] as const;

type KnownCode = (typeof KNOWN_CODES)[number];

function isKnown(code: string | null): code is KnownCode {
  return code !== null && (KNOWN_CODES as readonly string[]).includes(code);
}

/** Translates an API error into a message for the visitor (never the raw server message). */
export function useApiErrorMessage(error: ApiError | null): string | null {
  const t = useTranslations('Errors');
  if (!error) return null;
  if (error.status === 0) return t('network');
  if (error.status === 429) return t('rateLimited');
  if (isKnown(error.code)) return t(`codes.${error.code}`);
  return t('generic');
}
