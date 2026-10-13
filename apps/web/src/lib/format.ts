import type { Locale, Money, ProductFormat } from '@teran/contracts';

const NUMBER_LOCALES: Record<Locale, string> = { uz: 'uz', ru: 'ru', en: 'en' };

/**
 * Formats an exact decimal money string. Intl accepts numeric strings, so no floating-point
 * conversion happens; whole soʻm amounts are shown without decimals.
 */
export function formatAmount(amount: Money, locale: Locale): string {
  const hasFraction = /\.\d*[1-9]/.test(amount);
  return new Intl.NumberFormat(NUMBER_LOCALES[locale], {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount as Intl.StringNumericLiteral);
}

export function formatMoney(amount: Money, locale: Locale, currencyLabel: string): string {
  return `${formatAmount(amount, locale)} ${currencyLabel}`;
}

export function formatGrams(grams: number, locale: Locale): string {
  return new Intl.NumberFormat(NUMBER_LOCALES[locale], { style: 'unit', unit: 'gram' }).format(
    grams,
  );
}

export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(NUMBER_LOCALES[locale], {
    dateStyle: 'long',
    timeZone: 'Asia/Tashkent',
  }).format(new Date(iso));
}

export function formatDateTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(NUMBER_LOCALES[locale], {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Tashkent',
  }).format(new Date(iso));
}

type UnitsMessage = (key: 'TEA_BAGS' | 'PYRAMIDS' | 'default', values: { count: number }) => string;

/** "100 g", "20 tea bags · 40 g" — built from structured data so it is correct in every locale. */
export function packLabel(
  pack: { weightGrams: number | null; unitCount: number | null },
  format: ProductFormat,
  locale: Locale,
  units: UnitsMessage,
): string {
  const parts: string[] = [];
  if (pack.unitCount) {
    const key = format === 'TEA_BAGS' || format === 'PYRAMIDS' ? format : 'default';
    parts.push(units(key, { count: pack.unitCount }));
  }
  if (pack.weightGrams) {
    parts.push(formatGrams(pack.weightGrams, locale));
  }
  return parts.join(' · ');
}

/**
 * Exact money × quantity on decimal strings (via integer minor units), for display totals.
 * Never uses floating point; authoritative totals always come from the API.
 */
export function multiplyMoney(amount: Money, quantity: number): Money {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(amount);
  if (!match || !Number.isInteger(quantity)) throw new Error(`Invalid money amount: ${amount}`);
  const [, sign = '', whole = '0', fraction = ''] = match;
  const minor = BigInt(`${whole}${fraction.padEnd(2, '0')}`) * BigInt(quantity);
  const digits = minor.toString().padStart(3, '0');
  return `${sign}${digits.slice(0, -2)}.${digits.slice(-2)}`;
}
