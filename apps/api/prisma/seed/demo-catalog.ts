/**
 * DEMONSTRATION CATALOGUE — NOT VERIFIED TERAN PRODUCT DATA.
 *
 * A coherent range of Chinese tea styles with neutral copy and placeholder prices, so the
 * storefront and the admin area can be demonstrated end to end.
 *
 * - The five collection identifiers (XC2025, G8810, HET8800, 8830, 8009) were supplied by TERAN.
 *   Four of them have packaging (print files supplied 2026-10-14): their tea type, pack size,
 *   brewing, descriptions, storage, shelf life and producer are taken from the pack, and their
 *   images are renders of the pack. Their prices and stock are still placeholders. HET8800 has no
 *   packaging yet: its tea type, description, price and pack sizes are invented and say so.
 *   Deliberately not taken from the packs: the health benefits list and the nutrition table
 *   (claims that need the owner's confirmation before they are published online).
 * - Tasting notes describe what is typical of a tea style, not a verified product.
 * - Deliberately absent: origins, ingredients, caffeine levels, certifications, health claims
 *   and reviews. Those must come from TERAN.
 * - Brewing values are general guidance for each tea type.
 *
 * Replace everything here with verified data before launch (docs/demo-mode.md).
 */
import type { ArtAccent, ArtStyle, PackShape } from './demo-art.js';

export interface Localized<T> {
  uz: T;
  ru: T;
  en: T;
}

export interface DemoCategory {
  slug: string;
  /** Top-level category this one belongs to (categories have two levels). */
  parent?: string;
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
  /** DRAFT products exist only in the admin area (e.g. to demonstrate publishing). */
  status?: 'ACTIVE' | 'DRAFT';
  category: string;
  collections: string[];
  format: 'LOOSE_LEAF' | 'TEA_BAGS' | 'PYRAMIDS' | 'GIFT_SET';
  featured: boolean;
  illustrationKey: string;
  publishedDaysAgo: number;
  brewing: { tempC: number; minSeconds: number; maxSeconds: number; grams: number | null } | null;
  art: { style: ArtStyle; shape: PackShape; accent?: ArtAccent };
  /**
   * Images rendered from the real pack (assets/packaging, made by
   * apps/web/scripts/packaging); used instead of the code-drawn art.
   */
  packaging?: { front: string; back: string };
  name: Localized<string>;
  shortDescription: Localized<string>;
  description: Localized<string>;
  tastingNotes?: Localized<string>;
  /** Only where TERAN has stated it (on the pack). */
  origin?: Localized<string>;
  variants: DemoVariant[];
}

/** As printed on TERAN's green tea packs: 5 g per 250 ml (1:50), 90 °C, 2–3 minutes. */
const PACK_BREW = { tempC: 90, minSeconds: 120, maxSeconds: 180, grams: 5 };

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

type ProposedStyle = 'black';

/**
 * How an identifier without packaging (HET8800) is presented in the demo: a proposed tea type and
 * general advice for it.
 */
const PROPOSED: Record<ProposedStyle, { label: Localized<string>; advice: Localized<string> }> = {
  black: {
    label: { uz: 'qora choy', ru: 'чёрный чай', en: 'a black tea' },
    advice: {
      uz: 'Qora choy uchun yangi qaynagan suv mos keladi; uni sof holda yoki sut bilan ichish mumkin. Bu sahifadagi damlash tavsiyasi choy turi uchun umumiy maslahat.',
      ru: 'Чёрному чаю подходит свежий кипяток; его пьют в чистом виде или с молоком. Рекомендации по завариванию на этой странице — общие советы для этого вида чая.',
      en: 'Black tea suits freshly boiled water and can be enjoyed plain or with milk. The brewing guidance on this page is general advice for the tea type.',
    },
  },
};

/** Name and copy for an identifier whose real tea type is not known yet. */
function identifierCopy(
  code: string,
  style: ProposedStyle,
): Pick<DemoProduct, 'name' | 'shortDescription' | 'description'> {
  const { label, advice } = PROPOSED[style];
  return {
    name: { uz: `TERAN ${code}`, ru: `TERAN ${code}`, en: `TERAN ${code}` },
    shortDescription: {
      uz: `Namoyish: ${label.uz} sifatida koʻrsatilgan.`,
      ru: `Демо: показан как ${label.ru}.`,
      en: `Demo listing, shown as ${label.en}.`,
    },
    description: {
      uz: `${code} — TERAN premium kolleksiyasining identifikatorlaridan biri. Ushbu namoyish saytida u ${label.uz} sifatida koʻrsatilgan: choy turi, tavsif, narx va qadoq hajmlari taxminiy boʻlib, haqiqiy TERAN mahsuloti haqidagi maʼlumot emas.\n\n${advice.uz}`,
      ru: `${code} — один из идентификаторов премиальной коллекции TERAN. На этом демонстрационном сайте он показан как ${label.ru}: вид чая, описание, цена и фасовка условные и не являются сведениями о настоящем продукте TERAN.\n\n${advice.ru}`,
      en: `${code} is one of the identifiers of the TERAN premium collection. On this demonstration site it is shown as ${label.en}: the tea type, this description, the price and the pack sizes are placeholders, not information about the actual TERAN product.\n\n${advice.en}`,
    },
  };
}

/** The TERAN pack's product sentence for each identifier (Uzbek as printed; ru/en translated). */
const PACK_SENTENCES: Record<string, Localized<string>> = {
  XC2025: {
    uz: 'Xitoyning Hunan viloyatidagi tumanli togʻlarda yetishtirilgan, ingichka va zich buralgan bargli yashil choy.',
    ru: 'Зелёный чай из тонких, плотно скрученных листьев, выращенный в туманных горах провинции Хунань (Китай).',
    en: 'A green tea of thin, tightly rolled leaves, grown in the misty mountains of Hunan province, China.',
  },
  '8009': {
    uz: 'Xitoyning Hunan viloyatida yetishtirilgan, oʻziga xos qovurilgan iforga ega yashil choy.',
    ru: 'Зелёный чай с характерным обжаренным ароматом, выращенный в провинции Хунань (Китай).',
    en: 'A green tea with a distinctive roasted aroma, grown in Hunan province, China.',
  },
  G8810: {
    uz: 'Xitoyning Yunnan viloyatidagi baland togʻli choy plantatsiyalarida yetishtirilgan, nafis bargli yashil choy.',
    ru: 'Зелёный чай из нежного листа, выращенный на высокогорных чайных плантациях провинции Юньнань (Китай).',
    en: 'A delicate-leaf green tea, grown on high-mountain tea plantations in Yunnan province, China.',
  },
  '8830': {
    uz: 'Xitoyning Hunan viloyatidagi ekologik choy plantatsiyalarida yetishtirilgan, tabiiy iforini saqlab qolgan yashil choy.',
    ru: 'Зелёный чай, сохранивший естественный аромат, выращенный на экологических чайных плантациях провинции Хунань (Китай).',
    en: 'A green tea that keeps its natural aroma, grown on ecological tea plantations in Hunan province, China.',
  },
};

/** "Taʼmi, hidi va oʻziga xos xususiyatlari" — the same on every pack (its first two sentences). */
const PACK_TASTE: Localized<string> = {
  uz: 'Mayin va tetiklantiruvchi taʼmi, har bir chashkadan keyin uzoq saqlanadigan yoqimli shirin taʼm. Yengil va tabiiy hidli.',
  ru: 'Мягкий, бодрящий вкус с приятной сладостью, которая долго остаётся после каждой чашки. Лёгкий естественный аромат.',
  en: 'A smooth, refreshing taste with a pleasant sweetness that lingers after every cup. A light, natural aroma.',
};

const CHINA: Localized<string> = { uz: 'Xitoy', ru: 'Китай', en: 'China' };

/**
 * Copy for an identifier that has packaging: everything from the pack (storage, shelf life,
 * producer and importer included), plus one line saying what is still a placeholder.
 */
function packagedCopy(
  code: string,
): Pick<DemoProduct, 'name' | 'shortDescription' | 'description' | 'tastingNotes' | 'origin'> {
  const sentence = PACK_SENTENCES[code];
  if (!sentence) throw new Error(`No packaging copy for ${code}`);
  return {
    name: { uz: `TERAN ${code}`, ru: `TERAN ${code}`, en: `TERAN ${code}` },
    shortDescription: sentence,
    description: {
      uz: `${code} — Xitoy yashil choyi, 400 g qadoqda.\n\nSaqlash: quruq, salqin va quyosh nurlaridan himoyalangan joyda, mahkam yopilgan holda saqlang. Yaroqlilik muddati: 24 oy.\n\nIshlab chiqaruvchi: HUNAN EAST LAND TEA CO., LTD (Yiyang, Hunan viloyati, Xitoy). Import qiluvchi va qadoqlovchi: TERAN TRADE MChJ (Namangan, Oʻzbekiston).\n\nNamoyish rejimi: tavsif TERAN qadogʻidan olingan; narx va qoldiq taxminiy.`,
      ru: `${code} — китайский зелёный чай в упаковке 400 г.\n\nХранение: в сухом прохладном месте, защищённом от солнечных лучей, в плотно закрытой упаковке. Срок годности: 24 месяца.\n\nПроизводитель: HUNAN EAST LAND TEA CO., LTD (Иян, провинция Хунань, Китай). Импортёр и упаковщик: TERAN TRADE MChJ (Наманган, Узбекистан).\n\nДемонстрационный режим: описание взято с упаковки TERAN; цена и остаток условные.`,
      en: `${code} is a Chinese green tea in a 400 g pack.\n\nStorage: keep tightly closed in a dry, cool place away from sunlight. Shelf life: 24 months.\n\nProducer: HUNAN EAST LAND TEA CO., LTD (Yiyang, Hunan province, China). Imported and packed by TERAN TRADE MChJ (Namangan, Uzbekistan).\n\nDemonstration mode: this description is taken from the TERAN pack; the price and stock are placeholders.`,
    },
    tastingNotes: PACK_TASTE,
    origin: CHINA,
  };
}

/**
 * Exact text written by earlier versions of this seed, so a one-time upgrade can recognise records
 * nobody has edited since (see upgradeToPackaging in catalogue.ts).
 */
export const EARLIER_DEMO_COPY: {
  identifierMarker: string;
  collections: Record<string, Localized<string>>;
} = {
  /** In the Uzbek description of every identifier product before the packs were supplied. */
  identifierMarker: 'Ushbu namoyish saytida u',
  collections: {
    'teran-premium': {
      uz: 'Har didga oʻziga xos tanlov: XC2025 · G8810 · HET8800 · 8830 · STD8009. Namoyish rejimida choy turlari taxminiy.',
      ru: 'Свой выбор для каждого вкуса: XC2025 · G8810 · HET8800 · 8830 · STD8009. В демо-версии виды чая условные.',
      en: 'A choice for every taste: XC2025 · G8810 · HET8800 · 8830 · STD8009. Tea types in this demo are provisional.',
    },
  },
};

export const DEMO_CATEGORIES: DemoCategory[] = [
  {
    slug: 'tea',
    illustrationKey: 'green',
    name: { uz: 'Choy', ru: 'Чай', en: 'Tea' },
    description: {
      uz: 'Qora, yashil, oq choy, ulun va pu-erh — barcha choylar bir joyda.',
      ru: 'Чёрный, зелёный, белый чай, улун и пуэр — все чаи в одном месте.',
      en: 'Black, green and white tea, oolong and pu-erh — every tea in one place.',
    },
  },
  {
    slug: 'black-tea',
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
    parent: 'tea',
    // No dedicated pu-erh illustration exists yet; the black-tea artwork is the closest match.
    illustrationKey: 'black',
    name: { uz: 'Pu-erh', ru: 'Пуэр', en: 'Pu-erh' },
    description: {
      uz: 'Fermentlangan pu-erh choylari — bargli va presslangan.',
      ru: 'Ферментированные чаи пуэр — листовые и прессованные.',
      en: 'Fermented pu-erh teas, loose and pressed.',
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
    slug: 'teran-premium',
    illustrationKey: 'gift',
    name: {
      uz: 'TERAN premium kolleksiyasi',
      ru: 'Премиальная коллекция TERAN',
      en: 'TERAN premium collection',
    },
    description: {
      uz: 'Har didga oʻziga xos tanlov: XC2025 · G8810 · HET8800 · 8830 · 8009. XC2025, G8810, 8830 va 8009 maʼlumotlari qadoqdan olingan; HET8800 choy turi va barcha narxlar namoyish uchun taxminiy.',
      ru: 'Свой выбор для каждого вкуса: XC2025 · G8810 · HET8800 · 8830 · 8009. Данные XC2025, G8810, 8830 и 8009 взяты с упаковки; вид чая HET8800 и все цены в демо-версии условные.',
      en: 'A choice for every taste: XC2025 · G8810 · HET8800 · 8830 · 8009. XC2025, G8810, 8830 and 8009 are described from their packs; the tea type of HET8800 and all prices are demo placeholders.',
    },
  },
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
  // ─── TERAN premium collection: four identifiers described from their packs, HET8800 a demo ───
  {
    slug: 'teran-xc2025',
    category: 'green-tea',
    collections: ['teran-premium'],
    format: 'LOOSE_LEAF',
    featured: true,
    illustrationKey: 'green',
    publishedDaysAgo: 30,
    brewing: PACK_BREW,
    art: { style: 'green', shape: 'box' },
    packaging: { front: 'xc2025-front.webp', back: 'xc2025-back.webp' },
    ...packagedCopy('XC2025'),
    variants: [{ sku: 'TRN-XC2025-400', weightGrams: 400, price: '189000', stock: 24 }],
  },
  {
    slug: 'teran-g8810',
    category: 'green-tea',
    collections: ['teran-premium'],
    format: 'LOOSE_LEAF',
    featured: true,
    illustrationKey: 'green',
    publishedDaysAgo: 36,
    brewing: PACK_BREW,
    art: { style: 'green', shape: 'box' },
    packaging: { front: 'g8810-front.webp', back: 'g8810-back.webp' },
    ...packagedCopy('G8810'),
    variants: [{ sku: 'TRN-G8810-400', weightGrams: 400, price: '179000', stock: 30 }],
  },
  {
    slug: 'teran-het8800',
    category: 'black-tea',
    collections: ['teran-premium'],
    format: 'LOOSE_LEAF',
    featured: false,
    illustrationKey: 'black',
    publishedDaysAgo: 34,
    brewing: BREW.black,
    art: { style: 'black', shape: 'box' },
    ...identifierCopy('HET8800', 'black'),
    variants: [
      { sku: 'TRN-HET8800-100', weightGrams: 100, price: '89000', stock: 40 },
      { sku: 'TRN-HET8800-250', weightGrams: 250, price: '198000', stock: 18 },
    ],
  },
  {
    slug: 'teran-8830',
    category: 'green-tea',
    collections: ['teran-premium'],
    format: 'LOOSE_LEAF',
    featured: true,
    illustrationKey: 'green',
    publishedDaysAgo: 28,
    brewing: PACK_BREW,
    art: { style: 'green', shape: 'box' },
    packaging: { front: '8830-front.webp', back: '8830-back.webp' },
    ...packagedCopy('8830'),
    variants: [{ sku: 'TRN-8830-400', weightGrams: 400, price: '199000', stock: 12 }],
  },
  {
    // The slug and SKUs keep "std8009" from the first list of identifiers; the pack says 8009.
    slug: 'teran-std8009',
    category: 'green-tea',
    collections: ['teran-premium'],
    format: 'LOOSE_LEAF',
    featured: true,
    illustrationKey: 'green',
    publishedDaysAgo: 26,
    brewing: PACK_BREW,
    art: { style: 'green', shape: 'box' },
    packaging: { front: '8009-front.webp', back: '8009-back.webp' },
    ...packagedCopy('8009'),
    variants: [
      {
        sku: 'TRN-STD8009-400',
        weightGrams: 400,
        price: '159000',
        stock: 7,
        lowStockThreshold: 5,
      },
    ],
  },

  // ─── Black tea ───
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
    tastingNotes: NOTES.black,
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
    tastingNotes: NOTES.black,
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
    tastingNotes: NOTES.earlGrey,
    variants: [
      { sku: 'TRN-EGR-100', weightGrams: 100, price: '52000', compareAtPrice: '58000', stock: 30 },
      { sku: 'TRN-EGR-250', weightGrams: 250, price: '118000', stock: 12 },
    ],
  },

  // ─── Green tea ───
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
    tastingNotes: NOTES.green,
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
    tastingNotes: NOTES.jasmine,
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
    tastingNotes: NOTES.green,
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
    tastingNotes: NOTES.mint,
    variants: [{ sku: 'TRN-GRN-MNT-100', weightGrams: 100, price: '50000', stock: 26 }],
  },
  {
    slug: 'spring-green-tea',
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
    tastingNotes: NOTES.white,
    variants: [
      { sku: 'TRN-WHT-50', weightGrams: 50, price: '75000', stock: 16 },
      { sku: 'TRN-WHT-100', weightGrams: 100, price: '140000', stock: 9 },
    ],
  },

  // ─── Oolong ───
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
    tastingNotes: NOTES.oolong,
    variants: [{ sku: 'TRN-OOL-100', weightGrams: 100, price: '82000', stock: 20 }],
  },
  {
    slug: 'roasted-oolong',
    category: 'oolong',
    collections: ['evening-calm'],
    format: 'LOOSE_LEAF',
    featured: true,
    illustrationKey: 'oolong',
    publishedDaysAgo: 45,
    brewing: BREW.oolong,
    art: { style: 'oolong', shape: 'tin' },
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
    category: 'pu-erh',
    collections: ['evening-calm', 'everyday-classics'],
    format: 'LOOSE_LEAF',
    featured: true,
    illustrationKey: 'black',
    publishedDaysAgo: 50,
    brewing: BREW.puerh,
    art: { style: 'puerh', shape: 'tin' },
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
    category: 'pu-erh',
    collections: [],
    format: 'LOOSE_LEAF',
    featured: false,
    illustrationKey: 'black',
    publishedDaysAgo: 15,
    brewing: { ...BREW.puerh, grams: null },
    art: { style: 'puerh', shape: 'box' },
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
  {
    slug: 'gift-set-duo',
    category: 'gift-sets',
    collections: ['gift-ideas'],
    format: 'GIFT_SET',
    featured: false,
    illustrationKey: 'gift',
    publishedDaysAgo: 18,
    brewing: null,
    art: { style: 'gift', shape: 'gift' },
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
    category: 'gift-sets',
    collections: ['gift-ideas'],
    format: 'GIFT_SET',
    featured: true,
    illustrationKey: 'gift',
    publishedDaysAgo: 2,
    brewing: null,
    art: { style: 'gift', shape: 'gift' },
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
];

// ─── Product types and attributes ──────────────────────────────────────────

export interface DemoAttribute {
  key: string;
  kind: 'SELECT' | 'BOOLEAN' | 'NUMBER';
  isFilterable: boolean;
  label: Localized<string>;
  options?: { key: string; label: Localized<string> }[];
}

export interface DemoProductType {
  key: string;
  name: Localized<string>;
  attributes: DemoAttribute[];
}

/**
 * Product types used by the demonstration catalogue. Only the kinds of product the shop sells
 * today exist: tea and gift sets. Further types (coffee, sweets, accessories) are created in the
 * admin area when TERAN sells them; nothing hypothetical is seeded.
 */
export const DEMO_PRODUCT_TYPES: DemoProductType[] = [
  {
    key: 'tea',
    name: { uz: 'Choy', ru: 'Чай', en: 'Tea' },
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
        ],
      },
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
    attributes: [
      {
        key: 'teas-in-set',
        kind: 'NUMBER',
        isFilterable: false,
        label: { uz: 'Toʻplamdagi choylar', ru: 'Чаёв в наборе', en: 'Teas in the set' },
      },
    ],
  },
];

/** The product type of a demo product, from its category. */
export function demoProductType(product: Pick<DemoProduct, 'category'>): string {
  return product.category === 'gift-sets' ? 'gift-set' : 'tea';
}

/**
 * DEMONSTRATION attribute values, typical of each demo product's style (a jasmine tea is scented,
 * a mini pu-erh is pressed) or taken from the demo product itself (the number of teas in a set).
 * The five TERAN identifier products get none: nothing is claimed about the real TERAN teas.
 */
export const DEMO_ATTRIBUTE_VALUES: Record<string, Record<string, string | boolean | number>> = {
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

/**
 * Demo products, categories and collections from earlier versions of this file. The guarded demo
 * reset removes them too, so an older demo database ends up with exactly the current catalogue.
 */
export const RETIRED_DEMO = {
  products: ['mountain-herbs', 'chamomile-infusion', 'rosehip-hibiscus', 'berry-infusion'],
  categories: ['herbal', 'fruit'],
  collections: [] as string[],
} as const;
