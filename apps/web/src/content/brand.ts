import type { Localized } from './types';

/*
 * Official TERAN brand content, supplied and approved by the owner (2026-10-14).
 *
 * - Uzbek: exactly as supplied, including its apostrophes (’ U+2019 in taʼm, ‘ U+2018 in oʻ/gʻ).
 *   The only change is a no-break space before each dash, so a line never starts with "—".
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
 * Product identifiers supplied by TERAN. XC2025, G8810, 8830 and 8009 are printed on their packs
 * (2026-10-14: each "Xitoy yashil choy", 400 g). The owner's first list said "STD8009"; the pack
 * says "8009", which is what customers see. HET8800 has no packaging file yet.
 */
export const COLLECTION_CODES = ['XC2025', 'G8810', 'HET8800', '8830', '8009'] as const;

/**
 * Copy printed on the TERAN packaging (print files supplied by the owner, 2026-10-14). Uzbek is
 * exactly as printed and is used as the brand signature in every language, like the tagline;
 * the Russian and English value labels are drafts for the website, awaiting approval.
 */
export const PACKAGING = {
  /** Under the logo on every pack. */
  tagline: 'Fikrlang, tabiatning xushta’m lazzati.',
  /** Along the bottom edge of the back ("SOF TABIAT • YAXSHI KAYFIYAT • TERAN BILAN"). */
  slogan: ['Sof tabiat', 'Yaxshi kayfiyat', 'Teran bilan'],
} as const;

/** The four values printed with icons under the product name on every pack. */
export const BRAND_VALUES = ['natural', 'taste', 'vigour', 'quality'] as const;
export type BrandValue = (typeof BRAND_VALUES)[number];

export const brandValueLabels: Localized<Record<BrandValue, string>> = {
  uz: {
    natural: 'Tabiiy mahsulot',
    taste: 'Nafis ta’m',
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

export const brandCopy: Localized<BrandCopy> = {
  uz: {
    tagline: 'Teran ta’m. Teran taassurot.',
    description:
      'Har bir piyolada Xitoy choy madaniyatining boy an’analari va o‘zbekona mehmondo‘stlik ruhi uyg‘unlashadi.',
    location: 'Namangan, O‘zbekiston',
    story: {
      heading: 'TERAN — nom emas. Ma’no.',
      paragraphs: [
        'TERAN — qadimiy turkiy ildizlarga ega, chuqurlik va mazmunni ifodalovchi o‘zbekcha so‘z.',
        'Biz bu nomni choyning boy ta’mi, nafis ifori va har bir piyolada qoladigan iliq taassurot timsoli sifatida tanladik.',
      ],
    },
    philosophy: {
      heading: 'Biz qadrlaydigan uch tushuncha.',
      principles: [
        { title: 'Teran ta’m', text: 'boy ta’m va xushbo‘y ifor.' },
        { title: 'Tabiatdan ilhom', text: 'tabiat go‘zalligi va uyg‘unligi.' },
        { title: 'Qadrli lahzalar', text: 'samimiy suhbat va osoyishtalik.' },
      ],
    },
    collection: {
      heading: 'Har didga o‘ziga xos tanlov.',
      text: 'TERAN premium choy kolleksiyasi.',
    },
    partnership: {
      heading: 'TERAN bilan birga o‘sing.',
      text: 'Ulgurji savdo, distribyutorlik va hamkorlik imkoniyatlari.',
    },
    labels: {
      company: 'Kompaniya',
      location: 'Manzil',
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
      location: 'Город',
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

/** The original Uzbek tagline, shown as the brand signature on the Russian and English pages. */
export const SIGNATURE_TAGLINE = brandCopy.uz.tagline;
