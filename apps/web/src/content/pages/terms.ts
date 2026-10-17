import type { Locale } from '@teran/contracts';
import type { Localized, LongFormContent, Section } from '../types';

/**
 * Terms of use, in two versions of the sections on prices, orders, payment and delivery: the
 * online shop's (prices, the bag and checkout, NEXT_PUBLIC_SHOW_PRICES) and, while prices are
 * hidden, ordering by phone and messengers (termsByContact). Details TERAN has not supplied (its
 * taxpayer number and full legal address) are left out rather than invented; a lawyer should
 * review the text.
 */
export const termsOfUse: Localized<LongFormContent> = {
  en: {
    title: 'Terms of use',
    description: 'The terms that apply when you use the TERAN online store and place an order.',
    intro:
      'These terms apply to the use of this website and to orders placed in the TERAN online store. Please read them before ordering. Last updated: 18 October 2026.',
    sections: [
      {
        id: 'seller',
        heading: 'The seller',
        blocks: [
          'The store is operated by TERAN TRADE MChJ, a limited liability company in Namangan, Uzbekistan. Phone: +998 97 570 70 07, +998 95 110 13 26; e-mail: terantradellc@gmail.com; website: www.terantrade.uz.',
        ],
      },
      {
        id: 'products',
        heading: 'Products and information',
        blocks: [
          'We describe our products as accurately as we can. Packaging and colours on screen may differ slightly from the product you receive. Brewing recommendations are guidance, not instructions you must follow.',
        ],
      },
      {
        id: 'prices',
        heading: 'Prices',
        blocks: [
          'Prices are shown in Uzbek sum (UZS). The price that applies is the one shown when you place the order. The delivery fee is calculated at checkout from your region and the delivery method, and the total is shown before you confirm.',
          'If a price or stock changes while you are checking out, the store tells you and asks you to confirm the new total; an order is never placed at a total you have not seen.',
        ],
      },
      {
        id: 'orders',
        heading: 'Orders',
        blocks: [
          'By placing an order you make an offer to buy the selected products. We confirm the order by phone or through a messenger; the contract is concluded when we confirm it. We may decline an order, for example if a product is no longer available or the contact details are incorrect, and we will tell you if we do.',
          'After placing an order you receive a private link to follow its status. Keep this link to yourself.',
        ],
      },
      {
        id: 'payment',
        heading: 'Payment',
        blocks: [
          'The payment methods available are shown at checkout. At present orders are paid in cash to the courier on delivery. We never ask for bank card details by phone or message.',
        ],
      },
      {
        id: 'delivery',
        heading: 'Delivery',
        blocks: [
          'Delivery methods, regions, fees and estimated times are listed on the Delivery page and at checkout. Times are estimates. Please make sure someone can receive the order at the address and phone number you give, and check the package when it is handed over.',
        ],
      },
      {
        id: 'returns',
        heading: 'Returns and complaints',
        blocks: [
          'Returns and complaints are handled as described in the Returns & refunds policy. Nothing in these terms limits your rights under the Law of the Republic of Uzbekistan "On Protection of Consumer Rights".',
        ],
      },
      {
        id: 'accounts',
        heading: 'Customer accounts',
        blocks: [
          'You do not need an account to order. If you create one, keep your password secret and give accurate details. We may suspend an account that is used to misuse the store.',
        ],
      },
      {
        id: 'ip',
        heading: 'Intellectual property',
        blocks: [
          'The TERAN® name and logo are trademarks, and the texts, pictures and design of this website are protected by copyright; they may not be copied or used without TERAN’s written permission.',
        ],
      },
      {
        id: 'liability',
        heading: 'Liability',
        blocks: [
          'We are responsible for the products we sell in accordance with the law. We are not liable for interruptions of the website caused by events beyond our reasonable control.',
        ],
      },
      {
        id: 'law',
        heading: 'Applicable law',
        blocks: [
          'These terms are governed by the laws of the Republic of Uzbekistan. We will try to resolve any dispute through dialogue first; otherwise it is settled by the competent court of the Republic of Uzbekistan in accordance with the law.',
        ],
      },
      {
        id: 'changes',
        heading: 'Changes to these terms',
        blocks: [
          'We may update these terms. The version in force when you place an order applies to that order.',
        ],
      },
    ],
  },
  ru: {
    title: 'Условия использования',
    description:
      'Условия, которые действуют при использовании интернет-магазина TERAN и оформлении заказа.',
    intro:
      'Эти условия применяются к использованию сайта и к заказам в интернет-магазине TERAN. Пожалуйста, ознакомьтесь с ними перед заказом. Дата последнего обновления: 18.10.2026.',
    sections: [
      {
        id: 'seller',
        heading: 'Продавец',
        blocks: [
          'Магазином управляет общество с ограниченной ответственностью «TERAN TRADE» (TERAN TRADE MChJ), Наманган, Узбекистан. Телефоны: +998 97 570 70 07, +998 95 110 13 26; e-mail: terantradellc@gmail.com; сайт: www.terantrade.uz.',
        ],
      },
      {
        id: 'products',
        heading: 'Товары и информация',
        blocks: [
          'Мы стараемся описывать товары максимально точно. Упаковка и цвета на экране могут немного отличаться от полученного товара. Рекомендации по завариванию носят ознакомительный характер.',
        ],
      },
      {
        id: 'prices',
        heading: 'Цены',
        blocks: [
          'Цены указаны в узбекских сумах (UZS). Действует цена, указанная в момент оформления заказа. Стоимость доставки рассчитывается при оформлении в зависимости от региона и способа доставки, а итоговая сумма показывается до подтверждения.',
          'Если во время оформления цена или наличие изменятся, магазин сообщит об этом и попросит подтвердить новую сумму — заказ никогда не оформляется на сумму, которую вы не видели.',
        ],
      },
      {
        id: 'orders',
        heading: 'Заказы',
        blocks: [
          'Оформляя заказ, вы делаете предложение купить выбранные товары. Мы подтверждаем заказ по телефону или в мессенджере; договор считается заключённым после подтверждения. Мы можем отклонить заказ, например если товара больше нет в наличии или контактные данные неверны, и сообщим вам об этом.',
          'После оформления вы получаете персональную ссылку для отслеживания статуса заказа. Не передавайте её другим.',
        ],
      },
      {
        id: 'payment',
        heading: 'Оплата',
        blocks: [
          'Доступные способы оплаты показываются при оформлении заказа. Сейчас заказы оплачиваются наличными курьеру при получении. Мы никогда не запрашиваем данные банковской карты по телефону или в сообщениях.',
        ],
      },
      {
        id: 'delivery',
        heading: 'Доставка',
        blocks: [
          'Способы, регионы, стоимость и ориентировочные сроки доставки указаны на странице «Доставка» и при оформлении заказа. Сроки являются ориентировочными. Убедитесь, что по указанному адресу и телефону заказ смогут принять, и проверьте упаковку при получении.',
        ],
      },
      {
        id: 'returns',
        heading: 'Возврат и претензии',
        blocks: [
          'Возвраты и претензии рассматриваются согласно политике возврата. Ничто в этих условиях не ограничивает ваши права по Закону Республики Узбекистан «О защите прав потребителей».',
        ],
      },
      {
        id: 'accounts',
        heading: 'Аккаунты покупателей',
        blocks: [
          'Для заказа аккаунт не нужен. Если вы его создаёте, храните пароль в тайне и указывайте достоверные данные. Мы можем заблокировать аккаунт, который используется для злоупотреблений.',
        ],
      },
      {
        id: 'ip',
        heading: 'Интеллектуальная собственность',
        blocks: [
          'Название и логотип TERAN® являются товарными знаками, а тексты, изображения и оформление сайта охраняются авторским правом; их нельзя копировать или использовать без письменного разрешения TERAN.',
        ],
      },
      {
        id: 'liability',
        heading: 'Ответственность',
        blocks: [
          'Мы отвечаем за продаваемые товары в соответствии с законодательством. Мы не несём ответственности за перебои в работе сайта, вызванные обстоятельствами вне нашего разумного контроля.',
        ],
      },
      {
        id: 'law',
        heading: 'Применимое право',
        blocks: [
          'Эти условия регулируются законодательством Республики Узбекистан. Споры мы стараемся решать путём переговоров; в противном случае они разрешаются компетентным судом Республики Узбекистан в порядке, установленном законом.',
        ],
      },
      {
        id: 'changes',
        heading: 'Изменение условий',
        blocks: [
          'Мы можем обновлять эти условия. К заказу применяется редакция, действовавшая в момент его оформления.',
        ],
      },
    ],
  },
  uz: {
    title: 'Foydalanish shartlari',
    description:
      'TERAN internet-doʻkonidan foydalanish va buyurtma berishda amal qiladigan shartlar.',
    intro:
      'Ushbu shartlar saytdan foydalanish va TERAN internet-doʻkonidagi buyurtmalarga nisbatan qoʻllaniladi. Buyurtma berishdan oldin ular bilan tanishib chiqing. Oxirgi yangilanish sanasi: 18.10.2026.',
    sections: [
      {
        id: 'seller',
        heading: 'Sotuvchi',
        blocks: [
          'Doʻkonni «TERAN TRADE» masʼuliyati cheklangan jamiyati (MChJ), Namangan, Oʻzbekiston boshqaradi. Telefonlar: +998 97 570 70 07, +998 95 110 13 26; e-pochta: terantradellc@gmail.com; sayt: www.terantrade.uz.',
        ],
      },
      {
        id: 'products',
        heading: 'Mahsulotlar va maʼlumotlar',
        blocks: [
          'Biz mahsulotlarni imkon qadar aniq tasvirlashga harakat qilamiz. Qadoq va ekrandagi ranglar siz oladigan mahsulotdan biroz farq qilishi mumkin. Damlash boʻyicha tavsiyalar maslahat xarakteriga ega.',
        ],
      },
      {
        id: 'prices',
        heading: 'Narxlar',
        blocks: [
          'Narxlar oʻzbek soʻmida (UZS) koʻrsatilgan. Buyurtma berilgan paytda koʻrsatilgan narx amal qiladi. Yetkazib berish narxi rasmiylashtirishda hudud va yetkazib berish usuliga qarab hisoblanadi, jami summa esa tasdiqlashdan oldin koʻrsatiladi.',
          'Agar rasmiylashtirish vaqtida narx yoki mavjudlik oʻzgarsa, doʻkon bu haqda xabar beradi va yangi summani tasdiqlashni soʻraydi — buyurtma hech qachon siz koʻrmagan summaga rasmiylashtirilmaydi.',
        ],
      },
      {
        id: 'orders',
        heading: 'Buyurtmalar',
        blocks: [
          'Buyurtma berish orqali siz tanlangan mahsulotlarni sotib olish taklifini bildirasiz. Biz buyurtmani telefon yoki messenjer orqali tasdiqlaymiz; shartnoma tasdiqlangandan keyin tuzilgan hisoblanadi. Masalan, mahsulot qolmagan yoki aloqa maʼlumotlari notoʻgʻri boʻlsa, buyurtmani rad etishimiz mumkin va bu haqda sizga xabar beramiz.',
          'Buyurtma berganingizdan soʻng uning holatini kuzatish uchun shaxsiy havola olasiz. Uni boshqalarga bermang.',
        ],
      },
      {
        id: 'payment',
        heading: 'Toʻlov',
        blocks: [
          'Mavjud toʻlov usullari rasmiylashtirishda koʻrsatiladi. Hozircha buyurtmalar yetkazib berilganda kuryerga naqd pul bilan toʻlanadi. Biz hech qachon telefon yoki xabar orqali bank kartasi maʼlumotlarini soʻramaymiz.',
        ],
      },
      {
        id: 'delivery',
        heading: 'Yetkazib berish',
        blocks: [
          'Yetkazib berish usullari, hududlar, narxlar va taxminiy muddatlar «Yetkazib berish» sahifasida va rasmiylashtirishda koʻrsatilgan. Muddatlar taxminiydir. Koʻrsatilgan manzil va telefon orqali buyurtmani qabul qila olishlariga ishonch hosil qiling va qabul qilishda qadoqni tekshiring.',
        ],
      },
      {
        id: 'returns',
        heading: 'Qaytarish va eʼtirozlar',
        blocks: [
          'Qaytarish va eʼtirozlar qaytarish siyosatiga muvofiq koʻrib chiqiladi. Ushbu shartlardagi hech narsa Oʻzbekiston Respublikasining «Isteʼmolchilarning huquqlarini himoya qilish toʻgʻrisida»gi Qonuni boʻyicha huquqlaringizni cheklamaydi.',
        ],
      },
      {
        id: 'accounts',
        heading: 'Xaridor hisoblari',
        blocks: [
          'Buyurtma berish uchun hisob shart emas. Agar hisob yaratsangiz, parolingizni sir saqlang va toʻgʻri maʼlumotlarni kiriting. Suisteʼmol uchun foydalanilgan hisobni bloklashimiz mumkin.',
        ],
      },
      {
        id: 'ip',
        heading: 'Intellektual mulk',
        blocks: [
          'TERAN® nomi va logotipi tovar belgilaridir, sayt matnlari, tasvirlari va dizayni esa mualliflik huquqi bilan himoyalangan; ularni TERANning yozma ruxsatisiz nusxalash yoki ishlatish mumkin emas.',
        ],
      },
      {
        id: 'liability',
        heading: 'Javobgarlik',
        blocks: [
          'Biz sotadigan mahsulotlar uchun qonunchilikka muvofiq javobgarmiz. Oqilona nazoratimizdan tashqaridagi holatlar sababli sayt ishidagi uzilishlar uchun javobgar emasmiz.',
        ],
      },
      {
        id: 'law',
        heading: 'Qoʻllaniladigan huquq',
        blocks: [
          'Ushbu shartlar Oʻzbekiston Respublikasi qonunchiligi bilan tartibga solinadi. Nizolarni avvalo muzokaralar yoʻli bilan hal qilishga harakat qilamiz; aks holda ular Oʻzbekiston Respublikasining vakolatli sudi tomonidan qonunda belgilangan tartibda hal etiladi.',
        ],
      },
      {
        id: 'changes',
        heading: 'Shartlarga oʻzgartirishlar',
        blocks: [
          'Biz ushbu shartlarni yangilashimiz mumkin. Buyurtmaga uni bergan paytdagi amaldagi tahrir qoʻllaniladi.',
        ],
      },
    ],
  },
};

type ContactSection = 'prices' | 'orders' | 'payment' | 'delivery';

/** The sections that differ while prices are hidden and orders go by phone and messengers. */
export const termsByContact: Localized<Record<ContactSection, Section>> = {
  en: {
    prices: {
      id: 'prices',
      heading: 'Prices',
      blocks: [
        'Prices are in Uzbek sum (UZS). When you order, we tell you the price of the tea, the cost of delivery and the total before you confirm.',
        'The price that applies is the one agreed with you when the order is confirmed.',
      ],
    },
    orders: {
      id: 'orders',
      heading: 'Orders',
      blocks: [
        'To order, call or write to us (by phone, Telegram or WhatsApp) with the tea and the quantity you want. We agree the order, its total and the delivery with you; the contract is concluded when we confirm the order. We may decline an order, for example if a product is no longer available, and we will tell you if we do.',
      ],
    },
    payment: {
      id: 'payment',
      heading: 'Payment',
      blocks: [
        'The payment method is agreed when you order; the website itself takes no payments. We never ask for bank card details by phone or message.',
      ],
    },
    delivery: {
      id: 'delivery',
      heading: 'Delivery',
      blocks: [
        'Delivery to your region, its cost and its timing are agreed when you order (see the Delivery page). Times are estimates. Please make sure someone can receive the order at the address and phone number you give, and check the package when it is handed over.',
      ],
    },
  },
  ru: {
    prices: {
      id: 'prices',
      heading: 'Цены',
      blocks: [
        'Цены указываются в узбекских сумах (UZS). При заказе мы называем стоимость чая, доставки и итоговую сумму до того, как вы подтвердите заказ.',
        'Действует цена, согласованная с вами при подтверждении заказа.',
      ],
    },
    orders: {
      id: 'orders',
      heading: 'Заказы',
      blocks: [
        'Чтобы заказать, позвоните или напишите нам (по телефону, в Telegram или WhatsApp) и назовите чай и количество. Мы согласуем с вами заказ, его сумму и доставку; договор считается заключённым после подтверждения заказа. Мы можем отклонить заказ, например если товара больше нет в наличии, и сообщим вам об этом.',
      ],
    },
    payment: {
      id: 'payment',
      heading: 'Оплата',
      blocks: [
        'Способ оплаты согласуется при заказе; сам сайт платежи не принимает. Мы никогда не запрашиваем данные банковской карты по телефону или в сообщениях.',
      ],
    },
    delivery: {
      id: 'delivery',
      heading: 'Доставка',
      blocks: [
        'Доставка в ваш регион, её стоимость и сроки согласуются при заказе (см. страницу «Доставка»). Сроки являются ориентировочными. Убедитесь, что по указанному адресу и телефону заказ смогут принять, и проверьте упаковку при получении.',
      ],
    },
  },
  uz: {
    prices: {
      id: 'prices',
      heading: 'Narxlar',
      blocks: [
        'Narxlar oʻzbek soʻmida (UZS) beriladi. Buyurtma berayotganingizda choy narxi, yetkazib berish narxi va jami summani tasdiqlashdan oldin aytamiz.',
        'Buyurtma tasdiqlanganda siz bilan kelishilgan narx amal qiladi.',
      ],
    },
    orders: {
      id: 'orders',
      heading: 'Buyurtmalar',
      blocks: [
        'Buyurtma berish uchun bizga qoʻngʻiroq qiling yoki yozing (telefon, Telegram yoki WhatsApp orqali) va choy nomi hamda miqdorini ayting. Buyurtma, uning summasi va yetkazib berishni siz bilan kelishamiz; shartnoma buyurtma tasdiqlangandan keyin tuzilgan hisoblanadi. Masalan, mahsulot qolmagan boʻlsa, buyurtmani rad etishimiz mumkin va bu haqda sizga xabar beramiz.',
      ],
    },
    payment: {
      id: 'payment',
      heading: 'Toʻlov',
      blocks: [
        'Toʻlov usuli buyurtma berishda kelishiladi; saytning oʻzi toʻlov qabul qilmaydi. Biz hech qachon telefon yoki xabar orqali bank kartasi maʼlumotlarini soʻramaymiz.',
      ],
    },
    delivery: {
      id: 'delivery',
      heading: 'Yetkazib berish',
      blocks: [
        'Hududingizga yetkazib berish, uning narxi va muddati buyurtma berishda kelishiladi («Yetkazib berish» sahifasiga qarang). Muddatlar taxminiydir. Koʻrsatilgan manzil va telefon orqali buyurtmani qabul qila olishlariga ishonch hosil qiling va qabul qilishda qadoqni tekshiring.',
      ],
    },
  },
};

/** The terms as they apply: the online shop's, or ordering by phone and messengers. */
export function termsFor(byContact: boolean): Localized<LongFormContent> {
  if (!byContact) return termsOfUse;
  const swap = (locale: Locale): LongFormContent => ({
    ...termsOfUse[locale],
    sections: termsOfUse[locale].sections.map(
      (section) => termsByContact[locale][section.id as ContactSection] ?? section,
    ),
  });
  return { uz: swap('uz'), ru: swap('ru'), en: swap('en') };
}
