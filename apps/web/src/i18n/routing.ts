// The constants entry has no Zod: navigation is imported by nearly every client component.
import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from '@teran/contracts/constants';
import { defineRouting } from 'next-intl/routing';

/**
 * Enabled locales come from NEXT_PUBLIC_ENABLED_LOCALES (e.g. "uz,ru,en"). Uzbek is the default
 * and is always enabled; it is served without a URL prefix, the others under /ru and /en.
 */
function enabledLocales(): Locale[] {
  const configured = (process.env.NEXT_PUBLIC_ENABLED_LOCALES ?? LOCALES.join(','))
    .split(',')
    .map((value) => value.trim())
    .filter(isLocale);
  return [DEFAULT_LOCALE, ...configured.filter((locale) => locale !== DEFAULT_LOCALE)];
}

export const routing = defineRouting({
  locales: enabledLocales(),
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'as-needed',
  localeCookie: { name: 'TERAN_LOCALE', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' },
  // Each page states its language versions in its own metadata (lib/seo alternates); next-intl's
  // Link header would repeat them on every response, 404s and private pages included, and drop the
  // page number the canonical address keeps.
  alternateLinks: false,
});
