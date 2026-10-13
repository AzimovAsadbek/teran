/**
 * DEMONSTRATION CONTENT — delivery methods, site settings and journal articles.
 *
 * Delivery prices, free-delivery thresholds and time estimates below are PLACEHOLDERS that TERAN
 * must confirm (see docs/business-information-required.md). Articles contain only general,
 * widely accepted tea knowledge and make no claims about TERAN products.
 */
import { REGION_CODES } from '@teran/contracts';
import type { Localized } from './demo-catalog.js';

export interface DemoDeliveryMethod {
  code: string;
  position: number;
  price: string;
  freeFromAmount: string | null;
  regionCodes: string[];
  requiresAddress: boolean;
  name: Localized<string>;
  description: Localized<string>;
  estimate: Localized<string>;
}

export const DEMO_DELIVERY_METHODS: DemoDeliveryMethod[] = [
  {
    code: 'courier-tashkent',
    position: 0,
    price: '25000',
    freeFromAmount: '300000',
    regionCodes: ['UZ-TK'],
    requiresAddress: true,
    name: { uz: 'Toshkent boʻylab kuryer', ru: 'Курьер по Ташкенту', en: 'Courier in Tashkent' },
    description: {
      uz: 'Kuryer buyurtmani koʻrsatilgan manzilga olib keladi.',
      ru: 'Курьер доставит заказ по указанному адресу.',
      en: 'A courier delivers the order to your address.',
    },
    estimate: { uz: '1–2 ish kuni', ru: '1–2 рабочих дня', en: '1–2 business days' },
  },
  {
    code: 'regions',
    position: 1,
    price: '45000',
    freeFromAmount: null,
    regionCodes: REGION_CODES.filter((code) => code !== 'UZ-TK'),
    requiresAddress: true,
    name: {
      uz: 'Viloyatlarga yetkazib berish',
      ru: 'Доставка по регионам',
      en: 'Delivery to the regions',
    },
    description: {
      uz: 'Oʻzbekiston viloyatlariga yetkazib berish.',
      ru: 'Доставка в области Узбекистана.',
      en: 'Delivery to the regions of Uzbekistan.',
    },
    estimate: { uz: '3–7 ish kuni', ru: '3–7 рабочих дней', en: '3–7 business days' },
  },
];

export const DEMO_ANNOUNCEMENT = {
  enabled: true,
  text: {
    uz: 'TERAN onlayn doʻkoniga xush kelibsiz',
    ru: 'Добро пожаловать в интернет-магазин TERAN',
    en: 'Welcome to the TERAN online store',
  },
  href: '/catalog',
};

/** Every contact channel stays empty until TERAN provides verified details through the admin. */
export const EMPTY_CONTACT = {
  phone: null,
  email: null,
  telegram: null,
  instagram: null,
  address: null,
  workingHours: null,
};

export interface DemoArticle {
  slug: string;
  illustrationKey: string;
  publishedDaysAgo: number;
  title: Localized<string>;
  excerpt: Localized<string>;
  body: Localized<string>;
}

export const DEMO_ARTICLES: DemoArticle[] = [
  {
    slug: 'how-to-store-tea',
    illustrationKey: 'green',
    publishedDaysAgo: 14,
    title: { uz: 'Choyni qanday saqlash kerak', ru: 'Как хранить чай', en: 'How to store tea' },
    excerpt: {
      uz: 'Choy taʼmi va xushboʻyligini uzoqroq saqlash uchun oddiy qoidalar.',
      ru: 'Простые правила, которые помогают дольше сохранить вкус и аромат чая.',
      en: 'Simple habits that help tea keep its taste and aroma for longer.',
    },
    body: {
      uz: 'Choy atrofdagi muhitga sezgir: yorugʻlik, issiqlik, namlik va begona hidlar uning taʼmini tezroq oʻzgartiradi.\n\n## Asosiy qoidalar\n- Choyni zich yopiladigan, yorugʻlik oʻtkazmaydigan idishda saqlang.\n- Uni pechka, quyosh nuri va issiq jihozlardan uzoqroq joyga qoʻying.\n- Ziravorlar, qahva va kuchli hidli mahsulotlar yonida saqlamang.\n- Choyni faqat quruq qoshiq bilan oling.\n\n## Qancha muddat?\nQadoqdagi yaroqlilik muddatiga amal qiling. Ochilgan qadoqni oqilona muddat ichida ishlatib tugatgan maʼqul — shuning uchun koʻpincha kichikroq qadoq qulayroq.',
      ru: 'Чай чувствителен к окружающей среде: свет, тепло, влага и посторонние запахи быстрее меняют его вкус.\n\n## Основные правила\n- Храните чай в плотно закрывающейся непрозрачной ёмкости.\n- Держите его подальше от плиты, солнечного света и горячих приборов.\n- Не храните рядом со специями, кофе и продуктами с сильным запахом.\n- Набирайте чай только сухой ложкой.\n\n## Как долго?\nОриентируйтесь на срок годности на упаковке. Открытую упаковку лучше использовать в разумный срок — поэтому небольшая упаковка часто удобнее.',
      en: 'Tea is sensitive to its surroundings: light, heat, moisture and strong odours change its taste more quickly.\n\n## The basics\n- Keep tea in an airtight, opaque container.\n- Store it away from the stove, direct sunlight and warm appliances.\n- Keep it apart from spices, coffee and other strong-smelling foods.\n- Always use a dry spoon.\n\n## How long?\nFollow the best-before date on the pack. Use an opened pack within a reasonable time, which is why a smaller pack is often the better choice.',
    },
  },
  {
    slug: 'tea-brewing-basics',
    illustrationKey: 'black',
    publishedDaysAgo: 9,
    title: { uz: 'Choy damlash asoslari', ru: 'Основы заваривания чая', en: 'Tea brewing basics' },
    excerpt: {
      uz: 'Suv harorati, vaqt va miqdor — yaxshi piyola choyning uch asosi.',
      ru: 'Температура воды, время и количество — три основы хорошей чашки чая.',
      en: 'Water temperature, time and amount — the three foundations of a good cup.',
    },
    body: {
      uz: 'Bir xil choy turli usulda damlansa, butunlay boshqacha taʼm berishi mumkin. Uchta omilga eʼtibor bering.\n\n## Suv harorati\nYashil va oq choylar odatda qaynab turgan suvni yoqtirmaydi — biroz sovutilgan suv yumshoqroq taʼm beradi. Qora choy va giyohli damlamalar uchun qaynoq suv mos keladi.\n\n## Vaqt\nUzoq damlangan choy achchiqroq boʻladi. Qisqa vaqtdan boshlang va taʼmga qarab uzaytiring.\n\n## Miqdor\nOdatda 250 ml suvga 2–3 g choy olinadi. Aniq tavsiya har bir mahsulot sahifasida va qadoqda koʻrsatiladi.',
      ru: 'Один и тот же чай при разном заваривании может раскрыться совершенно по-разному. Обратите внимание на три фактора.\n\n## Температура воды\nЗелёный и белый чай обычно не любят крутой кипяток — слегка остывшая вода даёт более мягкий вкус. Для чёрного чая и травяных сборов подходит кипяток.\n\n## Время\nЧем дольше заваривается чай, тем он терпче. Начните с короткого времени и увеличивайте его по вкусу.\n\n## Количество\nОбычно берут 2–3 г чая на 250 мл воды. Точная рекомендация указана на странице каждого товара и на упаковке.',
      en: 'The same tea can taste completely different depending on how it is brewed. Pay attention to three things.\n\n## Water temperature\nGreen and white teas usually dislike boiling water; slightly cooled water gives a softer taste. Black tea and herbal infusions suit freshly boiled water.\n\n## Time\nThe longer tea steeps, the stronger and more astringent it becomes. Start short and extend to taste.\n\n## Amount\nA common starting point is 2–3 g of tea per 250 ml of water. Exact guidance is on each product page and on the pack.',
    },
  },
  {
    slug: 'types-of-tea',
    illustrationKey: 'oolong',
    publishedDaysAgo: 4,
    title: {
      uz: 'Choy turlari: qisqa qoʻllanma',
      ru: 'Виды чая: краткий гид',
      en: 'Types of tea: a short guide',
    },
    excerpt: {
      uz: 'Qora, yashil, oq choy va ulun bir-biridan nimasi bilan farq qiladi?',
      ru: 'Чем отличаются чёрный, зелёный, белый чай и улун?',
      en: 'What makes black, green and white tea and oolong different?',
    },
    body: {
      uz: 'Qora, yashil, oq choy va ulun bir oʻsimlik — choy butasi (Camellia sinensis) barglaridan tayyorlanadi. Ularning farqi asosan barglarga qanday ishlov berilishidan kelib chiqadi.\n\n## Asosiy turlar\n- Yashil choy: barglar oksidlanishdan himoyalanadi, shuning uchun taʼmi yengil va oʻtsimon boʻladi.\n- Oq choy: eng kam ishlov beriladigan choylardan biri, taʼmi nozik.\n- Ulun: qisman oksidlanadi, taʼmi yashil va qora choy oraligʻida.\n- Qora choy: toʻliq oksidlanadi, taʼmi toʻyimli va quyuq.\n\n## Giyohli damlamalar\nGiyohli va mevali damlamalar choy butasidan emas, boshqa oʻsimliklardan tayyorlanadi. Shuning uchun ular alohida guruhga kiradi.',
      ru: 'Чёрный, зелёный, белый чай и улун делают из листьев одного растения — чайного куста (Camellia sinensis). Различия возникают в основном из-за того, как обрабатывают лист.\n\n## Основные виды\n- Зелёный чай: лист защищают от окисления, поэтому вкус лёгкий и травянистый.\n- Белый чай: один из наименее обработанных, вкус деликатный.\n- Улун: частично окисленный, вкус между зелёным и чёрным.\n- Чёрный чай: полностью окисленный, вкус насыщенный и плотный.\n\n## Травяные сборы\nТравяные и фруктовые сборы делают не из чайного куста, а из других растений, поэтому их выделяют в отдельную группу.',
      en: 'Black, green and white tea and oolong are all made from the leaves of the same plant, the tea bush (Camellia sinensis). The differences come mostly from how the leaves are processed.\n\n## The main types\n- Green tea: the leaves are protected from oxidation, giving a light, grassy taste.\n- White tea: among the least processed teas, with a delicate taste.\n- Oolong: partly oxidised, sitting between green and black tea.\n- Black tea: fully oxidised, with a fuller, deeper taste.\n\n## Herbal infusions\nHerbal and fruit infusions are made from other plants rather than the tea bush, so they form a separate group.',
    },
  },
];
