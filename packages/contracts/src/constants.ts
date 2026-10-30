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

/** The longest comment a review may carry (ADR-042): the product page's review form. */
export const REVIEW_COMMENT_MAX = 1000;

/** Kinds of TERAN point of sale: the store locator's filter, as the reference's "experiences". */
export const STORE_KINDS = ['SHOP', 'DEALER', 'WHOLESALE'] as const;

/** Kinds of business a wholesale inquiry names (the form's choice, ADR-067 keeps it Zod-free). */
export const BUSINESS_TYPES = [
  'CAFE_RESTAURANT',
  'HOTEL',
  'RETAIL',
  'DISTRIBUTOR',
  'CORPORATE',
  'OTHER',
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

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

export function regionName(code: string, locale: Locale): string {
  return REGIONS.find((region) => region.code === code)?.name[locale] ?? code;
}
