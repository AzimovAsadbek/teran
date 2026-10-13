import { DEFAULT_LOCALE, type Locale } from '@teran/contracts';

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
