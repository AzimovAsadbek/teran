import type { Localized, LongFormContent } from '../types';

/**
 * DRAFT returns and refunds policy. Periods, conditions and refund methods are business decisions
 * TERAN has to make in line with consumer protection law; they are left in [brackets] until then.
 */
export const returnsPolicy: Localized<LongFormContent> = {
  en: {
    title: 'Returns & refunds',
    description:
      'What to do if your TERAN order arrives damaged or incorrect, and how refunds work.',
    intro:
      'We want every order to arrive exactly as you expect. If something is wrong, tell us and we will put it right. Last updated: [date of publication].',
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
          'If an item is damaged, faulty or not what you ordered, contact us within [number of days] days of delivery with your order number and, if possible, a photo. We will offer a replacement or a refund [conditions to be confirmed].',
        ],
      },
      {
        id: 'change-of-mind',
        heading: 'Returning items you no longer want',
        blocks: [
          'Tea is a food product. [Whether unopened products can be returned when you change your mind, and within what period, is to be decided by TERAN in line with the Law of the Republic of Uzbekistan "On Protection of Consumer Rights".]',
        ],
      },
      {
        id: 'how',
        heading: 'How to make a request',
        blocks: [
          {
            list: [
              'Contact us through the Contact page or the phone number shown there.',
              'Give your order number (for example TRN-7K4Q2M9X) and describe the problem.',
              'We will reply within [response period] and agree the next steps with you.',
            ],
          },
        ],
      },
      {
        id: 'refunds',
        heading: 'Refunds',
        blocks: [
          'Orders paid in cash on delivery are refunded [refund method, for example in cash or by bank transfer] within [refund period] after we approve the request. Delivery fees are refunded when the return is due to our mistake [to be confirmed].',
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
      'Мы хотим, чтобы каждый заказ приходил именно таким, каким вы его ждёте. Если что-то не так — сообщите нам, и мы всё исправим. Дата последнего обновления: [дата публикации].',
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
          'Если товар повреждён, бракован или не соответствует заказу, свяжитесь с нами в течение [количество дней] дней после доставки, указав номер заказа и, по возможности, приложив фото. Мы предложим замену или возврат денег [условия подлежат подтверждению].',
        ],
      },
      {
        id: 'change-of-mind',
        heading: 'Возврат товара, который вам больше не нужен',
        blocks: [
          'Чай — пищевой продукт. [Можно ли вернуть невскрытый товар без причины и в какой срок, TERAN определяет в соответствии с Законом Республики Узбекистан «О защите прав потребителей».]',
        ],
      },
      {
        id: 'how',
        heading: 'Как оформить обращение',
        blocks: [
          {
            list: [
              'Свяжитесь с нами через страницу «Контакты» или по указанному там телефону.',
              'Сообщите номер заказа (например, TRN-7K4Q2M9X) и опишите проблему.',
              'Мы ответим в течение [срок ответа] и согласуем с вами дальнейшие шаги.',
            ],
          },
        ],
      },
      {
        id: 'refunds',
        heading: 'Возврат денег',
        blocks: [
          'Заказы, оплаченные наличными при получении, возвращаются [способ возврата, например наличными или банковским переводом] в течение [срок возврата] после одобрения обращения. Стоимость доставки возвращается, если возврат вызван нашей ошибкой [подлежит подтверждению].',
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
      'Har bir buyurtma siz kutgandek yetib kelishini istaymiz. Agar biror narsa notoʻgʻri boʻlsa, bizga xabar bering — biz uni tuzatamiz. Oxirgi yangilanish sanasi: [eʼlon qilingan sana].',
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
          'Agar mahsulot shikastlangan, nuqsonli yoki buyurtmaga mos kelmasa, yetkazib berilgandan keyin [kunlar soni] kun ichida buyurtma raqamini koʻrsatib va iloji boʻlsa surat ilova qilib biz bilan bogʻlaning. Biz almashtirish yoki pulni qaytarishni taklif qilamiz [shartlar tasdiqlanishi kerak].',
        ],
      },
      {
        id: 'change-of-mind',
        heading: 'Endi kerak boʻlmagan mahsulotni qaytarish',
        blocks: [
          'Choy oziq-ovqat mahsulotidir. [Ochilmagan mahsulotni sababsiz qaytarish mumkinmi va qaysi muddatda — buni TERAN Oʻzbekiston Respublikasining «Isteʼmolchilarning huquqlarini himoya qilish toʻgʻrisida»gi Qonuniga muvofiq belgilaydi.]',
        ],
      },
      {
        id: 'how',
        heading: 'Murojaatni qanday rasmiylashtirish mumkin',
        blocks: [
          {
            list: [
              '«Aloqa» sahifasi yoki u yerda koʻrsatilgan telefon orqali biz bilan bogʻlaning.',
              'Buyurtma raqamini (masalan, TRN-7K4Q2M9X) ayting va muammoni tasvirlang.',
              'Biz [javob berish muddati] ichida javob beramiz va keyingi qadamlarni siz bilan kelishamiz.',
            ],
          },
        ],
      },
      {
        id: 'refunds',
        heading: 'Pulni qaytarish',
        blocks: [
          'Yetkazib berilganda naqd toʻlangan buyurtmalar uchun pul murojaat maʼqullangandan keyin [qaytarish muddati] ichida [qaytarish usuli, masalan naqd yoki bank oʻtkazmasi] qaytariladi. Agar qaytarish bizning xatoimiz sababli boʻlsa, yetkazib berish narxi ham qaytariladi [tasdiqlanishi kerak].',
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
