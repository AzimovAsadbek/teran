import type { Locale, ProductFormat } from '@teran/contracts';
import type { UnrecordedQuality } from './request-parser.js';

/**
 * Whole so'm grouped by thousands as each language writes them, matching the storefront's prices:
 * "159 000" in Uzbek and Russian, "159,000" in English.
 */
export function formatSum(amount: number, locale: Locale): string {
  return String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, locale === 'en' ? ',' : ' ');
}

export type DroppedCriterion = 'text' | 'attributes' | 'formats' | 'origin' | 'category' | 'budget';

interface Texts {
  found: (count: number) => string;
  relaxed: (dropped: string) => string;
  overBudget: (budget: string) => string;
  none: string;
  ask: string;
  dropped: Record<DroppedCriterion, string>;
  price: (price: string, single: boolean) => string;
  withinBudget: (price: string, budget: string) => string;
  aboveFloor: (price: string, floor: string) => string;
  inCategory: (name: string) => string;
  format: Record<ProductFormat, string>;
  attribute: (label: string, value: string) => string;
  yes: string;
  no: string;
  brewing: (parts: string[]) => string;
  temperature: (celsius: number, max: number | null) => string;
  minutes: (from: number, to: number | null) => string;
  amount: (grams: string, max: string | null) => string;
  origin: (origin: string) => string;
  textMatch: (word: string) => string;
  inStock: string;
  lowStock: string;
  notes: Record<UnrecordedQuality, string>;
  textRelaxed: (word: string) => string;
  askCategory: (names: string) => string;
  askBudget: string;
  askAlternative: string;
  /** Wording for a storefront that shows no prices (the request's `prices: false`). */
  noPrices: { ask: string; quality: string; askAlternative: string };
}

const so = (amount: string) => `${amount} soʻm`;
/** "85–90" for a range, "85" for one value (or a range whose ends are equal). */
const range = (from: number | string, to: number | string | null) =>
  to !== null && String(to) !== String(from) ? `${from}–${to}` : String(from);

export const TEXTS: Record<Locale, Texts> = {
  uz: {
    found: (count) => `Soʻrovingizga mos ${count} ta mahsulot topdim:`,
    relaxed: (dropped) =>
      `Barcha shartlarga aynan mos mahsulot topilmadi, shuning uchun ${dropped} hisobga olinmadi:`,
    overBudget: (budget) =>
      `${budget} gacha bu turdagi mahsulot topilmadi. Shu turdagi eng arzonlari:`,
    none: 'Afsuski, hozir katalogda bu soʻrovga mos mahsulot topilmadi.',
    ask: 'Qanday mahsulot qidiryapsiz? Turini, byudjetingizni yoki kimga moʻljallanganini yozing.',
    dropped: {
      text: 'tavsifdagi soʻz',
      attributes: 'xususiyat',
      formats: 'qadoq turi',
      origin: 'kelib chiqish joyi',
      category: 'turkum',
      budget: 'narx chegarasi',
    },
    price: (price, single) => `Narxi: ${single ? so(price) : `${so(price)}dan`}`,
    withinBudget: (price, budget) => `Narxi ${so(price)} — ${so(budget)}lik byudjetingiz ichida`,
    aboveFloor: (price, floor) => `Narxi ${so(price)} — ${so(floor)}dan yuqori`,
    inCategory: (name) => `Turkumi: ${name}`,
    format: {
      LOOSE_LEAF: 'Bargli',
      TEA_BAGS: 'Paketchalarda',
      PYRAMIDS: 'Piramidkalarda',
      GIFT_SET: 'Sovgʻa toʻplami',
      ACCESSORY: 'Aksessuar',
      OTHER: 'Mahsulot',
    },
    attribute: (label, value) => `${label}: ${value}`,
    yes: 'ha',
    no: 'yoʻq',
    brewing: (parts) => `Damlash: ${parts.join(', ')}`,
    temperature: (celsius, max) => `${range(celsius, max)} °C`,
    minutes: (from, to) => (to && to !== from ? `${from}–${to} daqiqa` : `${from} daqiqa`),
    amount: (grams, max) => `250 ml ga ${range(grams, max)} g`,
    origin: (origin) => `Kelib chiqishi: ${origin}`,
    textMatch: (word) => `Tavsifida «${word}» deb yozilgan`,
    inStock: 'Sotuvda bor',
    lowStock: 'Sotuvda oz qolgan',
    notes: {
      taste:
        'Taʼmning yumshoq yoki kuchliligi katalogda alohida qayd etilmaydi; mahsulot sahifasidagi tavsif va taʼm izohlariga qarang.',
      quality:
        'Sifat darajasi (sort) katalogda qayd etilmagan, shuning uchun biror mahsulotni “eng sifatli” deb baholay olmayman. Tanlov narx, tur va qayd etilgan maʼlumotlarga asoslangan.',
      health: 'Sogʻliq yoki davolash bilan bogʻliq hech qanday daʼvo bildira olmayman.',
      easyBrew:
        'Damlash qulayligi alohida baholanmagan; har bir mahsulotning damlash koʻrsatmasi keltirildi.',
    },
    textRelaxed: (word) => `Tavsiflarda «${word}» soʻzi topilmadi, shu shartsiz qidirdim.`,
    askCategory: (names) => `Qaysi biri qiziqtiradi: ${names}?`,
    askBudget: 'Byudjetingiz qancha?',
    askAlternative: 'Byudjetni oshirasizmi yoki boshqa turini koʻramizmi?',
    noPrices: {
      ask: 'Qanday mahsulot qidiryapsiz? Turini yoki kimga moʻljallanganini yozing.',
      quality:
        'Sifat darajasi (sort) katalogda qayd etilmagan, shuning uchun biror mahsulotni “eng sifatli” deb baholay olmayman. Tanlov tur va qayd etilgan maʼlumotlarga asoslangan.',
      askAlternative: 'Boshqa turini koʻramizmi?',
    },
  },
  ru: {
    found: (count) => `Подобрал товары по вашему запросу (${count}):`,
    relaxed: (dropped) => `Точных совпадений нет, поэтому я не учитывал(а) ${dropped}:`,
    overBudget: (budget) => `До ${budget} сум такого товара нет. Самые доступные из этого вида:`,
    none: 'К сожалению, сейчас в каталоге нет товаров по этому запросу.',
    ask: 'Что вы ищете? Напишите вид товара, бюджет или для кого он.',
    dropped: {
      text: 'слово из описания',
      attributes: 'характеристику',
      formats: 'вид упаковки',
      origin: 'происхождение',
      category: 'категорию',
      budget: 'ограничение по цене',
    },
    price: (price, single) => `Цена: ${single ? `${price} сум` : `от ${price} сум`}`,
    withinBudget: (price, budget) => `Цена ${price} сум — в пределах бюджета ${budget} сум`,
    aboveFloor: (price, floor) => `Цена ${price} сум — выше ${floor} сум`,
    inCategory: (name) => `Категория: ${name}`,
    format: {
      LOOSE_LEAF: 'Листовой',
      TEA_BAGS: 'В пакетиках',
      PYRAMIDS: 'В пирамидках',
      GIFT_SET: 'Подарочный набор',
      ACCESSORY: 'Аксессуар',
      OTHER: 'Товар',
    },
    attribute: (label, value) => `${label}: ${value}`,
    yes: 'да',
    no: 'нет',
    brewing: (parts) => `Заваривание: ${parts.join(', ')}`,
    temperature: (celsius, max) => `${range(celsius, max)} °C`,
    minutes: (from, to) => (to && to !== from ? `${from}–${to} мин` : `${from} мин`),
    amount: (grams, max) => `${range(grams, max)} г на 250 мл`,
    origin: (origin) => `Происхождение: ${origin}`,
    textMatch: (word) => `В описании есть «${word}»`,
    inStock: 'В наличии',
    lowStock: 'Осталось немного',
    notes: {
      taste:
        'Мягкость или крепость вкуса в каталоге отдельно не указывается; смотрите описание и вкусовые заметки на странице товара.',
      quality:
        'Сорт или класс качества в каталоге не указан, поэтому я не могу назвать товар «самым качественным». Подбор основан на цене, виде и указанных данных.',
      health: 'Я не делаю заявлений о пользе для здоровья или лечебных свойствах.',
      easyBrew:
        'Простота заваривания отдельно не оценивается; для каждого товара приведена инструкция по завариванию.',
    },
    textRelaxed: (word) => `В описаниях нет слова «${word}», поэтому искал(а) без него.`,
    askCategory: (names) => `Что вам интереснее: ${names}?`,
    askBudget: 'Какой у вас бюджет?',
    askAlternative: 'Увеличим бюджет или посмотрим другой вид?',
    noPrices: {
      ask: 'Что вы ищете? Напишите вид товара или для кого он.',
      quality:
        'Сорт или класс качества в каталоге не указан, поэтому я не могу назвать товар «самым качественным». Подбор основан на виде и указанных данных.',
      askAlternative: 'Посмотрим другой вид?',
    },
  },
  en: {
    found: (count) => `Here ${count === 1 ? 'is 1 product' : `are ${count} products`} that match:`,
    relaxed: (dropped) => `Nothing matched every criterion exactly, so I left out the ${dropped}:`,
    overBudget: (budget) =>
      `There is nothing of this kind under ${budget} UZS. The most affordable ones are:`,
    none: 'Sorry, nothing in the catalogue matches this request right now.',
    ask: 'What are you looking for? Tell me the kind of product, your budget or who it is for.',
    dropped: {
      text: 'descriptive word',
      attributes: 'characteristic',
      formats: 'pack type',
      origin: 'origin',
      category: 'category',
      budget: 'price limit',
    },
    price: (price, single) => `Price: ${single ? `${price} UZS` : `from ${price} UZS`}`,
    withinBudget: (price, budget) => `${price} UZS — within your ${budget} UZS budget`,
    aboveFloor: (price, floor) => `${price} UZS — above ${floor} UZS`,
    inCategory: (name) => `Category: ${name}`,
    format: {
      LOOSE_LEAF: 'Loose leaf',
      TEA_BAGS: 'Tea bags',
      PYRAMIDS: 'Pyramids',
      GIFT_SET: 'Gift set',
      ACCESSORY: 'Accessory',
      OTHER: 'Product',
    },
    attribute: (label, value) => `${label}: ${value}`,
    yes: 'yes',
    no: 'no',
    brewing: (parts) => `Brewing: ${parts.join(', ')}`,
    temperature: (celsius, max) => `${range(celsius, max)} °C`,
    minutes: (from, to) => (to && to !== from ? `${from}–${to} min` : `${from} min`),
    amount: (grams, max) => `${range(grams, max)} g per 250 ml`,
    origin: (origin) => `Origin: ${origin}`,
    textMatch: (word) => `Its description says “${word}”`,
    inStock: 'In stock',
    lowStock: 'Only a few left',
    notes: {
      taste:
        'How mild or strong a product tastes is not recorded in the catalogue; see the description and tasting notes on its page.',
      quality:
        'A quality grade is not recorded in the catalogue, so I cannot call any product “the best”. The choice is based on price, kind and the recorded facts.',
      health: 'I cannot make any health or medical claims about products.',
      easyBrew: 'Ease of brewing is not rated; each product shows its own brewing guide.',
    },
    textRelaxed: (word) => `No description mentions “${word}”, so I searched without it.`,
    askCategory: (names) => `Which would you like: ${names}?`,
    askBudget: 'What is your budget?',
    askAlternative: 'Shall we raise the budget or look at another kind?',
    noPrices: {
      ask: 'What are you looking for? Tell me the kind of product or who it is for.',
      quality:
        'A quality grade is not recorded in the catalogue, so I cannot call any product “the best”. The choice is based on the kind and the recorded facts.',
      askAlternative: 'Shall we look at another kind?',
    },
  },
};
