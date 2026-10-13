import type { Localized } from '../types';

interface DeliveryContent {
  title: string;
  description: string;
  intro: string;
  methodsTitle: string;
  regionsAll: string;
  stepsTitle: string;
  steps: readonly { title: string; text: string }[];
  paymentTitle: string;
  notesTitle: string;
  notes: readonly string[];
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
      { title: 'We confirm it', text: 'We call you to confirm the order and agree the delivery.' },
      { title: 'The courier delivers', text: 'Check the package when it is handed over to you.' },
    ],
    paymentTitle: 'Payment',
    notesTitle: 'Good to know',
    notes: [
      'Delivery times are estimates and may be longer during holidays or bad weather.',
      'Please give a phone number on which we can reach you, and a landmark if the address is hard to find.',
      'The available payment methods are always shown at checkout.',
    ],
  },
  ru: {
    title: 'Доставка и оплата',
    description:
      'Способы доставки TERAN, регионы, стоимость и сроки, а также способы оплаты заказа.',
    intro:
      'Выберите способ доставки при оформлении заказа. Стоимость для вашего региона рассчитывается до подтверждения заказа.',
    methodsTitle: 'Способы доставки',
    regionsAll: 'Все регионы Узбекистана',
    stepsTitle: 'Как это работает',
    steps: [
      { title: 'Оформите заказ', text: 'Выберите регион и способ доставки при оформлении.' },
      {
        title: 'Мы подтвердим его',
        text: 'Мы позвоним, чтобы подтвердить заказ и согласовать доставку.',
      },
      { title: 'Курьер привезёт заказ', text: 'Проверьте упаковку, когда курьер передаёт заказ.' },
    ],
    paymentTitle: 'Оплата',
    notesTitle: 'Полезно знать',
    notes: [
      'Сроки доставки ориентировочные и могут увеличиваться в праздники или в плохую погоду.',
      'Укажите номер телефона, по которому с вами можно связаться, и ориентир, если адрес сложно найти.',
      'Доступные способы оплаты всегда показываются при оформлении заказа.',
    ],
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
        title: 'Biz uni tasdiqlaymiz',
        text: 'Buyurtmani tasdiqlash va yetkazib berishni kelishish uchun qoʻngʻiroq qilamiz.',
      },
      { title: 'Kuryer olib keladi', text: 'Kuryer buyurtmani topshirganda qadoqni tekshiring.' },
    ],
    paymentTitle: 'Toʻlov',
    notesTitle: 'Bilib qoʻyish foydali',
    notes: [
      'Yetkazib berish muddatlari taxminiy boʻlib, bayramlarda yoki yomon ob-havoda uzayishi mumkin.',
      'Siz bilan bogʻlanish mumkin boʻlgan telefon raqamini va manzilni topish qiyin boʻlsa, moʻljalni koʻrsating.',
      'Mavjud toʻlov usullari doimo rasmiylashtirishda koʻrsatiladi.',
    ],
  },
};
