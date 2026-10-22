/**
 * Whether an answer talks about a product or a category, so the chat shows its card or link only
 * then (the owner's word of 2026-10-23: not under every answer). Names are compared as plain
 * words — lower case, without apostrophes, accents or punctuation — and each word by its stem, as
 * Uzbek and Russian add endings to the words they use ("choyni", "зелёного").
 */

/** The brand on every pack: no help in telling one product from another. */
const BRAND = 'teran';

/** Plain words: lower case, apostrophes, accents and punctuation gone ("Sovgʻa" → "sovga"). */
export function plainWords(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[ʻʼ'’‘`]/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** A word's stem: all of a short word, else without the last three letters (at least four). */
function stem(word: string): string {
  return word.length <= 4 ? word : word.slice(0, Math.max(4, word.length - 3));
}

/** A code on a pack ("XC2025", "G8810", "8800"): enough on its own to name its product. */
function isCode(word: string): boolean {
  return word.length >= 4 && /\d/.test(word);
}

/**
 * The text names this product or category: a code in the name appears as a word of its own
 * ("TERAN XC2025" → "XC2025"), or every word of the name of four letters or more appears, by its
 * stem, as the start of a word of the text ("Klassik yashil choy" in "klassik yashil choyni"; a
 * short word such as "чай" may change its ending, so it is left out while longer words remain).
 */
export function mentions(text: string, name: string): boolean {
  const words = plainWords(text);
  const own = plainWords(name).filter((word) => word !== BRAND);
  const codes = own.filter(isCode);
  // A code keeps its ending in Uzbek ("XC2025ni"), so it may start a word.
  if (codes.length > 0) return codes.some((code) => words.some((word) => word.startsWith(code)));
  const long = own.filter((word) => word.length >= 4);
  const significant = long.length > 0 ? long : own.filter((word) => word.length >= 3);
  if (significant.length === 0) return false;
  return significant.every((word) => {
    const start = stem(word);
    return words.some((candidate) => candidate.startsWith(start));
  });
}
