import type { Localized, LongFormContent } from '../types';

/**
 * The website's accessibility statement. Every line describes what the storefront actually does
 * (checked in the code and by the axe run in e2e/tests/accessibility.spec.ts) or what it does not
 * do yet; update it when either changes.
 */
export const accessibilityStatement: Localized<LongFormContent> = {
  en: {
    title: 'Accessibility',
    description:
      'How the TERAN website works with a keyboard, screen readers and other assistive technology, what is still limited and how to get help.',
    intro:
      'TERAN wants everyone to be able to browse, choose and order tea on this website, whatever device or assistive technology they use. This statement explains what we do for that, what is still limited and how to reach us if something gets in your way. Last updated: 18 October 2026.',
    sections: [
      {
        id: 'aim',
        heading: 'Our aim',
        blocks: [
          'We build the website to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA, the international standard for accessible web content.',
          'Every change to the website is checked automatically against the WCAG 2.2 level A and AA rules that software can test (with the axe tool) on the shop, checkout, information and account pages. Automated checks cannot catch everything, so pages are also reviewed by hand, with a keyboard and at different screen sizes, when they are built or changed.',
        ],
      },
      {
        id: 'features',
        heading: 'What the website does',
        blocks: [
          {
            list: [
              'The website can be used with a keyboard alone: the menus, the search, the bag, forms and dialogs, with a clearly visible focus outline. The first link on every page is "Skip to main content".',
              'Pictures that carry information have text alternatives; decorative pictures are hidden from screen readers.',
              'Pages are built with headings, landmarks and labelled form fields, and each page declares its language (Uzbek, Russian or English), so screen readers read it with the right pronunciation.',
              'Text and controls are designed to meet the WCAG AA colour contrast, and pages can be zoomed to 200% and read on narrow screens without the page scrolling sideways.',
              'The films on the home page and in product pictures stay still when your device is set to reduce motion or to save data, and the "Pause the videos" switch at the foot of every page stops them all (your device remembers the choice). The moving ribbons on the home page stop when your device is set to reduce motion and while the keyboard focus is on one of their links.',
              'Form errors are explained in words next to the field and summarised at the top of the form.',
            ],
          },
        ],
      },
      {
        id: 'limitations',
        heading: 'Known limitations',
        blocks: [
          {
            list: [
              "The map on the store locator is a picture of the area and is hard to use with a screen reader. The list next to it gives the same information: each store's address, opening hours, phone number and a link for directions.",
              'Directions open in Google Maps, and some links lead to messengers and other services. Those websites are not run by TERAN, and their accessibility is outside our control.',
            ],
          },
        ],
      },
      {
        id: 'help',
        heading: 'Need help or found a problem?',
        blocks: [
          'If any part of the website is hard to use, tell us. We can help you choose and order by phone or in a message instead, and we will work to fix the problem.',
          'Please tell us the page address, what you were trying to do and, if you use them, your assistive technology and browser.',
        ],
      },
    ],
  },
  ru: {
    title: 'Доступность',
    description:
      'Как сайт TERAN работает с клавиатурой, программами экранного доступа и другими вспомогательными технологиями, что пока ограничено и как получить помощь.',
    intro:
      'TERAN хочет, чтобы каждый мог смотреть, выбирать и заказывать чай на этом сайте, каким бы устройством или вспомогательной технологией он ни пользовался. Здесь рассказано, что для этого сделано, что пока ограничено и как связаться с нами, если что-то мешает. Последнее обновление: 18 октября 2026 года.',
    sections: [
      {
        id: 'aim',
        heading: 'Наша цель',
        blocks: [
          'Мы создаём сайт в соответствии с Руководством по доступности веб-контента (WCAG) 2.2 уровня AA — международным стандартом доступности.',
          'Каждое изменение сайта автоматически проверяется по правилам WCAG 2.2 уровней A и AA, которые может проверить программа (инструментом axe), на страницах магазина, оформления заказа, информационных страницах и в личном кабинете. Автоматическая проверка находит не всё, поэтому при создании и изменении страниц их также проверяют вручную — с клавиатуры и на экранах разного размера.',
        ],
      },
      {
        id: 'features',
        heading: 'Что сделано на сайте',
        blocks: [
          {
            list: [
              'Сайтом можно полностью пользоваться с одной клавиатуры: меню, поиск, корзина, формы и диалоговые окна, с хорошо заметной рамкой фокуса. Первая ссылка на каждой странице — «Перейти к основному содержимому».',
              'У изображений, которые несут информацию, есть текстовое описание; декоративные изображения скрыты от программ экранного доступа.',
              'Страницы размечены заголовками, областями (landmarks) и подписанными полями форм, и каждая страница сообщает свой язык (узбекский, русский или английский), чтобы программы экранного доступа читали текст с правильным произношением.',
              'Текст и элементы управления спроектированы с контрастом цветов по WCAG AA; страницы можно увеличить до 200 % и читать на узких экранах без горизонтальной прокрутки страницы.',
              'Видео на главной странице и в фотографиях товаров не двигаются, если на устройстве включено уменьшение движения или экономия трафика, а переключатель «Остановить видео» внизу каждой страницы останавливает их все (выбор запоминается на устройстве). Движущиеся ленты на главной странице останавливаются, если включено уменьшение движения, и пока фокус клавиатуры находится на одной из их ссылок.',
              'Ошибки в формах объясняются словами рядом с полем и собираются в сводку вверху формы.',
            ],
          },
        ],
      },
      {
        id: 'limitations',
        heading: 'Известные ограничения',
        blocks: [
          {
            list: [
              'Карта на странице поиска магазина — это изображение местности, и с программой экранного доступа ею пользоваться трудно. Список рядом с ней даёт те же сведения: адрес каждого магазина, часы работы, телефон и ссылку для построения маршрута.',
              'Маршруты открываются в Google Картах, а некоторые ссылки ведут в мессенджеры и другие сервисы. Эти сайты не принадлежат TERAN, и их доступность от нас не зависит.',
            ],
          },
        ],
      },
      {
        id: 'help',
        heading: 'Нужна помощь или нашли проблему?',
        blocks: [
          'Если какой-то частью сайта пользоваться трудно, сообщите нам. Мы поможем выбрать и заказать чай по телефону или в сообщении и постараемся устранить проблему.',
          'Пожалуйста, укажите адрес страницы, что вы пытались сделать и, если пользуетесь ими, вспомогательную технологию и браузер.',
        ],
      },
    ],
  },
  uz: {
    title: 'Maxsus imkoniyatlar',
    description:
      'TERAN sayti klaviatura, ekran oʻquvchi dasturlar va boshqa yordamchi texnologiyalar bilan qanday ishlashi, cheklovlar va yordam olish yoʻllari.',
    intro:
      'TERAN har bir kishi — qaysi qurilma yoki yordamchi texnologiyadan foydalanmasin — ushbu saytda choyni koʻrib chiqishi, tanlashi va buyurtma qilishi mumkin boʻlishini istaydi. Ushbu bayonot buning uchun nima qilinganini, nimalar hali cheklanganini va biror narsa xalaqit bersa, biz bilan qanday bogʻlanishni tushuntiradi. Soʻnggi yangilanish: 2026-yil 18-oktabr.',
    sections: [
      {
        id: 'aim',
        heading: 'Maqsadimiz',
        blocks: [
          'Saytni veb-kontent maxsus imkoniyatlari boʻyicha qoʻllanmaning (WCAG) 2.2 versiyasi AA darajasiga — bu boradagi xalqaro standartga — mos qilib quramiz.',
          'Saytdagi har bir oʻzgarish dasturiy taʼminot tekshira oladigan WCAG 2.2 A va AA darajasi qoidalari boʻyicha (axe vositasi bilan) doʻkon, buyurtma berish, maʼlumot va shaxsiy kabinet sahifalarida avtomatik tekshiriladi. Avtomatik tekshiruv hamma narsani aniqlay olmaydi, shuning uchun sahifalar yaratilganda yoki oʻzgartirilganda klaviatura bilan va turli ekran oʻlchamlarida qoʻlda ham koʻrib chiqiladi.',
        ],
      },
      {
        id: 'features',
        heading: 'Saytda nimalar qilingan',
        blocks: [
          {
            list: [
              'Saytdan sichqonchasiz, faqat klaviatura yordamida ham toʻliq foydalanish mumkin: menyular, qidiruv, savat, shakllar va dialog oynalari, fokus ramkasi aniq koʻrinib turadi. Har bir sahifadagi birinchi havola — «Asosiy mazmunga oʻtish».',
              'Maʼlumot beruvchi rasmlarning matnli tavsifi bor; bezak uchun qoʻyilgan rasmlar ekran oʻquvchi dasturlardan yashirilgan.',
              'Sahifalar sarlavhalar, hududlar (landmark) va nomlangan shakl maydonlari bilan tuzilgan; har bir sahifa oʻz tilini (oʻzbek, rus yoki ingliz) bildiradi, shuning uchun ekran oʻquvchi dasturlar matnni toʻgʻri talaffuz bilan oʻqiydi.',
              'Matn va boshqaruv elementlari WCAG AA rang kontrastiga mos qilib loyihalangan; sahifalarni 200 % gacha kattalashtirish va tor ekranlarda sahifani yon tomonga surmasdan oʻqish mumkin.',
              'Bosh sahifadagi va mahsulot rasmlaridagi videolar qurilmangizda «harakatni kamaytirish» yoki trafikni tejash sozlamasi yoqilganda harakatlanmaydi, har bir sahifa pastidagi «Videolarni toʻxtatish» tugmasi esa ularning hammasini toʻxtatadi (tanlov qurilmangizda eslab qolinadi). Bosh sahifadagi harakatlanuvchi lentalar «harakatni kamaytirish» yoqilganda va klaviatura fokusi ularning havolalaridan birida turganda toʻxtaydi.',
              'Shakldagi xatolar maydon yonida soʻz bilan tushuntiriladi va shakl tepasida jamlab koʻrsatiladi.',
            ],
          },
        ],
      },
      {
        id: 'limitations',
        heading: 'Maʼlum cheklovlar',
        blocks: [
          {
            list: [
              'Doʻkon topish sahifasidagi xarita hududning tasviri boʻlib, undan ekran oʻquvchi dastur bilan foydalanish qiyin. Uning yonidagi roʻyxat xuddi shu maʼlumotni beradi: har bir doʻkonning manzili, ish vaqti, telefoni va «Yoʻlni koʻrsatish» havolasi.',
              'Yoʻl Google Xaritalarda koʻrsatiladi, ayrim havolalar esa messenjerlar va boshqa xizmatlarga olib boradi. Bu saytlar TERAN tomonidan yuritilmaydi va ularning maxsus imkoniyatlari bizning nazoratimizdan tashqarida.',
            ],
          },
        ],
      },
      {
        id: 'help',
        heading: 'Yordam kerakmi yoki muammo topdingizmi?',
        blocks: [
          'Saytning biror qismidan foydalanish qiyin boʻlsa, bizga xabar bering. Choyni telefon yoki xabar orqali tanlash va buyurtma qilishda yordam beramiz hamda muammoni bartaraf etish ustida ishlaymiz.',
          'Iltimos, sahifa manzilini, nima qilmoqchi boʻlganingizni va, agar foydalansangiz, yordamchi texnologiya hamda brauzer nomini yozing.',
        ],
      },
    ],
  },
};
