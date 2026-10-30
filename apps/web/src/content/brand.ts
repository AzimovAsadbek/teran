import type { Localized } from './types';

/*
 * Official TERAN brand content, supplied and approved by the owner (2026-10-14).
 *
 * - Uzbek: exactly as supplied; only its apostrophes follow the rest of the site's Uzbek (ʻ U+02BB in
 *   oʻ/gʻ, ʼ U+02BC in taʼm, where the supplied text had ‘ and ’), so search and screen readers treat
 *   the words alike everywhere. A no-break space stands before each dash, so a line never starts
 *   with "—".
 * - English: the tagline was supplied; every other English and all Russian text are translations
 *   drafted for the website and waiting for the owner's approval
 *   (docs/business-information-required.md).
 *
 * Product facts (tea type, weight, brewing, origin) live with the products, not here; the
 * packaging they come from is described in docs/design/packaging.md.
 */

export const BRAND = {
  name: 'TERAN',
  /** Brand descriptor, used as supplied in every language (as on the packaging). */
  descriptor: 'PREMIUM CHINESE TEA',
  company: 'TERAN TRADE MChJ',
  website: { href: 'https://www.terantrade.uz', label: 'www.terantrade.uz' },
} as const;

/**
 * The five TERAN teas, as their packs, barcodes and the owner's descriptions name them
 * (2026-10-17): each a Chinese green tea in a 400 g zip pouch. The owner's first list said
 * "HET8800" and "STD8009"; the packs say 8800 and 8009, which is what customers see.
 */
export const COLLECTION_CODES = ['XC2025', 'G8810', '8800', '8830', '8009'] as const;

/**
 * Copy printed on the TERAN packaging (print files supplied by the owner, 2026-10-14). Uzbek is
 * exactly as printed and is used as the brand signature in every language, like the tagline;
 * the Russian and English value labels are drafts for the website, awaiting approval.
 */
export const PACKAGING = {
  /** Under the logo on every pack. */
  tagline: 'Fikrlang, tabiatning xushtaʼm lazzati.',
  /** Along the bottom edge of the back ("SOF TABIAT • YAXSHI KAYFIYAT • TERAN BILAN"). */
  slogan: ['Sof tabiat', 'Yaxshi kayfiyat', 'Teran bilan'],
} as const;

/** The four values printed with icons under the product name on every pack. */
export const BRAND_VALUES = ['natural', 'taste', 'vigour', 'quality'] as const;
export type BrandValue = (typeof BRAND_VALUES)[number];

export const brandValueLabels: Localized<Record<BrandValue, string>> = {
  uz: {
    natural: 'Tabiiy mahsulot',
    taste: 'Nafis taʼm',
    vigour: 'Har kungi tetiklik',
    quality: 'Sifatli tanlov',
  },
  ru: {
    natural: 'Натуральный продукт',
    taste: 'Изысканный вкус',
    vigour: 'Бодрость каждый день',
    quality: 'Качественный выбор',
  },
  en: {
    natural: 'Natural product',
    taste: 'Refined taste',
    vigour: 'Everyday vigour',
    quality: 'Quality choice',
  },
};

/** TERAN's five teas by the identifier printed on their packs. */
export const TEA_CODES = ['XC2025', 'G8810', '8800', '8830', '8009'] as const;
export type TeaCode = (typeof TEA_CODES)[number];

/**
 * A tea's product page from the identifier on its pack (the catalogue names them "teran-<code>";
 * a renamed product redirects), so a picture of a pack opens that tea.
 */
export function teaHref(code: TeaCode): string {
  return `/products/teran-${code.toLowerCase()}`;
}

/**
 * Each pack's own colour (its ribbon and lower band), sampled from the pack photographs in
 * public/brand/packs: the one thing besides the leaf that tells the five pouches apart.
 */
export const PACK_COLOURS: Record<TeaCode, string> = {
  XC2025: '#790810',
  G8810: '#191816',
  '8800': '#6a7c13',
  '8830': '#0b2f73',
  '8009': '#245719',
};

/** The identifier of one of TERAN's five teas from its catalogue address, else null. */
export function teaCodeOf(slug: string): TeaCode | null {
  const code = slug.replace(/^teran-/, '').toUpperCase();
  return slug.startsWith('teran-') && (TEA_CODES as readonly string[]).includes(code)
    ? (code as TeaCode)
    : null;
}

/** Slug of the demonstration collection that groups the five identifiers. */
export const PREMIUM_COLLECTION_SLUG = 'teran-premium';

export interface BrandCopy {
  /** Main tagline (Uzbek original; supplied English; Russian draft). */
  tagline: string;
  description: string;
  location: string;
  story: { heading: string; paragraphs: readonly string[] };
  philosophy: {
    heading: string;
    principles: readonly { title: string; text: string }[];
  };
  collection: { heading: string; text: string };
  partnership: { heading: string; text: string };
  /** Labels for the company facts (interface text, not supplied copy). */
  labels: { company: string; location: string; website: string; codes: string };
}

/**
 * Who TERAN is in one sentence, from the facts above (the descriptor, the company, its city): put
 * before the brand's own description where a page is described to search engines and AI
 * assistants (the home page's description, the organization's schema), so the name is read as a
 * Chinese tea brand, not the common word or the wine (ADR-068).
 */
export const brandIdentity: Localized<string> = {
  uz: 'TERAN — premium Xitoy choyi brendi (TERAN TRADE MChJ, Namangan, Oʻzbekiston).',
  ru: 'TERAN — бренд премиального китайского чая (TERAN TRADE MChJ, Наманган, Узбекистан).',
  en: 'TERAN is a premium Chinese tea brand (TERAN TRADE MChJ, Namangan, Uzbekistan).',
};

export const brandCopy: Localized<BrandCopy> = {
  uz: {
    tagline: 'Teran taʼm. Teran taassurot.',
    description:
      'Har bir piyolada Xitoy choy madaniyatining boy anʼanalari va oʻzbekona mehmondoʻstlik ruhi uygʻunlashadi.',
    location: 'Namangan, Oʻzbekiston',
    story: {
      heading: 'TERAN — nom emas. Maʼno.',
      paragraphs: [
        'TERAN — qadimiy turkiy ildizlarga ega, chuqurlik va mazmunni ifodalovchi oʻzbekcha soʻz.',
        'Biz bu nomni choyning boy taʼmi, nafis ifori va har bir piyolada qoladigan iliq taassurot timsoli sifatida tanladik.',
      ],
    },
    philosophy: {
      heading: 'Biz qadrlaydigan uch tushuncha.',
      principles: [
        { title: 'Teran taʼm', text: 'boy taʼm va xushboʻy ifor.' },
        { title: 'Tabiatdan ilhom', text: 'tabiat goʻzalligi va uygʻunligi.' },
        { title: 'Qadrli lahzalar', text: 'samimiy suhbat va osoyishtalik.' },
      ],
    },
    collection: {
      heading: 'Har didga oʻziga xos tanlov.',
      text: 'TERAN premium choy kolleksiyasi.',
    },
    partnership: {
      heading: 'TERAN bilan birga oʻsing.',
      text: 'Ulgurji savdo, distribyutorlik va hamkorlik imkoniyatlari.',
    },
    labels: {
      company: 'Kompaniya',
      location: 'Joylashuv',
      website: 'Veb-sayt',
      codes: 'Kolleksiya identifikatorlari',
    },
  },
  ru: {
    tagline: 'Глубокий вкус. Глубокое впечатление.',
    description:
      'В каждой пиале богатые традиции китайской чайной культуры соединяются с духом узбекского гостеприимства.',
    location: 'Наманган, Узбекистан',
    story: {
      heading: 'TERAN — не просто имя. Смысл.',
      paragraphs: [
        'TERAN — узбекское слово с древними тюркскими корнями, выражающее глубину и смысл.',
        'Мы выбрали это имя как символ богатого вкуса чая, его тонкого аромата и тёплого впечатления, которое остаётся после каждой пиалы.',
      ],
    },
    philosophy: {
      heading: 'Три понятия, которые мы ценим.',
      principles: [
        { title: 'Глубокий вкус', text: 'богатый вкус и благоухающий аромат.' },
        { title: 'Вдохновение природой', text: 'красота и гармония природы.' },
        { title: 'Ценные мгновения', text: 'душевная беседа и умиротворение.' },
      ],
    },
    collection: {
      heading: 'Свой выбор для каждого вкуса.',
      text: 'Коллекция премиального чая TERAN.',
    },
    partnership: {
      heading: 'Растите вместе с TERAN.',
      text: 'Оптовые продажи, дистрибуция и партнёрство.',
    },
    labels: {
      company: 'Компания',
      location: 'Местоположение',
      website: 'Сайт',
      codes: 'Идентификаторы коллекции',
    },
  },
  en: {
    tagline: 'Deep Taste. Lasting Impression.',
    description:
      'In every cup, the rich traditions of Chinese tea culture meet the spirit of Uzbek hospitality.',
    location: 'Namangan, Uzbekistan',
    story: {
      heading: 'TERAN — not a name. A meaning.',
      paragraphs: [
        'TERAN is an Uzbek word with ancient Turkic roots that expresses depth and meaning.',
        'We chose it as a symbol of tea’s rich taste, its delicate aroma and the warm impression that stays with every cup.',
      ],
    },
    philosophy: {
      heading: 'Three ideas we value.',
      principles: [
        { title: 'Deep taste', text: 'rich flavour and a fragrant aroma.' },
        { title: 'Inspired by nature', text: 'the beauty and harmony of nature.' },
        { title: 'Precious moments', text: 'heartfelt conversation and calm.' },
      ],
    },
    collection: {
      heading: 'A choice for every taste.',
      text: 'The TERAN premium tea collection.',
    },
    partnership: {
      heading: 'Grow with TERAN.',
      text: 'Wholesale, distribution and partnership opportunities.',
    },
    labels: {
      company: 'Company',
      location: 'Location',
      website: 'Website',
      codes: 'Collection identifiers',
    },
  },
};
