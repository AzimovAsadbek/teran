/**
 * DEMONSTRATION CATALOGUE — NOT VERIFIED TERAN PRODUCT DATA.
 *
 * Generic tea styles with neutral copy and placeholder prices so the storefront can be developed
 * and reviewed. Deliberately absent: ingredients, origins, caffeine levels, tasting notes,
 * certifications and reviews — those must come from TERAN. Brewing values are the same general
 * guidance shown on the homepage. Replace everything here with verified data before launch.
 */
import type { ArtAccent, ArtStyle, PackShape } from './demo-art.js';

export interface Localized<T> {
  uz: T;
  ru: T;
  en: T;
}

export interface DemoCategory {
  slug: string;
  illustrationKey: string;
  name: Localized<string>;
  description: Localized<string>;
}

export interface DemoVariant {
  sku: string;
  weightGrams: number | null;
  unitCount?: number;
  price: string;
  compareAtPrice?: string;
  stock: number;
  lowStockThreshold?: number;
}

export interface DemoProduct {
  slug: string;
  category: string;
  collections: string[];
  format: 'LOOSE_LEAF' | 'TEA_BAGS' | 'PYRAMIDS' | 'GIFT_SET';
  featured: boolean;
  illustrationKey: string;
  publishedDaysAgo: number;
  brewing: { tempC: number; minSeconds: number; maxSeconds: number; grams: number | null } | null;
  art: { style: ArtStyle; shape: PackShape; accent?: ArtAccent };
  name: Localized<string>;
  shortDescription: Localized<string>;
  description: Localized<string>;
  variants: DemoVariant[];
}

const BREW = {
  black: { tempC: 95, minSeconds: 180, maxSeconds: 300, grams: 2.5 },
  green: { tempC: 80, minSeconds: 120, maxSeconds: 180, grams: 2 },
  white: { tempC: 85, minSeconds: 180, maxSeconds: 300, grams: 2.5 },
  oolong: { tempC: 90, minSeconds: 180, maxSeconds: 300, grams: 3 },
  herbal: { tempC: 100, minSeconds: 300, maxSeconds: 420, grams: 2 },
  fruit: { tempC: 100, minSeconds: 360, maxSeconds: 480, grams: 3 },
} as const;

export const DEMO_CATEGORIES: DemoCategory[] = [
  {
    slug: 'black-tea',
    illustrationKey: 'black',
    name: { uz: 'Qora choy', ru: 'Чёрный чай', en: 'Black tea' },
    description: {
      uz: 'Toʻyimli va iliq taʼmli qora choylar — kundalik dasturxon uchun.',
      ru: 'Насыщенные чёрные чаи с тёплым вкусом — для ежедневного чаепития.',
      en: 'Full-bodied black teas with a warm character, for every day.',
    },
  },
  {
    slug: 'green-tea',
    illustrationKey: 'green',
    name: { uz: 'Yashil choy', ru: 'Зелёный чай', en: 'Green tea' },
    description: {
      uz: 'Yengil va tetiklantiruvchi yashil choylar.',
      ru: 'Лёгкие и бодрящие зелёные чаи.',
      en: 'Light, refreshing green teas.',
    },
  },
  {
    slug: 'white-tea',
    illustrationKey: 'white',
    name: { uz: 'Oq choy', ru: 'Белый чай', en: 'White tea' },
    description: {
      uz: 'Nozik taʼmli, sokin lahzalar uchun oq choy.',
      ru: 'Белый чай с деликатным вкусом — для спокойных моментов.',
      en: 'Delicate white tea for quiet moments.',
    },
  },
  {
    slug: 'oolong',
    illustrationKey: 'oolong',
    name: { uz: 'Ulun', ru: 'Улун', en: 'Oolong' },
    description: {
      uz: 'Yashil va qora choy oraligʻidagi ulun choylari.',
      ru: 'Улуны — чаи между зелёным и чёрным.',
      en: 'Oolong teas, between green and black.',
    },
  },
  {
    slug: 'herbal',
    illustrationKey: 'herbal',
    name: { uz: 'Giyohli damlamalar', ru: 'Травяные сборы', en: 'Herbal infusions' },
    description: {
      uz: 'Choy bargisiz giyohli damlamalar — kechki dam olish uchun.',
      ru: 'Травяные сборы без чайного листа — для спокойного вечера.',
      en: 'Infusions without tea leaves, for a calm evening.',
    },
  },
  {
    slug: 'fruit',
    illustrationKey: 'fruit',
    name: { uz: 'Mevali damlamalar', ru: 'Фруктовые сборы', en: 'Fruit infusions' },
    description: {
      uz: 'Yorqin rangli va xushboʻy mevali damlamalar.',
      ru: 'Яркие и ароматные фруктовые сборы.',
      en: 'Bright, aromatic fruit infusions.',
    },
  },
  {
    slug: 'gift-sets',
    illustrationKey: 'gift',
    name: { uz: 'Sovgʻa toʻplamlari', ru: 'Подарочные наборы', en: 'Gift sets' },
    description: {
      uz: 'Yaqinlaringiz uchun chiroyli qadoqlangan choy toʻplamlari.',
      ru: 'Красиво упакованные наборы чая для близких.',
      en: 'Beautifully packed tea sets for the people you love.',
    },
  },
];

export const DEMO_COLLECTIONS: DemoCategory[] = [
  {
    slug: 'everyday-classics',
    illustrationKey: 'black',
    name: { uz: 'Kundalik klassika', ru: 'Повседневная классика', en: 'Everyday classics' },
    description: {
      uz: 'Har kungi choy ichish uchun sodda va sevimli choylar.',
      ru: 'Простые и любимые чаи на каждый день.',
      en: 'Simple, well-loved teas for every day.',
    },
  },
  {
    slug: 'evening-calm',
    illustrationKey: 'herbal',
    name: { uz: 'Kechki osoyishtalik', ru: 'Вечерний покой', en: 'Evening calm' },
    description: {
      uz: 'Kechki sokin damlar uchun yengil damlamalar.',
      ru: 'Мягкие сборы для тихого вечера.',
      en: 'Gentle infusions for a quiet evening.',
    },
  },
  {
    slug: 'gift-ideas',
    illustrationKey: 'gift',
    name: { uz: 'Sovgʻa gʻoyalari', ru: 'Идеи для подарка', en: 'Gift ideas' },
    description: {
      uz: 'Bayram va tashriflar uchun choy sovgʻalari.',
      ru: 'Чайные подарки к праздникам и в гости.',
      en: 'Tea gifts for celebrations and visits.',
    },
  },
];

export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    slug: 'classic-black-tea',
    category: 'black-tea',
    collections: ['everyday-classics'],
    format: 'LOOSE_LEAF',
    featured: true,
    illustrationKey: 'black',
    publishedDaysAgo: 90,
    brewing: BREW.black,
    art: { style: 'black', shape: 'tin' },
    name: { uz: 'Klassik qora choy', ru: 'Классический чёрный чай', en: 'Classic black tea' },
    shortDescription: {
      uz: 'Kundalik choy ichish uchun klassik qora choy.',
      ru: 'Классический чёрный чай на каждый день.',
      en: 'A classic black tea for everyday drinking.',
    },
    description: {
      uz: 'Kundalik dasturxon uchun klassik qora choy. Sof holda, sut bilan yoki shirinliklar bilan birga damlang.\n\nBu namoyish mahsuloti: tavsif TERAN tomonidan tasdiqlangan maʼlumot bilan almashtiriladi.',
      ru: 'Классический чёрный чай для ежедневного стола. Пейте в чистом виде, с молоком или со сладостями.\n\nЭто демонстрационный товар: описание будет заменено проверенными данными TERAN.',
      en: 'A classic black tea for the everyday table. Enjoy it plain, with milk or alongside something sweet.\n\nThis is a demonstration product: the description will be replaced with verified TERAN data.',
    },
    variants: [
      { sku: 'TRN-BLK-CLS-100', weightGrams: 100, price: '45000', stock: 48 },
      { sku: 'TRN-BLK-CLS-250', weightGrams: 250, price: '98000', stock: 22 },
    ],
  },
  {
    slug: 'black-tea-bags',
    category: 'black-tea',
    collections: ['everyday-classics'],
    format: 'TEA_BAGS',
    featured: false,
    illustrationKey: 'black',
    publishedDaysAgo: 80,
    brewing: { ...BREW.black, grams: null },
    art: { style: 'black', shape: 'box' },
    name: { uz: 'Qora choy, paketchalarda', ru: 'Чёрный чай в пакетиках', en: 'Black tea bags' },
    shortDescription: {
      uz: 'Ishda va yoʻlda tez damlash uchun qulay paketchalar.',
      ru: 'Удобные пакетики, чтобы быстро заварить чай на работе и в дороге.',
      en: 'Convenient bags for a quick cup at work or on the go.',
    },
    description: {
      uz: 'Tez va qulay damlash uchun qora choy paketchalari. Bir piyolaga bitta paketcha.\n\nBu namoyish mahsuloti.',
      ru: 'Чёрный чай в пакетиках для быстрого и удобного заваривания. Один пакетик на чашку.\n\nЭто демонстрационный товар.',
      en: 'Black tea in bags for quick, easy brewing. One bag per cup.\n\nThis is a demonstration product.',
    },
    variants: [
      { sku: 'TRN-BLK-BAG-25', weightGrams: 50, unitCount: 25, price: '32000', stock: 60 },
      { sku: 'TRN-BLK-BAG-100', weightGrams: 200, unitCount: 100, price: '110000', stock: 15 },
    ],
  },
  {
    slug: 'earl-grey',
    category: 'black-tea',
    collections: [],
    format: 'LOOSE_LEAF',
    featured: false,
    illustrationKey: 'earl-grey',
    publishedDaysAgo: 12,
    brewing: BREW.black,
    art: { style: 'black', shape: 'tin' },
    name: { uz: 'Earl Grey', ru: 'Эрл Грей', en: 'Earl Grey' },
    shortDescription: {
      uz: 'Earl Grey uslubidagi xushboʻy qora choy.',
      ru: 'Ароматный чёрный чай в стиле «Эрл Грей».',
      en: 'An aromatic black tea in the Earl Grey style.',
    },
    description: {
      uz: 'Earl Grey uslubidagi xushboʻy qora choy — ertalabki va kunduzgi choy uchun.\n\nBu namoyish mahsuloti: tarkib va tavsif TERAN tomonidan tasdiqlanishi kerak.',
      ru: 'Ароматный чёрный чай в стиле «Эрл Грей» — для утреннего и дневного чаепития.\n\nЭто демонстрационный товар: состав и описание должны быть подтверждены TERAN.',
      en: 'An aromatic black tea in the Earl Grey style, for morning and afternoon cups.\n\nThis is a demonstration product: composition and description must be confirmed by TERAN.',
    },
    variants: [
      { sku: 'TRN-EGR-100', weightGrams: 100, price: '52000', compareAtPrice: '58000', stock: 30 },
      { sku: 'TRN-EGR-250', weightGrams: 250, price: '118000', stock: 12 },
    ],
  },
  {
    slug: 'classic-green-tea',
    category: 'green-tea',
    collections: ['everyday-classics'],
    format: 'LOOSE_LEAF',
    featured: true,
    illustrationKey: 'green',
    publishedDaysAgo: 85,
    brewing: BREW.green,
    art: { style: 'green', shape: 'tin' },
    name: { uz: 'Klassik yashil choy', ru: 'Классический зелёный чай', en: 'Classic green tea' },
    shortDescription: {
      uz: 'Yengil, tetiklantiruvchi klassik yashil choy.',
      ru: 'Лёгкий, бодрящий классический зелёный чай.',
      en: 'A light, refreshing classic green tea.',
    },
    description: {
      uz: 'Kunning istalgan vaqti uchun yengil yashil choy. Juda issiq boʻlmagan suvda damlang — shunda taʼmi yumshoq boʻladi.\n\nBu namoyish mahsuloti.',
      ru: 'Лёгкий зелёный чай на любое время дня. Заваривайте не слишком горячей водой — так вкус будет мягче.\n\nЭто демонстрационный товар.',
      en: 'A light green tea for any time of day. Brew it with water that is not too hot for a softer taste.\n\nThis is a demonstration product.',
    },
    variants: [
      { sku: 'TRN-GRN-CLS-100', weightGrams: 100, price: '48000', stock: 40 },
      { sku: 'TRN-GRN-CLS-250', weightGrams: 250, price: '105000', stock: 18 },
    ],
  },
  {
    slug: 'jasmine-green-tea',
    category: 'green-tea',
    collections: ['gift-ideas'],
    format: 'LOOSE_LEAF',
    featured: true,
    illustrationKey: 'jasmine',
    publishedDaysAgo: 8,
    brewing: BREW.green,
    art: { style: 'green', shape: 'tin', accent: 'jasmine' },
    name: { uz: 'Yasminli yashil choy', ru: 'Зелёный чай с жасмином', en: 'Jasmine green tea' },
    shortDescription: {
      uz: 'Yasmin xushboʻyligidagi yashil choy.',
      ru: 'Зелёный чай с ароматом жасмина.',
      en: 'Green tea with a jasmine fragrance.',
    },
    description: {
      uz: 'Gulli xushboʻylikka ega yashil choy — mehmonlar bilan suhbat uchun.\n\nBu namoyish mahsuloti: tarkib TERAN tomonidan tasdiqlanishi kerak.',
      ru: 'Зелёный чай с цветочным ароматом — для бесед с гостями.\n\nЭто демонстрационный товар: состав должен быть подтверждён TERAN.',
      en: 'A green tea with a floral fragrance, for conversations with guests.\n\nThis is a demonstration product: its composition must be confirmed by TERAN.',
    },
    variants: [
      { sku: 'TRN-GRN-JAS-100', weightGrams: 100, price: '56000', stock: 3, lowStockThreshold: 5 },
    ],
  },
  {
    slug: 'green-tea-pyramids',
    category: 'green-tea',
    collections: [],
    format: 'PYRAMIDS',
    featured: false,
    illustrationKey: 'green',
    publishedDaysAgo: 40,
    brewing: { ...BREW.green, grams: null },
    art: { style: 'green', shape: 'box' },
    name: {
      uz: 'Yashil choy, piramidkalarda',
      ru: 'Зелёный чай в пирамидках',
      en: 'Green tea pyramids',
    },
    shortDescription: {
      uz: 'Bargli choy piramidkalarda — qulay va tez.',
      ru: 'Листовой чай в пирамидках — удобно и быстро.',
      en: 'Leaf tea in pyramid bags — quick and easy.',
    },
    description: {
      uz: 'Piramidka shaklidagi paketchalarda yashil choy. Bir piyolaga bitta piramidka.\n\nBu namoyish mahsuloti.',
      ru: 'Зелёный чай в пакетиках-пирамидках. Одна пирамидка на чашку.\n\nЭто демонстрационный товар.',
      en: 'Green tea in pyramid-shaped bags. One pyramid per cup.\n\nThis is a demonstration product.',
    },
    variants: [
      { sku: 'TRN-GRN-PYR-20', weightGrams: 50, unitCount: 20, price: '38000', stock: 35 },
    ],
  },
  {
    slug: 'mint-green-tea',
    category: 'green-tea',
    collections: ['everyday-classics'],
    format: 'LOOSE_LEAF',
    featured: false,
    illustrationKey: 'mint',
    publishedDaysAgo: 60,
    brewing: BREW.green,
    art: { style: 'green', shape: 'tin', accent: 'mint' },
    name: { uz: 'Yalpizli yashil choy', ru: 'Зелёный чай с мятой', en: 'Green tea with mint' },
    shortDescription: {
      uz: 'Yalpiz bilan tetiklantiruvchi yashil choy.',
      ru: 'Освежающий зелёный чай с мятой.',
      en: 'A refreshing green tea with mint.',
    },
    description: {
      uz: 'Issiq kunlarda ham, sovuq kechalarda ham yoqimli tetiklantiruvchi choy.\n\nBu namoyish mahsuloti: tarkib TERAN tomonidan tasdiqlanishi kerak.',
      ru: 'Освежающий чай, приятный и в жаркий день, и в прохладный вечер.\n\nЭто демонстрационный товар: состав должен быть подтверждён TERAN.',
      en: 'A refreshing tea for hot days and cool evenings alike.\n\nThis is a demonstration product: its composition must be confirmed by TERAN.',
    },
    variants: [{ sku: 'TRN-GRN-MNT-100', weightGrams: 100, price: '50000', stock: 26 }],
  },
  {
    slug: 'white-tea',
    category: 'white-tea',
    collections: ['gift-ideas', 'evening-calm'],
    format: 'LOOSE_LEAF',
    featured: true,
    illustrationKey: 'white',
    publishedDaysAgo: 30,
    brewing: BREW.white,
    art: { style: 'white', shape: 'tin' },
    name: { uz: 'Oq choy', ru: 'Белый чай', en: 'White tea' },
    shortDescription: {
      uz: 'Nozik va yumshoq taʼmli oq choy.',
      ru: 'Белый чай с деликатным мягким вкусом.',
      en: 'A white tea with a soft, delicate taste.',
    },
    description: {
      uz: 'Shoshilmasdan damlash uchun nozik oq choy.\n\nBu namoyish mahsuloti.',
      ru: 'Деликатный белый чай для неспешного заваривания.\n\nЭто демонстрационный товар.',
      en: 'A delicate white tea for unhurried brewing.\n\nThis is a demonstration product.',
    },
    variants: [
      { sku: 'TRN-WHT-50', weightGrams: 50, price: '75000', stock: 16 },
      { sku: 'TRN-WHT-100', weightGrams: 100, price: '140000', stock: 9 },
    ],
  },
  {
    slug: 'oolong-tea',
    category: 'oolong',
    collections: ['gift-ideas'],
    format: 'LOOSE_LEAF',
    featured: false,
    illustrationKey: 'oolong',
    publishedDaysAgo: 5,
    brewing: BREW.oolong,
    art: { style: 'oolong', shape: 'tin' },
    name: { uz: 'Ulun choyi', ru: 'Чай улун', en: 'Oolong tea' },
    shortDescription: {
      uz: 'Bir necha marta damlash mumkin boʻlgan ulun choyi.',
      ru: 'Улун, который можно заваривать несколько раз.',
      en: 'An oolong you can steep more than once.',
    },
    description: {
      uz: 'Ulun choyini bir necha marta damlab, har safar yangi taʼmni kashf eting.\n\nBu namoyish mahsuloti.',
      ru: 'Заваривайте улун несколько раз и открывайте новый вкус с каждой заваркой.\n\nЭто демонстрационный товар.',
      en: 'Steep this oolong several times and discover a different cup each time.\n\nThis is a demonstration product.',
    },
    variants: [{ sku: 'TRN-OOL-100', weightGrams: 100, price: '82000', stock: 20 }],
  },
  {
    slug: 'mountain-herbs',
    category: 'herbal',
    collections: ['evening-calm'],
    format: 'LOOSE_LEAF',
    featured: true,
    illustrationKey: 'herbal',
    publishedDaysAgo: 50,
    brewing: BREW.herbal,
    art: { style: 'herbal', shape: 'tin' },
    name: { uz: 'Togʻ giyohlari', ru: 'Горные травы', en: 'Mountain herbs' },
    shortDescription: {
      uz: 'Kechki choy uchun giyohli damlama.',
      ru: 'Травяной сбор для вечернего чаепития.',
      en: 'A herbal infusion for the evening.',
    },
    description: {
      uz: 'Kun yakunida damlash uchun giyohli damlama.\n\nBu namoyish mahsuloti: tarkib TERAN tomonidan tasdiqlanishi kerak.',
      ru: 'Травяной сбор, чтобы завершить день.\n\nЭто демонстрационный товар: состав должен быть подтверждён TERAN.',
      en: 'A herbal infusion to end the day.\n\nThis is a demonstration product: its composition must be confirmed by TERAN.',
    },
    variants: [{ sku: 'TRN-HRB-MTN-80', weightGrams: 80, price: '42000', stock: 33 }],
  },
  {
    slug: 'chamomile-infusion',
    category: 'herbal',
    collections: ['evening-calm'],
    format: 'TEA_BAGS',
    featured: false,
    illustrationKey: 'herbal',
    publishedDaysAgo: 70,
    brewing: { ...BREW.herbal, grams: null },
    art: { style: 'herbal', shape: 'box', accent: 'chamomile' },
    name: { uz: 'Moychechak damlamasi', ru: 'Ромашковый сбор', en: 'Chamomile infusion' },
    shortDescription: {
      uz: 'Paketchalardagi moychechakli damlama.',
      ru: 'Ромашковый сбор в пакетиках.',
      en: 'A chamomile infusion in bags.',
    },
    description: {
      uz: 'Kechki sokin daqiqalar uchun moychechakli damlama.\n\nBu namoyish mahsuloti: tarkib TERAN tomonidan tasdiqlanishi kerak.',
      ru: 'Ромашковый сбор для спокойных вечерних минут.\n\nЭто демонстрационный товар: состав должен быть подтверждён TERAN.',
      en: 'A chamomile infusion for calm evening moments.\n\nThis is a demonstration product: its composition must be confirmed by TERAN.',
    },
    variants: [
      { sku: 'TRN-HRB-CHM-20', weightGrams: 30, unitCount: 20, price: '28000', stock: 44 },
    ],
  },
  {
    slug: 'rosehip-hibiscus',
    category: 'fruit',
    collections: [],
    format: 'LOOSE_LEAF',
    featured: false,
    illustrationKey: 'fruit',
    publishedDaysAgo: 3,
    brewing: BREW.fruit,
    art: { style: 'fruit', shape: 'tin', accent: 'hibiscus' },
    name: { uz: 'Naʼmatak va karkade', ru: 'Шиповник и каркаде', en: 'Rosehip & hibiscus' },
    shortDescription: {
      uz: 'Yorqin rangli mevali damlama.',
      ru: 'Фруктовый сбор яркого цвета.',
      en: 'A brightly coloured fruit infusion.',
    },
    description: {
      uz: 'Issiq yoki sovutilgan holda ichish mumkin boʻlgan yorqin damlama.\n\nBu namoyish mahsuloti: tarkib TERAN tomonidan tasdiqlanishi kerak.',
      ru: 'Яркий сбор, который можно пить горячим или охлаждённым.\n\nЭто демонстрационный товар: состав должен быть подтверждён TERAN.',
      en: 'A vivid infusion to enjoy hot or chilled.\n\nThis is a demonstration product: its composition must be confirmed by TERAN.',
    },
    variants: [{ sku: 'TRN-FRT-RHB-100', weightGrams: 100, price: '44000', stock: 27 }],
  },
  {
    slug: 'berry-infusion',
    category: 'fruit',
    collections: [],
    format: 'LOOSE_LEAF',
    featured: false,
    illustrationKey: 'fruit',
    publishedDaysAgo: 45,
    brewing: BREW.fruit,
    art: { style: 'fruit', shape: 'tin' },
    name: { uz: 'Rezavor damlama', ru: 'Ягодный сбор', en: 'Berry infusion' },
    shortDescription: {
      uz: 'Rezavor mevalar uslubidagi damlama.',
      ru: 'Сбор в ягодном стиле.',
      en: 'A berry-style infusion.',
    },
    description: {
      uz: 'Rezavor mevalar uslubidagi mevali damlama.\n\nBu namoyish mahsuloti (hozircha mavjud emas holatini koʻrsatish uchun).',
      ru: 'Фруктовый сбор в ягодном стиле.\n\nЭто демонстрационный товар (показывает состояние «нет в наличии»).',
      en: 'A fruit infusion in a berry style.\n\nThis is a demonstration product (it demonstrates the out-of-stock state).',
    },
    variants: [{ sku: 'TRN-FRT-BRY-100', weightGrams: 100, price: '46000', stock: 0 }],
  },
  {
    slug: 'gift-set-trio',
    category: 'gift-sets',
    collections: ['gift-ideas'],
    format: 'GIFT_SET',
    featured: true,
    illustrationKey: 'gift',
    publishedDaysAgo: 20,
    brewing: null,
    art: { style: 'gift', shape: 'gift' },
    name: {
      uz: 'Sovgʻa toʻplami: uch xil choy',
      ru: 'Подарочный набор: три чая',
      en: 'Gift set: three teas',
    },
    shortDescription: {
      uz: 'Uch xil choydan iborat sovgʻa toʻplami.',
      ru: 'Подарочный набор из трёх видов чая.',
      en: 'A gift set of three teas.',
    },
    description: {
      uz: 'Bayram, tashrif yoki minnatdorchilik uchun chiroyli qadoqlangan uchta choy.\n\nBu namoyish mahsuloti: toʻplam tarkibi TERAN tomonidan tasdiqlanishi kerak.',
      ru: 'Три чая в красивой упаковке — к празднику, в гости или в знак благодарности.\n\nЭто демонстрационный товар: состав набора должен быть подтверждён TERAN.',
      en: 'Three teas, beautifully packed — for a celebration, a visit or a thank-you.\n\nThis is a demonstration product: the set contents must be confirmed by TERAN.',
    },
    variants: [
      {
        sku: 'TRN-GFT-TRIO',
        weightGrams: null,
        unitCount: 3,
        price: '210000',
        stock: 10,
        lowStockThreshold: 3,
      },
    ],
  },
];
