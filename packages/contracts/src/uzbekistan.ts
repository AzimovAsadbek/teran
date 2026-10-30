import { z } from 'zod';
import { REGION_CODES } from './constants.js';

export const regionCodeSchema = z.enum(REGION_CODES, { error: 'invalid_region' });

/**
 * Normalises Uzbek phone numbers to E.164 (+998XXXXXXXXX).
 * Accepts common local spellings: "+998 90 123-45-67", "998901234567", "90 123 45 67".
 * Returns null when the input cannot be an Uzbek number.
 */
export function normalizeUzPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  let national: string;
  if (digits.length === 12 && digits.startsWith('998')) {
    national = digits.slice(3);
  } else if (digits.length === 9) {
    national = digits;
  } else {
    return null;
  }
  // National significant numbers never start with 0 or 1.
  if (!/^[2-9]\d{8}$/.test(national)) {
    return null;
  }
  return `+998${national}`;
}

/** Formats +998901234567 as "+998 90 123 45 67" for display. */
export function formatUzPhone(e164: string): string {
  const match = /^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(e164);
  if (!match) return e164;
  const [, operator = '', first = '', second = '', third = ''] = match;
  return `+998 ${operator} ${first} ${second} ${third}`;
}

export const uzPhoneSchema = z
  .string()
  .trim()
  .min(1, { error: 'required' })
  .transform((value, ctx) => {
    const normalized = normalizeUzPhone(value);
    if (!normalized) {
      ctx.addIssue({ code: 'custom', message: 'invalid_phone' });
      return z.NEVER;
    }
    return normalized;
  });
