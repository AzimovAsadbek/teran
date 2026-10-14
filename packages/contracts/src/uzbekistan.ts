import { z } from 'zod';
import type { Locale } from './constants.js';

/**
 * First-level administrative divisions of Uzbekistan with their ISO 3166-2 codes.
 * Used for delivery addresses and delivery-method coverage.
 */
export const REGIONS = [
  { code: 'UZ-TK', name: { uz: 'Toshkent shahri', ru: 'г. Ташкент', en: 'Tashkent City' } },
  {
    code: 'UZ-TO',
    name: { uz: 'Toshkent viloyati', ru: 'Ташкентская область', en: 'Tashkent Region' },
  },
  {
    code: 'UZ-AN',
    name: { uz: 'Andijon viloyati', ru: 'Андижанская область', en: 'Andijan Region' },
  },
  { code: 'UZ-BU', name: { uz: 'Buxoro viloyati', ru: 'Бухарская область', en: 'Bukhara Region' } },
  {
    code: 'UZ-FA',
    name: { uz: 'Fargʻona viloyati', ru: 'Ферганская область', en: 'Fergana Region' },
  },
  {
    code: 'UZ-JI',
    name: { uz: 'Jizzax viloyati', ru: 'Джизакская область', en: 'Jizzakh Region' },
  },
  {
    code: 'UZ-NG',
    name: { uz: 'Namangan viloyati', ru: 'Наманганская область', en: 'Namangan Region' },
  },
  { code: 'UZ-NW', name: { uz: 'Navoiy viloyati', ru: 'Навоийская область', en: 'Navoiy Region' } },
  {
    code: 'UZ-QA',
    name: { uz: 'Qashqadaryo viloyati', ru: 'Кашкадарьинская область', en: 'Kashkadarya Region' },
  },
  {
    code: 'UZ-QR',
    name: {
      uz: 'Qoraqalpogʻiston Respublikasi',
      ru: 'Республика Каракалпакстан',
      en: 'Republic of Karakalpakstan',
    },
  },
  {
    code: 'UZ-SA',
    name: { uz: 'Samarqand viloyati', ru: 'Самаркандская область', en: 'Samarkand Region' },
  },
  {
    code: 'UZ-SI',
    name: { uz: 'Sirdaryo viloyati', ru: 'Сырдарьинская область', en: 'Syrdarya Region' },
  },
  {
    code: 'UZ-SU',
    name: { uz: 'Surxondaryo viloyati', ru: 'Сурхандарьинская область', en: 'Surkhandarya Region' },
  },
  {
    code: 'UZ-XO',
    name: { uz: 'Xorazm viloyati', ru: 'Хорезмская область', en: 'Khorezm Region' },
  },
] as const satisfies readonly { code: string; name: Record<Locale, string> }[];

export type RegionCode = (typeof REGIONS)[number]['code'];
export const REGION_CODES = REGIONS.map((region) => region.code) as [RegionCode, ...RegionCode[]];
export const regionCodeSchema = z.enum(REGION_CODES, { error: 'invalid_region' });

export function regionName(code: string, locale: Locale): string {
  return REGIONS.find((region) => region.code === code)?.name[locale] ?? code;
}

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
