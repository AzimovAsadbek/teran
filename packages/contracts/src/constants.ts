/**
 * Plain values with no Zod dependency. Browser code that needs only these imports them from
 * '@teran/contracts/constants', so the schemas (and Zod) stay out of every page's first bundle;
 * the main entry re-exports them for everyone else.
 */

/** Locales the platform can serve. Which of them are enabled is a deployment setting. */
export const LOCALES = ['uz', 'ru', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'uz';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

export const PRODUCT_FORMATS = [
  'LOOSE_LEAF',
  'TEA_BAGS',
  'PYRAMIDS',
  'GIFT_SET',
  'ACCESSORY',
  /** None of the tea formats applies (honey, sweets, ceramics…): no format is shown. */
  'OTHER',
] as const;
export type ProductFormat = (typeof PRODUCT_FORMATS)[number];

export const PRODUCT_SORTS = ['featured', 'newest', 'price_asc', 'price_desc'] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

/** How much caffeine a drink has, from none (infusions, water, juice) to high; filterable. */
export const CAFFEINE_LEVELS = ['NONE', 'LOW', 'MEDIUM', 'HIGH'] as const;
export type CaffeineLevel = (typeof CAFFEINE_LEVELS)[number];
