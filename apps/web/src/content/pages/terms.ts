import type { Localized, LongFormContent } from '../types';

/**
 * DRAFT terms of use. They describe how this store works today (orders confirmed by phone, cash on
 * delivery, delivery methods from the configuration); details in [brackets] must be confirmed by
 * TERAN and the text reviewed by a lawyer before launch.
 */
export const termsOfUse: Localized<LongFormContent> = {
  en: {
    title: 'Terms of use',
    description: 'The terms that apply when you use the TERAN online store and place an order.',
    intro:
      'These terms apply to the use of this website and to orders placed in the TERAN online store. Please read them before ordering. Last updated: [date of publication].',
    sections: [
      {
        id: 'seller',
        heading: 'The seller',
        blocks: [
          'The store is operated by [company legal name, legal form], [legal address], taxpayer identification number (STIR) [number], [state registration details].',
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
          'Prices are shown in Uzbek sum (UZS) [whether prices include VAT]. The price that applies is the one shown when you place the order. The delivery fee is calculated at checkout from your region and the delivery method, and the total is shown before you confirm.',
          'If a price or stock changes while you are checking out, the store tells you and asks you to confirm the new total; an order is never placed at a total you have not seen.',
        ],
      },
      {
        id: 'orders',
        heading: 'Orders',
        blocks: [
          'By placing an order you make an offer to buy the selected products. We confirm the order by phone [or another channel]; the contract is concluded when we confirm it. We may decline an order, for example if a product is no longer available or the contact details are incorrect, and we will tell you if we do.',
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
          'The TERAN name, logo and the content of this website belong to [rights holder] and may not be copied or used without permission [trademark registration details].',
        ],
      },
      {
        id: 'liability',
        heading: 'Liability',
        blocks: [
          'We are responsible for the products we sell in accordance with the law. We are not liable for interruptions of the website caused by events beyond our reasonable control [liability wording to be reviewed by a lawyer].',
        ],
      },
      {
        id: 'law',
        heading: 'Applicable law',
        blocks: [
          'These terms are governed by the laws of the Republic of Uzbekistan. We will try to resolve any dispute through dialogue first; otherwise it is settled in accordance with the law [competent court].',
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
      'Эти условия применяются к использованию сайта и к заказам в интернет-магазине TERAN. Пожалуйста, ознакомьтесь с ними перед заказом. Дата последнего обновления: [дата публикации].',
    sections: [
      {
        id: 'seller',
        heading: 'Продавец',
        blocks: [
          'Магазин управляется компанией [наименование и организационно-правовая форма], [юридический адрес], ИНН (СТИР) [номер], [сведения о государственной регистрации].',
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
          'Цены указаны в узбекских сумах (UZS) [включён ли НДС]. Действует цена, указанная в момент оформления заказа. Стоимость доставки рассчитывается при оформлении в зависимости от региона и способа доставки, а итоговая сумма показывается до подтверждения.',
          'Если во время оформления цена или наличие изменятся, магазин сообщит об этом и попросит подтвердить новую сумму — заказ никогда не оформляется на сумму, которую вы не видели.',
        ],
      },
      {
        id: 'orders',
        heading: 'Заказы',
        blocks: [
          'Оформляя заказ, вы делаете предложение купить выбранные товары. Мы подтверждаем заказ по телефону [или по другому каналу]; договор считается заключённым после подтверждения. Мы можем отклонить заказ, например если товара больше нет в наличии или контактные данные неверны, и сообщим вам об этом.',
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
          'Название и логотип TERAN, а также содержимое сайта принадлежат [правообладатель] и не могут копироваться или использоваться без разрешения [сведения о регистрации товарного знака].',
        ],
      },
      {
        id: 'liability',
        heading: 'Ответственность',
        blocks: [
          'Мы отвечаем за продаваемые товары в соответствии с законодательством. Мы не несём ответственности за перебои в работе сайта, вызванные обстоятельствами вне нашего разумного контроля [формулировка подлежит проверке юристом].',
        ],
      },
      {
        id: 'law',
        heading: 'Применимое право',
        blocks: [
          'Эти условия регулируются законодательством Республики Узбекистан. Споры мы стараемся решать путём переговоров; в противном случае они разрешаются в порядке, установленном законом [компетентный суд].',
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
      'Ushbu shartlar saytdan foydalanish va TERAN internet-doʻkonidagi buyurtmalarga nisbatan qoʻllaniladi. Buyurtma berishdan oldin ular bilan tanishib chiqing. Oxirgi yangilanish sanasi: [eʼlon qilingan sana].',
    sections: [
      {
        id: 'seller',
        heading: 'Sotuvchi',
        blocks: [
          'Doʻkonni [kompaniyaning nomi va tashkiliy-huquqiy shakli], [yuridik manzil], STIR [raqam], [davlat roʻyxatidan oʻtganlik maʼlumotlari] boshqaradi.',
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
          'Narxlar oʻzbek soʻmida (UZS) koʻrsatilgan [QQS kiritilganmi]. Buyurtma berilgan paytda koʻrsatilgan narx amal qiladi. Yetkazib berish narxi rasmiylashtirishda hudud va yetkazib berish usuliga qarab hisoblanadi, jami summa esa tasdiqlashdan oldin koʻrsatiladi.',
          'Agar rasmiylashtirish vaqtida narx yoki mavjudlik oʻzgarsa, doʻkon bu haqda xabar beradi va yangi summani tasdiqlashni soʻraydi — buyurtma hech qachon siz koʻrmagan summaga rasmiylashtirilmaydi.',
        ],
      },
      {
        id: 'orders',
        heading: 'Buyurtmalar',
        blocks: [
          'Buyurtma berish orqali siz tanlangan mahsulotlarni sotib olish taklifini bildirasiz. Biz buyurtmani telefon orqali [yoki boshqa kanal orqali] tasdiqlaymiz; shartnoma tasdiqlangandan keyin tuzilgan hisoblanadi. Masalan, mahsulot qolmagan yoki aloqa maʼlumotlari notoʻgʻri boʻlsa, buyurtmani rad etishimiz mumkin va bu haqda sizga xabar beramiz.',
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
          'TERAN nomi va logotipi hamda sayt mazmuni [huquq egasi]ga tegishli va ruxsatsiz nusxa koʻchirilishi yoki ishlatilishi mumkin emas [tovar belgisi roʻyxatdan oʻtganligi haqida maʼlumot].',
        ],
      },
      {
        id: 'liability',
        heading: 'Javobgarlik',
        blocks: [
          'Biz sotadigan mahsulotlar uchun qonunchilikka muvofiq javobgarmiz. Oqilona nazoratimizdan tashqaridagi holatlar sababli sayt ishidagi uzilishlar uchun javobgar emasmiz [matn yurist tomonidan tekshirilishi kerak].',
        ],
      },
      {
        id: 'law',
        heading: 'Qoʻllaniladigan huquq',
        blocks: [
          'Ushbu shartlar Oʻzbekiston Respublikasi qonunchiligi bilan tartibga solinadi. Nizolarni avvalo muzokaralar yoʻli bilan hal qilishga harakat qilamiz; aks holda ular qonunda belgilangan tartibda hal etiladi [vakolatli sud].',
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
