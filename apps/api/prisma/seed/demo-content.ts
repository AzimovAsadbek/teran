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
  /** DRAFT articles exist only in the admin area (to demonstrate the journal editor). */
  status?: 'PUBLISHED' | 'DRAFT';
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
      uz: 'Qora, yashil, oq choy, ulun va pu-erh bir-biridan nimasi bilan farq qiladi?',
      ru: 'Чем отличаются чёрный, зелёный, белый чай, улун и пуэр?',
      en: 'What makes black, green and white tea, oolong and pu-erh different?',
    },
    body: {
      uz: 'Qora, yashil, oq choy, ulun va pu-erh bir oʻsimlik — choy butasi (Camellia sinensis) barglaridan tayyorlanadi. Ularning farqi asosan barglarga qanday ishlov berilishidan kelib chiqadi.\n\n## Asosiy turlar\n- Yashil choy: barglar oksidlanishdan himoyalanadi, shuning uchun taʼmi yengil va oʻtsimon boʻladi.\n- Oq choy: eng kam ishlov beriladigan choylardan biri, taʼmi nozik.\n- Ulun: qisman oksidlanadi, taʼmi yashil va qora choy oraligʻida.\n- Qora choy: toʻliq oksidlanadi, taʼmi toʻyimli va quyuq.\n- Pu-erh: fermentlangan choy, koʻpincha presslab saqlanadi; taʼmi chuqur va yumshoq.\n\n## Giyohli damlamalar\nGiyohli va mevali damlamalar choy butasidan emas, boshqa oʻsimliklardan tayyorlanadi. Shuning uchun ular alohida guruhga kiradi.',
      ru: 'Чёрный, зелёный, белый чай, улун и пуэр делают из листьев одного растения — чайного куста (Camellia sinensis). Различия возникают в основном из-за того, как обрабатывают лист.\n\n## Основные виды\n- Зелёный чай: лист защищают от окисления, поэтому вкус лёгкий и травянистый.\n- Белый чай: один из наименее обработанных, вкус деликатный.\n- Улун: частично окисленный, вкус между зелёным и чёрным.\n- Чёрный чай: полностью окисленный, вкус насыщенный и плотный.\n- Пуэр: ферментированный чай, который часто прессуют; вкус глубокий и мягкий.\n\n## Травяные сборы\nТравяные и фруктовые сборы делают не из чайного куста, а из других растений, поэтому их выделяют в отдельную группу.',
      en: 'Black, green and white tea, oolong and pu-erh are all made from the leaves of the same plant, the tea bush (Camellia sinensis). The differences come mostly from how the leaves are processed.\n\n## The main types\n- Green tea: the leaves are protected from oxidation, giving a light, grassy taste.\n- White tea: among the least processed teas, with a delicate taste.\n- Oolong: partly oxidised, sitting between green and black tea.\n- Black tea: fully oxidised, with a fuller, deeper taste.\n- Pu-erh: a fermented tea, often pressed into cakes, with a deep, smooth taste.\n\n## Herbal infusions\nHerbal and fruit infusions are made from other plants rather than the tea bush, so they form a separate group.',
    },
  },
  {
    slug: 'tea-at-the-uzbek-table',
    illustrationKey: 'green',
    publishedDaysAgo: 2,
    title: {
      uz: 'Oʻzbek dasturxonida choy',
      ru: 'Чай за узбекским дастарханом',
      en: 'Tea at the Uzbek table',
    },
    excerpt: {
      uz: 'Nega mezbon piyolaga ozgina quyadi va mehmonga choy uzatishning boshqa odatlari.',
      ru: 'Почему хозяин наливает совсем немного, и другие обычаи чаепития с гостями.',
      en: 'Why the host pours only a little, and other customs of serving tea to guests.',
    },
    body: {
      uz: 'Oʻzbek xonadonida mehmonga eng avval choy taklif qilinadi. Choy uzatishning bir necha oddiy odati bor.\n\n## Qaytarish\nChoy damlangach, mezbon odatda uni piyolaga quyib, choynakka ikki-uch marta qaytaradi. Shunda choy bir tekis damlanadi.\n\n## Oz-ozdan\nPiyola toʻla quyilmaydi: shunda choy issiq qoladi va mezbon yana quyib beradi. Toʻla piyola esa mehmonga ketish vaqti boʻlganiga ishora deb ham tushuniladi.\n\n## Uzatish\nPiyola oʻng qoʻl bilan uzatiladi, chap qoʻl esa hurmat belgisi sifatida koʻpincha koʻksiga qoʻyiladi.',
      ru: 'В узбекском доме гостю первым делом предлагают чай. У чаепития есть несколько простых обычаев.\n\n## Кайтариш\nПосле заваривания хозяин обычно наливает чай в пиалу и возвращает его в чайник два-три раза, чтобы чай заварился равномерно. По-узбекски это называется «кайтариш».\n\n## Понемногу\nПиалу наполняют не до краёв: так чай остаётся горячим, а хозяин может подлить ещё. Полная пиала может даже намекать гостю, что пора уходить.\n\n## Подача\nПиалу подают правой рукой, часто приложив левую к груди в знак уважения.',
      en: 'In an Uzbek home, tea is the first thing offered to a guest. Serving it follows a few simple customs.\n\n## Pouring back\nAfter brewing, the host usually pours a bowl and returns it to the teapot two or three times so the tea brews evenly. In Uzbek this is called qaytarish.\n\n## A little at a time\nThe piyola is never filled to the brim: the tea stays hot and the host can offer more. A full bowl can even hint that it is time for the guest to leave.\n\n## Serving\nThe bowl is passed with the right hand, often with the left hand on the chest as a sign of respect.',
    },
  },
  {
    slug: 'brewing-in-a-small-teapot',
    illustrationKey: 'oolong',
    publishedDaysAgo: 6,
    title: {
      uz: 'Kichik choynakda damlash',
      ru: 'Заваривание в маленьком чайнике',
      en: 'Brewing in a small teapot',
    },
    excerpt: {
      uz: 'Koʻproq barg, kamroq suv va qisqa damlash: choy taʼmi piyoladan piyolaga qanday oʻzgarishini his qilish usuli.',
      ru: 'Больше листа, меньше воды и короткие проливы: способ почувствовать, как вкус чая меняется от чашки к чашке.',
      en: 'More leaf, less water and short steeps: a way to taste how a tea changes from cup to cup.',
    },
    body: {
      uz: 'Koʻplab Xitoy choylari, ayniqsa ulun va pu-erh, koʻpincha kichik choynakda yoki qopqoqli kosada damlanadi. Gʻoya oddiy: koʻproq barg, kamroq suv va qisqaroq vaqt.\n\n## Qanday boshlash kerak\n- Taxminan 100–150 ml hajmli kichik choynak yoki gayvan oling.\n- Avval uni issiq suv bilan isitib, suvni toʻkib tashlang.\n- Odatdagidan koʻproq barg soling — taxminan 5–7 g.\n- Dastlabki damlashlarni qisqa qiling: 10–20 soniya.\n\n## Bir necha damlama\nHar safar choyni toʻliq quyib oling va yana damlang, har gal biroz uzoqroq. Bir xil barglardan bir necha piyola choy chiqadi va har birining taʼmi biroz farq qiladi.\n\n## Qoida emas\nBu damlash usullaridan biri, xolos. Har bir mahsulot sahifasidagi tavsiya oddiy choynakda ham yaxshi natija beradi.',
      ru: 'Многие китайские чаи, особенно улуны и пуэры, часто заваривают в маленьком чайнике или гайвани. Идея проста: больше листа, меньше воды, короче настаивание.\n\n## С чего начать\n- Возьмите маленький чайник или гайвань объёмом около 100–150 мл.\n- Сначала прогрейте посуду горячей водой и слейте её.\n- Положите больше листа, чем обычно, — примерно 5–7 г.\n- Первые проливы делайте короткими: 10–20 секунд.\n\n## Несколько настоев\nКаждый раз сливайте весь настой и заваривайте снова, чуть дольше. Один и тот же лист даёт несколько чашек, и вкус каждой немного отличается.\n\n## Не правило\nЭто лишь один из способов заваривания. Рекомендации на странице каждого товара так же хорошо работают в обычном чайнике.',
      en: 'Many Chinese teas, especially oolong and pu-erh, are often brewed in a small teapot or a lidded bowl. The idea is simple: more leaf, less water, shorter steeps.\n\n## How to start\n- Use a small teapot or gaiwan of about 100–150 ml.\n- Warm it with hot water first, then pour that water away.\n- Add more leaf than usual, roughly 5–7 g.\n- Keep the first steeps short: 10–20 seconds.\n\n## Several infusions\nPour off all the tea each time, then steep again, a little longer each round. The same leaves give several cups, and each tastes slightly different.\n\n## Not a rule\nThis is one way of brewing, not the only one. The guidance on each product page works just as well in an ordinary teapot.',
    },
  },
  {
    slug: 'new-season-notes',
    status: 'DRAFT',
    illustrationKey: 'green',
    publishedDaysAgo: 0,
    title: {
      uz: 'Yangi mavsum qaydlari (qoralama)',
      ru: 'Заметки о новом сезоне (черновик)',
      en: 'New season notes (draft)',
    },
    excerpt: {
      uz: 'Jurnal muharririni koʻrsatish uchun qoralama maqola.',
      ru: 'Черновик статьи для демонстрации редактора журнала.',
      en: 'A draft article used to demonstrate the journal editor.',
    },
    body: {
      uz: 'Bu qoralama maqola. U faqat admin panelida koʻrinadi va maqola qanday yoziladi, koʻrib chiqiladi va eʼlon qilinishini koʻrsatadi.\n\nIshga tushirishdan oldin uni almashtiring yoki oʻchiring.',
      ru: 'Это черновик статьи. Он виден только в админ-панели и показывает, как статью пишут, просматривают и публикуют.\n\nЗамените или удалите его перед запуском.',
      en: 'This is a draft article. It is only visible in the admin area and shows how an article is written, previewed and published.\n\nReplace or delete it before launch.',
    },
  },
];
