import type { Localized } from '../types';

/** The parts of the page that describe how an order is placed. */
interface OrderingCopy {
  title: string;
  description: string;
  intro: string;
  steps: readonly { title: string; text: string }[];
  notes: readonly string[];
}

interface DeliveryContent extends OrderingCopy {
  methodsTitle: string;
  regionsAll: string;
  stepsTitle: string;
  paymentTitle: string;
  notesTitle: string;
  /** The same parts while the shop shows no prices and takes orders by phone and messengers. */
  byContact: OrderingCopy;
}

/**
 * Delivery page copy. Methods, fees, estimates, regions and payment methods are rendered from the
 * live configuration, so the page never promises what checkout does not offer.
 */
export const deliveryPage: Localized<DeliveryContent> = {
  en: {
    title: 'Delivery & payment',
    description:
      'TERAN delivery methods, regions, fees and estimated times, and how to pay for your order.',
    intro:
      'Choose a delivery method at checkout. The fee for your region is calculated before you confirm the order.',
    methodsTitle: 'Delivery methods',
    regionsAll: 'All regions of Uzbekistan',
    stepsTitle: 'How it works',
    steps: [
      { title: 'Place your order', text: 'Choose your region and delivery method at checkout.' },
      {
        title: 'We confirm your order',
        text: 'We call you to confirm the order and agree the delivery.',
      },
      { title: 'The courier delivers', text: 'Check the package when it is handed over to you.' },
    ],
    paymentTitle: 'Payment',
    notesTitle: 'Good to know',
    notes: [
      'Delivery times are estimates and may be longer during holidays or bad weather.',
      'Please give a phone number on which we can reach you, and a landmark if the address is hard to find.',
      'The available payment methods are always shown at checkout.',
    ],
    byContact: {
      title: 'Delivery',
      description:
        'TERAN delivery methods, regions and estimated times, and how to order by phone or on social media.',
      intro:
        'For now we take orders by phone and on social media. We agree the delivery method and fee when you order.',
      steps: [
        {
          title: 'Contact us',
          text: 'Call us or write on Telegram or WhatsApp: tell us the tea and how much you would like.',
        },
        {
          title: 'We confirm your order',
          text: 'We agree the price, the delivery method and the timing with you.',
        },
        { title: 'The courier delivers', text: 'Check the package when it is handed over to you.' },
      ],
      notes: [
        'Delivery times are estimates and may be longer during holidays or bad weather.',
        'Please give a phone number on which we can reach you, and a landmark if the address is hard to find.',
        'We agree the payment method when you order.',
      ],
    },
  },
  ru: {
    title: 'Доставка и оплата',
    description:
      'Способы доставки TERAN, регионы, стоимость и сроки, а также способы оплаты заказа.',
    intro:
      'Выберите способ доставки при оформлении заказа. Стоимость для вашего региона рассчитывается до подтверждения заказа.',
    methodsTitle: 'Способы доставки',
    regionsAll: 'Все регионы Узбекистана',
    stepsTitle: 'Как это работает',
    steps: [
      { title: 'Оформите заказ', text: 'Выберите регион и способ доставки при оформлении.' },
      {
        title: 'Мы подтвердим его',
        text: 'Мы позвоним, чтобы подтвердить заказ и согласовать доставку.',
      },
      { title: 'Курьер привезёт заказ', text: 'Проверьте упаковку при получении заказа.' },
    ],
    paymentTitle: 'Оплата',
    notesTitle: 'Полезно знать',
    notes: [
      'Сроки доставки ориентировочные и могут увеличиваться в праздники или в плохую погоду.',
      'Укажите номер телефона, по которому с вами можно связаться, и ориентир, если адрес сложно найти.',
      'Доступные способы оплаты всегда показываются при оформлении заказа.',
    ],
    byContact: {
      title: 'Доставка',
      description:
        'Способы доставки TERAN, регионы и сроки, а также как заказать по телефону или в соцсетях.',
      intro:
        'Пока заказы принимаются по телефону и в соцсетях. Способ и стоимость доставки согласуем при заказе.',
      steps: [
        {
          title: 'Свяжитесь с нами',
          text: 'Позвоните или напишите в Telegram или WhatsApp: назовите чай и количество.',
        },
        { title: 'Мы подтвердим заказ', text: 'Согласуем с вами цену, способ и сроки доставки.' },
        {
          title: 'Курьер привезёт заказ',
          text: 'Проверьте упаковку при получении заказа.',
        },
      ],
      notes: [
        'Сроки доставки ориентировочные и могут увеличиваться в праздники или в плохую погоду.',
        'Укажите номер телефона, по которому с вами можно связаться, и ориентир, если адрес сложно найти.',
        'Способ оплаты согласуем при заказе.',
      ],
    },
  },
  uz: {
    title: 'Yetkazib berish va toʻlov',
    description:
      'TERAN yetkazib berish usullari, hududlar, narxlar va muddatlar hamda buyurtmani toʻlash usullari.',
    intro:
      'Buyurtmani rasmiylashtirishda yetkazib berish usulini tanlang. Hududingiz uchun narx buyurtmani tasdiqlashdan oldin hisoblanadi.',
    methodsTitle: 'Yetkazib berish usullari',
    regionsAll: 'Oʻzbekistonning barcha hududlari',
    stepsTitle: 'Bu qanday ishlaydi',
    steps: [
      {
        title: 'Buyurtma bering',
        text: 'Rasmiylashtirishda hudud va yetkazib berish usulini tanlang.',
      },
      {
        title: 'Buyurtmani tasdiqlaymiz',
        text: 'Buyurtmani tasdiqlash va yetkazib berishni kelishish uchun qoʻngʻiroq qilamiz.',
      },
      { title: 'Kuryer olib keladi', text: 'Kuryer buyurtmani topshirganda qadoqni tekshiring.' },
    ],
    paymentTitle: 'Toʻlov',
    notesTitle: 'Bilib qoʻyish foydali',
    notes: [
      'Yetkazib berish muddatlari taxminiy boʻlib, bayramlarda yoki yomon ob-havoda uzayishi mumkin.',
      'Siz bilan bogʻlanish mumkin boʻlgan telefon raqamini koʻrsating; manzilni topish qiyin boʻlsa, moʻljalni ham yozing.',
      'Mavjud toʻlov usullari doimo rasmiylashtirishda koʻrsatiladi.',
    ],
    byContact: {
      title: 'Yetkazib berish',
      description:
        'TERAN yetkazib berish usullari, hududlar va muddatlar hamda telefon yoki ijtimoiy tarmoqlar orqali buyurtma berish tartibi.',
      intro:
        'Hozircha buyurtmalar telefon va ijtimoiy tarmoqlar orqali qabul qilinadi. Yetkazib berish usuli va narxini buyurtma berishda kelishib olamiz.',
      steps: [
        {
          title: 'Biz bilan bogʻlaning',
          text: 'Qoʻngʻiroq qiling yoki Telegram, WhatsApp orqali yozing: choy nomi va miqdorini ayting.',
        },
        {
          title: 'Buyurtmani tasdiqlaymiz',
          text: 'Narx, yetkazib berish usuli va muddatini siz bilan kelishib olamiz.',
        },
        { title: 'Kuryer olib keladi', text: 'Kuryer buyurtmani topshirganda qadoqni tekshiring.' },
      ],
      notes: [
        'Yetkazib berish muddatlari taxminiy boʻlib, bayramlarda yoki yomon ob-havoda uzayishi mumkin.',
        'Siz bilan bogʻlanish mumkin boʻlgan telefon raqamini koʻrsating; manzilni topish qiyin boʻlsa, moʻljalni ham yozing.',
        'Toʻlov usulini buyurtma berishda kelishib olamiz.',
      ],
    },
  },
};
