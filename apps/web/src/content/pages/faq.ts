import type { Locale } from '@teran/contracts';
import type { Block, Localized, QuestionGroup } from '../types';

/**
 * Help centre answers. They describe how the store works (guest checkout, cash on delivery,
 * configured delivery methods) and general tea knowledge; nothing about specific products.
 */
export const faqGroups: Localized<readonly QuestionGroup[]> = {
  en: [
    {
      id: 'ordering',
      heading: 'Ordering',
      items: [
        {
          question: 'How do I place an order?',
          answer: [
            'Add teas to your bag, open the bag and choose “Checkout”. Enter your contact details and address, choose a delivery method and confirm. We call you to confirm the order.',
          ],
        },
        {
          question: 'Do I need an account?',
          answer: [
            'No. You can order as a guest. An account simply keeps your orders and details in one place.',
          ],
        },
        {
          question: 'How can I follow my order?',
          answer: [
            'After placing an order you get a private link to its status page. If you have an account, your orders are also listed there.',
          ],
        },
        {
          question: 'Can I change or cancel my order?',
          answer: [
            'Yes, as long as it has not been sent. Contact us as soon as possible with your order number.',
          ],
        },
      ],
    },
    {
      id: 'payment',
      heading: 'Payment',
      items: [
        {
          question: 'How can I pay?',
          answer: [
            'The available methods are shown at checkout. At present you pay in cash to the courier when you receive your order.',
          ],
        },
        {
          question: 'Is my order paid when I place it?',
          answer: [
            'No. With cash on delivery nothing is charged online; you pay only when the order is handed to you.',
          ],
        },
      ],
    },
    {
      id: 'delivery',
      heading: 'Delivery',
      items: [
        {
          question: 'Where do you deliver and how much does it cost?',
          answer: [
            'Delivery methods, regions, fees and estimated times are listed on the Delivery page. The exact fee for your region is calculated at checkout before you confirm the order.',
          ],
        },
        {
          question: 'When will my order arrive?',
          answer: [
            'Each delivery method shows an estimated time. We call to confirm your order and agree the delivery with you.',
          ],
        },
      ],
    },
    {
      id: 'tea',
      heading: 'About tea',
      items: [
        {
          question: 'How should I store tea?',
          answer: [
            'Keep tea in a closed container away from light, moisture, heat and strong smells. Close the package well after each use.',
          ],
        },
        {
          question: 'How do I brew it?',
          answer: [
            'When brewing guidance is available, you will find water temperature, amount and steeping time on the product page. Adjust the time to taste: longer for a stronger cup.',
          ],
        },
        {
          question: 'Do all teas contain caffeine?',
          answer: [
            'Black, green, white and oolong teas are made from the tea plant and naturally contain caffeine. Herbal and fruit infusions are usually caffeine-free. When caffeine information is available it is shown on the product page.',
          ],
        },
      ],
    },
    {
      id: 'returns',
      heading: 'Returns',
      items: [
        {
          question: 'What if my order arrives damaged or incorrect?',
          answer: [
            'Contact us with your order number and, if possible, a photo. The Returns & refunds page explains the process.',
          ],
        },
      ],
    },
  ],
  ru: [
    {
      id: 'ordering',
      heading: 'Заказ',
      items: [
        {
          question: 'Как оформить заказ?',
          answer: [
            'Добавьте чай в корзину, откройте её и нажмите «Оформить заказ». Укажите контакты и адрес, выберите способ доставки и подтвердите. Мы позвоним, чтобы подтвердить заказ.',
          ],
        },
        {
          question: 'Нужен ли аккаунт?',
          answer: [
            'Нет, можно заказать без регистрации. Аккаунт просто хранит ваши заказы и данные в одном месте.',
          ],
        },
        {
          question: 'Как отследить заказ?',
          answer: [
            'После оформления вы получаете персональную ссылку на страницу статуса заказа. Если у вас есть аккаунт, заказы также видны в нём.',
          ],
        },
        {
          question: 'Можно ли изменить или отменить заказ?',
          answer: [
            'Да, пока он не отправлен. Свяжитесь с нами как можно скорее и назовите номер заказа.',
          ],
        },
      ],
    },
    {
      id: 'payment',
      heading: 'Оплата',
      items: [
        {
          question: 'Как оплатить заказ?',
          answer: [
            'Доступные способы показываются при оформлении. Сейчас оплата производится наличными курьеру при получении.',
          ],
        },
        {
          question: 'Оплачивается ли заказ при оформлении?',
          answer: [
            'Нет. При оплате наличными ничего не списывается онлайн — вы платите только при получении заказа.',
          ],
        },
      ],
    },
    {
      id: 'delivery',
      heading: 'Доставка',
      items: [
        {
          question: 'Куда вы доставляете и сколько это стоит?',
          answer: [
            'Способы, регионы, стоимость и ориентировочные сроки доставки указаны на странице «Доставка». Точная стоимость для вашего региона рассчитывается при оформлении, до подтверждения заказа.',
          ],
        },
        {
          question: 'Когда придёт заказ?',
          answer: [
            'У каждого способа доставки указан ориентировочный срок. Мы звоним, чтобы подтвердить заказ и согласовать доставку.',
          ],
        },
      ],
    },
    {
      id: 'tea',
      heading: 'О чае',
      items: [
        {
          question: 'Как хранить чай?',
          answer: [
            'Храните чай в закрытой ёмкости вдали от света, влаги, тепла и сильных запахов. Плотно закрывайте упаковку после каждого использования.',
          ],
        },
        {
          question: 'Как его заваривать?',
          answer: [
            'Если для товара есть рекомендации, температура воды, количество чая и время заваривания указаны на его странице. Подстройте время под свой вкус: дольше — крепче.',
          ],
        },
        {
          question: 'Во всех ли чаях есть кофеин?',
          answer: [
            'Чёрный, зелёный, белый чай и улун делают из чайного растения, и они естественно содержат кофеин. Травяные и фруктовые напитки обычно его не содержат. Если информация о кофеине есть, она указана на странице товара.',
          ],
        },
      ],
    },
    {
      id: 'returns',
      heading: 'Возврат',
      items: [
        {
          question: 'Что делать, если заказ пришёл повреждённым или неверным?',
          answer: [
            'Свяжитесь с нами, назовите номер заказа и, по возможности, приложите фото. Порядок описан на странице «Возврат и обмен».',
          ],
        },
      ],
    },
  ],
  uz: [
    {
      id: 'ordering',
      heading: 'Buyurtma',
      items: [
        {
          question: 'Qanday buyurtma beraman?',
          answer: [
            'Choylarni savatga qoʻshing, savatni oching va «Buyurtmani rasmiylashtirish» tugmasini bosing. Aloqa maʼlumotlari va manzilni kiriting, yetkazib berish usulini tanlang va tasdiqlang. Buyurtmani tasdiqlash uchun sizga qoʻngʻiroq qilamiz.',
          ],
        },
        {
          question: 'Hisob ochish shartmi?',
          answer: [
            'Yoʻq, roʻyxatdan oʻtmasdan ham buyurtma berish mumkin. Hisob shunchaki buyurtmalaringiz va maʼlumotlaringizni bir joyda saqlaydi.',
          ],
        },
        {
          question: 'Buyurtmani qanday kuzataman?',
          answer: [
            'Buyurtma berganingizdan soʻng uning holati sahifasiga shaxsiy havola olasiz. Agar hisobingiz boʻlsa, buyurtmalar unda ham koʻrinadi.',
          ],
        },
        {
          question: 'Buyurtmani oʻzgartirish yoki bekor qilish mumkinmi?',
          answer: [
            'Ha, u joʻnatilmagan boʻlsa. Imkon qadar tezroq biz bilan bogʻlaning va buyurtma raqamini ayting.',
          ],
        },
      ],
    },
    {
      id: 'payment',
      heading: 'Toʻlov',
      items: [
        {
          question: 'Qanday toʻlash mumkin?',
          answer: [
            'Mavjud usullar rasmiylashtirishda koʻrsatiladi. Hozircha toʻlov buyurtmani qabul qilishda kuryerga naqd pul bilan amalga oshiriladi.',
          ],
        },
        {
          question: 'Buyurtma berilganda pul yechiladimi?',
          answer: [
            'Yoʻq. Naqd toʻlovda onlayn hech narsa yechilmaydi — faqat buyurtmani olganingizda toʻlaysiz.',
          ],
        },
      ],
    },
    {
      id: 'delivery',
      heading: 'Yetkazib berish',
      items: [
        {
          question: 'Qayerga yetkazib berasiz va bu qancha turadi?',
          answer: [
            'Yetkazib berish usullari, hududlar, narxlar va taxminiy muddatlar «Yetkazib berish» sahifasida koʻrsatilgan. Hududingiz uchun aniq narx buyurtmani tasdiqlashdan oldin, rasmiylashtirishda hisoblanadi.',
          ],
        },
        {
          question: 'Buyurtma qachon yetib keladi?',
          answer: [
            'Har bir yetkazib berish usulida taxminiy muddat koʻrsatilgan. Buyurtmani tasdiqlash va yetkazib berishni kelishish uchun qoʻngʻiroq qilamiz.',
          ],
        },
      ],
    },
    {
      id: 'tea',
      heading: 'Choy haqida',
      items: [
        {
          question: 'Choyni qanday saqlash kerak?',
          answer: [
            'Choyni yorugʻlik, namlik, issiqlik va kuchli hidlardan uzoqda, yopiq idishda saqlang. Har safar foydalangandan keyin qadoqni yaxshilab yoping.',
          ],
        },
        {
          question: 'Uni qanday damlash kerak?',
          answer: [
            'Agar mahsulot uchun tavsiyalar boʻlsa, suv harorati, choy miqdori va damlash vaqti uning sahifasida koʻrsatilgan. Vaqtni taʼbingizga qarab oʻzgartiring: qancha uzoq boʻlsa, shuncha toʻq.',
          ],
        },
        {
          question: 'Barcha choylarda kofein bormi?',
          answer: [
            'Qora, yashil, oq choy va ulun choy oʻsimligidan tayyorlanadi va tarkibida tabiiy ravishda kofein bor. Giyohli va mevali damlamalarda odatda kofein boʻlmaydi. Kofein haqida maʼlumot mavjud boʻlsa, u mahsulot sahifasida koʻrsatiladi.',
          ],
        },
      ],
    },
    {
      id: 'returns',
      heading: 'Qaytarish',
      items: [
        {
          question: 'Buyurtma shikastlangan yoki notoʻgʻri kelsa nima qilish kerak?',
          answer: [
            'Biz bilan bogʻlaning, buyurtma raqamini ayting va iloji boʻlsa surat yuboring. Tartib «Qaytarish va almashtirish» sahifasida tushuntirilgan.',
          ],
        },
      ],
    },
  ],
};

/**
 * The answers about the bag and checkout as they read while the shop shows no prices and takes
 * orders by phone and messengers (lib/site `showPrices` off): by group id, then by the question's
 * position in that group. The questions themselves stay.
 */
export const faqByContact: Localized<
  Readonly<Record<string, Readonly<Record<number, readonly Block[]>>>>
> = {
  en: {
    ordering: {
      0: [
        'For now we take orders by phone and on social media: call us, or write on Telegram or WhatsApp with the tea and how much you would like. We agree the price, the delivery and the payment there and then.',
      ],
      1: ['No. To order, simply call or write to us.'],
      2: ['Call or write to us and we will tell you where your order is.'],
    },
    payment: {
      0: ['We agree the payment method when you order.'],
      1: ['No. The website takes no payments.'],
    },
    delivery: {
      0: [
        'Delivery methods, regions and estimated times are listed on the Delivery page. We agree the delivery fee when you order.',
      ],
    },
  },
  ru: {
    ordering: {
      0: [
        'Пока заказы принимаются по телефону и в соцсетях: позвоните нам или напишите в Telegram или WhatsApp, назовите чай и количество. Цену, доставку и оплату согласуем сразу.',
      ],
      1: ['Нет. Чтобы заказать, достаточно позвонить или написать нам.'],
      2: ['Позвоните или напишите нам — мы расскажем, где ваш заказ.'],
    },
    payment: {
      0: ['Способ оплаты согласуем при заказе.'],
      1: ['Нет. Через сайт оплата не принимается.'],
    },
    delivery: {
      0: [
        'Способы, регионы и ориентировочные сроки доставки указаны на странице «Доставка». Стоимость доставки согласуем при заказе.',
      ],
    },
  },
  uz: {
    ordering: {
      0: [
        'Hozircha buyurtmalar telefon va ijtimoiy tarmoqlar orqali qabul qilinadi: bizga qoʻngʻiroq qiling yoki Telegram, WhatsApp orqali yozing va choy nomi hamda miqdorini ayting. Narx, yetkazib berish va toʻlovni shu yerning oʻzida kelishib olamiz.',
      ],
      1: ['Yoʻq. Buyurtma berish uchun bizga qoʻngʻiroq qilish yoki yozish kifoya.'],
      2: ['Bizga qoʻngʻiroq qiling yoki yozing — buyurtmangiz qayerdaligini aytib beramiz.'],
    },
    payment: {
      0: ['Toʻlov usulini buyurtma berishda kelishib olamiz.'],
      1: ['Yoʻq. Sayt orqali toʻlov qabul qilinmaydi.'],
    },
    delivery: {
      0: [
        'Yetkazib berish usullari, hududlar va taxminiy muddatlar «Yetkazib berish» sahifasida koʻrsatilgan. Yetkazib berish narxini buyurtma berishda kelishib olamiz.',
      ],
    },
  },
};

/** The FAQ as it applies now: with checkout, or (`byContact`) with ordering by phone and messengers. */
export function faqFor(locale: Locale, byContact: boolean): readonly QuestionGroup[] {
  const groups = faqGroups[locale];
  if (!byContact) return groups;
  return groups.map((group) => {
    const answers = faqByContact[locale][group.id];
    if (!answers) return group;
    return {
      ...group,
      items: group.items.map((item, index) => ({ ...item, answer: answers[index] ?? item.answer })),
    };
  });
}

/** A help-centre article: one question with its answer, addressed by a slug. */
export interface HelpArticle {
  slug: string;
  group: string;
  question: string;
  answer: readonly Block[];
}

/** A help-centre category: one FAQ group and its questions as articles. */
export interface HelpCategory {
  id: string;
  heading: string;
  articles: readonly HelpArticle[];
}

/** An address made from an English question ("Do I need an account?" → "do-i-need-an-account"). */
function slugFrom(question: string): string {
  return question
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-');
}

/**
 * The FAQ as the reference's help centre: each group a category, each question an article. An
 * article keeps one address in every language (made from its English question).
 */
export function helpCentre(locale: Locale, byContact: boolean): readonly HelpCategory[] {
  return faqFor(locale, byContact).map((group) => {
    const english = faqGroups.en.find((candidate) => candidate.id === group.id);
    return {
      id: group.id,
      heading: group.heading,
      articles: group.items.map((item, index) => ({
        slug: slugFrom(english?.items[index]?.question ?? item.question),
        group: group.id,
        question: item.question,
        answer: item.answer,
      })),
    };
  });
}
