import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { LOCALES, type AdminTranslation, type Locale } from '@teran/contracts';
import type { Request } from 'express';
import { ApiException } from '../common/errors/api-exception.js';

/** The staff member performing an admin action, recorded in audit entries and stock ledgers. */
export interface Actor {
  userId: string;
  ipAddress: string | null;
}

/** Only use on routes protected by @RequireStaff. */
export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Actor => {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.auth) throw ApiException.unauthenticated();
    return { userId: request.auth.userId, ipAddress: request.ip ?? null };
  },
);

type LocalizedInput<T> = { uz: T; ru: T | null; en: T | null };

/** `{ uz, ru, en }` admin input → one row per provided locale (Uzbek is always present). */
export function translationRows<T extends object>(
  input: LocalizedInput<T>,
): (T & { locale: Locale })[] {
  return LOCALES.flatMap((locale) => {
    const value = input[locale];
    return value ? [{ ...value, locale }] : [];
  });
}

/** Translation rows → the `{ uz, ru, en }` shape the admin forms edit. */
export function toAdminTranslation<R extends { locale: string }, T>(
  rows: readonly R[],
  map: (row: R) => T,
): AdminTranslation<T> {
  const pick = (locale: Locale) => {
    const row = rows.find((candidate) => candidate.locale === locale);
    return row ? map(row) : null;
  };
  const uz = pick('uz');
  // Every write path stores Uzbek, so a missing row is a data error worth surfacing.
  if (!uz) throw new Error('Uzbek translation missing');
  return { uz, ru: pick('ru'), en: pick('en') };
}

/** Optional text from a parsed contract (`undefined` when empty) → a nullable column value. */
export function nullable(value: string | undefined): string | null {
  return value ?? null;
}

export function pageArgs(page: number, pageSize: number): { skip: number; take: number } {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

/** "YYYY-MM-DD" in Tashkent time (UTC+5, no daylight saving) → the instant the day starts or ends. */
export function tashkentDayBoundary(date: string, edge: 'start' | 'end'): Date {
  return new Date(`${date}T${edge === 'start' ? '00:00:00.000' : '23:59:59.999'}+05:00`);
}

/** Start of the current day in Tashkent. */
export function tashkentToday(now = new Date()): Date {
  const local = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  return tashkentDayBoundary(local.toISOString().slice(0, 10), 'start');
}

/** Escapes a CSV cell, neutralising spreadsheet formulas (CSV injection). */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Lets spreadsheet apps detect UTF-8 (Cyrillic and Uzbek names). */
const BYTE_ORDER_MARK = '\uFEFF';

export function toCsv(
  header: readonly string[],
  rows: readonly (readonly (string | number | null)[])[],
): string {
  return `${BYTE_ORDER_MARK}${[header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}
