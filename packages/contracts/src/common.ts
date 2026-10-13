import { z } from 'zod';

/** Locales the platform can serve. Which of them are enabled is a deployment setting. */
export const LOCALES = ['uz', 'ru', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'uz';
export const localeSchema = z.enum(LOCALES);

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** ISO-4217 code of the only currency sold in at launch. */
export const DEFAULT_CURRENCY = 'UZS';

/**
 * Monetary amounts travel as exact decimal strings ("85000.00"), never as floating-point numbers.
 * The API produces them from PostgreSQL NUMERIC values.
 */
export const moneySchema = z.string().regex(/^-?\d{1,12}(\.\d{1,2})?$/, { error: 'invalid_money' });
export type Money = z.infer<typeof moneySchema>;

export const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: 'invalid_slug' });

export const idSchema = z.uuid();

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function buildPaginated<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): Paginated<T> {
  return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Optional free-text that is trimmed and turned into `undefined` when empty. */
export function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === undefined || value === '' ? undefined : value));
}

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'invalid_email' }).max(254));
