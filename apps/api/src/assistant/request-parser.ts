import type { ProductFormat } from '@teran/contracts';

/**
 * Rule-based reading of a shopper's request, in Uzbek, Russian or English: a budget, a category or
 * product type, pack formats, recorded attributes, a place of origin, a gift, and properties the
 * catalogue does not record. Category, type, attribute and place names come from the live
 * catalogue (CatalogVocabulary), so nothing here knows about tea in particular; only generic
 * shopping words are listed below.
 */

export interface CatalogVocabulary {
  categories: {
    slug: string;
    path: string;
    parentSlug: string | null;
    names: string[];
  }[];
  productTypes: { key: string; names: string[] }[];
  /** Filterable choice and yes/no attributes with their labels in every language. */
  attributes: {
    key: string;
    kind: 'SELECT' | 'MULTI_SELECT' | 'BOOLEAN';
    labels: string[];
    options: { key: string; labels: string[] }[];
  }[];
  /**
   * Places products come from (their recorded origin, e.g. "Xitoy, Yunnan"), with the place's
   * name in every language. Only places that tell products apart: not one every product shares.
   */
  origins: { key: string; names: string[] }[];
}

export type UnrecordedQuality = 'taste' | 'quality' | 'health' | 'easyBrew';

export interface ParsedRequest {
  maxPrice: number | null;
  minPrice: number | null;
  categorySlug: string | null;
  productTypeKey: string | null;
  formats: ProductFormat[];
  gift: boolean;
  /** Attribute key → option keys, or ["true"] / ["false"] for yes/no attributes. */
  attributes: Record<string, string[]>;
  /** A place of origin asked for (an `origins` key, e.g. "yunnan"). */
  origin: string | null;
  /** A descriptive word worth looking for in product texts (e.g. "mild"). */
  textQuery: string | null;
  unrecorded: UnrecordedQuality[];
}

const GIFT_WORDS = ["sovg'a", 'tuhfa', 'подар', 'gift', 'present'];
const FORMAT_WORDS: Partial<Record<ProductFormat, string[]>> = {
  TEA_BAGS: ['paketcha', 'paket', 'пакетик', 'tea bag', 'teabag', 'bags'],
  PYRAMIDS: ['piramid', 'пирамид', 'pyramid'],
  LOOSE_LEAF: ['bargli', 'рассыпн', 'листов', 'loose'],
  ACCESSORY: ['aksessuar', 'аксессуар', 'accessor'],
};
/** Properties shoppers ask for that the catalogue does not record as structured data. */
const UNRECORDED: Record<UnrecordedQuality, string[]> = {
  taste: [
    'yumshoq',
    'mayin',
    'мягк',
    'mild',
    'smooth',
    'kuchli',
    'крепк',
    'strong',
    'achchiq',
    'горьк',
    'bitter',
  ],
  quality: [
    'sifatli',
    'yuqori sifat',
    'eng yaxshi',
    'качеств',
    'лучш',
    'quality',
    'best',
    'premium',
  ],
  health: [
    'foydali',
    "sog'liq",
    'davola',
    'ozish',
    'полезн',
    'здоров',
    'похуд',
    'лечит',
    'healthy',
    'health',
    'weight loss',
    'cure',
  ],
  easyBrew: [
    'oson damla',
    'tez damla',
    'oson tayyor',
    'легко завар',
    'просто завар',
    'easy to brew',
    'easy brew',
    'easy to make',
  ],
};
/** Taste words that may appear in descriptions and tasting notes (searched as text). */
const SEARCHABLE_TASTE = new Set(['yumshoq', 'mayin', 'mild', 'smooth', 'kuchli', 'strong']);
const NEGATIONS = ['emas', 'siz', 'без', 'не ', 'no ', 'not ', 'without', 'un'];
const SIZE_UNIT = /^(?:g|gr|gramm?|г|гр|kg|кг|ml|мл|l|л|dona|ta|шт|pcs|pieces|°|%)\b/;

/** Lower case, one apostrophe, no punctuation (keeps digits, separators and Cyrillic). */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ʻʼ'`’‘]/g, "'")
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}'\s.,\-–—]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function words(text: string): string[] {
  return normalize(text)
    .split(/[\s.,\-–—]+/)
    .filter((word) => word.length > 0);
}

/** A name's word appears in the request when a request word starts with its stem (suffixes). */
function wordMatches(nameWord: string, requestWords: readonly string[]): boolean {
  if (nameWord.length < 3) return requestWords.includes(nameWord);
  const stem = nameWord.length > 5 ? nameWord.slice(0, Math.max(4, nameWord.length - 2)) : nameWord;
  return requestWords.some((word) => word.startsWith(stem));
}

/** Share of a name's significant words found in the request (0 when none is). */
function nameScore(name: string, requestWords: readonly string[]): number {
  const nameWords = words(name).filter((word) => word.length >= 3);
  if (nameWords.length === 0) return 0;
  const found = nameWords.filter((word) => wordMatches(word, requestWords));
  if (found.length === 0) return 0;
  return found.length / nameWords.length;
}

function containsAny(text: string, cues: readonly string[]): boolean {
  return cues.some((cue) => text.includes(cue));
}

const CURRENCY = "(?:so'm|som|сум\\S*|sum|uzs)?";
/** Words right after an amount that make it a ceiling (Uzbek) — "100 000 so'mgacha", "…dan arzon". */
const MAX_AFTER = new RegExp(
  `^${CURRENCY}\\s*(?:lik|ga)?\\s*(?:gacha|dan\\s+(?:arzon|oshmasin|oshmagan|kam))`,
);
/** …or a floor — "100 mingdan qimmat", "…dan ortiq". */
const MIN_AFTER = new RegExp(`^${CURRENCY}\\s*(?:dan|из)\\s+(?:qimmat|yuqori|ortiq|ko'p)`);
/** Words right before an amount (Russian, English, and "byudjet" in any language). */
const MAX_BEFORE =
  /(?:до|не дороже|дешевле|не более|under|below|up to|less than|within|max|budget(?: of)?|byudjet(?:im)?|budjet(?:im)?|бюджет)\s*$/;
const MIN_BEFORE = /(?:^|\s)(?:от|дороже|больше|over|above|more than|at least|from)\s*$/;

/** Prices mentioned in the request, with what they bound (a lone amount is a budget ceiling). */
export function parsePrices(raw: string): { min: number | null; max: number | null } {
  const text = normalize(raw);
  const pattern =
    /(\d{1,3}(?:[ .,]\d{3})+|\d+(?:[.,]\d+)?)\s*(k\b|ming|тыс\S*|mln|млн|million|миллион\S*)?/g;
  const found: { value: number; index: number; end: number }[] = [];
  for (const match of text.matchAll(pattern)) {
    const [whole, digits = '', unit = ''] = match;
    const index = match.index ?? 0;
    const after = text.slice(index + whole.length).trimStart();
    if (!unit && SIZE_UNIT.test(after)) continue;
    let value = Number(digits.replace(/[ .,](?=\d{3}\b)/g, '').replace(',', '.'));
    if (/^(?:k|ming|тыс)/.test(unit)) value *= 1000;
    if (/^(?:mln|млн|million|миллион)/.test(unit)) value *= 1_000_000;
    // Small numbers without a unit are counts or sizes, not prices in so'm.
    if (!Number.isFinite(value) || value < 1000) continue;
    found.push({ value: Math.round(value), index, end: index + whole.length });
  }
  if (found.length === 0) return { min: null, max: null };
  if (found.length >= 2) {
    const [a, b] = found as [(typeof found)[number], (typeof found)[number]];
    const between = text.slice(a.end, b.index);
    if (/^\s*(?:so'm|сум)?\s*(?:-|–|—|dan|до|to|and|va)\s*$/.test(between)) {
      return { min: Math.min(a.value, b.value), max: Math.max(a.value, b.value) };
    }
  }
  const first = found[0]!;
  const before = text.slice(Math.max(0, first.index - 24), first.index).trimEnd();
  const after = text.slice(first.end).trimStart();
  if (MIN_AFTER.test(after) || MIN_BEFORE.test(before)) return { min: first.value, max: null };
  if (MAX_AFTER.test(after) || MAX_BEFORE.test(before)) return { min: null, max: first.value };
  return { min: null, max: first.value };
}

export function parseRequest(raw: string, vocabulary: CatalogVocabulary): ParsedRequest {
  const text = normalize(raw);
  const requestWords = words(raw);
  const { min, max } = parsePrices(raw);

  // The category whose name matches best; on a tie the more specific (a subcategory) wins.
  let bestCategory: { slug: string; score: number; depth: number } | null = null;
  for (const category of vocabulary.categories) {
    const score = Math.max(0, ...category.names.map((name) => nameScore(name, requestWords)));
    if (score < 0.5) continue;
    const depth = category.parentSlug ? 1 : 0;
    if (
      !bestCategory ||
      score > bestCategory.score ||
      (score === bestCategory.score && depth > bestCategory.depth)
    ) {
      bestCategory = { slug: category.slug, score, depth };
    }
  }

  let productTypeKey: string | null = null;
  if (!bestCategory) {
    for (const type of vocabulary.productTypes) {
      if (type.names.some((name) => nameScore(name, requestWords) >= 1)) {
        productTypeKey = type.key;
        break;
      }
    }
  }

  const formats = (Object.entries(FORMAT_WORDS) as [ProductFormat, string[]][])
    .filter(([, cues]) => containsAny(text, cues))
    .map(([format]) => format);
  const gift = containsAny(text, GIFT_WORDS);

  const attributes: Record<string, string[]> = {};
  for (const attribute of vocabulary.attributes) {
    if (attribute.kind === 'BOOLEAN') {
      const label = attribute.labels.find((candidate) => nameScore(candidate, requestWords) >= 1);
      if (!label) continue;
      const stem = words(label)[0] ?? '';
      const at = text.indexOf(stem.slice(0, Math.max(4, stem.length - 2)));
      const around = at >= 0 ? text.slice(Math.max(0, at - 8), at + stem.length + 6) : '';
      attributes[attribute.key] = [
        NEGATIONS.some((cue) => around.includes(cue)) ? 'false' : 'true',
      ];
      continue;
    }
    const options = attribute.options
      .filter((option) => option.labels.some((label) => nameScore(label, requestWords) >= 1))
      .map((option) => option.key);
    if (options.length > 0) attributes[attribute.key] = options;
  }

  const origin =
    vocabulary.origins.find((place) =>
      place.names.some((name) => nameScore(name, requestWords) >= 1),
    )?.key ?? null;

  const unrecorded = (Object.entries(UNRECORDED) as [UnrecordedQuality, string[]][])
    .filter(([, cues]) => containsAny(text, cues))
    .map(([quality]) => quality);
  const textQuery = requestWords.find((word) => SEARCHABLE_TASTE.has(word)) ?? null;

  return {
    maxPrice: max,
    minPrice: min,
    categorySlug: bestCategory?.slug ?? null,
    productTypeKey,
    formats,
    gift,
    attributes,
    origin,
    textQuery,
    unrecorded,
  };
}

/** Removes phone numbers and e-mail addresses before a request leaves the server. */
export function redactPersonalData(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .replace(/\+?\d[\d\s()-]{7,}\d/g, (match) =>
      /\d{9,}/.test(match.replace(/\D/g, '')) ? '[phone]' : match,
    );
}
