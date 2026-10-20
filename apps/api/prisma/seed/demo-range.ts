/**
 * The wider DEMONSTRATION range (2026-10-20): what a TERAN tea house could carry around its teas —
 * matcha, infusions of flowers and fruit, iced tea, water, juices, teaware and a discovery box —
 * so the storefront can be shown and tested as a whole beverage store.
 *
 * Every entry here is `testOnly`: loaded only with SEED_TEST_CATALOGUE=true and archived
 * everywhere else, like the generic tea range (docs/development/demo-mode.md). TERAN sells none of
 * it today; every description says so in all three languages, prices are invented, and nothing
 * claims an origin, a certification, a health effect or a sales figure. Where a value is typical
 * of a style (an infusion of flowers has no tea leaves), it is general knowledge, not a TERAN
 * statement. Volumes are a typed attribute of the "drink" product type, so the variants of a drink
 * count bottles and cans.
 */
import type { DemoCategory, DemoProduct, DemoProductType, Localized } from './demo-catalog.js';

const DEMO: Localized<string> = {
  uz: 'Bu namoyish mahsuloti.',
  ru: 'Это демонстрационный товар.',
  en: 'This is a demonstration product.',
};

/** Joins a description and the demonstration notice, per language. */
function described(text: Localized<string>): Localized<string> {
  return {
    uz: `${text.uz}\n\n${DEMO.uz}`,
    ru: `${text.ru}\n\n${DEMO.ru}`,
    en: `${text.en}\n\n${DEMO.en}`,
  };
}

/** Top-level categories (and their subcategories) placed between "Tea" and "Gift sets". */
export const DEMO_RANGE_CATEGORIES: DemoCategory[] = [
  {
    slug: 'matcha',
    testOnly: true,
    productType: 'tea',
    illustrationKey: 'matcha',
    name: { uz: 'Matcha', ru: 'Матча', en: 'Matcha' },
    description: {
      uz: 'Kukun holidagi yashil choy: piyolada koʻpirtiriladi yoki latte qilinadi.',
      ru: 'Порошковый зелёный чай: его взбивают в пиале или готовят латте.',
      en: 'Powdered green tea, whisked in a bowl or made into a latte.',
    },
  },
  {
    slug: 'infusions',
    testOnly: true,
    productType: 'infusion',
    illustrationKey: 'herbal',
    name: { uz: 'Damlamalar', ru: 'Травяные чаи', en: 'Infusions' },
    description: {
      uz: 'Gullar, mevalar va xushboʻy oʻtlardan tayyorlangan damlamalar.',
      ru: 'Настои из цветов, фруктов и душистых трав.',
      en: 'Blends of flowers, fruit and fragrant herbs.',
    },
  },
  {
    slug: 'drinks',
    testOnly: true,
    productType: 'drink',
    illustrationKey: 'iced',
    name: { uz: 'Sovuq ichimliklar', ru: 'Холодные напитки', en: 'Cold drinks' },
    description: {
      uz: 'Sovuq choy, suv va sharbatlar — dasturxon va yoʻl uchun.',
      ru: 'Холодный чай, вода и соки — к столу и в дорогу.',
      en: 'Iced tea, water and juices for the table and the road.',
    },
  },
  {
    slug: 'iced-tea',
    testOnly: true,
    parent: 'drinks',
    illustrationKey: 'iced',
    name: { uz: 'Sovuq choy', ru: 'Холодный чай', en: 'Iced tea' },
    description: {
      uz: 'Sovuq damlangan va gazli choylar — shisha va bankalarda.',
      ru: 'Чай холодного заваривания и игристый чай — в бутылках и банках.',
      en: 'Cold-brewed and sparkling teas in bottles and cans.',
    },
  },
  {
    slug: 'water',
    testOnly: true,
    parent: 'drinks',
    illustrationKey: 'water',
    name: { uz: 'Suv', ru: 'Вода', en: 'Water' },
    description: {
      uz: 'Gazsiz va gazli suv — shisha idishlarda.',
      ru: 'Негазированная и газированная вода — в стеклянных бутылках.',
      en: 'Still and sparkling water in glass bottles.',
    },
  },
  {
    slug: 'juice',
    testOnly: true,
    parent: 'drinks',
    illustrationKey: 'juice',
    name: { uz: 'Sharbatlar', ru: 'Соки', en: 'Juices' },
    description: {
      uz: 'Anor, olma va behi sharbatlari — choy dasturxoniga hamroh.',
      ru: 'Гранатовый, яблочный и айвовый соки — к чайному столу.',
      en: 'Pomegranate, apple and quince juices to sit beside the tea.',
    },
  },
  {
    slug: 'teaware',
    testOnly: true,
    productType: 'teaware',
    illustrationKey: 'teaware',
    name: { uz: 'Choy idishlari', ru: 'Чайная посуда', en: 'Teaware' },
    description: {
      uz: 'Choynak, gaivan va piyolalar — choyni damlash va uzatish uchun.',
      ru: 'Чайники, гайвани и пиалы — чтобы заварить и подать чай.',
      en: 'Teapots, gaiwans and piyolas to brew and serve.',
    },
  },
];

export const DEMO_RANGE_COLLECTIONS: DemoCategory[] = [
  {
    slug: 'autumn-table',
    testOnly: true,
    illustrationKey: 'oolong',
    name: { uz: 'Kuzgi dasturxon', ru: 'Осенний стол', en: 'Autumn table' },
    description: {
      uz: 'Iliq, qovurilgan va mevali taʼmlar — kuz kechlari uchun tanlov.',
      ru: 'Тёплые, обжаренные и фруктовые вкусы для осенних вечеров.',
      en: 'Warm, roasted and fruity tastes for autumn evenings.',
    },
  },
  {
    slug: 'for-guests',
    testOnly: true,
    illustrationKey: 'teaware',
    name: { uz: 'Mehmonlar kelganda', ru: 'Когда приходят гости', en: 'When guests come' },
    description: {
      uz: 'Katta dasturxon uchun choylar, piyolalar, sharbatlar va suv.',
      ru: 'Чаи, пиалы, соки и вода для большого стола.',
      en: 'Teas, piyolas, juices and water for a full table.',
    },
  },
];

/** The "flavour" attribute (taste notes), shared by the tea and infusion product types. */
export const FLAVOUR_ATTRIBUTE = {
  key: 'flavour',
  kind: 'MULTI_SELECT' as const,
  isFilterable: true,
  label: { uz: 'Taʼm', ru: 'Вкус', en: 'Taste' },
  options: [
    {
      key: 'fresh',
      label: { uz: 'Yangi, oʻtsimon', ru: 'Свежий, травянистый', en: 'Fresh and green' },
    },
    { key: 'sweet', label: { uz: 'Shirin', ru: 'Сладкий', en: 'Sweet' } },
    { key: 'floral', label: { uz: 'Gulli', ru: 'Цветочный', en: 'Floral' } },
    { key: 'fruity', label: { uz: 'Mevali', ru: 'Фруктовый', en: 'Fruity' } },
    { key: 'citrus', label: { uz: 'Sitrusli', ru: 'Цитрусовый', en: 'Citrus' } },
    { key: 'tart', label: { uz: 'Nordon', ru: 'С кислинкой', en: 'Tart' } },
    { key: 'minty', label: { uz: 'Yalpizli', ru: 'Мятный', en: 'Minty' } },
    { key: 'toasty', label: { uz: 'Qovurilgan', ru: 'Обжаренный', en: 'Roasted' } },
    { key: 'earthy', label: { uz: 'Tuproqsimon', ru: 'Землистый', en: 'Earthy' } },
  ],
};

/** Product types the range needs beyond "tea" and "gift-set". */
export const DEMO_RANGE_PRODUCT_TYPES: DemoProductType[] = [
  {
    key: 'infusion',
    name: { uz: 'Damlama', ru: 'Настой', en: 'Infusion' },
    brewingGuide: true,
    attributes: [FLAVOUR_ATTRIBUTE],
  },
  {
    key: 'drink',
    name: { uz: 'Ichimlik', ru: 'Напиток', en: 'Drink' },
    brewingGuide: false,
    attributes: [
      FLAVOUR_ATTRIBUTE,
      {
        key: 'sparkling',
        kind: 'BOOLEAN',
        isFilterable: true,
        label: { uz: 'Gazli', ru: 'Газированный', en: 'Sparkling' },
      },
      {
        key: 'volume',
        kind: 'NUMBER',
        isFilterable: false,
        unit: 'ml',
        label: { uz: 'Hajmi', ru: 'Объём', en: 'Volume' },
      },
    ],
  },
  {
    key: 'teaware',
    name: { uz: 'Choy idishi', ru: 'Чайная посуда', en: 'Teaware' },
    brewingGuide: false,
    attributes: [
      {
        key: 'material',
        kind: 'SELECT',
        isFilterable: true,
        label: { uz: 'Material', ru: 'Материал', en: 'Material' },
        options: [
          { key: 'porcelain', label: { uz: 'Chinni', ru: 'Фарфор', en: 'Porcelain' } },
          { key: 'glass', label: { uz: 'Shisha', ru: 'Стекло', en: 'Glass' } },
          { key: 'clay', label: { uz: 'Loy', ru: 'Глина', en: 'Clay' } },
          { key: 'bamboo', label: { uz: 'Bambuk', ru: 'Бамбук', en: 'Bamboo' } },
          { key: 'metal', label: { uz: 'Metall', ru: 'Металл', en: 'Metal' } },
        ],
      },
      {
        key: 'capacity',
        kind: 'NUMBER',
        isFilterable: false,
        unit: 'ml',
        label: { uz: 'Sigʻimi', ru: 'Объём', en: 'Capacity' },
      },
    ],
  },
];

/** Product type of a category of the range (subcategories inherit from their parent). */
export const DEMO_RANGE_TYPES_BY_CATEGORY: Record<string, string> = {
  matcha: 'tea',
  infusions: 'infusion',
  drinks: 'drink',
  'iced-tea': 'drink',
  water: 'drink',
  juice: 'drink',
  teaware: 'teaware',
};

const INFUSION_BREW = { tempC: 95, minSeconds: 300, maxSeconds: 420, grams: 2.5 } as const;
const MATCHA_BREW = { tempC: 80, minSeconds: 30, maxSeconds: 60, grams: 2 } as const;

export const DEMO_RANGE_PRODUCTS: DemoProduct[] = [
  // ─── Matcha ───
  {
    slug: 'ceremonial-matcha',
    testOnly: true,
    category: 'matcha',
    collections: ['autumn-table'],
    format: 'OTHER',
    featured: true,
    illustrationKey: 'matcha',
    publishedDaysAgo: 12,
    caffeine: 'HIGH',
    brewing: MATCHA_BREW,
    art: { style: 'matcha', shape: 'matcha' },
    photo: 'matcha-bowl',
    name: { uz: 'Tantanali matcha', ru: 'Церемониальная матча', en: 'Ceremonial matcha' },
    shortDescription: {
      uz: 'Yorqin yashil, mayin kukun — koʻpirtirib ichish uchun.',
      ru: 'Яркий зелёный тонкий порошок — для взбитой матчи.',
      en: 'A bright green, fine powder for whisked matcha.',
    },
    description: described({
      uz: 'Kukunni piyolaga elab, ozgina iliq suv bilan koʻpirtirgichda koʻpik hosil boʻlguncha aralashtiring. Sof holda iching yoki sut bilan latte qiling.',
      ru: 'Просейте порошок в пиалу и взбейте венчиком с небольшим количеством тёплой воды до пены. Пейте в чистом виде или готовьте латте с молоком.',
      en: 'Sift the powder into a bowl and whisk it with a little warm water until it foams. Drink it as it is, or make a latte with milk.',
    }),
    tastingNotes: {
      uz: 'Uslubga xos: yumshoq, biroz shirin va oʻtsimon taʼm.',
      ru: 'Типично для стиля: мягкий, сладковатый, травянистый вкус.',
      en: 'Typical of the style: smooth, gently sweet and grassy.',
    },
    variants: [{ sku: 'TRN-MAT-CER-30', weightGrams: 30, price: '245000', stock: 24 }],
  },
  {
    slug: 'everyday-matcha',
    testOnly: true,
    category: 'matcha',
    collections: [],
    format: 'OTHER',
    featured: false,
    illustrationKey: 'matcha',
    publishedDaysAgo: 30,
    caffeine: 'HIGH',
    brewing: MATCHA_BREW,
    art: { style: 'matcha', shape: 'matcha' },
    photo: 'matcha-powder',
    name: { uz: 'Kundalik matcha', ru: 'Матча на каждый день', en: 'Everyday matcha' },
    shortDescription: {
      uz: 'Latte va ichimliklar uchun quyuqroq taʼmli matcha.',
      ru: 'Матча с более насыщенным вкусом — для латте и напитков.',
      en: 'A bolder matcha for lattes and drinks.',
    },
    description: described({
      uz: 'Sut bilan latte, muzli matcha yoki pishiriqlar uchun. Bir piyolaga 2 g kukun yetarli.',
      ru: 'Для латте, матчи со льдом и выпечки. На одну чашку достаточно 2 г.',
      en: 'For lattes, iced matcha and baking. 2 g is enough for a cup.',
    }),
    tastingNotes: {
      uz: 'Uslubga xos: toʻyimli, oʻtsimon taʼm, yengil achchiqlik bilan.',
      ru: 'Типично для стиля: насыщенный травянистый вкус с лёгкой горчинкой.',
      en: 'Typical of the style: full and grassy, with a light bitterness.',
    },
    variants: [{ sku: 'TRN-MAT-DAY-100', weightGrams: 100, price: '165000', stock: 40 }],
  },

  // ─── Infusions ───
  {
    slug: 'chamomile-apple',
    testOnly: true,
    category: 'infusions',
    collections: [],
    format: 'LOOSE_LEAF',
    featured: false,
    illustrationKey: 'herbal',
    publishedDaysAgo: 20,
    caffeine: 'NONE',
    brewing: INFUSION_BREW,
    art: { style: 'herbal', shape: 'tin', accent: 'chamomile' },
    photo: 'chamomile',
    name: { uz: 'Moychechak va olma', ru: 'Ромашка и яблоко', en: 'Chamomile and apple' },
    shortDescription: {
      uz: 'Moychechak gullari va quritilgan olma boʻlakchalari.',
      ru: 'Цветки ромашки и кусочки сушёного яблока.',
      en: 'Chamomile flowers with pieces of dried apple.',
    },
    description: described({
      uz: 'Kechki choy uchun yumshoq damlama: moychechak, quritilgan olma va melissa. Qaynoq suvda 5–7 daqiqa damlang.',
      ru: 'Мягкий настой для вечера: ромашка, сушёное яблоко и мелисса. Заваривайте кипятком 5–7 минут.',
      en: 'A soft blend for the evening: chamomile, dried apple and lemon balm. Steep in boiling water for 5–7 minutes.',
    }),
    ingredients: {
      uz: 'Moychechak, quritilgan olma, melissa.',
      ru: 'Ромашка, сушёное яблоко, мелисса.',
      en: 'Chamomile, dried apple, lemon balm.',
    },
    tastingNotes: {
      uz: 'Uslubga xos: gulli, mayin va biroz shirin.',
      ru: 'Типично для стиля: цветочный, мягкий и сладковатый.',
      en: 'Typical of the style: floral, mellow and lightly sweet.',
    },
    variants: [{ sku: 'TRN-INF-CHA-80', weightGrams: 80, price: '58000', stock: 36 }],
  },
  {
    slug: 'hibiscus-pomegranate',
    testOnly: true,
    category: 'infusions',
    collections: ['autumn-table', 'for-guests'],
    format: 'LOOSE_LEAF',
    featured: true,
    illustrationKey: 'fruit',
    publishedDaysAgo: 8,
    caffeine: 'NONE',
    brewing: { tempC: 95, minSeconds: 300, maxSeconds: 480, grams: 3 },
    art: { style: 'fruit', shape: 'tin', accent: 'hibiscus' },
    photo: 'hibiscus',
    name: { uz: 'Karkade va anor', ru: 'Каркаде и гранат', en: 'Hibiscus and pomegranate' },
    shortDescription: {
      uz: 'Yorqin qizil, nordon-shirin damlama — issiq yoki muz bilan.',
      ru: 'Ярко-красный кисло-сладкий настой — горячим или со льдом.',
      en: 'A ruby, sweet-tart infusion, hot or over ice.',
    },
    description: described({
      uz: 'Karkade gulbarglari, quritilgan anor donlari va olma. Issiq iching yoki sovutib, muz bilan uzating.',
      ru: 'Лепестки каркаде, сушёные зёрна граната и яблоко. Пейте горячим или охладите и подайте со льдом.',
      en: 'Hibiscus petals, dried pomegranate seeds and apple. Drink it hot, or chill it and pour over ice.',
    }),
    ingredients: {
      uz: 'Karkade, quritilgan anor donlari, olma.',
      ru: 'Каркаде, сушёные зёрна граната, яблоко.',
      en: 'Hibiscus, dried pomegranate seeds, apple.',
    },
    tastingNotes: {
      uz: 'Uslubga xos: nordon, mevali va yorqin.',
      ru: 'Типично для стиля: кисловатый, фруктовый, яркий.',
      en: 'Typical of the style: tart, fruity and bright.',
    },
    variants: [
      {
        sku: 'TRN-INF-HIB-100',
        weightGrams: 100,
        price: '62000',
        compareAtPrice: '69000',
        stock: 30,
      },
    ],
  },
  {
    slug: 'mint-lemongrass',
    testOnly: true,
    category: 'infusions',
    collections: [],
    format: 'LOOSE_LEAF',
    featured: false,
    illustrationKey: 'mint',
    publishedDaysAgo: 40,
    caffeine: 'NONE',
    brewing: { tempC: 95, minSeconds: 300, maxSeconds: 420, grams: 2 },
    art: { style: 'herbal', shape: 'tin', accent: 'mint' },
    photo: 'mint-tea',
    name: { uz: 'Yalpiz va limon oʻti', ru: 'Мята и лемонграсс', en: 'Mint and lemongrass' },
    shortDescription: {
      uz: 'Salqin yalpiz va limon oʻti — tetiklantiruvchi damlama.',
      ru: 'Прохладная мята и лемонграсс — освежающий настой.',
      en: 'Cool mint and lemongrass, a bright and refreshing cup.',
    },
    description: described({
      uz: 'Ovqatdan keyin yoki kunduzi ichish uchun yengil damlama. Issiq va sovuq holda ham yaxshi.',
      ru: 'Лёгкий настой после еды или днём. Хорош и горячим, и холодным.',
      en: 'A light cup after a meal or in the afternoon. Good hot or cold.',
    }),
    ingredients: {
      uz: 'Yalpiz, limon oʻti.',
      ru: 'Мята, лемонграсс.',
      en: 'Mint, lemongrass.',
    },
    tastingNotes: {
      uz: 'Uslubga xos: salqin, sitrusli va toza.',
      ru: 'Типично для стиля: прохладный, цитрусовый, чистый.',
      en: 'Typical of the style: cool, citrusy and clean.',
    },
    variants: [
      {
        sku: 'TRN-INF-MNT-60',
        weightGrams: 60,
        price: '54000',
        stock: 3,
        lowStockThreshold: 5,
      },
    ],
  },
  {
    slug: 'rosehip-quince',
    testOnly: true,
    category: 'infusions',
    collections: ['autumn-table'],
    format: 'PYRAMIDS',
    featured: false,
    illustrationKey: 'fruit',
    publishedDaysAgo: 5,
    caffeine: 'NONE',
    brewing: { tempC: 95, minSeconds: 420, maxSeconds: 600, grams: null },
    art: { style: 'fruit', shape: 'box', accent: 'rosehip' },
    photo: 'rosehip',
    name: { uz: 'Naʼmatak va behi', ru: 'Шиповник и айва', en: 'Rosehip and quince' },
    shortDescription: {
      uz: 'Naʼmatak va behi — kuz kechlari uchun iliq damlama, piramidachalarda.',
      ru: 'Шиповник и айва — тёплый настой для осенних вечеров, в пирамидках.',
      en: 'Rosehip and quince in pyramids, a warm cup for autumn evenings.',
    },
    description: described({
      uz: 'Bitta piramidachani 300 ml qaynoq suvda 7–10 daqiqa damlang. Asal bilan ham yaxshi.',
      ru: 'Заваривайте одну пирамидку в 300 мл кипятка 7–10 минут. Хорош с мёдом.',
      en: 'Steep one pyramid in 300 ml of boiling water for 7–10 minutes. Lovely with honey.',
    }),
    ingredients: {
      uz: 'Naʼmatak, quritilgan behi, olma.',
      ru: 'Шиповник, сушёная айва, яблоко.',
      en: 'Rosehip, dried quince, apple.',
    },
    tastingNotes: {
      uz: 'Uslubga xos: mevali, nordon-shirin va iliq.',
      ru: 'Типично для стиля: фруктовый, кисло-сладкий, тёплый.',
      en: 'Typical of the style: fruity, sweet-tart and warming.',
    },
    variants: [
      { sku: 'TRN-INF-ROS-15', weightGrams: 45, unitCount: 15, price: '49000', stock: 28 },
    ],
  },

  // ─── Iced tea ───
  {
    slug: 'jasmine-cold-brew',
    testOnly: true,
    category: 'iced-tea',
    collections: ['for-guests'],
    format: 'OTHER',
    featured: true,
    illustrationKey: 'iced',
    publishedDaysAgo: 6,
    caffeine: 'LOW',
    brewing: null,
    art: { style: 'iced', shape: 'bottle' },
    photo: 'iced-jasmine',
    name: {
      uz: 'Yasminli sovuq choy, 330 ml',
      ru: 'Холодный чай с жасмином, 330 мл',
      en: 'Jasmine cold-brew tea, 330 ml',
    },
    shortDescription: {
      uz: 'Sovuq suvda sekin damlangan yashil choy, yasmin iforli.',
      ru: 'Зелёный чай с жасмином, медленно заваренный в холодной воде.',
      en: 'Green tea slowly steeped in cold water, scented with jasmine.',
    },
    description: described({
      uz: 'Shisha idishda, sovutib iching. Ochilgandan keyin muzlatgichda saqlang va bir kunda iching.',
      ru: 'В стеклянной бутылке, пейте охлаждённым. После открытия храните в холодильнике и выпейте за день.',
      en: 'In a glass bottle, best served cold. Once opened, keep it in the fridge and finish it within a day.',
    }),
    ingredients: {
      uz: 'Suv, yashil choy, yasmin gullari.',
      ru: 'Вода, зелёный чай, цветки жасмина.',
      en: 'Water, green tea, jasmine flowers.',
    },
    tastingNotes: {
      uz: 'Uslubga xos: gulli, yengil va toza.',
      ru: 'Типично для стиля: цветочный, лёгкий, чистый.',
      en: 'Typical of the style: floral, light and clean.',
    },
    variants: [
      { sku: 'TRN-ICE-JAS-330', weightGrams: null, unitCount: 1, price: '19000', stock: 60 },
      { sku: 'TRN-ICE-JAS-330X6', weightGrams: null, unitCount: 6, price: '105000', stock: 12 },
    ],
  },
  {
    slug: 'iced-peach-oolong',
    testOnly: true,
    category: 'iced-tea',
    collections: [],
    format: 'OTHER',
    featured: false,
    illustrationKey: 'iced',
    publishedDaysAgo: 15,
    caffeine: 'LOW',
    brewing: null,
    art: { style: 'peach', shape: 'bottle' },
    photo: 'iced-peach',
    name: {
      uz: 'Shaftolili sovuq ulun, 330 ml',
      ru: 'Холодный улун с персиком, 330 мл',
      en: 'Iced peach oolong, 330 ml',
    },
    shortDescription: {
      uz: 'Ulun choyi va shaftoli sharbati — yengil shirin, sovuq holda.',
      ru: 'Улун с персиковым соком — слегка сладкий, охлаждённый.',
      en: 'Oolong with a touch of peach juice, lightly sweet and chilled.',
    },
    description: described({
      uz: 'Shisha idishda. Sovutib, muz bilan uzating.',
      ru: 'В стеклянной бутылке. Подавайте охлаждённым, со льдом.',
      en: 'In a glass bottle. Serve chilled, over ice.',
    }),
    ingredients: {
      uz: 'Suv, ulun choyi, shaftoli sharbati, shakar.',
      ru: 'Вода, улун, персиковый сок, сахар.',
      en: 'Water, oolong tea, peach juice, sugar.',
    },
    tastingNotes: {
      uz: 'Uslubga xos: mevali, gulli va yumshoq.',
      ru: 'Типично для стиля: фруктовый, цветочный, мягкий.',
      en: 'Typical of the style: fruity, floral and smooth.',
    },
    variants: [
      { sku: 'TRN-ICE-PCH-330', weightGrams: null, unitCount: 1, price: '21000', stock: 40 },
    ],
  },
  {
    slug: 'sparkling-black-tea-lemon',
    testOnly: true,
    category: 'iced-tea',
    collections: ['for-guests'],
    format: 'OTHER',
    featured: false,
    illustrationKey: 'iced',
    publishedDaysAgo: 25,
    caffeine: 'MEDIUM',
    brewing: null,
    art: { style: 'sparkling', shape: 'can' },
    photo: 'sparkling-tea',
    name: {
      uz: 'Limonli gazli qora choy, 250 ml',
      ru: 'Игристый чёрный чай с лимоном, 250 мл',
      en: 'Sparkling black tea with lemon, 250 ml',
    },
    shortDescription: {
      uz: 'Gazli qora choy, limon sharbati bilan — bankada.',
      ru: 'Игристый чёрный чай с лимонным соком — в банке.',
      en: 'Sparkling black tea with lemon juice, in a can.',
    },
    description: described({
      uz: 'Yaxshilab sovutib, bankadan yoki muzli stakandan iching.',
      ru: 'Хорошо охладите и пейте из банки или из стакана со льдом.',
      en: 'Serve well chilled, straight from the can or over ice.',
    }),
    ingredients: {
      uz: 'Gazlangan suv, qora choy, limon sharbati, shakar.',
      ru: 'Газированная вода, чёрный чай, лимонный сок, сахар.',
      en: 'Carbonated water, black tea, lemon juice, sugar.',
    },
    tastingNotes: {
      uz: 'Uslubga xos: sitrusli, tetik va toza.',
      ru: 'Типично для стиля: цитрусовый, бодрый, чистый.',
      en: 'Typical of the style: citrusy, brisk and clean.',
    },
    variants: [
      { sku: 'TRN-ICE-SPK-250', weightGrams: null, unitCount: 1, price: '17000', stock: 0 },
    ],
  },

  // ─── Water ───
  {
    slug: 'still-water',
    testOnly: true,
    category: 'water',
    collections: ['for-guests'],
    format: 'OTHER',
    featured: false,
    illustrationKey: 'water',
    publishedDaysAgo: 50,
    caffeine: 'NONE',
    brewing: null,
    art: { style: 'water', shape: 'bottle' },
    photo: 'still-water',
    name: {
      uz: 'Gazsiz suv, 500 ml',
      ru: 'Вода негазированная, 500 мл',
      en: 'Still water, 500 ml',
    },
    shortDescription: {
      uz: 'Shisha idishda gazsiz ichimlik suvi.',
      ru: 'Негазированная питьевая вода в стеклянной бутылке.',
      en: 'Still drinking water in a glass bottle.',
    },
    description: described({
      uz: 'Dasturxon va choy damlash uchun. Shisha idish, qayta yopiladigan qopqoq.',
      ru: 'К столу и для заваривания чая. Стеклянная бутылка с крышкой.',
      en: 'For the table and for brewing tea. A glass bottle with a screw cap.',
    }),
    variants: [
      { sku: 'TRN-WTR-STL-500', weightGrams: null, unitCount: 1, price: '9000', stock: 80 },
      { sku: 'TRN-WTR-STL-500X12', weightGrams: null, unitCount: 12, price: '96000', stock: 10 },
    ],
  },
  {
    slug: 'sparkling-water',
    testOnly: true,
    category: 'water',
    collections: [],
    format: 'OTHER',
    featured: false,
    illustrationKey: 'water',
    publishedDaysAgo: 45,
    caffeine: 'NONE',
    brewing: null,
    art: { style: 'sparkling', shape: 'bottle' },
    photo: 'sparkling-water',
    name: {
      uz: 'Gazli suv, 500 ml',
      ru: 'Вода газированная, 500 мл',
      en: 'Sparkling water, 500 ml',
    },
    shortDescription: {
      uz: 'Mayda pufakchali gazli suv, shisha idishda.',
      ru: 'Газированная вода с мелкими пузырьками, в стекле.',
      en: 'Finely sparkling water in a glass bottle.',
    },
    description: described({
      uz: 'Sovutib iching yoki anor sharbati bilan aralashtiring.',
      ru: 'Пейте охлаждённой или смешайте с гранатовым соком.',
      en: 'Drink it chilled, or top up a glass of pomegranate juice.',
    }),
    variants: [
      { sku: 'TRN-WTR-SPK-500', weightGrams: null, unitCount: 1, price: '10000', stock: 70 },
    ],
  },

  // ─── Juices ───
  {
    slug: 'pomegranate-juice',
    testOnly: true,
    category: 'juice',
    collections: ['autumn-table', 'for-guests'],
    format: 'OTHER',
    featured: true,
    illustrationKey: 'juice',
    publishedDaysAgo: 10,
    caffeine: 'NONE',
    brewing: null,
    art: { style: 'pomegranate', shape: 'bottle' },
    photo: 'pomegranate-juice',
    name: {
      uz: 'Anor sharbati, 750 ml',
      ru: 'Гранатовый сок, 750 мл',
      en: 'Pomegranate juice, 750 ml',
    },
    shortDescription: {
      uz: 'Toʻq qizil, nordon-shirin anor sharbati — shisha idishda.',
      ru: 'Тёмно-красный кисло-сладкий гранатовый сок — в стекле.',
      en: 'Deep red, sweet-tart pomegranate juice in a glass bottle.',
    },
    description: described({
      uz: 'Sovutib iching yoki gazli suv bilan aralashtiring. Ochilgandan keyin muzlatgichda saqlang.',
      ru: 'Пейте охлаждённым или смешайте с газированной водой. После открытия храните в холодильнике.',
      en: 'Drink it chilled or lengthen it with sparkling water. Keep it in the fridge once opened.',
    }),
    ingredients: { uz: 'Anor sharbati.', ru: 'Гранатовый сок.', en: 'Pomegranate juice.' },
    tastingNotes: {
      uz: 'Uslubga xos: nordon-shirin va toʻyimli.',
      ru: 'Типично для стиля: кисло-сладкий, насыщенный.',
      en: 'Typical of the style: sweet-tart and full.',
    },
    variants: [
      { sku: 'TRN-JCE-POM-750', weightGrams: null, unitCount: 1, price: '39000', stock: 35 },
    ],
  },
  {
    slug: 'apple-quince-juice',
    testOnly: true,
    category: 'juice',
    collections: [],
    format: 'OTHER',
    featured: false,
    illustrationKey: 'juice',
    publishedDaysAgo: 35,
    caffeine: 'NONE',
    brewing: null,
    art: { style: 'apple', shape: 'carton' },
    photo: 'apple-juice',
    name: {
      uz: 'Olma va behi sharbati, 1 l',
      ru: 'Сок яблоко и айва, 1 л',
      en: 'Apple and quince juice, 1 l',
    },
    shortDescription: {
      uz: 'Olma va behi sharbati, bir litrlik qutida.',
      ru: 'Сок из яблока и айвы в литровом пакете.',
      en: 'Apple and quince juice in a one-litre carton.',
    },
    description: described({
      uz: 'Nonushta va bolalar dasturxoni uchun yumshoq sharbat. Ochilgandan keyin muzlatgichda saqlang.',
      ru: 'Мягкий сок к завтраку и для детского стола. После открытия храните в холодильнике.',
      en: 'A gentle juice for breakfast and the children’s end of the table. Keep it in the fridge once opened.',
    }),
    ingredients: {
      uz: 'Olma sharbati, behi pyuresi.',
      ru: 'Яблочный сок, пюре айвы.',
      en: 'Apple juice, quince purée.',
    },
    tastingNotes: {
      uz: 'Uslubga xos: shirin, mevali va yumshoq.',
      ru: 'Типично для стиля: сладкий, фруктовый, мягкий.',
      en: 'Typical of the style: sweet, fruity and soft.',
    },
    variants: [
      { sku: 'TRN-JCE-APQ-1000', weightGrams: null, unitCount: 1, price: '28000', stock: 45 },
    ],
  },

  // ─── Teaware ───
  {
    slug: 'glass-teapot',
    testOnly: true,
    category: 'teaware',
    collections: ['for-guests'],
    format: 'ACCESSORY',
    featured: true,
    illustrationKey: 'teaware',
    publishedDaysAgo: 18,
    brewing: null,
    art: { style: 'glass', shape: 'teapot' },
    photo: 'glass-teapot',
    name: {
      uz: 'Shisha choynak, 600 ml',
      ru: 'Стеклянный чайник, 600 мл',
      en: 'Glass teapot, 600 ml',
    },
    shortDescription: {
      uz: 'Olinadigan sitechkali shisha choynak.',
      ru: 'Стеклянный чайник со съёмным ситечком.',
      en: 'A glass teapot with a removable infuser.',
    },
    description: described({
      uz: 'Barglar qanday ochilishini koʻrish uchun shisha choynak. Choy kuchayib ketmasligi uchun sitechkani oling.',
      ru: 'Стеклянный чайник, чтобы видеть, как раскрываются листья. Выньте ситечко, чтобы чай не перестоял.',
      en: 'A glass teapot for watching the leaves open. Lift out the infuser so the tea never stews.',
    }),
    variants: [
      { sku: 'TRN-WRE-GTP-600', weightGrams: null, unitCount: 1, price: '185000', stock: 14 },
    ],
  },
  {
    slug: 'porcelain-gaiwan',
    testOnly: true,
    category: 'teaware',
    collections: [],
    format: 'ACCESSORY',
    featured: false,
    illustrationKey: 'teaware',
    publishedDaysAgo: 28,
    brewing: null,
    art: { style: 'porcelain', shape: 'gaiwan' },
    photo: 'gaiwan-green',
    name: {
      uz: 'Chinni gaivan, 150 ml',
      ru: 'Фарфоровая гайвань, 150 мл',
      en: 'Porcelain gaiwan, 150 ml',
    },
    shortDescription: {
      uz: 'Qisqa-qisqa damlash uchun qopqoqli piyola.',
      ru: 'Чашка с крышкой — для коротких проливов.',
      en: 'A lidded bowl for short, repeated steeps.',
    },
    description: described({
      uz: 'Gaivanda choy qisqa-qisqa damlanadi: har gal taʼm oʻzgaradi. Barglarni qopqoq bilan ushlab, choyni piyolaga quying.',
      ru: 'В гайвани чай заваривают короткими проливами: вкус меняется от пролива к проливу. Придерживая листья крышкой, перелейте чай в пиалу.',
      en: 'A gaiwan brews tea in short steeps, so the taste changes from one to the next. Hold the leaves back with the lid as you pour.',
    }),
    variants: [
      { sku: 'TRN-WRE-GWN-150', weightGrams: null, unitCount: 1, price: '120000', stock: 9 },
    ],
  },
  {
    slug: 'piyola-set',
    testOnly: true,
    category: 'teaware',
    collections: ['for-guests', 'autumn-table'],
    format: 'ACCESSORY',
    featured: true,
    illustrationKey: 'teaware',
    publishedDaysAgo: 3,
    brewing: null,
    art: { style: 'porcelain', shape: 'piyola' },
    photo: 'piyola-set',
    name: { uz: 'Piyolalar toʻplami', ru: 'Набор пиал', en: 'Set of piyolas' },
    shortDescription: {
      uz: 'Oltin hoshiyali oltita chinni piyola, 180 ml dan.',
      ru: 'Шесть фарфоровых пиал с золотой каймой, по 180 мл.',
      en: 'Six porcelain piyolas with a gold rim, 180 ml each.',
    },
    description: described({
      uz: 'Oʻzbek dasturxonining piyolalari: mehmonga choyni yarim piyoladan quyib uzatish uchun.',
      ru: 'Пиалы узбекского дастархана: чтобы подавать гостю чай, наливая по полпиалы.',
      en: 'The bowls of the Uzbek table, for pouring a guest half a piyola at a time.',
    }),
    variants: [
      { sku: 'TRN-WRE-PYL-6', weightGrams: null, unitCount: 6, price: '210000', stock: 11 },
    ],
  },

  {
    slug: 'cold-brew-green-tea',
    testOnly: true,
    category: 'iced-tea',
    collections: [],
    format: 'OTHER',
    featured: false,
    illustrationKey: 'iced',
    publishedDaysAgo: 2,
    caffeine: 'LOW',
    brewing: null,
    art: { style: 'iced', shape: 'bottle' },
    photo: 'iced-green-tea',
    name: {
      uz: 'Sovuq damlangan yashil choy, 1 l',
      ru: 'Зелёный чай холодного заваривания, 1 л',
      en: 'Cold-brew green tea, 1 l',
    },
    shortDescription: {
      uz: 'Yengil, yangi taʼmli sovuq yashil choy — shisha idishda.',
      ru: 'Лёгкий свежий холодный зелёный чай — в стеклянной бутылке.',
      en: 'A light, fresh cold green tea in a glass bottle.',
    },
    description: described({
      uz: 'Yashil choy barglari sovuq suvda uzoq damlanadi: taʼmi yumshoq, achchiqligi kam boʻladi. Sovutib iching.',
      ru: 'Листья зелёного чая долго настаиваются в холодной воде: вкус получается мягким, почти без горечи. Пейте охлаждённым.',
      en: 'Green tea leaves steep slowly in cold water, so the taste is soft and barely bitter. Drink it chilled.',
    }),
    ingredients: {
      uz: 'Suv, yashil choy.',
      ru: 'Вода, зелёный чай.',
      en: 'Water, green tea.',
    },
    variants: [
      { sku: 'TRN-ICE-GRN-1000', weightGrams: null, unitCount: 1, price: '34000', stock: 25 },
    ],
  },
  {
    slug: 'apricot-nectar',
    testOnly: true,
    category: 'juice',
    collections: ['for-guests'],
    format: 'OTHER',
    featured: false,
    illustrationKey: 'juice',
    publishedDaysAgo: 6,
    caffeine: 'NONE',
    brewing: null,
    art: { style: 'peach', shape: 'bottle' },
    photo: 'apricot-juice',
    name: { uz: 'Oʻrik nektari, 1 l', ru: 'Абрикосовый нектар, 1 л', en: 'Apricot nectar, 1 l' },
    shortDescription: {
      uz: 'Quyuq, baxmaldek oʻrik nektari — sovutib iching.',
      ru: 'Густой бархатистый абрикосовый нектар — пейте охлаждённым.',
      en: 'A thick, velvety apricot nectar to drink chilled.',
    },
    description: described({
      uz: 'Pishgan oʻrik pyuresidan tayyorlangan nektar. Muz bilan yoki choy dasturxonida sovuq holda torting.',
      ru: 'Нектар из пюре спелых абрикосов. Подавайте со льдом или охлаждённым к чайному столу.',
      en: 'A nectar of ripe apricot purée. Serve it over ice, or chilled at the tea table.',
    }),
    ingredients: {
      uz: 'Oʻrik pyuresi, suv, shakar, limon kislotasi.',
      ru: 'Абрикосовое пюре, вода, сахар, лимонная кислота.',
      en: 'Apricot purée, water, sugar, citric acid.',
    },
    variants: [
      { sku: 'TRN-JCE-APR-1000', weightGrams: null, unitCount: 1, price: '32000', stock: 30 },
    ],
  },
  {
    slug: 'matcha-whisk',
    testOnly: true,
    category: 'teaware',
    collections: [],
    format: 'ACCESSORY',
    featured: false,
    illustrationKey: 'teaware',
    publishedDaysAgo: 11,
    brewing: null,
    art: { style: 'matcha', shape: 'matcha' },
    photo: 'matcha-whisk',
    name: {
      uz: 'Bambuk koʻpirtirgich (chasen)',
      ru: 'Бамбуковый венчик (часэн)',
      en: 'Bamboo matcha whisk (chasen)',
    },
    shortDescription: {
      uz: 'Matchani koʻpirtirish uchun 100 tishli bambuk koʻpirtirgich.',
      ru: 'Бамбуковый венчик на 100 зубцов для взбивания матчи.',
      en: 'A 100-prong bamboo whisk for whisking matcha.',
    },
    description: described({
      uz: 'Ishlatishdan oldin koʻpirtirgichni bir daqiqa iliq suvga botiring: tishlari yumshaydi va uzoq xizmat qiladi.',
      ru: 'Перед использованием опустите венчик на минуту в тёплую воду: зубцы станут мягче и прослужат дольше.',
      en: 'Soak the whisk in warm water for a minute before use: the prongs soften and last longer.',
    }),
    variants: [
      { sku: 'TRN-WRE-WSK-1', weightGrams: null, unitCount: 1, price: '95000', stock: 15 },
    ],
  },
  {
    slug: 'tea-caddy',
    testOnly: true,
    category: 'teaware',
    collections: [],
    format: 'ACCESSORY',
    featured: false,
    illustrationKey: 'teaware',
    publishedDaysAgo: 16,
    brewing: null,
    art: { style: 'gift', shape: 'tin' },
    photo: 'tea-caddy',
    name: {
      uz: 'Choy saqlash qutisi, 150 g',
      ru: 'Банка для хранения чая, 150 г',
      en: 'Tea caddy, 150 g',
    },
    shortDescription: {
      uz: 'Zich qopqoqli bambuk quti — choyni yorugʻlik va namlikdan saqlaydi.',
      ru: 'Бамбуковая банка с плотной крышкой — бережёт чай от света и влаги.',
      en: 'A bamboo caddy with a tight lid that keeps tea from light and moisture.',
    },
    description: described({
      uz: 'Choyni salqin, quruq va qorongʻi joyda saqlang: ochilgan paketdagi choyni qutiga oʻtkazing.',
      ru: 'Храните чай в прохладном, сухом и тёмном месте: пересыпьте чай из открытой упаковки в банку.',
      en: 'Keep tea cool, dry and dark: move an opened pack into the caddy.',
    }),
    variants: [
      { sku: 'TRN-WRE-CDY-150', weightGrams: null, unitCount: 1, price: '75000', stock: 20 },
    ],
  },
  {
    slug: 'spiced-black-tea',
    testOnly: true,
    category: 'black-tea',
    collections: ['autumn-table'],
    format: 'LOOSE_LEAF',
    featured: true,
    illustrationKey: 'black',
    publishedDaysAgo: 1,
    caffeine: 'HIGH',
    brewing: { tempC: 95, minSeconds: 180, maxSeconds: 300, grams: 2.5 },
    art: { style: 'black', shape: 'tin' },
    photo: 'spiced-tea',
    name: { uz: 'Ziravorli qora choy', ru: 'Чёрный чай с пряностями', en: 'Spiced black tea' },
    shortDescription: {
      uz: 'Dolchin, apelsin poʻsti va qalampirmunchoq bilan qora choy — kuz kechlari uchun.',
      ru: 'Чёрный чай с корицей, апельсиновой цедрой и гвоздикой — для осенних вечеров.',
      en: 'Black tea with cinnamon, orange peel and clove for autumn evenings.',
    },
    description: described({
      uz: 'Toʻyimli qora choy iliq ziravorlar bilan. 95 °C suvda 3–5 daqiqa damlang; xohlasangiz sut yoki asal qoʻshing.',
      ru: 'Насыщенный чёрный чай с тёплыми пряностями. Заваривайте водой 95 °C 3–5 минут; по желанию добавьте молоко или мёд.',
      en: 'A full black tea with warm spices. Steep at 95 °C for 3–5 minutes; add milk or honey if you like.',
    }),
    tastingNotes: {
      uz: 'Uslubga xos: iliq, ziravorli va biroz sitrusli.',
      ru: 'Типично для стиля: тёплый, пряный, с цитрусовой ноткой.',
      en: 'Typical of the style: warm and spicy, with a hint of citrus.',
    },
    ingredients: {
      uz: 'Qora choy, dolchin, apelsin poʻsti, qalampirmunchoq.',
      ru: 'Чёрный чай, корица, апельсиновая цедра, гвоздика.',
      en: 'Black tea, cinnamon, orange peel, clove.',
    },
    variants: [{ sku: 'TRN-BLK-SPC-100', weightGrams: 100, price: '64000', stock: 26 }],
  },

  // ─── Discovery ───
  {
    slug: 'discovery-box',
    testOnly: true,
    category: 'gift-sets',
    collections: ['gift-ideas'],
    format: 'GIFT_SET',
    featured: true,
    illustrationKey: 'gift',
    publishedDaysAgo: 9,
    brewing: null,
    art: { style: 'gift', shape: 'sampler' },
    photo: 'discovery-box',
    name: { uz: 'Tanishuv qutisi', ru: 'Коробка-знакомство', en: 'Discovery box' },
    shortDescription: {
      uz: 'Besh xil choydan 20 grammdan — oʻz choyingizni toping.',
      ru: 'Пять чаёв по 20 г — найдите свой.',
      en: 'Five teas, 20 g each, to find your own.',
    },
    description: described({
      uz: 'Yashil, qora, oq, ulun va pu-erh choylari kichik qutichalarda; har biriga damlash koʻrsatmasi ilova qilingan.',
      ru: 'Маленькие баночки зелёного, чёрного, белого чая, улуна и пуэра; к каждой приложена инструкция по завариванию.',
      en: 'Small tins of green, black and white tea, oolong and pu-erh, each with its own brewing card.',
    }),
    variants: [
      {
        sku: 'TRN-GFT-DSC-5',
        weightGrams: 100,
        unitCount: 5,
        price: '120000',
        stock: 20,
      },
    ],
  },
];

/**
 * Taste notes (the "flavour" attribute) and other demonstration values of the range. For the
 * five TERAN teas the notes come from the owner's own taste descriptions (2026-10-17), nothing more.
 */
export const DEMO_RANGE_ATTRIBUTE_VALUES: Record<
  string,
  Record<string, string | boolean | number | string[]>
> = {
  'ceremonial-matcha': { 'leaf-style': 'powder', flavour: ['fresh', 'sweet'] },
  'everyday-matcha': { 'leaf-style': 'powder', flavour: ['fresh'] },
  'chamomile-apple': { flavour: ['floral', 'sweet', 'fruity'] },
  'hibiscus-pomegranate': { flavour: ['tart', 'fruity'] },
  'mint-lemongrass': { flavour: ['minty', 'citrus', 'fresh'] },
  'rosehip-quince': { flavour: ['fruity', 'tart', 'sweet'] },
  'jasmine-cold-brew': { flavour: ['floral', 'fresh'], sparkling: false, volume: 330 },
  'iced-peach-oolong': { flavour: ['fruity', 'floral'], sparkling: false, volume: 330 },
  'sparkling-black-tea-lemon': { flavour: ['citrus'], sparkling: true, volume: 250 },
  'still-water': { sparkling: false, volume: 500 },
  'sparkling-water': { sparkling: true, volume: 500 },
  'pomegranate-juice': { flavour: ['fruity', 'tart'], sparkling: false, volume: 750 },
  'apple-quince-juice': { flavour: ['fruity', 'sweet'], sparkling: false, volume: 1000 },
  'glass-teapot': { material: 'glass', capacity: 600 },
  'porcelain-gaiwan': { material: 'porcelain', capacity: 150 },
  'piyola-set': { material: 'porcelain', capacity: 180 },
  'discovery-box': { 'teas-in-set': 5 },
  'cold-brew-green-tea': { flavour: ['fresh'], sparkling: false, volume: 1000 },
  'apricot-nectar': { flavour: ['fruity', 'sweet'], sparkling: false, volume: 1000 },
  'matcha-whisk': { material: 'bamboo' },
  'tea-caddy': { material: 'bamboo' },
  'spiced-black-tea': { 'leaf-style': 'cut', flavoured: true, flavour: ['toasty', 'citrus'] },
  // Taste notes added to the generic tea range (typical of each style).
  'classic-black-tea': { flavour: ['toasty'] },
  'black-tea-bags': { flavour: ['toasty'] },
  'earl-grey': { flavour: ['citrus', 'floral'] },
  'classic-green-tea': { flavour: ['fresh'] },
  'jasmine-green-tea': { flavour: ['floral', 'fresh'] },
  'green-tea-pyramids': { flavour: ['fresh'] },
  'mint-green-tea': { flavour: ['minty', 'fresh'] },
  'spring-green-tea': { flavour: ['fresh', 'sweet'] },
  'white-tea': { flavour: ['sweet', 'floral'] },
  'oolong-tea': { flavour: ['floral'] },
  'roasted-oolong': { flavour: ['toasty'] },
  'pu-erh-tea': { flavour: ['earthy'] },
  'mini-pu-erh': { flavour: ['earthy'] },
  // The owner's descriptions: "light sweetness … notes of roasted chestnut", "sweet finish",
  // "fresh, natural aroma", "roasted notes reminiscent of coffee".
  'teran-xc2025': { flavour: ['sweet', 'toasty', 'fresh'] },
  'teran-g8810': { flavour: ['sweet', 'fresh'] },
  'teran-8800': { flavour: ['sweet', 'fresh'] },
  'teran-8830': { flavour: ['fresh'] },
  'teran-8009': { flavour: ['toasty', 'sweet'] },
};

/** Caffeine of the generic tea range, typical of each style (the TERAN teas have none set). */
export const DEMO_RANGE_CAFFEINE: Record<string, 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'> = {
  'classic-black-tea': 'HIGH',
  'black-tea-bags': 'HIGH',
  'earl-grey': 'HIGH',
  'classic-green-tea': 'MEDIUM',
  'jasmine-green-tea': 'MEDIUM',
  'green-tea-pyramids': 'MEDIUM',
  'mint-green-tea': 'MEDIUM',
  'spring-green-tea': 'MEDIUM',
  'white-tea': 'LOW',
  'oolong-tea': 'MEDIUM',
  'roasted-oolong': 'MEDIUM',
  'pu-erh-tea': 'MEDIUM',
  'mini-pu-erh': 'MEDIUM',
};
