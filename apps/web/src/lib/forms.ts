import type { ValidationIssue } from '@teran/contracts';
import type { z } from 'zod';

/**
 * A field-level problem, from client-side Zod validation or from the API's VALIDATION_FAILED
 * response. The shared contracts use translation keys (e.g. "invalid_phone") as custom messages, so
 * both sources can be turned into the same localised text.
 */
export interface FieldIssue {
  code: string;
  message: string;
  minimum?: number;
  maximum?: number;
  /** What was checked ("number", "string"…), so "too small" can be worded for each. */
  origin?: string;
}

/** Field path ("customer.phone") → its first issue. */
export type FieldErrors = Record<string, FieldIssue>;

function numeric(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  return undefined;
}

export function fieldErrorsFromZod(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const path = issue.path.map(String).join('.');
    if (path in errors) continue;
    errors[path] = {
      code: issue.code,
      message: issue.message,
      minimum: 'minimum' in issue ? numeric(issue.minimum) : undefined,
      maximum: 'maximum' in issue ? numeric(issue.maximum) : undefined,
      origin: 'origin' in issue && typeof issue.origin === 'string' ? issue.origin : undefined,
    };
  }
  return errors;
}

export function fieldErrorsFromApi(issues: readonly ValidationIssue[] | undefined): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues ?? []) {
    if (!(issue.path in errors)) errors[issue.path] = { code: issue.code, message: issue.message };
  }
  return errors;
}

/** Validation message keys that the contracts use as custom Zod messages. */
export const VALIDATION_KEYS = [
  'required',
  'invalid_email',
  'invalid_phone',
  'invalid_region',
  'terms_required',
  'contact_required',
  'passwords_mismatch',
  'invalid_money',
  'money_negative',
  'invalid_slug',
  'invalid_sku',
  'invalid_barcode',
  'compare_at_not_above_price',
  'variant_size_required',
  'brew_time_order',
  'duplicate_sku',
  'delta_zero',
  'internal_path_only',
  'invalid_telegram',
  'invalid_instagram',
  'invalid_code',
  'invalid_key',
  'options_required',
  'options_not_allowed',
  'not_filterable',
  'duplicate_key',
  'cancel_reason_required',
] as const;
export type ValidationKey = (typeof VALIDATION_KEYS)[number];

export function isValidationKey(value: string): value is ValidationKey {
  return (VALIDATION_KEYS as readonly string[]).includes(value);
}
