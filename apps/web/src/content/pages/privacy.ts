import type { Localized, LongFormContent } from '../types';

/**
 * DRAFT privacy policy. It describes what this platform actually does (data collected by the
 * checkout, account, forms and cookies); everything in [brackets] must be confirmed by TERAN and the
 * whole text reviewed by a lawyer before launch.
 */
export const privacyPolicy: Localized<LongFormContent> = {
  en: {
    title: 'Privacy policy',
    description:
      'How TERAN collects, uses and protects personal data when you shop, create an account or contact us.',
    intro:
      'This policy explains which personal data the TERAN online store processes, why, for how long and what your rights are. Last updated: [date of publication].',
    sections: [
      {
        id: 'controller',
        heading: 'Who is responsible for your data',
        blocks: [
          'The operator of this website and controller of your personal data is [company legal name, legal form], [legal address], taxpayer identification number (STIR) [number].',
          'For any question about your personal data, write to [e-mail address for privacy requests].',
        ],
      },
      {
        id: 'data',
        heading: 'Data we collect',
        blocks: [
          'We only ask for what is needed for the service you use:',
          {
            list: [
              'Orders: your name, phone number, optional e-mail address, delivery region, city, address and landmark, an optional note, the products ordered and the amounts.',
              'Customer account (optional): e-mail address, name, optional phone number, preferred language and order history. Passwords are never stored in readable form, only as a one-way cryptographic hash.',
              'Contact and business enquiries: the details you enter in the form (name, phone or e-mail, company, business type, region, message).',
              'Newsletter (optional): your e-mail address and preferred language.',
              'Technical data: the cookies listed below and server records needed for security, such as the time of a request and the IP address [retention period for server logs].',
            ],
          },
          'We do not collect payment card data: orders are currently paid in cash on delivery.',
        ],
      },
      {
        id: 'purposes',
        heading: 'Why we use it',
        blocks: [
          {
            list: [
              'To accept, confirm, deliver and support your orders (including calling you to confirm an order).',
              'To run your customer account if you create one.',
              'To answer your messages and business enquiries.',
              'To send the newsletter, only with your consent; every e-mail lets you unsubscribe.',
              'To keep the store secure and prevent misuse (for example limiting repeated sign-in attempts).',
              'To meet legal obligations such as accounting and tax record keeping.',
            ],
          },
          'We process personal data in accordance with the Law of the Republic of Uzbekistan "On Personal Data" [legal basis for each purpose to be confirmed by a lawyer].',
        ],
      },
      {
        id: 'sharing',
        heading: 'Who we share it with',
        blocks: [
          'We do not sell personal data. We share it only when necessary:',
          {
            list: [
              'with the courier or delivery partner who brings your order (name, phone number and address) [names of delivery partners];',
              'with the companies that host this website and, if enabled, send our e-mails, under confidentiality obligations [hosting provider and e-mail provider];',
              'with public authorities when the law requires it.',
            ],
          },
        ],
      },
      {
        id: 'storage',
        heading: 'Where and how long we keep it',
        blocks: [
          'Personal data is stored on servers located in [country and data centre — must satisfy the data-localisation requirements of Uzbek law].',
          {
            list: [
              'Orders: [period required by accounting and tax law].',
              'Customer account: until you ask us to delete it.',
              'Newsletter: until you unsubscribe.',
              'Enquiries: [retention period for enquiries].',
              'By default, sign-in sessions end after 30 days (12 hours for staff) and an inactive bag is deleted after 30 days.',
            ],
          },
        ],
      },
      {
        id: 'security',
        heading: 'How we protect it',
        blocks: [
          'Connections to the store are encrypted (HTTPS). Passwords are stored only as strong one-way hashes, sessions use secure cookies that scripts cannot read, administration requires a staff account, and access to personal data is limited to staff who need it.',
        ],
      },
      {
        id: 'cookies',
        heading: 'Cookies',
        blocks: [
          'The store uses only cookies that are necessary for it to work. There are no advertising or analytics cookies.',
          {
            list: [
              'Session cookie: keeps you signed in (up to 30 days; 12 hours for staff).',
              'Bag cookie: remembers the products in your bag (up to 30 days).',
              'Language cookie (TERAN_LOCALE): remembers the language you chose (up to one year).',
            ],
          },
        ],
      },
      {
        id: 'rights',
        heading: 'Your rights',
        blocks: [
          'You may ask us what data we hold about you, ask us to correct or delete it, and withdraw consent you have given (for example to the newsletter). Some data, such as order records, must be kept for the period required by law. You also have the right to complain to [authorised state body for personal data protection].',
          'To exercise these rights, contact us at [e-mail address for privacy requests]. We will answer within [response period].',
        ],
      },
      {
        id: 'changes',
        heading: 'Changes to this policy',
        blocks: [
          'We may update this policy when our services or the law change. The date of the current version is shown at the top of this page.',
        ],
      },
    ],
  },
  ru: {
    title: 'Политика конфиденциальности',
    description:
      'Как TERAN собирает, использует и защищает персональные данные при покупках, регистрации и обращениях.',
    intro:
      'Эта политика объясняет, какие персональные данные обрабатывает интернет-магазин TERAN, зачем, как долго и какие у вас права. Дата последнего обновления: [дата публикации].',
    sections: [
      {
        id: 'controller',
        heading: 'Кто отвечает за ваши данные',
        blocks: [
          'Оператором сайта и ваших персональных данных является [наименование и организационно-правовая форма компании], [юридический адрес], ИНН (СТИР) [номер].',
          'По любым вопросам о персональных данных пишите на [адрес электронной почты для обращений по данным].',
        ],
      },
      {
        id: 'data',
        heading: 'Какие данные мы собираем',
        blocks: [
          'Мы запрашиваем только то, что нужно для выбранной услуги:',
          {
            list: [
              'Заказы: имя, номер телефона, e-mail (по желанию), область, город, адрес и ориентир доставки, комментарий (по желанию), заказанные товары и суммы.',
              'Аккаунт покупателя (по желанию): e-mail, имя, телефон (по желанию), язык и история заказов. Пароли никогда не хранятся в открытом виде — только в виде необратимого криптографического хеша.',
              'Обращения и запросы для бизнеса: данные, которые вы вводите в форму (имя, телефон или e-mail, компания, вид деятельности, регион, сообщение).',
              'Рассылка (по желанию): адрес e-mail и язык.',
              'Технические данные: файлы cookie, перечисленные ниже, и серверные записи, необходимые для безопасности, например время запроса и IP-адрес [срок хранения серверных журналов].',
            ],
          },
          'Мы не собираем данные банковских карт: сейчас заказы оплачиваются наличными при получении.',
        ],
      },
      {
        id: 'purposes',
        heading: 'Зачем мы их используем',
        blocks: [
          {
            list: [
              'Чтобы принимать, подтверждать, доставлять и сопровождать заказы (в том числе звонить для подтверждения).',
              'Чтобы вести ваш аккаунт, если вы его создали.',
              'Чтобы отвечать на сообщения и запросы для бизнеса.',
              'Чтобы отправлять рассылку — только с вашего согласия; в каждом письме можно отписаться.',
              'Чтобы обеспечивать безопасность магазина и предотвращать злоупотребления (например, ограничивать повторные попытки входа).',
              'Чтобы выполнять требования закона, например вести бухгалтерский и налоговый учёт.',
            ],
          },
          'Мы обрабатываем персональные данные в соответствии с Законом Республики Узбекистан «О персональных данных» [правовые основания для каждой цели подтверждаются юристом].',
        ],
      },
      {
        id: 'sharing',
        heading: 'Кому мы их передаём',
        blocks: [
          'Мы не продаём персональные данные и передаём их только при необходимости:',
          {
            list: [
              'курьеру или службе доставки, которая привозит заказ (имя, телефон и адрес) [названия служб доставки];',
              'компаниям, которые размещают сайт и, если это включено, отправляют наши письма, на условиях конфиденциальности [хостинг-провайдер и почтовый сервис];',
              'государственным органам, когда этого требует закон.',
            ],
          },
        ],
      },
      {
        id: 'storage',
        heading: 'Где и как долго мы их храним',
        blocks: [
          'Персональные данные хранятся на серверах, расположенных в [страна и дата-центр — с учётом требований законодательства Узбекистана о локализации данных].',
          {
            list: [
              'Заказы: [срок, установленный законодательством о бухгалтерском и налоговом учёте].',
              'Аккаунт покупателя: пока вы не попросите его удалить.',
              'Рассылка: пока вы не отпишетесь.',
              'Обращения: [срок хранения обращений].',
              'По умолчанию сеанс входа действует до 30 дней (для сотрудников — 12 часов), а неактивная корзина хранится 30 дней.',
            ],
          },
        ],
      },
      {
        id: 'security',
        heading: 'Как мы их защищаем',
        blocks: [
          'Соединение с магазином шифруется (HTTPS). Пароли хранятся только в виде стойких необратимых хешей, сеансы используют защищённые cookie, недоступные скриптам, администрирование требует учётной записи сотрудника, а доступ к персональным данным есть только у тех, кому он нужен для работы.',
        ],
      },
      {
        id: 'cookies',
        heading: 'Файлы cookie',
        blocks: [
          'Магазин использует только cookie, без которых он не может работать. Рекламных и аналитических cookie нет.',
          {
            list: [
              'Cookie сеанса: сохраняет вход в аккаунт (до 30 дней; для сотрудников — 12 часов).',
              'Cookie корзины: запоминает товары в корзине (до 30 дней).',
              'Cookie языка (TERAN_LOCALE): запоминает выбранный язык (до одного года).',
            ],
          },
        ],
      },
      {
        id: 'rights',
        heading: 'Ваши права',
        blocks: [
          'Вы можете узнать, какие данные о вас мы храним, попросить исправить или удалить их и отозвать данное согласие (например, на рассылку). Некоторые данные, например сведения о заказах, мы обязаны хранить в течение срока, установленного законом. Вы также вправе обратиться с жалобой в [уполномоченный государственный орган по защите персональных данных].',
          'Чтобы воспользоваться этими правами, напишите на [адрес электронной почты для обращений по данным]. Мы ответим в течение [срок ответа].',
        ],
      },
      {
        id: 'changes',
        heading: 'Изменения политики',
        blocks: [
          'Мы можем обновлять политику при изменении наших услуг или законодательства. Дата действующей редакции указана в начале страницы.',
        ],
      },
    ],
  },
  uz: {
    title: 'Maxfiylik siyosati',
    description:
      'TERAN xarid qilish, roʻyxatdan oʻtish va murojaat qilishda shaxsiy maʼlumotlarni qanday toʻplashi, ishlatishi va himoya qilishi haqida.',
    intro:
      'Ushbu siyosat TERAN internet-doʻkoni qaysi shaxsiy maʼlumotlarga ishlov berishi, nima uchun va qancha muddat saqlashi hamda sizning huquqlaringiz haqida tushuntiradi. Oxirgi yangilanish sanasi: [eʼlon qilingan sana].',
    sections: [
      {
        id: 'controller',
        heading: 'Maʼlumotlaringiz uchun kim javobgar',
        blocks: [
          'Sayt va shaxsiy maʼlumotlaringiz operatori — [kompaniyaning nomi va tashkiliy-huquqiy shakli], [yuridik manzil], STIR [raqam].',
          'Shaxsiy maʼlumotlar boʻyicha har qanday savol bilan [maʼlumotlar boʻyicha murojaatlar uchun elektron pochta] manziliga yozing.',
        ],
      },
      {
        id: 'data',
        heading: 'Qanday maʼlumotlarni toʻplaymiz',
        blocks: [
          'Biz faqat tanlangan xizmat uchun zarur boʻlgan maʼlumotlarni soʻraymiz:',
          {
            list: [
              'Buyurtmalar: ism, telefon raqami, elektron pochta (ixtiyoriy), yetkazib berish viloyati, shahri, manzili va moʻljali, izoh (ixtiyoriy), buyurtma qilingan mahsulotlar va summalar.',
              'Xaridor hisobi (ixtiyoriy): elektron pochta, ism, telefon (ixtiyoriy), afzal til va buyurtmalar tarixi. Parollar hech qachon ochiq koʻrinishda saqlanmaydi — faqat qaytarib boʻlmaydigan kriptografik xesh sifatida.',
              'Murojaatlar va biznes soʻrovlari: formaga kiritgan maʼlumotlaringiz (ism, telefon yoki elektron pochta, kompaniya, faoliyat turi, hudud, xabar).',
              'Yangiliklar rassilkasi (ixtiyoriy): elektron pochta manzili va til.',
              'Texnik maʼlumotlar: quyida keltirilgan cookie fayllari va xavfsizlik uchun zarur server yozuvlari, masalan soʻrov vaqti va IP-manzil [server jurnallarini saqlash muddati].',
            ],
          },
          'Biz bank kartasi maʼlumotlarini toʻplamaymiz: hozircha buyurtmalar yetkazib berilganda naqd pul bilan toʻlanadi.',
        ],
      },
      {
        id: 'purposes',
        heading: 'Maʼlumotlardan nima uchun foydalanamiz',
        blocks: [
          {
            list: [
              'Buyurtmalarni qabul qilish, tasdiqlash, yetkazib berish va ularga xizmat koʻrsatish uchun (jumladan, tasdiqlash uchun qoʻngʻiroq qilish).',
              'Agar hisob yaratgan boʻlsangiz, uni yuritish uchun.',
              'Xabarlaringiz va biznes soʻrovlaringizga javob berish uchun.',
              'Faqat roziligingiz bilan yangiliklar yuborish uchun; har bir xatda obunani bekor qilish mumkin.',
              'Doʻkon xavfsizligini taʼminlash va suisteʼmolning oldini olish uchun (masalan, takroriy kirish urinishlarini cheklash).',
              'Qonun talablarini, masalan buxgalteriya va soliq hisobini yuritishni bajarish uchun.',
            ],
          },
          'Biz shaxsiy maʼlumotlarga Oʻzbekiston Respublikasining «Shaxsga doir maʼlumotlar toʻgʻrisida»gi Qonuniga muvofiq ishlov beramiz [har bir maqsad uchun huquqiy asoslar yurist tomonidan tasdiqlanadi].',
        ],
      },
      {
        id: 'sharing',
        heading: 'Maʼlumotlarni kimga beramiz',
        blocks: [
          'Biz shaxsiy maʼlumotlarni sotmaymiz va ularni faqat zarur hollarda beramiz:',
          {
            list: [
              'buyurtmani olib keladigan kuryer yoki yetkazib berish xizmatiga (ism, telefon va manzil) [yetkazib berish xizmatlari nomlari];',
              'saytni joylashtiradigan va, agar yoqilgan boʻlsa, xatlarimizni yuboradigan kompaniyalarga — maxfiylik shartlari asosida [xosting provayderi va pochta xizmati];',
              'qonun talab qilganda davlat organlariga.',
            ],
          },
        ],
      },
      {
        id: 'storage',
        heading: 'Maʼlumotlar qayerda va qancha muddat saqlanadi',
        blocks: [
          'Shaxsiy maʼlumotlar [mamlakat va maʼlumotlar markazi — Oʻzbekiston qonunchiligidagi maʼlumotlarni lokalizatsiya qilish talablarini hisobga olgan holda] joylashgan serverlarda saqlanadi.',
          {
            list: [
              'Buyurtmalar: [buxgalteriya va soliq qonunchiligida belgilangan muddat].',
              'Xaridor hisobi: uni oʻchirishni soʻraguningizcha.',
              'Yangiliklar rassilkasi: obunani bekor qilguningizcha.',
              'Murojaatlar: [murojaatlarni saqlash muddati].',
              'Standart holatda tizimga kirish seansi 30 kungacha (xodimlar uchun 12 soat), faol boʻlmagan savat esa 30 kun saqlanadi.',
            ],
          },
        ],
      },
      {
        id: 'security',
        heading: 'Maʼlumotlarni qanday himoya qilamiz',
        blocks: [
          'Doʻkon bilan aloqa shifrlangan (HTTPS). Parollar faqat mustahkam, qaytarib boʻlmaydigan xesh sifatida saqlanadi, seanslar skriptlar oʻqiy olmaydigan himoyalangan cookie fayllardan foydalanadi, boshqaruv paneliga faqat xodim hisobi bilan kiriladi va shaxsiy maʼlumotlarga faqat ish uchun zarur boʻlgan xodimlar kira oladi.',
        ],
      },
      {
        id: 'cookies',
        heading: 'Cookie fayllari',
        blocks: [
          'Doʻkon faqat ishlashi uchun zarur boʻlgan cookie fayllardan foydalanadi. Reklama va tahliliy cookie fayllar yoʻq.',
          {
            list: [
              'Seans cookie fayli: hisobingizga kirganingizni saqlaydi (30 kungacha; xodimlar uchun 12 soat).',
              'Savat cookie fayli: savatdagi mahsulotlarni eslab qoladi (30 kungacha).',
              'Til cookie fayli (TERAN_LOCALE): tanlangan tilni eslab qoladi (bir yilgacha).',
            ],
          },
        ],
      },
      {
        id: 'rights',
        heading: 'Sizning huquqlaringiz',
        blocks: [
          'Siz biz qanday maʼlumotlaringizni saqlayotganimizni bilishingiz, ularni tuzatish yoki oʻchirishni soʻrashingiz va bergan roziligingizni (masalan, rassilkaga) qaytarib olishingiz mumkin. Ayrim maʼlumotlarni, masalan buyurtmalar haqidagi maʼlumotlarni qonunda belgilangan muddat davomida saqlashimiz shart. Shuningdek, siz [shaxsga doir maʼlumotlarni himoya qilish boʻyicha vakolatli davlat organi]ga shikoyat qilish huquqiga egasiz.',
          'Ushbu huquqlardan foydalanish uchun [maʼlumotlar boʻyicha murojaatlar uchun elektron pochta] manziliga yozing. Biz [javob berish muddati] ichida javob beramiz.',
        ],
      },
      {
        id: 'changes',
        heading: 'Siyosatga oʻzgartirishlar',
        blocks: [
          'Xizmatlarimiz yoki qonunchilik oʻzgarganda siyosatni yangilashimiz mumkin. Amaldagi tahrir sanasi sahifa boshida koʻrsatilgan.',
        ],
      },
    ],
  },
};
