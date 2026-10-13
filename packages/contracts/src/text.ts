/**
 * Every apostrophe-like character used in Uzbek Latin text (oʻ, gʻ, tutuq belgisi) and its common
 * keyboard substitutes. Searches must match regardless of which one a visitor types.
 */
const APOSTROPHE_VARIANTS = /[‘’ʻʼ`´ʹ]/g;

/** Lower-cases and normalises text so that stored search text and queries compare reliably. */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFC')
    .toLowerCase()
    .replace(APOSTROPHE_VARIANTS, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Builds the `searchText` column value from the searchable fields of a product translation. */
export function buildSearchText(parts: readonly (string | null | undefined)[]): string {
  return normalizeSearchText(parts.filter((part): part is string => Boolean(part)).join(' '));
}
