import type { BusinessType } from '@teran/contracts';
import type { Localized, QuestionGroup } from '../types';

interface WholesaleContent {
  title: string;
  description: string;
  intro: string;
  segmentsTitle: string;
  segments: Record<Exclude<BusinessType, 'OTHER'>, string>;
  processTitle: string;
  steps: readonly { title: string; text: string }[];
  formTitle: string;
  formIntro: string;
  faq: QuestionGroup;
}

/**
 * For-business page. Commercial terms (minimum order, prices, delivery schedule) are agreed
 * individually, so none are stated here.
 */
export const wholesalePage: Localized<WholesaleContent> = {
  en: {
    title: 'TERAN for business',
    description:
      'Tea for cafés, restaurants, hotels, shops, distributors and corporate gifts. Send a request and we will contact you.',
    intro:
      'Serve TERAN to your guests, offer it in your shop or choose it as a gift for partners and colleagues. Tell us about your business and we will prepare an offer that fits it.',
    segmentsTitle: 'Who we work with',
    segments: {
      CAFE_RESTAURANT: 'Tea for the menu of cafés, tea houses and restaurants.',
      HOTEL: 'Tea for rooms, breakfast and lounges.',
      RETAIL: 'TERAN packs for the shelves of your shop.',
      DISTRIBUTOR: 'Partnership for distribution in the regions.',
      CORPORATE: 'Gift sets for partners, employees and events.',
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
          question: 'Do you deliver outside Tashkent?',
          answer: [
            'Tell us your region in the request and we will tell you which delivery options are available.',
          ],
        },
        {
          question: 'Can we get gift sets with our own card or message?',
          answer: [
            'Describe what you have in mind in the request and we will tell you what is possible.',
          ],
        },
      ],
    },
  },
  ru: {
    title: 'TERAN для бизнеса',
    description:
      'Чай для кафе, ресторанов, отелей, магазинов, дистрибьюторов и корпоративных подарков. Оставьте заявку — мы свяжемся с вами.',
    intro:
      'Угощайте гостей чаем TERAN, предлагайте его в своём магазине или выбирайте в подарок партнёрам и коллегам. Расскажите о своём бизнесе — мы подготовим подходящее предложение.',
    segmentsTitle: 'С кем мы работаем',
    segments: {
      CAFE_RESTAURANT: 'Чай для меню кафе, чайхан и ресторанов.',
      HOTEL: 'Чай для номеров, завтраков и лаундж-зон.',
      RETAIL: 'Упаковки TERAN для полок вашего магазина.',
      DISTRIBUTOR: 'Партнёрство по дистрибуции в регионах.',
      CORPORATE: 'Подарочные наборы для партнёров, сотрудников и мероприятий.',
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
          question: 'Доставляете ли вы за пределы Ташкента?',
          answer: ['Укажите регион в заявке, и мы сообщим, какие варианты доставки доступны.'],
        },
        {
          question: 'Можно ли получить подарочные наборы с нашей открыткой или поздравлением?',
          answer: ['Опишите свою идею в заявке, и мы расскажем, что возможно.'],
        },
      ],
    },
  },
  uz: {
    title: 'Biznes uchun TERAN',
    description:
      'Kafe, restoran, mehmonxona, doʻkon, distribyutorlar va korporativ sovgʻalar uchun choy. Soʻrov qoldiring — biz siz bilan bogʻlanamiz.',
    intro:
      'Mehmonlaringizni TERAN choyi bilan siylang, uni doʻkoningizda taklif qiling yoki hamkorlar va hamkasblarga sovgʻa sifatida tanlang. Biznesingiz haqida aytib bering — biz mos taklif tayyorlaymiz.',
    segmentsTitle: 'Kimlar bilan ishlaymiz',
    segments: {
      CAFE_RESTAURANT: 'Kafe, choyxona va restoranlar menyusi uchun choy.',
      HOTEL: 'Xonalar, nonushta va lounge zonalar uchun choy.',
      RETAIL: 'Doʻkoningiz peshtaxtalari uchun TERAN qadoqlari.',
      DISTRIBUTOR: 'Hududlarda distribyutsiya boʻyicha hamkorlik.',
      CORPORATE: 'Hamkorlar, xodimlar va tadbirlar uchun sovgʻa toʻplamlari.',
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
      'Formani toʻldiring va biz siz bilan bogʻlanamiz. «Ixtiyoriy» deb belgilangan maydonlarni boʻsh qoldirish mumkin.',
    faq: {
      id: 'business-faq',
      heading: 'Bizneslardan savollar',
      items: [
        {
          question: 'Minimal buyurtma bormi?',
          answer: [
            'Hajm va shartlar biznesingizga bogʻliq, shuning uchun ularni soʻrovingizdan keyin alohida kelishamiz.',
          ],
        },
        {
          question: 'Toshkentdan tashqariga yetkazib berasizmi?',
          answer: [
            'Soʻrovda hududingizni koʻrsating va biz qanday yetkazib berish imkoniyatlari borligini aytamiz.',
          ],
        },
        {
          question: 'Oʻz otkritkamiz yoki tabrigimiz bilan sovgʻa toʻplamlari olish mumkinmi?',
          answer: [
            'Gʻoyangizni soʻrovda tasvirlang va biz nima qilish mumkinligini aytib beramiz.',
          ],
        },
      ],
    },
  },
};
