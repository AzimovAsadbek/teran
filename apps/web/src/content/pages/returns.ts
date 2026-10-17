import type { Localized, LongFormContent } from '../types';

/**
 * Returns and refunds policy. It sets no period or condition TERAN has not decided: exchanges,
 * returns and refunds follow the consumer protection law, and TERAN agrees the details with the
 * customer. A lawyer should review it before TERAN adds periods of its own.
 */
export const returnsPolicy: Localized<LongFormContent> = {
  en: {
    title: 'Returns & refunds',
    description:
      'What to do if your TERAN order arrives damaged or incorrect, and how refunds work.',
    intro:
      'We want every order to arrive exactly as you expect. If something is wrong, tell us and we will put it right. Last updated: 18 October 2026.',
    sections: [
      {
        id: 'on-delivery',
        heading: 'Check your order on delivery',
        blocks: [
          'Please check the package and its contents when the courier hands it over. If the package is damaged, mention it to the courier and contact us the same day.',
        ],
      },
      {
        id: 'damaged',
        heading: 'Damaged, faulty or incorrect items',
        blocks: [
          'If an item is damaged, faulty or not what you ordered, contact us as soon as possible after delivery, preferably the same day, with your order details and, if possible, a photo. We will replace the item or refund it, as the Law of the Republic of Uzbekistan "On Protection of Consumer Rights" provides.',
        ],
      },
      {
        id: 'change-of-mind',
        heading: 'Returning items you no longer want',
        blocks: [
          'Tea is a food product: tea of proper quality can be exchanged or returned only in the cases provided by the Law of the Republic of Uzbekistan "On Protection of Consumer Rights". Call or write to us and we will tell you what is possible for your order.',
        ],
      },
      {
        id: 'how',
        heading: 'How to make a request',
        blocks: [
          {
            list: [
              'Contact us through the Contact page or the phone number shown there.',
              'Give your order details (its number, for example TRN-7K4Q2M9X, if you have one, or the date and the phone number you ordered with) and describe the problem.',
              'We will reply as soon as possible and agree the next steps with you.',
            ],
          },
        ],
      },
      {
        id: 'refunds',
        heading: 'Refunds',
        blocks: [
          'Money is returned the way the order was paid, or another way agreed with you (in cash or by bank transfer), within the time limits set by law once we have approved the request. If the return is due to our mistake, the delivery cost is refunded as well.',
        ],
      },
      {
        id: 'rights',
        heading: 'Your statutory rights',
        blocks: [
          'This policy does not limit your rights under the Law of the Republic of Uzbekistan "On Protection of Consumer Rights".',
        ],
      },
    ],
  },
  ru: {
    title: 'Возврат и обмен',
    description:
      'Что делать, если заказ TERAN пришёл повреждённым или неверным, и как проходит возврат денег.',
    intro:
      'Мы хотим, чтобы каждый заказ приходил именно таким, каким вы его ждёте. Если что-то не так — сообщите нам, и мы всё исправим. Дата последнего обновления: 18.10.2026.',
    sections: [
      {
        id: 'on-delivery',
        heading: 'Проверьте заказ при получении',
        blocks: [
          'Пожалуйста, проверьте упаковку и содержимое, когда курьер передаёт заказ. Если упаковка повреждена, скажите об этом курьеру и свяжитесь с нами в тот же день.',
        ],
      },
      {
        id: 'damaged',
        heading: 'Повреждённые, бракованные или неверные товары',
        blocks: [
          'Если товар повреждён, бракован или не соответствует заказу, свяжитесь с нами как можно скорее после доставки, желательно в тот же день, указав данные заказа и, по возможности, приложив фото. Мы заменим товар или вернём деньги в порядке, предусмотренном Законом Республики Узбекистан «О защите прав потребителей».',
        ],
      },
      {
        id: 'change-of-mind',
        heading: 'Возврат товара, который вам больше не нужен',
        blocks: [
          'Чай — пищевой продукт: чай надлежащего качества можно обменять или вернуть только в случаях, предусмотренных Законом Республики Узбекистан «О защите прав потребителей». Позвоните или напишите нам — мы подскажем, что возможно для вашего заказа.',
        ],
      },
      {
        id: 'how',
        heading: 'Как оформить обращение',
        blocks: [
          {
            list: [
              'Свяжитесь с нами через страницу «Контакты» или по указанному там телефону.',
              'Сообщите данные заказа (его номер, например TRN-7K4Q2M9X, если он есть, или дату и телефон, с которого вы заказывали) и опишите проблему.',
              'Мы ответим как можно скорее и согласуем с вами дальнейшие шаги.',
            ],
          },
        ],
      },
      {
        id: 'refunds',
        heading: 'Возврат денег',
        blocks: [
          'Деньги возвращаются тем же способом, которым был оплачен заказ, или другим согласованным с вами способом (наличными или банковским переводом) в сроки, установленные законом, после одобрения обращения. Если возврат вызван нашей ошибкой, стоимость доставки также возвращается.',
        ],
      },
      {
        id: 'rights',
        heading: 'Ваши права по закону',
        blocks: [
          'Эта политика не ограничивает ваши права по Закону Республики Узбекистан «О защите прав потребителей».',
        ],
      },
    ],
  },
  uz: {
    title: 'Qaytarish va almashtirish',
    description:
      'TERAN buyurtmasi shikastlangan yoki notoʻgʻri kelsa nima qilish kerak va pul qanday qaytariladi.',
    intro:
      'Har bir buyurtma siz kutgandek yetib kelishini istaymiz. Agar biror narsa notoʻgʻri boʻlsa, bizga xabar bering — biz uni tuzatamiz. Oxirgi yangilanish sanasi: 18.10.2026.',
    sections: [
      {
        id: 'on-delivery',
        heading: 'Buyurtmani qabul qilishda tekshiring',
        blocks: [
          'Kuryer buyurtmani topshirganda qadoq va ichidagi mahsulotlarni tekshiring. Agar qadoq shikastlangan boʻlsa, bu haqda kuryerga ayting va oʻsha kuni biz bilan bogʻlaning.',
        ],
      },
      {
        id: 'damaged',
        heading: 'Shikastlangan, nuqsonli yoki notoʻgʻri mahsulotlar',
        blocks: [
          'Agar mahsulot shikastlangan, nuqsonli yoki buyurtmaga mos kelmasa, yetkazib berilgandan keyin imkon qadar tezroq, iloji boʻlsa oʻsha kuni, buyurtma maʼlumotlarini koʻrsatib va iloji boʻlsa surat ilova qilib biz bilan bogʻlaning. Biz mahsulotni almashtiramiz yoki pulini qaytaramiz — Oʻzbekiston Respublikasining «Isteʼmolchilarning huquqlarini himoya qilish toʻgʻrisida»gi Qonunida belgilangan tartibda.',
        ],
      },
      {
        id: 'change-of-mind',
        heading: 'Endi kerak boʻlmagan mahsulotni qaytarish',
        blocks: [
          'Choy oziq-ovqat mahsulotidir: sifati talabga javob beradigan choyni faqat Oʻzbekiston Respublikasining «Isteʼmolchilarning huquqlarini himoya qilish toʻgʻrisida»gi Qonunida nazarda tutilgan hollarda almashtirish yoki qaytarish mumkin. Bizga qoʻngʻiroq qiling yoki yozing — buyurtmangiz boʻyicha nima qilish mumkinligini aytib beramiz.',
        ],
      },
      {
        id: 'how',
        heading: 'Murojaatni qanday rasmiylashtirish mumkin',
        blocks: [
          {
            list: [
              '«Aloqa» sahifasi yoki u yerda koʻrsatilgan telefon orqali biz bilan bogʻlaning.',
              'Buyurtma maʼlumotlarini (raqami boʻlsa raqamini, masalan TRN-7K4Q2M9X, boʻlmasa buyurtma sanasi va qaysi telefon orqali berilganini) ayting va muammoni tasvirlang.',
              'Biz imkon qadar tez javob beramiz va keyingi qadamlarni siz bilan kelishamiz.',
            ],
          },
        ],
      },
      {
        id: 'refunds',
        heading: 'Pulni qaytarish',
        blocks: [
          'Pul buyurtma qanday toʻlangan boʻlsa, shu usulda yoki siz bilan kelishilgan boshqa usulda (naqd yoki bank oʻtkazmasi orqali) murojaat maʼqullangandan keyin qonunda belgilangan muddatlarda qaytariladi. Agar qaytarish bizning xatomiz sababli boʻlsa, yetkazib berish narxi ham qaytariladi.',
        ],
      },
      {
        id: 'rights',
        heading: 'Qonun boʻyicha huquqlaringiz',
        blocks: [
          'Ushbu siyosat Oʻzbekiston Respublikasining «Isteʼmolchilarning huquqlarini himoya qilish toʻgʻrisida»gi Qonuni boʻyicha huquqlaringizni cheklamaydi.',
        ],
      },
    ],
  },
};
