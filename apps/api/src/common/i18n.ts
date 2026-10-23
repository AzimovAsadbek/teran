import { DEFAULT_LOCALE, LOCALES, type Locale } from '@teran/contracts';

/**
 * The languages an item has its own translation row in, in the site's order (uz, ru, en). The
 * storefront offers only these versions to search engines; the others show the Uzbek text.
 */
export function translatedLocales(translations: readonly { locale: string }[]): Locale[] {
  return LOCALES.filter((locale) =>
    translations.some((translation) => translation.locale === locale),
  );
}

/** Locales to load for a request: the requested one plus the default (Uzbek) as fallback. */
export function localeChain(locale: Locale): Locale[] {
  return locale === DEFAULT_LOCALE ? [DEFAULT_LOCALE] : [locale, DEFAULT_LOCALE];
}

/** Picks the translation for `locale`, falling back to the default locale. */
export function pickTranslation<T extends { locale: string }>(
  translations: readonly T[],
  locale: Locale,
): T | undefined {
  return (
    translations.find((translation) => translation.locale === locale) ??
    translations.find((translation) => translation.locale === DEFAULT_LOCALE)
  );
}
