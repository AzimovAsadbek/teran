import type { BusinessType } from '@teran/contracts';
import type { Localized, QuestionGroup } from '../types';

interface WholesaleContent {
  title: string;
  /** Search result title, used as it is (no "— TERAN"). */
  metaTitle: string;
  description: string;
  intro: string;
  /** The five teas offered to businesses (the packs are shown beside it). */
  products: { title: string; text: string };
  /** Becoming a TERAN dealer: what TERAN offers (facts only), then how to start. */
  dealer: { title: string; text: string; points: readonly string[]; contactTitle: string };
  segmentsTitle: string;
  segments: Record<Exclude<BusinessType, 'OTHER'>, string>;
  processTitle: string;
  steps: readonly { title: string; text: string }[];
  formTitle: string;
  formIntro: string;
  faq: QuestionGroup;
  /** The reference's wholesale landing page, in TERAN's words. */
  landing: {
    partnerQuestion: string;
    partnerCta: string;
    heroKicker: string;
    cardsTitle: string;
    cards: readonly [string, string, string];
    cardCta: string;
    whyTitle: string;
    why: { title: string; text: string };
    best: { title: string; text: string };
    valuesKicker: string;
    flavour: { title: string; text: string };
    community: { title: string; text: string };
  };
}

/**
 * For-business page: wholesale and dealership. Commercial terms (minimum order, prices, discounts,
 * delivery schedule) are agreed individually, so none are stated here; the dealer points are facts
 * TERAN supplied (it imports and packs the teas itself, five teas in 400 g zip pouches).
 */
export const wholesalePage: Localized<WholesaleContent> = {
  en: {
    title: 'TERAN for business',
    metaTitle: 'TERAN for business — wholesale and dealers',
    description:
      'Wholesale and dealership: TERAN teas for shops, cafés, restaurants, hotels, distributors and dealers. Send a request and we will contact you.',
    intro:
      'Serve TERAN to your guests, offer it in your shop or choose it as a gift for partners and colleagues. Tell us about your business and we will prepare an offer that fits it.',
    products: {
      title: 'Five teas, one pack size',
      text: 'XC2025 · G8810 · 8800 · 8830 · 8009 — Chinese green teas from the mountains of Hunan and Yunnan, each in a 400 g zip pouch.',
    },
    dealer: {
      title: 'Become a TERAN dealer',
      text: 'We are looking for dealers and distributors in every region of Uzbekistan. Tell us where you work and how you sell, and we will agree the terms with you.',
      points: [
        'Straight from the importer: TERAN TRADE MChJ brings the teas from China and packs them itself.',
        'Five premium green teas in retail-ready 400 g zip pouches.',
        'Terms, prices and delivery agreed with each dealer.',
      ],
      contactTitle: 'Talk to us directly',
    },
    segmentsTitle: 'Who we work with',
    segments: {
      CAFE_RESTAURANT: 'Tea for the menu of cafés, tea houses and restaurants.',
      HOTEL: 'Tea for rooms, breakfast and lounges.',
      RETAIL: 'TERAN packs for the shelves of your shop.',
      DISTRIBUTOR: 'Dealership and distribution in the regions.',
      CORPORATE: 'TERAN teas as gifts for partners, employees and events.',
    },
    processTitle: 'How it works',
    steps: [
      {
        title: 'Send a request',
        text: 'Tell us about your business, your needs and an estimated volume.',
      },
      {
        title: 'We contact you',
        text: 'Our team calls you to discuss the assortment and the details.',
      },
      {
        title: 'Receive an offer',
        text: 'You get an offer with products, prices and delivery terms agreed with you.',
      },
      { title: 'Regular supply', text: 'We deliver on the schedule we agree together.' },
    ],
    formTitle: 'Request an offer',
    formIntro:
      'Fill in the form and we will get back to you. Fields marked “optional” can be left empty.',
    faq: {
      id: 'business-faq',
      heading: 'Questions from businesses',
      items: [
        {
          question: 'Is there a minimum order?',
          answer: [
            'Volumes and terms depend on your business, so we agree them individually after your request.',
          ],
        },
        {
          question: 'Do you deliver across Uzbekistan?',
          answer: [
            'Tell us your region in the request and we will tell you which delivery options are available.',
          ],
        },
        {
          question: 'How do we become a TERAN dealer?',
          answer: [
            'Send the request below, or call or write to us on Telegram or WhatsApp: tell us your region and how you sell, and we will agree the terms with you.',
          ],
        },
      ],
    },
    landing: {
      partnerQuestion: 'Already a TERAN partner?',
      partnerCta: 'Contact us',
      heroKicker: 'Grow with',
      cardsTitle: 'TERAN for every business',
      cards: [
        'For distributors and dealers',
        'For cafés, restaurants and hotels',
        'For shops and corporate gifts',
      ],
      cardCta: 'Apply now',
      whyTitle: 'Why TERAN…',
      why: {
        title: 'Straight from the importer',
        text: 'TERAN TRADE MChJ brings its teas from the mountains of Hunan and Yunnan and packs them itself, so every pouch you sell comes from one source you can call.',
      },
      best: {
        title: 'Five premium teas',
        text: 'Five Chinese green teas, each in a retail-ready 400 g zip pouch: ready for the shelf, the menu or a corporate gift.',
      },
      valuesKicker: 'Premium Chinese tea',
      flavour: {
        title: 'Deep taste',
        text: 'In every cup, the rich traditions of Chinese tea culture meet the spirit of Uzbek hospitality.',
      },
      community: {
        title: 'How we work',
        text: 'Send a request and our team calls you to discuss the assortment. You receive an offer with products, prices and delivery terms agreed with you, and we deliver on the schedule we agree together.',
      },
    },
  },
  ru: {
    title: 'TERAN для бизнеса',
    metaTitle: 'TERAN для бизнеса — опт и дилерство',
    description:
      'Опт и дилерство: чай TERAN для магазинов, кафе, ресторанов, отелей, дистрибьюторов и дилеров. Оставьте заявку, и мы свяжемся с вами.',
    intro:
      'Угощайте гостей чаем TERAN, предлагайте его в своём магазине или выбирайте в подарок партнёрам и коллегам. Расскажите о своём бизнесе — мы подготовим подходящее предложение.',
    products: {
      title: 'Пять чаёв, одна фасовка',
      text: 'XC2025 · G8810 · 8800 · 8830 · 8009 — китайские зелёные чаи с гор Хунани и Юньнани, каждый в зип-пакете 400 г.',
    },
    dealer: {
      title: 'Станьте дилером TERAN',
      text: 'Мы ищем дилеров и дистрибьюторов во всех регионах Узбекистана. Расскажите, где и как вы продаёте, и мы согласуем условия с вами.',
      points: [
        'Напрямую от импортёра: TERAN TRADE MChJ сама привозит чай из Китая и упаковывает его.',
        'Пять премиальных зелёных чаёв в готовых к продаже зип-пакетах по 400 г.',
        'Условия, цены и доставка согласуются с каждым дилером.',
      ],
      contactTitle: 'Свяжитесь с нами напрямую',
    },
    segmentsTitle: 'С кем мы работаем',
    segments: {
      CAFE_RESTAURANT: 'Чай для меню кафе, чайхан и ресторанов.',
      HOTEL: 'Чай для номеров, завтраков и лаундж-зон.',
      RETAIL: 'Упаковки TERAN для полок вашего магазина.',
      DISTRIBUTOR: 'Дилерство и дистрибуция в регионах.',
      CORPORATE: 'Чай TERAN в подарок партнёрам, сотрудникам и на мероприятия.',
    },
    processTitle: 'Как мы работаем',
    steps: [
      { title: 'Оставьте заявку', text: 'Расскажите о бизнесе, потребностях и примерном объёме.' },
      {
        title: 'Мы свяжемся с вами',
        text: 'Наша команда позвонит, чтобы обсудить ассортимент и детали.',
      },
      {
        title: 'Получите предложение',
        text: 'Вы получите предложение с товарами, ценами и условиями доставки, согласованными с вами.',
      },
      { title: 'Регулярные поставки', text: 'Мы доставляем по графику, который согласуем вместе.' },
    ],
    formTitle: 'Запросить предложение',
    formIntro:
      'Заполните форму, и мы свяжемся с вами. Поля с пометкой «необязательно» можно оставить пустыми.',
    faq: {
      id: 'business-faq',
      heading: 'Вопросы от бизнеса',
      items: [
        {
          question: 'Есть ли минимальный заказ?',
          answer: [
            'Объёмы и условия зависят от вашего бизнеса, поэтому мы согласовываем их индивидуально после заявки.',
          ],
        },
        {
          question: 'Доставляете ли вы по всему Узбекистану?',
          answer: ['Укажите регион в заявке, и мы сообщим, какие варианты доставки доступны.'],
        },
        {
          question: 'Как стать дилером TERAN?',
          answer: [
            'Оставьте заявку ниже или позвоните, напишите нам в Telegram или WhatsApp: расскажите о своём регионе и о том, как вы продаёте, и мы согласуем условия.',
          ],
        },
      ],
    },
    landing: {
      partnerQuestion: 'Уже работаете с TERAN?',
      partnerCta: 'Свяжитесь с нами',
      heroKicker: 'Растите вместе с',
      cardsTitle: 'TERAN для любого бизнеса',
      cards: [
        'Для дистрибьюторов и дилеров',
        'Для кафе, ресторанов и отелей',
        'Для магазинов и корпоративных подарков',
      ],
      cardCta: 'Оставить заявку',
      whyTitle: 'Почему TERAN…',
      why: {
        title: 'Напрямую от импортёра',
        text: 'TERAN TRADE MChJ сама привозит чай с гор Хунани и Юньнани и сама его упаковывает: каждая упаковка, которую вы продаёте, — от одного поставщика, которому можно позвонить.',
      },
      best: {
        title: 'Пять премиальных чаёв',
        text: 'Пять китайских зелёных чаёв, каждый в готовом к продаже зип-пакете 400 г: для полки, меню или корпоративного подарка.',
      },
      valuesKicker: 'Премиальный китайский чай',
      flavour: {
        title: 'Глубокий вкус',
        text: 'В каждой чашке богатые традиции китайской чайной культуры встречаются с духом узбекского гостеприимства.',
      },
      community: {
        title: 'Как мы работаем',
        text: 'Оставьте заявку — наша команда позвонит, чтобы обсудить ассортимент. Вы получите предложение с товарами, ценами и условиями доставки, согласованными с вами, а поставки пойдут по графику, который мы согласуем вместе.',
      },
    },
  },
  uz: {
    title: 'Biznes uchun TERAN',
    metaTitle: 'Biznes uchun TERAN — ulgurji savdo va dilerlik',
    description:
      'Ulgurji savdo va dilerlik: doʻkonlar, kafe, restoran, mehmonxona, distribyutor va dilerlar uchun TERAN choylari. Soʻrov qoldiring — biz siz bilan bogʻlanamiz.',
    intro:
      'Mehmonlaringizni TERAN choyi bilan siylang, uni doʻkoningizda taklif qiling yoki hamkorlar va hamkasblarga sovgʻa sifatida tanlang. Biznesingiz haqida aytib bering — biz mos taklif tayyorlaymiz.',
    products: {
      title: 'Beshta choy, bir xil qadoq',
      text: 'XC2025 · G8810 · 8800 · 8830 · 8009 — Hunan va Yunnan togʻlaridan Xitoy yashil choylari, har biri 400 g zip-paketda.',
    },
    dealer: {
      title: 'TERAN dileri boʻling',
      text: 'Oʻzbekistonning barcha hududlarida diler va distribyutorlarni izlaymiz. Qayerda va qanday savdo qilishingizni aytib bering — shartlarni siz bilan kelishamiz.',
      points: [
        'Toʻgʻridan-toʻgʻri import qiluvchidan: TERAN TRADE MChJ choylarni Xitoydan oʻzi olib keladi va oʻzi qadoqlaydi.',
        'Chakana savdoga tayyor 400 g zip-paketlarda beshta premium yashil choy.',
        'Shartlar, narxlar va yetkazib berish har bir diler bilan alohida kelishiladi.',
      ],
      contactTitle: 'Biz bilan toʻgʻridan-toʻgʻri bogʻlaning',
    },
    segmentsTitle: 'Kimlar bilan ishlaymiz',
    segments: {
      CAFE_RESTAURANT: 'Kafe, choyxona va restoranlar menyusi uchun choy.',
      HOTEL: 'Xonalar, nonushta va dam olish zonalari uchun choy.',
      RETAIL: 'Doʻkoningiz peshtaxtalari uchun TERAN qadoqlari.',
      DISTRIBUTOR: 'Hududlarda dilerlik va distribyutsiya boʻyicha hamkorlik.',
      CORPORATE: 'Hamkorlar, xodimlar va tadbirlar uchun sovgʻa sifatida TERAN choylari.',
    },
    processTitle: 'Qanday ishlaymiz',
    steps: [
      {
        title: 'Soʻrov qoldiring',
        text: 'Biznesingiz, ehtiyojlaringiz va taxminiy hajm haqida aytib bering.',
      },
      {
        title: 'Biz bogʻlanamiz',
        text: 'Jamoamiz assortiment va tafsilotlarni muhokama qilish uchun qoʻngʻiroq qiladi.',
      },
      {
        title: 'Taklif oling',
        text: 'Siz bilan kelishilgan mahsulotlar, narxlar va yetkazib berish shartlari bilan taklif olasiz.',
      },
      {
        title: 'Muntazam taʼminot',
        text: 'Birgalikda kelishilgan jadval boʻyicha yetkazib beramiz.',
      },
    ],
    formTitle: 'Taklif soʻrash',
    formIntro:
      'Shaklni toʻldiring va biz siz bilan bogʻlanamiz. «Ixtiyoriy» deb belgilangan maydonlarni boʻsh qoldirish mumkin.',
    faq: {
      id: 'business-faq',
      heading: 'Biznes vakillarining savollari',
      items: [
        {
          question: 'Minimal buyurtma bormi?',
          answer: [
            'Hajm va shartlar biznesingizga bogʻliq, shuning uchun ularni soʻrovingizdan keyin alohida kelishamiz.',
          ],
        },
        {
          question: 'Oʻzbekistonning boshqa hududlariga ham yetkazib berasizmi?',
          answer: [
            'Soʻrovda hududingizni koʻrsating va biz qanday yetkazib berish imkoniyatlari borligini aytamiz.',
          ],
        },
        {
          question: 'Qanday qilib TERAN dileri boʻlish mumkin?',
          answer: [
            'Quyidagi soʻrovni qoldiring yoki qoʻngʻiroq qiling, Telegram yoki WhatsApp orqali yozing: hududingiz va savdo usulingizni aytib bering — shartlarni kelishamiz.',
          ],
        },
      ],
    },
    landing: {
      partnerQuestion: 'TERAN bilan allaqachon ishlaysizmi?',
      partnerCta: 'Biz bilan bogʻlaning',
      heroKicker: 'Birga oʻsamiz:',
      cardsTitle: 'Har bir biznes uchun TERAN',
      cards: [
        'Distribyutor va dilerlar uchun',
        'Kafe, restoran va mehmonxonalar uchun',
        'Doʻkonlar va korporativ sovgʻalar uchun',
      ],
      cardCta: 'Ariza qoldirish',
      whyTitle: 'Nega aynan TERAN…',
      why: {
        title: 'Toʻgʻridan-toʻgʻri import qiluvchidan',
        text: 'TERAN TRADE MChJ choylarni Hunan va Yunnan togʻlaridan oʻzi olib keladi va oʻzi qadoqlaydi: siz sotadigan har bir qadoq bitta manbadan keladi va u bilan bevosita bogʻlanish mumkin.',
      },
      best: {
        title: 'Beshta premium choy',
        text: 'Beshta Xitoy yashil choyi, har biri chakana savdoga tayyor 400 g zip-paketda: peshtaxta, menyu yoki korporativ sovgʻa uchun.',
      },
      valuesKicker: 'Premium Xitoy choyi',
      flavour: {
        title: 'Teran taʼm',
        text: 'Har bir piyolada Xitoy choy madaniyatining boy anʼanalari oʻzbek mehmondoʻstligi ruhi bilan uchrashadi.',
      },
      community: {
        title: 'Qanday ishlaymiz',
        text: 'Soʻrov qoldiring — jamoamiz assortimentni muhokama qilish uchun qoʻngʻiroq qiladi. Siz bilan kelishilgan mahsulotlar, narxlar va yetkazib berish shartlari bilan taklif olasiz, taʼminot esa birga kelishilgan jadval boʻyicha boʻladi.',
      },
    },
  },
};
