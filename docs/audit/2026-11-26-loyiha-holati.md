# TERAN loyihasining amaldagi holati

2026-yil 26-noyabr, Toshkent vaqti. Jonli web va API relizi `78cb969cc48b`. Zaxiralash dasturi `df72be0108cb`. Tekshiruv jonli sayt, PostgreSQL, serverdagi xizmatlar, provayderlar javobi va mahalliy testlarni qamrab oldi.

## Xaridor hozir nima qila oladi

| Qism                  | Jonli holat                                                                                                                                                                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Katalog               | 46 ta faol mahsulotning har biri o‘zbek, rus va ingliz tilida kiritilgan. Bazada 15 ta faol turkum, 6 ta faol kolleksiya va 56 ta faol qadoq varianti bor. Xaridor mahsulotni turkum, qidiruv va filtr orqali topadi.                          |
| Savat va hisob        | Mehmon mahsulot qo‘sha oladi. Savat darhol ochilib, mahsulot, miqdor va jami summani ko‘rsatadi. Buyurtmani tasdiqlash hisobga kirishni talab qiladi. Anonim buyurtma so‘roviga jonli API `401` qaytardi.                                      |
| Chakana savdo         | 6 ta choyni onlayn sotib olish mumkin. 13 ta boshqa choyning fiskal maydonlari tugallanmagan. Ular va boshqa turkumdagi 27 ta mahsulot aloqa orqali buyurtma oladi. Yetkazib berish va uning haqi o‘chirilgan.                                 |
| Aloqa va kontent      | Oddiy va ulgurji murojaatlar xodimlar paneliga tushadi. Jurnalda 5 ta maqola, galereyada 10 ta surat, 6 ta video va 4 ta qisqa video nashr qilingan.                                                                                           |
| Xarid tarixi va aloqa | Hisobda buyurtmalar tarixi va to‘lov holati ko‘rinadi. Ro‘yxatdan o‘tish ochiq. Pochta jo‘natish o‘chirilgan, shuning uchun email orqali parolni tiklash hozir mavjud emas. Gemini yordamchisi sozlamada yoqilgan va servis kaliti kiritilgan. |

Sotib olishni sinash uchun XC2025 400 g choyining ikkita qadog‘i alohida taklifga ajratildi. Sinov taklifi 1 000 so‘m, odatiy qadoq 70 000 so‘m. Taklif qo‘shishdan oldingi 55 ta qadoqning narxlari solishtirildi va saqlandi. [1 000 so‘mlik choy](https://terantrade.uz/products/teran-xc2025-1000)

## To‘lov va fiskal chek

| Provayder | Tasdiqlangan qism                                                                                                                                                                                                                                                           | Qolgan qism                                                                                                                                                                                                             |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CLICK     | Xizmat merchant kabinetida faol. Jonli savat CLICK’ni taklif qiladi. Xaridor CLICK’ga o‘tadi. TERAN imzolangan `Prepare` va `Complete` xabarlaridan buyurtma va to‘lov holatini yangilaydi. Muvaffaqiyatli to‘lovdan so‘ng tovar satrlari `submit_items` orqali yuboriladi. | Tekshiruv chog‘ida 1 000 so‘mlik taklif bo‘yicha haqiqiy to‘lov yo‘q edi. Birinchi real xaridda summa, TERAN’dagi “To‘langan” holati va CLICK bergan fiskal chekni bitta buyurtma raqami bo‘yicha solishtirish qolgan.  |
| Payme     | Sinov kaliti ajratilgan bazaga ulangan. Payme ommaviy endpoint orqali uchta sinov buyurtmasini tekshirib, sinov o‘tganini tasdiqladi. Sayt tovar satrlarini jo‘natadi va `SetFiscalData` orqali chek natijasini qabul qiladi.                                               | Payme kassani faollashtirishni menejerga topshirdi. 18:41 da menejerdan jonli kassa va `SetFiscalData` tasdig‘i yana so‘raldi. Tasdiq kelgach, Payme jonli savatga qo‘shiladi va 1 000 so‘mlik real xarid tekshiriladi. |

Fiskal chekni to‘lov provayderi rasmiylashtiradi. TERAN har bir buyurtmada mahsulot nomi, miqdori, narxi, MXIK, qadoq kodi va QQS stavkasini uzatadi. Yangi mahsulotning har bir sotiladigan qadoq varianti uchun xodim bu ma’lumotlarni admin panelga kiritadi. Keyingi xaridlarda ular avtomatik yuboriladi. [CLICK fiskalizatsiya hujjati](https://docs.click.uz/merchant-api/fiscalization) · [Payme sinov sahifasi](https://terantrade.uz/payme-sinov) · [Loyiha to‘lov yo‘riqnomasi](../deployment/payment-provider-setup.md)

## Xodim paneli va texnik tuzilma

- **Savdo va ombor.** Panelda buyurtmalar, mijozlar, qoldiq harakati, so‘rovlar, savdo ko‘rsatkichlari va CSV hisobotlari bor. API narx, qoldiq va jami summani qayta hisoblaydi. Buyurtma rezerv yaratadi. Muddati o‘tgan to‘lanmagan buyurtmada fon vazifasi mahsulotni omborga bir marta qaytaradi. [Buyurtma va to‘lov qoidalari](../architecture/payments.md)
- **Katalog va nashr.** Xodim turkum, kolleksiya, mahsulot turi, qadoq, tarjima, maqola, sharh va galereyani boshqaradi. Telegram kanaliga mahsulot va maqola e’lon qilish moduli mavjud, uning jonli rejimi o‘chirilgan. Zaxira boti serverda alohida ishlaydi. [Katalog](../architecture/catalogue.md) · [Telegram nashrlari](../architecture/telegram.md)
- **Dastur.** `apps/web` ichida Next.js vitrinasi va admin paneli, `apps/api` ichida NestJS xizmatlari, `packages/contracts` ichida ikkala tomon ishlatadigan so‘rov va javob sxemalari bor. Prisma sxemasida 48 ta model, migratsiyalar tarixida 25 ta SQL migratsiya bor. [Arxitektura](../architecture/overview.md) · [Baza modeli](../../apps/api/prisma/schema.prisma)
- **Server.** HTTPS orqali kelgan so‘rovlar Nginx orqali web va API’ga yetadi. PostgreSQL tashqi tarmoqqa chiqarilmagan. Uchala konteyner sog‘lom. Anonim foydalanuvchiga admin API `401` qaytardi. Uch tildagi vitrina, mahsulot, aloqa, ulgurji savdo, jurnal, galereya, sitemap va Payme sinov sahifasi HTTP `200` qaytardi. [Joylashtirish va tiklash](../deployment/production.md)

## Ma’lumotlar qayerda saqlanadi

**PostgreSQL** buyurtmalar, to‘lovlar, chek yozuvlari, ombor, mahsulotlar, akkauntlar va media manzillarini saqlaydi. Toshkent vaqti bilan 00:00, 06:00, 12:00 va 18:00 da faqat bazaning nusxasi olinadi. Serverda yetti kunlik tarix va kamida oxirgi ikki nusxa saqlanadi. Yakshanba 02:30 da alohida konteynerda tiklash sinovi bajariladi.

**R2** rasm va videolarni saqlaydi. Amaldagi jadval media fayllarini ko‘chirmaydi. Rejim almashtirilishidan avval olingan birinchi to‘liq nusxa serverda odatiy saqlash muddati tugaguncha turadi.

**Telegram.** `@teran_saver_bot` yopiq `teran data` guruhiga shifrlangan baza, sayt, API va PostgreSQL holati hamda diskdagi bo‘sh joyni yuboradi. Yangi faqat-baza nusxasi alohida PostgreSQL konteyneriga 1,81 soniyada tiklandi va unda media fayllari soni nol bo‘ldi. Guruhdagi hujjat qayta yuklandi, egasining Mac kompyuteridagi kalit bilan ochildi va SHA-256 nazorat summasi asl nusxaga mos keldi. Telegram hujjatini ochish uchun Mac’dagi `~/Library/Application Support/TERAN Backup/identity.txt` tiklash kaliti kerak.

## Past tezlikdagi internet

Jonli bosh sahifa 390 × 844 o‘lchamdagi mobil Chromium bilan har bir rejimda uch martadan, bo‘sh brauzer keshi bilan o‘lchandi. Jadvaldagi vaqt navigatsiya boshidan olingan mediana. R2 qoidasida mavjud TERAN domenlari uchun video bayt oralig‘i va uzunligini brauzer o‘qishi yoqildi. [O‘lchov skripti](../../e2e/scripts/measure-film.ts) · [R2 CORS hujjati](https://developers.cloudflare.com/r2/buckets/cors/)

| Tarmoq                        | Birinchi rasm | Birinchi video kadri | Shu kuni tuzatishdan oldingi video kadri |
| ----------------------------- | ------------: | -------------------: | ---------------------------------------: |
| 3G, 750 kbit/s, 150 ms        |        4,63 s |               8,27 s |                                   8,40 s |
| 2G, 128 kbit/s, 350 ms        |       13,02 s |              51,39 s |                                  54,68 s |
| Save-Data, 750 kbit/s, 150 ms |        2,87 s |               4,96 s |                                   9,41 s |

Video barcha o‘lchovlarda o‘ynadi. 2G’da kadr chiqishi hali ham uzoq. Rasm va birinchi kadr orasidagi taxminan 38 soniyalik kutish keyingi tezlik ishining asosiy masalasi.

## Sifat nazorati va keyingi ish

21-noyabrdagi sakkizta band bo‘yicha ombor rezervi, paketlar, takroriy murojaat, parallel savat, CSV eksporti, narxsiz savdo rejimi, kesh va IndexNow, zaxiradan tiklash tuzatilgan. 26-noyabrda production bog‘liqliklari auditi ma’lum zaiflik topmadi. [Sakkizta tuzatish va sinov dalillari](2026-11-21-texnik-tahlil.md)

Narxlar ochiq rejimda lint va TypeScript tekshiruvlari, 445 ta birlik testi, 178 ta PostgreSQL integratsion testi hamda Telegram zaxirasiga oid 3 ta test o‘tdi. Bajarilgan to‘plamlarda yiqilgan yoki o‘tkazib yuborilgan test qayd etilmadi. Integratsion to‘plamdagi 25 ta to‘lov testi alohida ham bajarildi. PostgreSQL testlarida `pg` drayveri bitta ulanishda bir vaqtda bir nechta so‘rov ishlatilishi haqida ogohlantirdi. Buni drayverning keyingi katta versiyasiga o‘tishda tekshirish kerak.

Brauzer tekshiruvi ikkita mahalliy ssenariyni qamradi. Jonli domenda mehmon savati va majburiy login qo‘lda ham tekshirildi.

Hozirgi tijoriy ustuvorliklar CLICK’dagi birinchi haqiqiy to‘lov va chekni tasdiqlash hamda Payme jonli kassasini ochishdir. Katalog kengaytirilganda tegishli qadoqlarning fiskal ma’lumotlari kiritiladi. Xaridorlarga email orqali parolni tiklash kerak bo‘lsa, keyingi tashqi bog‘lanish SMTP jo‘natuvchisidir.
