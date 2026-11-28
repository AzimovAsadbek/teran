import type { Localized, LongFormContent } from '../types';

/**
 * Privacy policy. It describes what this platform actually does (data collected by orders, the
 * account, forms and cookies) and where the store keeps them. Details TERAN has not
 * supplied (its taxpayer number and full legal address) are left out rather than invented; a
 * lawyer should review the text, in particular against Uzbekistan's data-localisation rules.
 */
export const privacyPolicy: Localized<LongFormContent> = {
  en: {
    title: 'Privacy policy',
    description:
      'How TERAN collects, uses and protects personal data when you shop, create an account or contact us.',
    intro:
      'This policy explains which personal data the TERAN online store processes, why, for how long and what your rights are. Updated on 28 November 2026.',
    sections: [
      {
        id: 'controller',
        heading: 'Who is responsible for your data',
        blocks: [
          'The operator of this website and controller of your personal data is TERAN TRADE MChJ, a limited liability company in Namangan, Uzbekistan (phone +998 97 570 70 07, +998 95 110 13 26).',
          'For any question about your personal data, write to terantradellc@gmail.com.',
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
              'Your customer account stores your name, e-mail address, phone number, language and order history. If you use a password, we store a one-way hash.',
              'Contact and business enquiries: the details you enter in the form (name, phone or e-mail, company, business type, region, message).',
              'Newsletter (optional): your e-mail address and preferred language.',
              'Technical data: the cookies listed below and server records needed for security, such as the time of a request and the IP address, which are kept only for a short time.',
            ],
          },
          'You enter payment details with the payment provider. TERAN receives the payment reference and status for your order.',
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
          'We process personal data in accordance with the Law of the Republic of Uzbekistan "On Personal Data": to fulfil your order or request, with your consent (for example to the newsletter), or where the law requires it.',
        ],
      },
      {
        id: 'sharing',
        heading: 'Who we share it with',
        blocks: [
          'We do not sell personal data. We share it only when necessary:',
          {
            list: [
              'with the courier or delivery service that brings your order (name, phone number and address);',
              'Our hosting provider runs the store and its database. Cloudflare R2 stores product photos and videos.',
              'If you choose Google sign-in, Google shares your account identifier, verified e-mail and name with TERAN so we can identify your account.',
              'If you choose Telegram, our bot uses your Telegram identifier to send the code. If you share your contact in the bot, TERAN receives your phone number.',
              'Resend receives your e-mail address and the message when we send a sign-in code or password reset link.',
              'with Google (the Gemini API) when you ask the chat’s AI assistant a question: the question and the conversation so far, without phone numbers or e-mail addresses, so that it can answer. We do not keep the conversation;',
              'with public authorities when the law requires it.',
            ],
          },
        ],
      },
      {
        id: 'storage',
        heading: 'Where and how long we keep it',
        blocks: [
          'TERAN stores customer accounts and orders in its production database and keeps encrypted backup copies.',
          {
            list: [
              'Orders: for the period required by accounting and tax law.',
              'Customer account: until you ask us to delete it.',
              'Newsletter: until you unsubscribe.',
              'Enquiries: for as long as needed to answer them and to follow up on any cooperation.',
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
              'A sign-in cookie links a verification request to the browser that started it for up to 30 minutes.',
              'Language cookie (TERAN_LOCALE): remembers the language you chose (up to one year).',
            ],
          },
        ],
      },
      {
        id: 'rights',
        heading: 'Your rights',
        blocks: [
          'You may ask us what data we hold about you, ask us to correct or delete it, and withdraw consent you have given (for example to the newsletter). Some data, such as order records, must be kept for the period required by law. You also have the right to complain to the authorised state body for personal data protection of the Republic of Uzbekistan.',
          'To exercise these rights, write to terantradellc@gmail.com or call +998 97 570 70 07. We will answer as soon as possible, within the time limits set by law.',
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
      'Как TERAN собирает, использует и защищает персональные данные при покупках, регистрации и обращениях.',
    intro:
      'Эта политика объясняет, какие персональные данные обрабатывает интернет-магазин TERAN, зачем, как долго и какие у вас права. Обновлено 28 ноября 2026 года.',
    sections: [
      {
        id: 'controller',
        heading: 'Кто отвечает за ваши данные',
        blocks: [
          'Оператором сайта и ваших персональных данных является общество с ограниченной ответственностью «TERAN TRADE» (TERAN TRADE MChJ), Наманган, Узбекистан (телефоны +998 97 570 70 07, +998 95 110 13 26).',
          'По любым вопросам о персональных данных пишите на terantradellc@gmail.com.',
        ],
      },
      {
        id: 'data',
        heading: 'Какие данные мы собираем',
        blocks: [
          'Мы запрашиваем только то, что нужно для выбранной услуги:',
          {
            list: [
              'Заказы: имя, номер телефона, e-mail (по желанию), область, город, адрес и ориентир доставки, комментарий (по желанию), заказанные товары и суммы.',
              'В аккаунте покупателя хранятся имя, фамилия, электронная почта, телефон, язык и история заказов. Если вы используете пароль, мы сохраняем его односторонний хеш.',
              'Обращения и запросы для бизнеса: данные, которые вы вводите в форму (имя, телефон или e-mail, компания, вид деятельности, регион, сообщение).',
              'Рассылка (по желанию): адрес e-mail и язык.',
              'Технические данные: файлы cookie, перечисленные ниже, и серверные записи, необходимые для безопасности, например время запроса и IP-адрес; они хранятся недолго.',
            ],
          },
          'Платёжные данные вы вводите у платёжного провайдера. TERAN получает номер и статус платежа по заказу.',
        ],
      },
      {
        id: 'purposes',
        heading: 'Зачем мы их используем',
        blocks: [
          {
            list: [
              'Чтобы принимать, подтверждать, доставлять и сопровождать заказы (в том числе звонить для подтверждения).',
              'Чтобы вести ваш аккаунт, если вы его создали.',
              'Чтобы отвечать на сообщения и запросы для бизнеса.',
              'Чтобы отправлять рассылку — только с вашего согласия; в каждом письме можно отписаться.',
              'Чтобы обеспечивать безопасность магазина и предотвращать злоупотребления (например, ограничивать повторные попытки входа).',
              'Чтобы выполнять требования закона, например вести бухгалтерский и налоговый учёт.',
            ],
          },
          'Мы обрабатываем персональные данные в соответствии с Законом Республики Узбекистан «О персональных данных»: для исполнения вашего заказа или обращения, с вашего согласия (например, на рассылку) или когда этого требует закон.',
        ],
      },
      {
        id: 'sharing',
        heading: 'Кому мы их передаём',
        blocks: [
          'Мы не продаём персональные данные и передаём их только при необходимости:',
          {
            list: [
              'курьеру или службе доставки, которая привозит заказ (имя, телефон и адрес);',
              'Провайдер хостинга размещает магазин и его базу данных. Фотографии и видео товаров хранятся в Cloudflare R2.',
              'При входе через Google сервис передаёт TERAN идентификатор аккаунта, подтверждённый адрес почты и имя, чтобы мы могли распознать ваш аккаунт.',
              'При входе через Telegram наш бот использует ваш идентификатор Telegram для отправки кода. Если вы делитесь контактом в боте, TERAN получает ваш номер телефона.',
              'Когда мы отправляем код для входа или ссылку для восстановления пароля, Resend получает адрес электронной почты и текст письма.',
              'компании Google (Gemini API), когда вы задаёте вопрос AI-помощнику в чате: вопрос и предыдущие сообщения беседы, без номеров телефонов и адресов электронной почты, чтобы он мог ответить. Мы не храним переписку;',
              'государственным органам, когда этого требует закон.',
            ],
          },
        ],
      },
      {
        id: 'storage',
        heading: 'Где и как долго мы их храним',
        blocks: [
          'TERAN хранит аккаунты покупателей и заказы в рабочей базе данных и создаёт зашифрованные резервные копии.',
          {
            list: [
              'Заказы: в течение срока, установленного законодательством о бухгалтерском и налоговом учёте.',
              'Аккаунт покупателя: пока вы не попросите его удалить.',
              'Рассылка: пока вы не отпишетесь.',
              'Обращения: столько, сколько нужно, чтобы ответить на них и продолжить сотрудничество.',
              'По умолчанию сеанс входа действует до 30 дней (для сотрудников — 12 часов), а неактивная корзина хранится 30 дней.',
            ],
          },
        ],
      },
      {
        id: 'security',
        heading: 'Как мы их защищаем',
        blocks: [
          'Соединение с магазином шифруется (HTTPS). Пароли хранятся только в виде стойких необратимых хешей, сеансы используют защищённые cookie, недоступные скриптам, администрирование требует учётной записи сотрудника, а доступ к персональным данным есть только у тех, кому он нужен для работы.',
        ],
      },
      {
        id: 'cookies',
        heading: 'Файлы cookie',
        blocks: [
          'Магазин использует только cookie, без которых он не может работать. Рекламных и аналитических cookie нет.',
          {
            list: [
              'Cookie сеанса: сохраняет вход в аккаунт (до 30 дней; для сотрудников — 12 часов).',
              'Cookie корзины: запоминает товары в корзине (до 30 дней).',
              'Cookie подтверждения входа связывает запрос с браузером, из которого вы его начали, на срок до 30 минут.',
              'Cookie языка (TERAN_LOCALE): запоминает выбранный язык (до одного года).',
            ],
          },
        ],
      },
      {
        id: 'rights',
        heading: 'Ваши права',
        blocks: [
          'Вы можете узнать, какие данные о вас мы храним, попросить исправить или удалить их и отозвать данное согласие (например, на рассылку). Некоторые данные, например сведения о заказах, мы обязаны хранить в течение срока, установленного законом. Вы также вправе обратиться с жалобой в уполномоченный государственный орган Республики Узбекистан по защите персональных данных.',
          'Чтобы воспользоваться этими правами, напишите на terantradellc@gmail.com или позвоните по номеру +998 97 570 70 07. Мы ответим как можно скорее, в сроки, установленные законом.',
        ],
      },
      {
        id: 'changes',
        heading: 'Изменения политики',
        blocks: [
          'Мы можем обновлять политику при изменении наших услуг или законодательства. Дата действующей редакции указана в начале страницы.',
        ],
      },
    ],
  },
  uz: {
    title: 'Maxfiylik siyosati',
    description:
      'TERAN xarid qilish, roʻyxatdan oʻtish va murojaat qilishda shaxsiy maʼlumotlarni qanday toʻplashi, ishlatishi va himoya qilishi haqida.',
    intro:
      'Ushbu siyosat TERAN internet-doʻkoni qaysi shaxsiy maʼlumotlarga ishlov berishi, nima uchun va qancha muddat saqlashi hamda sizning huquqlaringiz haqida tushuntiradi. 2026-yil 28-noyabrda yangilangan.',
    sections: [
      {
        id: 'controller',
        heading: 'Maʼlumotlaringiz uchun kim javobgar',
        blocks: [
          'Sayt va shaxsiy maʼlumotlaringiz operatori — «TERAN TRADE» masʼuliyati cheklangan jamiyati (MChJ), Namangan, Oʻzbekiston (telefonlar: +998 97 570 70 07, +998 95 110 13 26).',
          'Shaxsiy maʼlumotlar boʻyicha har qanday savol bilan terantradellc@gmail.com manziliga yozing.',
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
              'Xaridor hisobida ism, familiya, elektron pochta, telefon raqami, tanlangan til va buyurtmalar tarixi saqlanadi. Paroldan foydalansangiz, uning bir tomonlama xeshi saqlanadi.',
              'Murojaatlar va biznes soʻrovlari: shaklga kiritgan maʼlumotlaringiz (ism, telefon yoki elektron pochta, kompaniya, faoliyat turi, hudud, xabar).',
              'Yangiliklar obunasi (ixtiyoriy): elektron pochta manzili va til.',
              'Texnik maʼlumotlar: quyida keltirilgan cookie fayllari va xavfsizlik uchun zarur server yozuvlari, masalan soʻrov vaqti va IP-manzil; ular qisqa muddat saqlanadi.',
            ],
          },
          'Toʻlov maʼlumotlarini toʻlov provayderida kiritasiz. TERAN buyurtmangiz boʻyicha toʻlov raqami va holatini oladi.',
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
          'Biz shaxsiy maʼlumotlarga Oʻzbekiston Respublikasining «Shaxsga doir maʼlumotlar toʻgʻrisida»gi Qonuniga muvofiq ishlov beramiz: buyurtmangiz yoki murojaatingizni bajarish uchun, sizning roziligingiz bilan (masalan, yangiliklar obunasi uchun) yoki qonun talab qilganda.',
        ],
      },
      {
        id: 'sharing',
        heading: 'Maʼlumotlarni kimga beramiz',
        blocks: [
          'Biz shaxsiy maʼlumotlarni sotmaymiz va ularni faqat zarur hollarda beramiz:',
          {
            list: [
              'buyurtmani olib keladigan kuryer yoki yetkazib berish xizmatiga (ism, telefon va manzil);',
              'Doʻkon va uning bazasini xosting provayderi joylashtiradi. Mahsulot rasmlari va videolari Cloudflare R2 da saqlanadi.',
              'Google orqali kirishni tanlasangiz, hisobingizni aniqlash uchun Google TERANga hisob identifikatori, tasdiqlangan elektron pochta va ismingizni beradi.',
              'Telegram orqali kirsangiz, bot kodni yuborish uchun Telegram identifikatoringizdan foydalanadi. Botda kontaktingizni ulashsangiz, TERAN telefon raqamingizni oladi.',
              'Kirish kodi yoki parolni tiklash havolasi yuborilganda, Resend elektron pochta manzilingiz va xat matnini oladi.',
              'chatdagi AI yordamchiga savol berganingizda Google kompaniyasiga (Gemini API): javob bera olishi uchun savol va suhbatning oldingi xabarlari — telefon raqamlari va elektron pochta manzillarisiz. Biz suhbatni saqlamaymiz;',
              'qonun talab qilganda davlat organlariga.',
            ],
          },
        ],
      },
      {
        id: 'storage',
        heading: 'Maʼlumotlar qayerda va qancha muddat saqlanadi',
        blocks: [
          'TERAN xaridor hisoblari va buyurtmalarni doʻkonning asosiy bazasida saqlaydi hamda shifrlangan zaxira nusxalarini yaratadi.',
          {
            list: [
              'Buyurtmalar: buxgalteriya va soliq qonunchiligida belgilangan muddat davomida.',
              'Xaridor hisobi: uni oʻchirishni soʻraguningizcha.',
              'Yangiliklar obunasi: obunani bekor qilguningizcha.',
              'Murojaatlar: ularga javob berish va hamkorlikni davom ettirish uchun zarur boʻlgan muddat davomida.',
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
              'Kirishni tasdiqlash uchun cookie soʻrovni u boshlangan brauzer bilan 30 daqiqagacha bogʻlaydi.',
              'Til cookie fayli (TERAN_LOCALE): tanlangan tilni eslab qoladi (bir yilgacha).',
            ],
          },
        ],
      },
      {
        id: 'rights',
        heading: 'Sizning huquqlaringiz',
        blocks: [
          'Siz biz qanday maʼlumotlaringizni saqlayotganimizni bilishingiz, ularni tuzatish yoki oʻchirishni soʻrashingiz va bergan roziligingizni (masalan, yangiliklar obunasiga) qaytarib olishingiz mumkin. Ayrim maʼlumotlarni, masalan buyurtmalar haqidagi maʼlumotlarni qonunda belgilangan muddat davomida saqlashimiz shart. Shuningdek, siz Oʻzbekiston Respublikasining shaxsga doir maʼlumotlarni himoya qilish boʻyicha vakolatli davlat organiga shikoyat qilish huquqiga egasiz.',
          'Ushbu huquqlardan foydalanish uchun terantradellc@gmail.com manziliga yozing yoki +998 97 570 70 07 raqamiga qoʻngʻiroq qiling. Biz imkon qadar tez, qonunda belgilangan muddatlarda javob beramiz.',
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
