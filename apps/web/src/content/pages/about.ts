import type { Localized, LongFormContent } from '../types';

/**
 * About page sections that are not part of the official brand copy (the brand story and the three
 * principles come from content/brand.ts). The history is written only from facts TERAN supplied:
 * the name, the company and its city, where the teas grow, the producer and importer printed on
 * the packs, the five teas and the words on every pack (2026-10-17). Uzbek is the original; the
 * Russian and English are translations awaiting the owner's approval.
 */
export const aboutPage: Localized<LongFormContent> = {
  en: {
    title: 'About TERAN',
    metaTitle: 'About TERAN — premium Chinese tea',
    description:
      'TERAN® — premium Chinese tea. In every cup, the rich traditions of Chinese tea culture meet the spirit of Uzbek hospitality.',
    sections: [
      {
        id: 'range',
        heading: 'Something for every cup',
        blocks: [
          'Five Chinese green teas — XC2025, G8810, 8800, 8830 and 8009 — from the mountains of Hunan and Yunnan, each in a 400 g zip pouch.',
        ],
      },
      {
        id: 'history',
        heading: 'Our history',
        blocks: [
          'TERAN is the tea brand of TERAN TRADE MChJ, a company from Namangan, Uzbekistan. Its name is an Uzbek word with ancient Turkic roots that speaks of depth and meaning; we chose it as the symbol of a tea’s rich taste, its delicate aroma and the warm impression that stays after every cup.',
          'Our teas grow on mountain plantations in the Hunan and Yunnan provinces of China and are produced by HUNAN EAST LAND TEA CO., LTD. TERAN TRADE MChJ brings them to Uzbekistan and packs them in 400 g zip pouches.',
          'Today the TERAN premium collection holds five green teas: XC2025, G8810, 8800, 8830 and 8009. Every pack carries the brand’s words: “Sof tabiat. Yaxshi kayfiyat. Teran bilan.” — pure nature, a good mood, with TERAN.',
          'Our aim is in our tagline: to bring together the rich traditions of Chinese tea culture and the spirit of Uzbek hospitality — a deep taste and a lasting impression in every cup.',
        ],
      },
    ],
  },
  ru: {
    title: 'О TERAN',
    metaTitle: 'О TERAN — премиальный китайский чай',
    description:
      'TERAN® — премиальный китайский чай. В каждой пиале традиции китайской чайной культуры соединяются с узбекским гостеприимством.',
    sections: [
      {
        id: 'range',
        heading: 'Для каждой чашки',
        blocks: [
          'Пять китайских зелёных чаёв — XC2025, G8810, 8800, 8830 и 8009 — с гор Хунани и Юньнани, каждый в зип-пакете 400 г.',
        ],
      },
      {
        id: 'history',
        heading: 'Наша история',
        blocks: [
          'TERAN — чайный бренд компании TERAN TRADE MChJ из Намангана, Узбекистан. Его имя — узбекское слово с древними тюркскими корнями, выражающее глубину и смысл; мы выбрали его как символ богатого вкуса чая, его тонкого аромата и тёплого впечатления, которое остаётся после каждой пиалы.',
          'Наши чаи растут на горных плантациях провинций Хунань и Юньнань в Китае, их производит HUNAN EAST LAND TEA CO., LTD. TERAN TRADE MChJ привозит их в Узбекистан и упаковывает в зип-пакеты по 400 г.',
          'Сегодня в премиальной коллекции TERAN пять зелёных чаёв: XC2025, G8810, 8800, 8830 и 8009. На каждой упаковке — слова бренда: «Sof tabiat. Yaxshi kayfiyat. Teran bilan.» — чистая природа, хорошее настроение, вместе с TERAN.',
          'Наша цель — в нашем слогане: соединить богатые традиции китайской чайной культуры с духом узбекского гостеприимства, чтобы в каждой пиале были глубокий вкус и глубокое впечатление.',
        ],
      },
    ],
  },
  uz: {
    title: 'TERAN haqida',
    metaTitle: 'TERAN haqida — premium Xitoy choyi',
    description:
      'TERAN® — premium Xitoy choyi. Har bir piyolada Xitoy choy madaniyatining boy anʼanalari va oʻzbekona mehmondoʻstlik ruhi uygʻunlashadi.',
    sections: [
      {
        id: 'range',
        heading: 'Har bir piyola uchun',
        blocks: [
          'Beshta Xitoy yashil choyi — XC2025, G8810, 8800, 8830 va 8009 — Hunan va Yunnan togʻlaridan, har biri 400 g zip-paketda.',
        ],
      },
      {
        id: 'history',
        heading: 'Bizning tariximiz',
        blocks: [
          'TERAN — Namangandagi TERAN TRADE MChJ kompaniyasining choy brendi. Uning nomi qadimiy turkiy ildizlarga ega, chuqurlik va mazmunni ifodalovchi oʻzbekcha soʻz; biz uni choyning boy taʼmi, nafis ifori va har bir piyolada qoladigan iliq taassurot timsoli sifatida tanladik.',
          'Choylarimiz Xitoyning Hunan va Yunnan viloyatlaridagi togʻli plantatsiyalarda yetishtiriladi va HUNAN EAST LAND TEA CO., LTD tomonidan ishlab chiqariladi. TERAN TRADE MChJ ularni Oʻzbekistonga olib keladi va 400 grammli zip-paketlarga qadoqlaydi.',
          'Bugun TERAN premium kolleksiyasida beshta yashil choy bor: XC2025, G8810, 8800, 8830 va 8009. Har bir qadoqda brendimizning soʻzlari yozilgan: «Sof tabiat. Yaxshi kayfiyat. Teran bilan.»',
          'Maqsadimiz shiorimizda: Xitoy choy madaniyatining boy anʼanalarini oʻzbekona mehmondoʻstlik ruhi bilan uygʻunlashtirish — har bir piyolada teran taʼm va teran taassurot.',
        ],
      },
    ],
  },
};
