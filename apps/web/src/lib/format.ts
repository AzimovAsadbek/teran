import type { Locale, Money, ProductFormat } from '@teran/contracts';

/*
 * Numbers, and dates in Uzbek, are formatted here rather than by Intl. Chromium (Chrome, Android
 * WebView) ships without Uzbek locale data and falls back to root formats ("1,234.5",
 * "2026 M10 14"): Uzbek shoppers would see foreign formatting, and text rendered on the server
 * (Node.js has full ICU data) would differ from the browser's, which breaks hydration. The
 * patterns are CLDR's, as Node.js produces them.
 */

const SEPARATORS: Record<Locale, { group: string; decimal: string }> = {
  uz: { group: '\u00a0', decimal: ',' },
  ru: { group: '\u00a0', decimal: ',' },
  en: { group: ',', decimal: '.' },
};

const GRAM_UNIT: Record<Locale, string> = { uz: 'g', ru: 'г', en: 'g' };

/** Uzbek month names in dates ("5-oktabr, 2026"; stand-alone forms are capitalised). */
const UZ_MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
];
const UZ_MONTHS_SHORT = [
  'yan',
  'fev',
  'mar',
  'apr',
  'may',
  'iyn',
  'iyl',
  'avg',
  'sen',
  'okt',
  'noy',
  'dek',
];

const TIME_ZONE = 'Asia/Tashkent';

function groupDigits(digits: string, separator: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/**
 * Formats an exact decimal money string without floating point; whole soʻm amounts are shown
 * without decimals, real fractions with two.
 */
export function formatAmount(amount: Money, locale: Locale): string {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(amount);
  if (!match) throw new Error(`Invalid money amount: ${amount}`);
  const [, sign = '', whole = '0', fraction = ''] = match;
  const { group, decimal } = SEPARATORS[locale];
  const integer = groupDigits(whole.replace(/^0+(?=\d)/, ''), group);
  return /[1-9]/.test(fraction)
    ? `${sign}${integer}${decimal}${fraction.padEnd(2, '0')}`
    : `${sign}${integer}`;
}

export function formatMoney(amount: Money, locale: Locale, currencyLabel: string): string {
  return `${formatAmount(amount, locale)} ${currencyLabel}`;
}

/**
 * A file's size in the reader's language: "37 KB", "4,5 MB", "1,2 GB" (one decimal where it says
 * something), the same on the server and in every browser.
 */
export function formatFileSize(bytes: number, locale: Locale): string {
  const { group, decimal } = SEPARATORS[locale];
  const units = [
    [1024 ** 3, 'GB'],
    [1024 ** 2, 'MB'],
  ] as const;
  for (const [size, unit] of units) {
    if (bytes < size) continue;
    const [integer = '0', fraction = '0'] = (Math.round((bytes / size) * 10) / 10)
      .toFixed(1)
      .split('.');
    const whole = groupDigits(integer, group);
    return `${fraction === '0' ? whole : `${whole}${decimal}${fraction}`} ${unit}`;
  }
  return `${groupDigits(String(Math.max(1, Math.round(bytes / 1024))), group)} KB`;
}

export function formatGrams(grams: number, locale: Locale): string {
  const [integer = '0', fraction] = String(Math.abs(grams)).split('.');
  const { group, decimal } = SEPARATORS[locale];
  const number = `${groupDigits(integer, group)}${fraction ? `${decimal}${fraction}` : ''}`;
  return `${grams < 0 ? '-' : ''}${number} ${GRAM_UNIT[locale]}`;
}

/** Calendar fields in Tashkent time, read through the en-US data every runtime ships. */
function tashkentParts(iso: string): {
  year: number;
  month: number;
  day: number;
  time: string;
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const field = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return {
    year: Number(field('year')),
    month: Number(field('month')) - 1,
    day: Number(field('day')),
    time: `${field('hour')}:${field('minute')}`,
  };
}

/** "5-oktabr, 2026" · "5 октября 2026 г." · "October 5, 2026" (Tashkent time). */
export function formatDate(iso: string, locale: Locale): string {
  if (locale === 'uz') {
    const { year, month, day } = tashkentParts(iso);
    return `${day}-${UZ_MONTHS[month]}, ${year}`;
  }
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: TIME_ZONE }).format(
    new Date(iso),
  );
}

/** "5-okt, 2026, 14:05" · "5 окт. 2026 г., 14:05" · "Oct 5, 2026, 2:05 PM" (Tashkent time). */
export function formatDateTime(iso: string, locale: Locale): string {
  if (locale === 'uz') {
    const { year, month, day, time } = tashkentParts(iso);
    return `${day}-${UZ_MONTHS_SHORT[month]}, ${year}, ${time}`;
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

/** Whether a product's format is worth naming ("Loose leaf"); OTHER means none of them applies. */
export function namesFormat(format: ProductFormat): boolean {
  return format !== 'OTHER';
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
