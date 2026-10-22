/**
 * The catalogue the seed loads: TERAN's five teas, and a generic test catalogue.
 *
 * - The five TERAN teas (XC2025, G8810, 8800, 8830, 8009) carry the owner's own descriptions
 *   (2026-10-17): description, taste and aroma, brewing, origin, storage and shelf life, a 400 g zip
 *   pouch each, the pouch photographs and the barcode (the last three on 2026-10-18). Prices are
 *   placeholders until the owner confirms them.
 * - Everything marked `testOnly` is a generic, invented range of tea styles (other tea types, pack
 *   sizes, a sale price, low and no stock, a draft) that the end-to-end tests need. It is loaded only
 *   with SEED_TEST_CATALOGUE=true; elsewhere the seed archives it (docs/development/demo-mode.md).
 * - The wider demonstration range (matcha, infusions, iced tea, water, juices, chocolates, teaware,
 *   a discovery box; demo-range.ts) is `testOnly` too. Only demonstration products get ingredients and a
 *   caffeine level (typical of their style); the TERAN teas get neither.
 * - Deliberately absent: certifications, health claims and reviews.
 */
import type { ArtAccent, ArtStyle, PackShape } from './demo-art.js';
import {
  DEMO_RANGE_ATTRIBUTE_VALUES,
  DEMO_RANGE_CAFFEINE,
  DEMO_RANGE_CATEGORIES,
  DEMO_RANGE_COLLECTIONS,
  DEMO_RANGE_LAST_CATEGORIES,
  DEMO_RANGE_PRODUCT_TYPES,
  DEMO_RANGE_PRODUCTS,
  DEMO_RANGE_TYPES_BY_CATEGORY,
  FLAVOUR_ATTRIBUTE,
} from './demo-range.js';

export interface Localized<T> {
  uz: T;
  ru: T;
  en: T;
}

export interface DemoCategory {
  slug: string;
  /** Part of the generic test catalogue (see the file comment). */
  testOnly?: boolean;
  /** Top-level category this one belongs to (categories have two levels). */
  parent?: string;
  /** Product type new products start with (top-level categories; subcategories use the parent's). */
  productType?: string;
  illustrationKey: string;
  name: Localized<string>;
  description: Localized<string>;
}

export interface DemoVariant {
  sku: string;
  /** Earlier SKUs of the same pack: renamed in place, so orders keep pointing at it. */
  formerSkus?: string[];
  weightGrams: number | null;
  unitCount?: number;
  price: string;
  compareAtPrice?: string;
  stock: number;
  lowStockThreshold?: number;
  /** The EAN-13 printed on the pack, only where the owner supplied it. */
  barcode?: string;
}

export interface DemoProduct {
  slug: string;
  /** Earlier slugs: the product keeps a redirect from each. */
  formerSlugs?: string[];
  /** Part of the generic test catalogue (see the file comment). */
  testOnly?: boolean;
  /** DRAFT products exist only in the admin area (e.g. to demonstrate publishing). */
  status?: 'ACTIVE' | 'DRAFT';
  category: string;
  collections: string[];
  format: 'LOOSE_LEAF' | 'TEA_BAGS' | 'PYRAMIDS' | 'GIFT_SET' | 'ACCESSORY' | 'OTHER';
  /** Demonstration products only: the caffeine typical of the style (never on TERAN teas). */
  caffeine?: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  featured: boolean;
  illustrationKey: string;
  publishedDaysAgo: number;
  /** `tempMaxC` and `gramsMax` close a range ("80–90 °C", "3–5 g"); absent for one value. */
  brewing: {
    tempC: number;
    tempMaxC?: number;
    minSeconds: number;
    maxSeconds: number;
    grams: number | null;
    gramsMax?: number;
  } | null;
  art: { style: ArtStyle; shape: PackShape; accent?: ArtAccent };
  /**
   * A real photograph for a product of the demonstration range, used instead of the drawn art when
   * the seed runs with DEMO_PHOTOS_DIR (scripts/build-demo-photos.ts makes the folder from the
   * site's licensed pictures; file name without .jpg).
   */
  photo?: string;
  /**
   * Images of the real pack (assets/packaging, made by apps/web/scripts/packaging), used instead
   * of the code-drawn art: the pouch photograph, the back of the pack where a print file exists,
   * and the pouch cut out on a transparent background (the home page stage).
   */
  packaging?: { front: string; back: string | null; cutout?: string };
  name: Localized<string>;
  shortDescription: Localized<string>;
  description: Localized<string>;
  tastingNotes?: Localized<string>;
  /** Demonstration products only: what an infusion, a juice or an iced tea is made of. */
  ingredients?: Localized<string>;
  /** Only where TERAN has stated it (on the pack). */
  origin?: Localized<string>;
  variants: DemoVariant[];
}

const BREW = {
  black: { tempC: 95, minSeconds: 180, maxSeconds: 300, grams: 2.5 },
  green: { tempC: 80, minSeconds: 120, maxSeconds: 180, grams: 2 },
  white: { tempC: 85, minSeconds: 180, maxSeconds: 300, grams: 2.5 },
  oolong: { tempC: 90, minSeconds: 180, maxSeconds: 300, grams: 3 },
  puerh: { tempC: 95, minSeconds: 180, maxSeconds: 300, grams: 3 },
} as const;

/** What is typical of each style — general tea knowledge, not a description of TERAN products. */
const NOTES = {
  black: {
    uz: 'Uslubga xos: toʻyimli va iliq taʼm, toza yakun.',
    ru: 'Типично для стиля: насыщенный тёплый вкус и чистое послевкусие.',
    en: 'Typical of the style: full and warm, with a clean finish.',
  },
  earlGrey: {
    uz: 'Uslubga xos: sitrusli xushboʻylik va qora choy taʼmi.',
    ru: 'Типично для стиля: цитрусовый аромат и вкус чёрного чая.',
    en: 'Typical of the style: a citrus aroma over black tea.',
  },
  green: {
    uz: 'Uslubga xos: yengil, yangi va oʻtsimon taʼm.',
    ru: 'Типично для стиля: лёгкий, свежий, травянистый вкус.',
    en: 'Typical of the style: light, fresh and grassy.',
  },
  jasmine: {
    uz: 'Uslubga xos: yasmin gullarining xushboʻyligi va yengil yashil choy taʼmi.',
    ru: 'Типично для стиля: аромат жасмина и лёгкий вкус зелёного чая.',
    en: 'Typical of the style: jasmine fragrance over a light green tea.',
  },
  mint: {
    uz: 'Uslubga xos: yalpizning salqin xushboʻyligi va yashil choy taʼmi.',
    ru: 'Типично для стиля: прохладный аромат мяты и вкус зелёного чая.',
    en: 'Typical of the style: cool mint over green tea.',
  },
  white: {
    uz: 'Uslubga xos: nozik, yumshoq va biroz shirin taʼm.',
    ru: 'Типично для стиля: деликатный, мягкий, сладковатый вкус.',
    en: 'Typical of the style: delicate, soft and gently sweet.',
  },
  oolong: {
    uz: 'Uslubga xos: gulli xushboʻylik va qatlamli taʼm.',
    ru: 'Типично для стиля: цветочный аромат и многослойный вкус.',
    en: 'Typical of the style: a floral aroma and a layered taste.',
  },
  roastedOolong: {
    uz: 'Uslubga xos: qovurilgan, iliq va chuqur taʼm.',
    ru: 'Типично для стиля: тёплый, глубокий вкус с нотами обжарки.',
    en: 'Typical of the style: toasty, warm and deep.',
  },
  puerh: {
    uz: 'Uslubga xos: chuqur, yumshoq va tuproqsimon taʼm.',
    ru: 'Типично для стиля: глубокий, мягкий, землистый вкус.',
    en: 'Typical of the style: deep, smooth and earthy.',
  },
} satisfies Record<string, Localized<string>>;

/**
 * The five TERAN teas as the owner described them (2026-10-17): Uzbek and Russian exactly as
 * supplied (only the apostrophes follow the site's Uzbek: ʻ in oʻ/gʻ, ʼ in taʼm), English translated.
 * Every one is a Chinese green tea in a 400 g zip pouch; the photographs are of those pouches.
 */
interface TeranTea {
  code: string;
  description: Localized<string>;
  taste: Localized<string>;
  origin: Localized<string>;
  brewing: Localized<string>;
  storage: Localized<string>;
  shelfLife: Localized<string>;
  /** Producer and importer, as printed on the packs that have a print file (not yet 8800). */
  printed: boolean;
}

const STORAGE: Localized<string> = {
  uz: 'Salqin, quruq, yorugʻlik tushmaydigan joyda, mahkam yopilgan holda saqlang.',
  ru: 'Хранить в плотно закрытой упаковке в прохладном, сухом, защищённом от света месте.',
  en: 'Keep tightly closed in a cool, dry place away from light.',
};
const SHELF_LIFE: Localized<string> = { uz: '24 oy.', ru: '24 месяца.', en: '24 months.' };
const HUNAN: Localized<string> = { uz: 'Xitoy, Hunan', ru: 'Китай, Хунань', en: 'China, Hunan' };
const BREW_3_5: Localized<string> = {
  uz: '3–5 g choyga 250 ml, 85–90°C suv. 2 daqiqa damlang.',
  ru: '3–5 г чая на 250 мл воды при 85–90°C. Настаивать 2 минуты.',
  en: '3–5 g of tea per 250 ml of water at 85–90 °C. Steep for 2 minutes.',
};

const TERAN_TEAS: Record<string, TeranTea> = {
  XC2025: {
    code: 'XC2025',
    description: {
      uz: 'Xitoyning Hunan viloyatidagi tumanli togʻlarda yetishtirilgan, ingichka va zich buralgan bargli yashil choy.',
      ru: 'Зелёный чай с тонкими, плотно скрученными листьями, выращенный в туманных горах провинции Хунань, Китай.',
      en: 'A green tea with thin, tightly rolled leaves, grown in the misty mountains of Hunan province, China.',
    },
    taste: {
      uz: 'Mayin, tetiklantiruvchi taʼm, yengil shirinlik va biroz taxir taʼm qoldigʻi. Qovurilgan kashtanni eslatuvchi uzoq saqlanadigan yoqimli ifor.',
      ru: 'Мягкий, освежающий вкус с лёгкой сладостью и слегка терпким послевкусием. Стойкий приятный аромат с нотами жареного каштана.',
      en: 'A smooth, refreshing taste with a light sweetness and a slightly brisk finish. A long-lasting, pleasant aroma with notes of roasted chestnut.',
    },
    origin: HUNAN,
    brewing: {
      uz: '5 g choyga 250 ml, 80–90°C suv. 2–3 daqiqa damlang.',
      ru: '5 г чая на 250 мл воды при 80–90°C. Настаивать 2–3 минуты.',
      en: '5 g of tea per 250 ml of water at 80–90 °C. Steep for 2–3 minutes.',
    },
    storage: STORAGE,
    shelfLife: SHELF_LIFE,
    printed: true,
  },
  G8810: {
    code: 'G8810',
    description: {
      uz: 'Xitoyning Yunnan viloyatidagi baland togʻli choy plantatsiyalarida yetishtirilgan, nafis bargli yashil choy.',
      ru: 'Зелёный чай с нежными листьями, выращенный на высокогорных чайных плантациях провинции Юньнань, Китай.',
      en: 'A green tea with delicate leaves, grown on high-mountain tea plantations in Yunnan province, China.',
    },
    taste: {
      uz: 'Mayin, tetiklantiruvchi taʼm, yoqimli shirin taʼm qoldigʻi va yengil, yangi choy ifori.',
      ru: 'Мягкий, освежающий вкус с приятным сладковатым послевкусием и лёгким свежим ароматом.',
      en: 'A smooth, refreshing taste with a pleasant sweet finish and a light, fresh tea aroma.',
    },
    origin: { uz: 'Xitoy, Yunnan', ru: 'Китай, Юньнань', en: 'China, Yunnan' },
    brewing: {
      uz: '5 g choyga 250 ml, 90°C suv. 2–3 daqiqa damlang.',
      ru: '5 г чая на 250 мл воды при 90°C. Настаивать 2–3 минуты.',
      en: '5 g of tea per 250 ml of water at 90 °C. Steep for 2–3 minutes.',
    },
    storage: STORAGE,
    shelfLife: SHELF_LIFE,
    printed: true,
  },
  '8800': {
    code: '8800',
    description: {
      uz: 'Xitoyning Hunan viloyatidagi togʻli hududlarda joylashgan ekologik choy plantatsiyalarida yetishtirilgan yashil choy. Barglari yirik, butun va tabiiy buralgan shaklga ega.',
      ru: 'Зелёный чай, выращенный на экологических чайных плантациях в горных районах провинции Хунань, Китай. Отличается крупными, цельными, естественно скрученными листьями.',
      en: 'A green tea grown on ecological tea plantations in the mountains of Hunan province, China. Its leaves are large, whole and naturally rolled.',
    },
    taste: {
      uz: 'Taʼmi: toʻyingan, tetiklantiruvchi, uzoq saqlanadigan yoqimli shirin taʼmga ega.\nHidi: sof, tabiiy choy ifori.',
      ru: 'Вкус: насыщенный, освежающий, с приятным длительным сладковатым послевкусием.\nАромат: чистый, натуральный чайный аромат.',
      en: 'Taste: full and refreshing, with a pleasant, long-lasting sweet finish.\nAroma: a clean, natural tea aroma.',
    },
    origin: HUNAN,
    brewing: {
      uz: '250 ml suvga 3–5 g choy soling. 85–90°C haroratdagi suvda 2 daqiqa damlang.',
      ru: 'Добавьте 3–5 г чая на 250 мл воды. Заваривайте 2 минуты при температуре 85–90°C.',
      en: 'Add 3–5 g of tea to 250 ml of water. Steep for 2 minutes at 85–90 °C.',
    },
    storage: {
      uz: 'Salqin, quruq joyda, quyosh nuri, namlik va kuchli hidlardan uzoqda, mahkam yopilgan holda saqlang.',
      ru: 'Хранить в плотно закрытой упаковке в прохладном, сухом месте, вдали от солнечного света, влаги и сильных запахов.',
      en: 'Keep tightly closed in a cool, dry place, away from sunlight, moisture and strong odours.',
    },
    shelfLife: {
      uz: 'Tavsiya etilgan sharoitda 24 oy.',
      ru: '24 месяца при соблюдении условий хранения.',
      en: '24 months when stored as recommended.',
    },
    printed: false,
  },
  '8830': {
    code: '8830',
    description: {
      uz: 'Xitoyning Hunan viloyatidagi ekologik choy plantatsiyalarida yetishtirilgan, tabiiy iforini saqlab qolgan yashil choy.',
      ru: 'Зелёный чай, выращенный на экологических чайных плантациях провинции Хунань, Китай, сохранивший естественный аромат свежих чайных листьев.',
      en: 'A green tea grown on ecological tea plantations in Hunan province, China, that keeps the natural aroma of fresh tea leaves.',
    },
    taste: {
      uz: 'Mayin, yumshoq va yoqimli taʼm, yangi choy barglariga xos tabiiy ifor.',
      ru: 'Мягкий, нежный, приятный вкус и свежий натуральный чайный аромат.',
      en: 'A smooth, gentle and pleasant taste with the fresh, natural aroma of tea leaves.',
    },
    origin: HUNAN,
    brewing: BREW_3_5,
    storage: STORAGE,
    shelfLife: SHELF_LIFE,
    printed: true,
  },
  '8009': {
    code: '8009',
    description: {
      uz: 'Xitoyning Hunan viloyatida yetishtirilgan, oʻziga xos qovurilgan iforga ega yashil choy.',
      ru: 'Зелёный чай из провинции Хунань, Китай, с характерным ароматом обжарки.',
      en: 'A green tea from Hunan province, China, with a distinctive roasted aroma.',
    },
    taste: {
      uz: 'Toʻyingan, kuchli taʼm, yoqimli shirin taʼm qoldigʻi va qahvani eslatuvchi qovurilgan ifor.',
      ru: 'Насыщенный, выразительный вкус с приятным сладковатым послевкусием и нотами обжарки, напоминающими кофе.',
      en: 'A full, bold taste with a pleasant sweet finish and roasted notes reminiscent of coffee.',
    },
    origin: HUNAN,
    brewing: BREW_3_5,
    storage: STORAGE,
    shelfLife: SHELF_LIFE,
    printed: true,
  },
};

/** Section labels of the description, as in the owner's texts. */
const LABELS: Localized<{ brewing: string; storage: string; shelfLife: string; pack: string }> = {
  uz: {
    brewing: 'Damlanishi',
    storage: 'Saqlash',
    shelfLife: 'Yaroqlilik muddati',
    pack: 'Xitoy yashil choyi, 400 g zip-paketda',
  },
  ru: {
    brewing: 'Заваривание',
    storage: 'Хранение',
    shelfLife: 'Срок годности',
    pack: 'китайский зелёный чай в зип-пакете 400 г',
  },
  en: {
    brewing: 'Brewing',
    storage: 'Storage',
    shelfLife: 'Shelf life',
    pack: 'a Chinese green tea in a 400 g zip pouch',
  },
};

/** Producer and importer, as printed on the packs (print files of 2026-10-14). */
const PRINTED_BY: Localized<string> = {
  uz: 'Ishlab chiqaruvchi: HUNAN EAST LAND TEA CO., LTD (Yiyang, Hunan viloyati, Xitoy). Import qiluvchi va qadoqlovchi: TERAN TRADE MChJ (Namangan, Oʻzbekiston).',
  ru: 'Производитель: HUNAN EAST LAND TEA CO., LTD (Иян, провинция Хунань, Китай). Импортёр и упаковщик: TERAN TRADE MChJ (Наманган, Узбекистан).',
  en: 'Producer: HUNAN EAST LAND TEA CO., LTD (Yiyang, Hunan province, China). Imported and packed by TERAN TRADE MChJ (Namangan, Uzbekistan).',
};

/** Name, texts and origin of a TERAN tea, built from the owner's description. */
function teranCopy(
  code: string,
): Pick<DemoProduct, 'name' | 'shortDescription' | 'description' | 'tastingNotes' | 'origin'> {
  const tea = TERAN_TEAS[code];
  if (!tea) throw new Error(`No description for TERAN ${code}`);
  const describe = (locale: keyof Localized<string>) => {
    const label = LABELS[locale];
    return [
      `TERAN ${code} — ${label.pack}.`,
      `${label.brewing}: ${tea.brewing[locale]}`,
      `${label.storage}: ${tea.storage[locale]}`,
      `${label.shelfLife}: ${tea.shelfLife[locale]}`,
      ...(tea.printed ? [PRINTED_BY[locale]] : []),
    ].join('\n\n');
  };
  return {
    name: { uz: `TERAN ${code}`, ru: `TERAN ${code}`, en: `TERAN ${code}` },
    shortDescription: tea.description,
    description: { uz: describe('uz'), ru: describe('ru'), en: describe('en') },
    tastingNotes: tea.taste,
    origin: tea.origin,
  };
}

/** The pouch photograph, the back of the pack (where a print file exists) and the cut-out. */
function pouch(code: string, back: boolean): NonNullable<DemoProduct['packaging']> {
  const file = code.toLowerCase();
  return {
    front: `${file}-pack.webp`,
    back: back ? `${file}-back.webp` : null,
    cutout: `${file}-pack-cutout.webp`,
  };
}

/**
 * Exact text written by earlier versions of this seed, so a one-time upgrade can recognise records
 * nobody has edited since (see catalogue.ts).
 */
export const EARLIER_DEMO_COPY: {
  /** In the Uzbek description of the identifier products before the packs were supplied. */
  identifierMarker: string;
  /** In the Uzbek description of the pack products before the owner described the teas. */
  packMarker: string;
  categories: Record<string, Localized<string>[]>;
  collections: Record<string, Localized<string>[]>;
} = {
  identifierMarker: 'Ushbu namoyish saytida u',
  packMarker: 'Namoyish rejimi: tavsif TERAN qadogʻidan olingan',
  categories: {
    tea: [
      {
        uz: 'Qora, yashil, oq choy, ulun va pu-erh — barcha choylar bir joyda.',
        ru: 'Чёрный, зелёный, белый чай, улун и пуэр — все чаи в одном месте.',
        en: 'Black, green and white tea, oolong and pu-erh — every tea in one place.',
      },
    ],
  },
  collections: {
    'teran-premium': [
      {
        uz: 'Har didga oʻziga xos tanlov: XC2025 · G8810 · HET8800 · 8830 · STD8009. Namoyish rejimida choy turlari taxminiy.',
        ru: 'Свой выбор для каждого вкуса: XC2025 · G8810 · HET8800 · 8830 · STD8009. В демо-версии виды чая условные.',
        en: 'A choice for every taste: XC2025 · G8810 · HET8800 · 8830 · STD8009. Tea types in this demo are provisional.',
      },
      {
        uz: 'Har didga oʻziga xos tanlov: XC2025 · G8810 · HET8800 · 8830 · 8009. XC2025, G8810, 8830 va 8009 maʼlumotlari qadoqdan olingan; HET8800 choy turi va barcha narxlar namoyish uchun taxminiy.',
        ru: 'Свой выбор для каждого вкуса: XC2025 · G8810 · HET8800 · 8830 · 8009. Данные XC2025, G8810, 8830 и 8009 взяты с упаковки; вид чая HET8800 и все цены в демо-версии условные.',
        en: 'A choice for every taste: XC2025 · G8810 · HET8800 · 8830 · 8009. XC2025, G8810, 8830 and 8009 are described from their packs; the tea type of HET8800 and all prices are demo placeholders.',
      },
    ],
  },
};

export const DEMO_CATEGORIES: DemoCategory[] = [
  {
    slug: 'tea',
    productType: 'tea',
    illustrationKey: 'green',
    name: { uz: 'Choy', ru: 'Чай', en: 'Tea' },
    description: {
      uz: 'TERAN premium Xitoy yashil choylari: Hunan va Yunnan togʻlaridan, 400 g zip-paketlarda.',
      ru: 'Премиальные китайские зелёные чаи TERAN: из гор Хунани и Юньнани, в зип-пакетах по 400 г.',
      en: 'TERAN premium Chinese green teas from the mountains of Hunan and Yunnan, in 400 g zip pouches.',
    },
  },
  {
    slug: 'black-tea',
    testOnly: true,
    parent: 'tea',
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
    parent: 'tea',
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
    testOnly: true,
    parent: 'tea',
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
    testOnly: true,
    parent: 'tea',
    illustrationKey: 'oolong',
    name: { uz: 'Ulun', ru: 'Улун', en: 'Oolong' },
    description: {
      uz: 'Yashil va qora choy oraligʻidagi ulun choylari.',
      ru: 'Улуны — чаи между зелёным и чёрным.',
      en: 'Oolong teas, between green and black.',
    },
  },
  {
    slug: 'pu-erh',
    testOnly: true,
    parent: 'tea',
    illustrationKey: 'dark',
    name: { uz: 'Pu-erh', ru: 'Пуэр', en: 'Pu-erh' },
    description: {
      uz: 'Fermentlangan pu-erh choylari — bargli va presslangan.',
      ru: 'Ферментированные чаи пуэр — листовые и прессованные.',
      en: 'Fermented pu-erh teas, loose and pressed.',
    },
  },
  ...DEMO_RANGE_CATEGORIES,
  {
    slug: 'gift-sets',
    testOnly: true,
    productType: 'gift-set',
    illustrationKey: 'gift',
    name: { uz: 'Sovgʻa toʻplamlari', ru: 'Подарочные наборы', en: 'Gift sets' },
    description: {
      uz: 'Yaqinlaringiz uchun chiroyli qadoqlangan choy toʻplamlari.',
      ru: 'Красиво упакованные наборы чая для близких.',
      en: 'Beautifully packed tea sets for the people you love.',
    },
  },
  ...DEMO_RANGE_LAST_CATEGORIES,
];

export const DEMO_COLLECTIONS: DemoCategory[] = [
  {
    slug: 'teran-premium',
    illustrationKey: 'gift',
    name: {
      uz: 'TERAN premium kolleksiyasi',
      ru: 'Премиальная коллекция TERAN',
      en: 'TERAN premium collection',
    },
    description: {
      uz: 'Har didga oʻziga xos tanlov: XC2025 · G8810 · 8800 · 8830 · 8009.',
      ru: 'Свой выбор для каждого вкуса: XC2025 · G8810 · 8800 · 8830 · 8009.',
      en: 'A choice for every taste: XC2025 · G8810 · 8800 · 8830 · 8009.',
    },
  },
  {
    slug: 'everyday-classics',
    testOnly: true,
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
    testOnly: true,
    illustrationKey: 'white',
    name: { uz: 'Kechki osoyishtalik', ru: 'Вечерний покой', en: 'Evening calm' },
    description: {
      uz: 'Kechki sokin damlar uchun yumshoq choylar.',
      ru: 'Мягкие чаи для тихого вечера.',
      en: 'Soft teas for a quiet evening.',
    },
  },
  {
    slug: 'gift-ideas',
    testOnly: true,
    illustrationKey: 'gift',
    name: { uz: 'Sovgʻa gʻoyalari', ru: 'Идеи для подарка', en: 'Gift ideas' },
    description: {
      uz: 'Bayram va tashriflar uchun choy sovgʻalari.',
      ru: 'Чайные подарки к праздникам и в гости.',
      en: 'Tea gifts for celebrations and visits.',
    },
  },
  ...DEMO_RANGE_COLLECTIONS,
];

export const DEMO_PRODUCTS: DemoProduct[] = [
  // ─── The five TERAN teas (the owner's descriptions and pouch photographs, 2026-10-17) ───
  {
    slug: 'teran-xc2025',
    category: 'green-tea',
    collections: ['teran-premium'],
    format: 'LOOSE_LEAF',
    featured: true,
    illustrationKey: 'green',
    publishedDaysAgo: 60,
    brewing: { tempC: 80, tempMaxC: 90, minSeconds: 120, maxSeconds: 180, grams: 5 },
    art: { style: 'green', shape: 'box' },
    packaging: pouch('XC2025', true),
    ...teranCopy('XC2025'),
    variants: [
      {
        sku: 'TRN-XC2025-400',
        weightGrams: 400,
        price: '189000',
        stock: 50,
        barcode: '4780179230021',
      },
    ],
  },
  {
    slug: 'teran-g8810',
    category: 'green-tea',
    collections: ['teran-premium'],
    format: 'LOOSE_LEAF',
    featured: true,
    illustrationKey: 'green',
    publishedDaysAgo: 58,
    brewing: { tempC: 90, minSeconds: 120, maxSeconds: 180, grams: 5 },
    art: { style: 'green', shape: 'box' },
    packaging: pouch('G8810', true),
    ...teranCopy('G8810'),
    variants: [
      {
        sku: 'TRN-G8810-400',
        weightGrams: 400,
        price: '179000',
        stock: 50,
        barcode: '4780179230014',
      },
    ],
  },
  {
    // The owner's first list said "HET8800"; the pack, its barcode and description say 8800.
    slug: 'teran-8800',
    formerSlugs: ['teran-het8800'],
    category: 'green-tea',
    collections: ['teran-premium'],
    format: 'LOOSE_LEAF',
    featured: true,
    illustrationKey: 'green',
    publishedDaysAgo: 56,
    brewing: { tempC: 85, tempMaxC: 90, minSeconds: 120, maxSeconds: 120, grams: 3, gramsMax: 5 },
    art: { style: 'green', shape: 'box' },
    packaging: pouch('8800', false),
    ...teranCopy('8800'),
    variants: [
      {
        sku: 'TRN-8800-400',
        weightGrams: 400,
        price: '179000',
        stock: 50,
        barcode: '4780179230045',
      },
    ],
  },
  {
    slug: 'teran-8830',
    category: 'green-tea',
    collections: ['teran-premium'],
    format: 'LOOSE_LEAF',
    featured: true,
    illustrationKey: 'green',
    publishedDaysAgo: 54,
    brewing: { tempC: 85, tempMaxC: 90, minSeconds: 120, maxSeconds: 120, grams: 3, gramsMax: 5 },
    art: { style: 'green', shape: 'box' },
    packaging: pouch('8830', true),
    ...teranCopy('8830'),
    variants: [
      {
        sku: 'TRN-8830-400',
        weightGrams: 400,
        price: '199000',
        stock: 50,
        barcode: '4780179230038',
      },
    ],
  },
  {
    // The owner's first list said "STD8009"; the pack says 8009.
    slug: 'teran-8009',
    formerSlugs: ['teran-std8009'],
    category: 'green-tea',
    collections: ['teran-premium'],
    format: 'LOOSE_LEAF',
    featured: true,
    illustrationKey: 'green',
    publishedDaysAgo: 52,
    brewing: { tempC: 85, tempMaxC: 90, minSeconds: 120, maxSeconds: 120, grams: 3, gramsMax: 5 },
    art: { style: 'green', shape: 'box' },
    packaging: pouch('8009', true),
    ...teranCopy('8009'),
    variants: [
      {
        sku: 'TRN-8009-400',
        formerSkus: ['TRN-STD8009-400'],
        weightGrams: 400,
        price: '159000',
        stock: 50,
        barcode: '4780179230052',
      },
    ],
  },

  // ─── Black tea ───
  {
    slug: 'classic-black-tea',
    testOnly: true,
    category: 'black-tea',
    collections: ['everyday-classics'],
    format: 'LOOSE_LEAF',
    featured: true,
    illustrationKey: 'black',
    publishedDaysAgo: 90,
    brewing: BREW.black,
    art: { style: 'black', shape: 'tin' },
    photo: 'black-leaves',
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
    tastingNotes: NOTES.black,
    variants: [
      { sku: 'TRN-BLK-CLS-100', weightGrams: 100, price: '45000', stock: 48 },
      { sku: 'TRN-BLK-CLS-250', weightGrams: 250, price: '98000', stock: 22 },
    ],
  },
  {
    slug: 'black-tea-bags',
    testOnly: true,
    category: 'black-tea',
    collections: ['everyday-classics'],
    format: 'TEA_BAGS',
    featured: false,
    illustrationKey: 'black',
    publishedDaysAgo: 80,
    brewing: { ...BREW.black, grams: null },
    art: { style: 'black', shape: 'box' },
    photo: 'red-pour',
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
    tastingNotes: NOTES.black,
    variants: [
      { sku: 'TRN-BLK-BAG-25', weightGrams: 50, unitCount: 25, price: '32000', stock: 60 },
      { sku: 'TRN-BLK-BAG-100', weightGrams: 200, unitCount: 100, price: '110000', stock: 15 },
    ],
  },
  {
    slug: 'earl-grey',
    testOnly: true,
    category: 'black-tea',
    collections: [],
    format: 'LOOSE_LEAF',
    featured: false,
    illustrationKey: 'earl-grey',
    publishedDaysAgo: 12,
    brewing: BREW.black,
    art: { style: 'black', shape: 'tin' },
    photo: 'lemon-cups',
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
    tastingNotes: NOTES.earlGrey,
    variants: [
      { sku: 'TRN-EGR-100', weightGrams: 100, price: '52000', compareAtPrice: '58000', stock: 30 },
      { sku: 'TRN-EGR-250', weightGrams: 250, price: '118000', stock: 12 },
    ],
  },

  // ─── Green tea ───
  {
    slug: 'classic-green-tea',
    testOnly: true,
    category: 'green-tea',
    collections: ['everyday-classics'],
    format: 'LOOSE_LEAF',
    featured: true,
    illustrationKey: 'green',
    publishedDaysAgo: 85,
    brewing: BREW.green,
    art: { style: 'green', shape: 'tin' },
    photo: 'green-cup-leaves',
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
    tastingNotes: NOTES.green,
    variants: [
      { sku: 'TRN-GRN-CLS-100', weightGrams: 100, price: '48000', stock: 40 },
      { sku: 'TRN-GRN-CLS-250', weightGrams: 250, price: '105000', stock: 18 },
    ],
  },
  {
    slug: 'jasmine-green-tea',
    testOnly: true,
    category: 'green-tea',
    collections: ['gift-ideas'],
    format: 'LOOSE_LEAF',
    featured: true,
    illustrationKey: 'jasmine',
    publishedDaysAgo: 8,
    brewing: BREW.green,
    art: { style: 'green', shape: 'tin', accent: 'jasmine' },
    photo: 'green-glass',
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
    tastingNotes: NOTES.jasmine,
    variants: [
      { sku: 'TRN-GRN-JAS-100', weightGrams: 100, price: '56000', stock: 3, lowStockThreshold: 5 },
    ],
  },
  {
    slug: 'green-tea-pyramids',
    testOnly: true,
    category: 'green-tea',
    collections: [],
    format: 'PYRAMIDS',
    featured: false,
    illustrationKey: 'green',
    publishedDaysAgo: 40,
    brewing: { ...BREW.green, grams: null },
    art: { style: 'green', shape: 'box' },
    photo: 'green-tray',
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
    tastingNotes: NOTES.green,
    variants: [
      { sku: 'TRN-GRN-PYR-20', weightGrams: 50, unitCount: 20, price: '38000', stock: 35 },
    ],
  },
  {
    slug: 'mint-green-tea',
    testOnly: true,
    category: 'green-tea',
    collections: ['everyday-classics'],
    format: 'LOOSE_LEAF',
    featured: false,
    illustrationKey: 'mint',
    publishedDaysAgo: 60,
    brewing: BREW.green,
    art: { style: 'green', shape: 'tin', accent: 'mint' },
    photo: 'glass-teapot',
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
    tastingNotes: NOTES.mint,
    variants: [{ sku: 'TRN-GRN-MNT-100', weightGrams: 100, price: '50000', stock: 26 }],
  },
  {
    slug: 'spring-green-tea',
    testOnly: true,
    status: 'DRAFT',
    category: 'green-tea',
    collections: [],
    format: 'LOOSE_LEAF',
    featured: false,
    illustrationKey: 'green',
    publishedDaysAgo: 0,
    brewing: BREW.green,
    art: { style: 'green', shape: 'tin' },
    name: { uz: 'Bahorgi yashil choy', ru: 'Весенний зелёный чай', en: 'Spring green tea' },
    shortDescription: {
      uz: 'Hali eʼlon qilinmagan qoralama mahsulot.',
      ru: 'Черновик товара, ещё не опубликован.',
      en: 'A draft product, not yet published.',
    },
    description: {
      uz: 'Bu qoralama namoyish mahsuloti: u faqat admin panelida koʻrinadi. Uni eʼlon qilib, katalogda paydo boʻlishini tekshirish mumkin.',
      ru: 'Это демонстрационный черновик: он виден только в админ-панели. Опубликуйте его, чтобы проверить, как товар появляется в каталоге.',
      en: 'This is a demonstration draft: it is only visible in the admin area. Publish it to see a product appear in the catalogue.',
    },
    tastingNotes: NOTES.green,
    variants: [{ sku: 'TRN-GRN-SPR-100', weightGrams: 100, price: '85000', stock: 20 }],
  },

  // ─── White tea ───
  {
    slug: 'white-tea',
    testOnly: true,
    category: 'white-tea',
    collections: ['gift-ideas', 'evening-calm'],
    format: 'LOOSE_LEAF',
    featured: true,
    illustrationKey: 'white',
    publishedDaysAgo: 30,
    brewing: BREW.white,
    art: { style: 'white', shape: 'tin' },
    photo: 'tea-shoots',
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
    tastingNotes: NOTES.white,
    variants: [
      { sku: 'TRN-WHT-50', weightGrams: 50, price: '75000', stock: 16 },
      { sku: 'TRN-WHT-100', weightGrams: 100, price: '140000', stock: 9 },
    ],
  },

  // ─── Oolong ───
  {
    slug: 'oolong-tea',
    testOnly: true,
    category: 'oolong',
    collections: ['gift-ideas'],
    format: 'LOOSE_LEAF',
    featured: false,
    illustrationKey: 'oolong',
    publishedDaysAgo: 5,
    brewing: BREW.oolong,
    art: { style: 'oolong', shape: 'tin' },
    photo: 'gaiwan-green',
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
    tastingNotes: NOTES.oolong,
    variants: [{ sku: 'TRN-OOL-100', weightGrams: 100, price: '82000', stock: 20 }],
  },
  {
    slug: 'roasted-oolong',
    testOnly: true,
    category: 'oolong',
    collections: ['evening-calm'],
    format: 'LOOSE_LEAF',
    featured: true,
    illustrationKey: 'oolong',
    publishedDaysAgo: 45,
    brewing: BREW.oolong,
    art: { style: 'oolong', shape: 'tin' },
    photo: 'oolong-leaves',
    name: { uz: 'Qovurilgan ulun', ru: 'Улун сильной обжарки', en: 'Roasted oolong' },
    shortDescription: {
      uz: 'Qovurilgan ulun uslubidagi choy.',
      ru: 'Чай в стиле улуна сильной обжарки.',
      en: 'A tea in the roasted oolong style.',
    },
    description: {
      uz: 'Qovurilgan ulunlar odatda iliqroq va chuqurroq taʼmga ega. Uni ham bir necha marta damlash mumkin.\n\nBu namoyish mahsuloti.',
      ru: 'У улунов сильной обжарки обычно более тёплый и глубокий вкус. Его тоже можно заваривать несколько раз.\n\nЭто демонстрационный товар.',
      en: 'Roasted oolongs usually taste warmer and deeper. This one can be steeped several times too.\n\nThis is a demonstration product.',
    },
    tastingNotes: NOTES.roastedOolong,
    variants: [
      { sku: 'TRN-OOL-RST-100', weightGrams: 100, price: '92000', stock: 22 },
      { sku: 'TRN-OOL-RST-250', weightGrams: 250, price: '209000', stock: 6 },
    ],
  },

  // ─── Pu-erh ───
  {
    slug: 'pu-erh-tea',
    testOnly: true,
    category: 'pu-erh',
    collections: ['evening-calm', 'everyday-classics'],
    format: 'LOOSE_LEAF',
    featured: true,
    illustrationKey: 'black',
    publishedDaysAgo: 50,
    brewing: BREW.puerh,
    art: { style: 'puerh', shape: 'tin' },
    photo: 'basket-leaves',
    name: { uz: 'Pu-erh choyi', ru: 'Пуэр', en: 'Pu-erh tea' },
    shortDescription: {
      uz: 'Pu-erh uslubidagi bargli choy.',
      ru: 'Листовой чай в стиле пуэра.',
      en: 'A loose-leaf tea in the pu-erh style.',
    },
    description: {
      uz: 'Pu-erh — fermentlangan choy turi. Bargli pu-erhni oddiy choynakda damlash qulay.\n\nBu namoyish mahsuloti.',
      ru: 'Пуэр — ферментированный вид чая. Рассыпной пуэр удобно заваривать в обычном чайнике.\n\nЭто демонстрационный товар.',
      en: 'Pu-erh is a fermented type of tea. Loose pu-erh is easy to brew in an ordinary teapot.\n\nThis is a demonstration product.',
    },
    tastingNotes: NOTES.puerh,
    variants: [
      { sku: 'TRN-PUE-100', weightGrams: 100, price: '69000', stock: 28 },
      { sku: 'TRN-PUE-250', weightGrams: 250, price: '154000', stock: 10 },
    ],
  },
  {
    slug: 'mini-pu-erh',
    testOnly: true,
    category: 'pu-erh',
    collections: [],
    format: 'LOOSE_LEAF',
    featured: false,
    illustrationKey: 'black',
    publishedDaysAgo: 15,
    brewing: { ...BREW.puerh, grams: null },
    art: { style: 'puerh', shape: 'box' },
    photo: 'dark-plates-2',
    name: { uz: 'Mini pu-erh', ru: 'Мини-пуэр', en: 'Mini pu-erh' },
    shortDescription: {
      uz: 'Bir damlamalik presslangan pu-erh boʻlakchalari.',
      ru: 'Прессованные порции пуэра на одну заварку.',
      en: 'Pressed pu-erh portions, one per pot.',
    },
    description: {
      uz: 'Har bir boʻlakcha — bitta choynak uchun. Sindirish yoki tortish shart emas.\n\nBu namoyish mahsuloti («mavjud emas» holatini koʻrsatish uchun).',
      ru: 'Каждая порция — на один чайник: ничего не нужно отламывать или взвешивать.\n\nЭто демонстрационный товар (показывает состояние «нет в наличии»).',
      en: 'Each portion makes one pot, with nothing to break off or weigh.\n\nThis is a demonstration product (it demonstrates the out-of-stock state).',
    },
    tastingNotes: NOTES.puerh,
    variants: [
      { sku: 'TRN-PUE-MINI-20', weightGrams: 100, unitCount: 20, price: '74000', stock: 0 },
    ],
  },

  // ─── Gift sets ───
  {
    slug: 'gift-set-trio',
    testOnly: true,
    category: 'gift-sets',
    collections: ['gift-ideas'],
    format: 'GIFT_SET',
    featured: true,
    illustrationKey: 'gift',
    publishedDaysAgo: 20,
    brewing: null,
    art: { style: 'gift', shape: 'gift' },
    photo: 'gift-boxes-black',
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
  {
    slug: 'gift-set-duo',
    testOnly: true,
    category: 'gift-sets',
    collections: ['gift-ideas'],
    format: 'GIFT_SET',
    featured: false,
    illustrationKey: 'gift',
    publishedDaysAgo: 18,
    brewing: null,
    art: { style: 'gift', shape: 'gift' },
    photo: 'gift-box-white',
    name: {
      uz: 'Sovgʻa toʻplami: yashil va oq choy',
      ru: 'Подарочный набор: зелёный и белый чай',
      en: 'Gift set: green and white tea',
    },
    shortDescription: {
      uz: 'Ikki xil choydan iborat ixcham sovgʻa.',
      ru: 'Небольшой подарок из двух видов чая.',
      en: 'A small gift of two teas.',
    },
    description: {
      uz: 'Yashil va oq choy — ikki banka bitta chiroyli qutida.\n\nBu namoyish mahsuloti: toʻplam tarkibi TERAN tomonidan tasdiqlanishi kerak.',
      ru: 'Зелёный и белый чай — две банки в одной красивой коробке.\n\nЭто демонстрационный товар: состав набора должен быть подтверждён TERAN.',
      en: 'Green and white tea: two tins in one handsome box.\n\nThis is a demonstration product: the set contents must be confirmed by TERAN.',
    },
    variants: [{ sku: 'TRN-GFT-DUO', weightGrams: null, unitCount: 2, price: '150000', stock: 14 }],
  },
  {
    slug: 'teran-premium-gift-box',
    testOnly: true,
    category: 'gift-sets',
    collections: ['gift-ideas'],
    format: 'GIFT_SET',
    featured: true,
    illustrationKey: 'gift',
    publishedDaysAgo: 2,
    brewing: null,
    art: { style: 'gift', shape: 'gift' },
    // No photograph: a stock gift box under TERAN's name would read as TERAN's own packaging.
    name: {
      uz: 'TERAN premium: sovgʻa qutisi',
      ru: 'TERAN premium: подарочная коробка',
      en: 'TERAN premium gift box',
    },
    shortDescription: {
      uz: 'Premium kolleksiyadagi beshta choy — bitta sovgʻa qutisida.',
      ru: 'Пять чаёв премиальной коллекции в одной подарочной коробке.',
      en: 'Five teas from the premium collection in one gift box.',
    },
    description: {
      uz: 'Premium kolleksiyaning beshta choyi kichik bankalarda, bitta sovgʻa qutisida.\n\nBu namoyish mahsuloti: toʻplam tarkibi, narx va qadoq TERAN tomonidan tasdiqlanishi kerak.',
      ru: 'Пять чаёв премиальной коллекции в маленьких банках, в одной подарочной коробке.\n\nЭто демонстрационный товар: состав набора, цена и упаковка должны быть подтверждены TERAN.',
      en: 'The five teas of the premium collection in small tins, in one gift box.\n\nThis is a demonstration product: the contents, price and packaging must be confirmed by TERAN.',
    },
    variants: [
      {
        sku: 'TRN-GFT-PREMIUM-5',
        weightGrams: 125,
        unitCount: 5,
        price: '349000',
        compareAtPrice: '389000',
        stock: 12,
        lowStockThreshold: 3,
      },
    ],
  },
  ...DEMO_RANGE_PRODUCTS,
];

// ─── Product types and attributes ──────────────────────────────────────────

export interface DemoAttribute {
  key: string;
  kind: 'SELECT' | 'MULTI_SELECT' | 'BOOLEAN' | 'NUMBER';
  isFilterable: boolean;
  /** Unit of a NUMBER attribute ("ml"). */
  unit?: string;
  label: Localized<string>;
  options?: { key: string; label: Localized<string> }[];
}

export interface DemoProductType {
  key: string;
  name: Localized<string>;
  /** Products of the type have brewing guidance and a caffeine level. */
  brewingGuide: boolean;
  attributes: DemoAttribute[];
}

/**
 * Product types used by the demonstration catalogue: tea and gift sets, which TERAN sells, and the
 * infusion, drink and teaware types of the wider demonstration range (demo-range.ts), which only
 * exist where that range is loaded. Real types are created in the admin area.
 */
export const DEMO_PRODUCT_TYPES: DemoProductType[] = [
  {
    key: 'tea',
    name: { uz: 'Choy', ru: 'Чай', en: 'Tea' },
    brewingGuide: true,
    attributes: [
      {
        key: 'leaf-style',
        kind: 'SELECT',
        isFilterable: true,
        label: { uz: 'Barg shakli', ru: 'Форма листа', en: 'Leaf style' },
        options: [
          { key: 'whole-leaf', label: { uz: 'Butun barg', ru: 'Цельный лист', en: 'Whole leaf' } },
          {
            key: 'rolled',
            label: { uz: 'Oʻralgan barg', ru: 'Скрученный лист', en: 'Rolled leaf' },
          },
          { key: 'compressed', label: { uz: 'Presslangan', ru: 'Прессованный', en: 'Compressed' } },
          { key: 'cut', label: { uz: 'Maydalangan barg', ru: 'Резаный лист', en: 'Cut leaf' } },
          { key: 'powder', label: { uz: 'Kukun', ru: 'Порошок', en: 'Powder' } },
        ],
      },
      FLAVOUR_ATTRIBUTE,
      {
        key: 'flavoured',
        kind: 'BOOLEAN',
        isFilterable: true,
        label: { uz: 'Xushboʻy qoʻshimchali', ru: 'Ароматизированный', en: 'Flavoured' },
      },
    ],
  },
  {
    key: 'gift-set',
    name: { uz: 'Sovgʻa toʻplami', ru: 'Подарочный набор', en: 'Gift set' },
    brewingGuide: false,
    attributes: [
      {
        key: 'teas-in-set',
        kind: 'NUMBER',
        isFilterable: false,
        label: { uz: 'Toʻplamdagi choylar', ru: 'Чаёв в наборе', en: 'Teas in the set' },
      },
    ],
  },
  ...DEMO_RANGE_PRODUCT_TYPES,
];

/** The product type of a demo product, from its category. */
export function demoProductType(product: Pick<DemoProduct, 'category'>): string {
  if (product.category === 'gift-sets') return 'gift-set';
  return DEMO_RANGE_TYPES_BY_CATEGORY[product.category] ?? 'tea';
}

/**
 * DEMONSTRATION attribute values, typical of each demo product's style (a jasmine tea is scented,
 * a mini pu-erh is pressed) or taken from the demo product itself (the number of teas in a set).
 * The five TERAN identifier products get only the taste notes of the owner's own descriptions
 * (demo-range.ts): nothing else is claimed about the real TERAN teas.
 */
const BASE_ATTRIBUTE_VALUES: Record<string, Record<string, string | boolean | number>> = {
  'classic-black-tea': { 'leaf-style': 'whole-leaf', flavoured: false },
  'black-tea-bags': { 'leaf-style': 'cut', flavoured: false },
  'earl-grey': { 'leaf-style': 'whole-leaf', flavoured: true },
  'classic-green-tea': { 'leaf-style': 'whole-leaf', flavoured: false },
  'jasmine-green-tea': { 'leaf-style': 'whole-leaf', flavoured: true },
  'green-tea-pyramids': { 'leaf-style': 'whole-leaf', flavoured: false },
  'mint-green-tea': { 'leaf-style': 'whole-leaf', flavoured: true },
  'spring-green-tea': { 'leaf-style': 'whole-leaf', flavoured: false },
  'white-tea': { 'leaf-style': 'whole-leaf', flavoured: false },
  'oolong-tea': { 'leaf-style': 'rolled', flavoured: false },
  'roasted-oolong': { 'leaf-style': 'rolled', flavoured: false },
  'pu-erh-tea': { 'leaf-style': 'whole-leaf', flavoured: false },
  'mini-pu-erh': { 'leaf-style': 'compressed', flavoured: false },
  'gift-set-trio': { 'teas-in-set': 3 },
  'gift-set-duo': { 'teas-in-set': 2 },
  'teran-premium-gift-box': { 'teas-in-set': 5 },
};

export type DemoAttributeValue = string | boolean | number | string[];

/** Every demonstration attribute value, per product slug. */
export const DEMO_ATTRIBUTE_VALUES: Record<
  string,
  Record<string, DemoAttributeValue>
> = Object.fromEntries(
  [
    ...new Set([
      ...Object.keys(BASE_ATTRIBUTE_VALUES),
      ...Object.keys(DEMO_RANGE_ATTRIBUTE_VALUES),
    ]),
  ].map((slug) => [slug, { ...BASE_ATTRIBUTE_VALUES[slug], ...DEMO_RANGE_ATTRIBUTE_VALUES[slug] }]),
);

/** Caffeine of demonstration products: their own `caffeine`, or the generic range's table. */
export function demoCaffeine(product: Pick<DemoProduct, 'slug' | 'caffeine' | 'testOnly'>) {
  if (!product.testOnly) return null;
  return product.caffeine ?? DEMO_RANGE_CAFFEINE[product.slug] ?? null;
}

/**
 * Demo products, categories and collections from earlier versions of this file. The guarded demo
 * reset removes them too, so an older demo database ends up with exactly the current catalogue.
 */
export const RETIRED_DEMO = {
  products: ['mountain-herbs', 'chamomile-infusion', 'rosehip-hibiscus', 'berry-infusion'],
  categories: ['herbal', 'fruit'],
  collections: [] as string[],
} as const;
