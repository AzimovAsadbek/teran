# TERAN loyihasining amaldagi holati

2026-yil 26-noyabr, Toshkent vaqti. Dastlabki tekshiruvda jonli web va API relizi `78cb969cc48b` edi. Soat 22:00 da ikkalasi `772193866290` versiyasida ishlayotgani tasdiqlandi. Zaxiralash dasturi `df72be0108cb`. Tekshiruv jonli sayt, PostgreSQL, serverdagi xizmatlar, provayderlar javobi va mahalliy testlarni qamrab oldi.

## Xaridor hozir nima qila oladi

| Qism                  | Jonli holat                                                                                                                                                                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Katalog               | 46 ta faol mahsulotning har biri o‘zbek, rus va ingliz tilida kiritilgan. Bazada 15 ta faol turkum, 6 ta faol kolleksiya va 56 ta faol qadoq varianti bor. Xaridor mahsulotni turkum, qidiruv va filtr orqali topadi.                          |
| Savat va hisob        | Mehmon mahsulot qo‘sha oladi. Savat darhol ochilib, mahsulot, miqdor va jami summani ko‘rsatadi. Buyurtmani tasdiqlash hisobga kirishni talab qiladi. Anonim buyurtma so‘roviga jonli API `401` qaytardi.                                      |
| Chakana savdo         | 6 ta choyni onlayn sotib olish mumkin. 13 ta boshqa choyning fiskal maydonlari tugallanmagan. Ular va boshqa turkumdagi 27 ta mahsulot aloqa orqali buyurtma oladi. Yetkazib berish va uning haqi o‘chirilgan.                                 |
| Aloqa va kontent      | Oddiy va ulgurji murojaatlar xodimlar paneliga tushadi. Jurnalda 5 ta maqola, galereyada 10 ta surat, 6 ta video va 4 ta qisqa video nashr qilingan.                                                                                           |
| Xarid tarixi va aloqa | Hisobda buyurtmalar tarixi va to‘lov holati ko‘rinadi. Ro‘yxatdan o‘tish ochiq. Pochta jo‘natish o‘chirilgan, shuning uchun email orqali parolni tiklash hozir mavjud emas. Gemini yordamchisi sozlamada yoqilgan va servis kaliti kiritilgan. |

Sotib olishni sinash uchun dastlab XC2025 400 g choyining ikkita qadog‘i ajratildi. 20:13 va 20:14 dagi buyurtmalar ikkala qadoqni rezerv qilgach, odatiy XC2025 zaxirasidan yana sakkizta qadoq o‘tkazildi. Sinov taklifiga jami o‘nta qadoq ajratildi. O‘tkazmadan keyin jonli vitrinada sakkizta qadoqni 1 000 so‘mdan savatga qo‘shish mumkin edi. Odatiy qadoq narxi 70 000 so‘m. Taklif qo‘shishdan oldingi 55 ta qadoqning narxlari solishtirildi va saqlandi. [1 000 so‘mlik choy](https://terantrade.uz/products/teran-xc2025-1000)

## To‘lov va fiskal chek

| Provayder | Tasdiqlangan qism                                                                                                                                                                                                             | Qolgan qism                                                                                                                                                                                                             |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CLICK     | Xizmat merchant kabinetida faol. CLICK to‘lov sahifasida TERAN nomi, buyurtma raqami va 1 000 so‘m to‘g‘ri ko‘rindi.                                                                                                          | Ilova birinchi real urinishni «To‘lash» bosilganda rad etdi. Rad etish sababi CLICK’dan so‘raldi. To‘lov va fiskal chek hali jonli xaridda tasdiqlanmagan.                                                              |
| Payme     | Sinov kaliti ajratilgan bazaga ulangan. Payme ommaviy endpoint orqali uchta sinov buyurtmasini tekshirib, sinov o‘tganini tasdiqladi. Sayt tovar satrlarini jo‘natadi va `SetFiscalData` orqali chek natijasini qabul qiladi. | Payme kassani faollashtirishni menejerga topshirdi. 18:41 da menejerdan jonli kassa va `SetFiscalData` tasdig‘i yana so‘raldi. Tasdiq kelgach, Payme jonli savatga qo‘shiladi va 1 000 so‘mlik real xarid tekshiriladi. |

26-noyabr kuni 18:43 da yaratilgan buyurtma uchun CLICK ilovasi «По указанному контрагенту операции недоступны» xabarini ko‘rsatdi. Xaridorning aytishicha, kartadan pul yechilmagan. TERAN kirish jurnalida `Prepare` yoki `Complete` so‘rovi qayd etilmadi. Merchant kabinetida ikkala HTTPS manzil to‘g‘ri, muvaffaqiyatsiz to‘lovlar hisobotida bu urinish ko‘rinmadi. Buyurtma raqami, vaqt va xato matni CLICK integratsiya guruhiga yuborildi.

19:13:39 da to‘lov muddati tugagach, TERAN buyurtmani avtomatik bekor qildi va rezervdagi bir qadoqni qaytardi. Qoldiq yana ikkita bo‘ldi. Muddat tugashidan oldin ham, keyin ham CLICK Merchant API’da buyurtma raqami va sana bo‘yicha qidiruv `-16` («Платёж с указанными параметрами не найден») qaytardi. [CLICK to‘lov holatini tekshirish hujjati](https://docs.click.uz/merchant-api/requests)

Ikkinchi 1 000 so‘mlik buyurtma 19:24 da yaratildi. 19:25 da CLICK ilovasi «Texnik nosozlik. To‘lov holatini Hisobotlar bo‘limida tekshiring» deb ko‘rsatdi. Xaridorning CLICK hisobotida ham, TERAN merchant kabinetining barcha to‘lovlar hisobotida ham operatsiya ko‘rinmadi. TERAN kirish jurnalida shu urinish uchun `Prepare` yoki `Complete` qayd etilmadi. 19:54:39 da TERAN buyurtmani bekor qildi va rezervdagi bir qadoqni qaytardi. Muddat tugaganidan keyin ham CLICK Merchant API buyurtma raqami bo‘yicha `-16` qaytardi. Kartadan mablag‘ yechilganini bu javob asosida aniqlab bo‘lmaydi.

Tashqi HTTPS tekshiruvida domen Cloudflare orqali ochildi. TERAN serverining amaldagi IPv4 manziliga bevosita ulanganda ham domen sertifikati tekshiruvdan o‘tdi va `Prepare` manzili `OPTIONS` so‘roviga `204` qaytardi. CLICK boti avvalroq amaldagi IP ruxsat ro‘yxatiga kiritilganini tasdiqlagan. Xato skrinshoti, buyurtma vaqti va server manzili CLICK guruhiga yuborildi. CLICK’dan to‘lovning yakuniy holati va ularning shlyuzi amalda qaysi manzilga ulangani so‘raldi.

To‘rtta jonli CLICK buyurtmasida bittadan 400 g XC2025, jami 1 000 so‘m va yetkazish haqi 0 so‘m saqlangan. To‘lov havolasida summa `1000.00` so‘m, fiskal satrda `100000` tiyin. Shundan `10714` tiyin QQS (12%). Korxona STIRi CLICK uchun berilgan xatga mos. MXIK `00902001001000000` va qadoq kodi `1653256` Soliq katalogidagi 400 g qadoqlangan yashil choyga mos. Sinov taklifida alohida shtrixkod kiritilmagan. CLICK `Barcode` maydonini ixtiyoriy deb ko‘rsatadi. Tekshirilgan to‘rtta urinishda `Prepare` yoki `Complete` qayd etilmagan. Oxirgi ikkita buyurtma bo‘yicha ham CLICK Merchant API `-16` javobini qaytardi. [Soliq mahsulot tasnifi](https://tasnif.soliq.uz/api/cls-api/mxik/get/by-mxik?mxikCode=00902001001000000&lang=ru) · [CLICK fiskal maydonlari](https://docs.click.uz/merchant-api/fiscalization)

20:59:41 dagi 1 000 so‘mlik urinishda CLICK SuperApp yana «По указанному контрагенту операции недоступны» xatosini ko‘rsatdi. CLICK’ning to‘lov sahifasida xizmat nomi «Teran», buyurtma raqami va summa to‘g‘ri chiqdi. 21:03 da TERAN buyurtmasi to‘lovni kutayotgan edi. CLICK Merchant API `-16` javobini qaytardi. 20:54–21:07 oralig‘ida Nginx buyurtma yaratilganini qayd etdi, CLICK’dan `Prepare` yoki `Complete` POST so‘rovi kelmadi. Ikkala manzil ham domen va bevosita server orqali HTTPS `OPTIONS` so‘roviga `204` qaytardi. SuperApp’ning ulashish havolasi `invite_to_app` orqali bosh ekranni ochadi. Unda tranzaksiya raqami yoki to‘lov holati yo‘q. Rad sababini ajratish uchun CLICK’dan xizmat `115697` bo‘yicha ichki xato kodi va `Prepare` yuborilgan bo‘lsa, manzil hamda natija kerak. [CLICK Merchant API](https://docs.click.uz/merchant-api/requests)

20:59 dagi buyurtmaning muddati tugagach, TERAN to‘lovni `EXPIRED`, buyurtmani `CANCELLED` holatida saqladi. Ombor tarixida bir qadoq rezervga olingani va bir marta qaytarilgani ko‘rindi. Shu buyurtmada CLICK tranzaksiyasi va fiskal chek yozuvlari soni nol edi.

22:27:43 da `772193866290` relizida `TRN-5M88BA4V` buyurtmasi yaratildi (HTTP `201`). Jami 1 000 so‘m, bir qadoq choy, yetkazish haqi 0 so‘m. SuperApp «По указанному контрагенту операции недоступны» xabarini ko‘rsatdi. Xaridor pul yechilmaganini tasdiqladi. 22:28:48 da CLICK’ning `status_by_mti` so‘rovi HTTP `200` va `error_code: -16` («to‘lov topilmadi») qaytardi. SuperApp rad javobining ichki kodi ochiq qolgan.

22:38 dagi tekshiruvda bazada bitta `REQUIRES_ACTION` to‘lov urinishi bor edi. CLICK tranzaksiyasi va fiskal chek yozuvlari soni nol edi. Jonli jurnalda shu xarid uchun CLICK’dan `Prepare` ham, `Complete` ham ko‘rinmadi. Soat 22:32:51 va 22:32:52 da ikkala manzilga tashqaridan yuborilgan, buyurtma raqami va imzosi bo‘lmagan nazorat POST so‘rovlari API’ga yetib, HTTP `200` oldi. Kabinetda 115697 xizmati faol, minimumi 1 000 so‘m, ikkala callback manzili sozlangan edi. CLICK integratsiya guruhiga buyurtma raqami va vaqti yuborildi. Ulardan ichki rad etish sababini, `Prepare` yuborilgan bo‘lsa, manzil va yetkazish natijasini tekshirish so‘raldi.

Fiskal chekni to‘lov provayderi rasmiylashtiradi. TERAN buyurtma uchun mahsulot nomi, miqdori, narxi, MXIK, qadoq kodi va QQS stavkasini saqlaydi. CLICK muvaffaqiyatli `Complete` yuborgach, TERAN shu buyurtmaning tovar satrlarini CLICK’ga yuboradi. Yangi mahsulotning har bir sotiladigan qadoq varianti uchun xodim fiskal ma’lumotlarni admin panelga kiritadi. [CLICK fiskalizatsiya hujjati](https://docs.click.uz/merchant-api/fiscalization) · [Payme sinov sahifasi](https://terantrade.uz/payme-sinov) · [Loyiha to‘lov yo‘riqnomasi](../deployment/payment-provider-setup.md)

Payme’ning alohida tester portalida bitta qo‘shimcha brauzer urinishi umumiy xato qaytardi. Uchta asosiy sinov natijasini Payme integratsiya vakili tasdiqlagan. Jonli kassada kartadan pul yechish va yakuniy chek hali sinovdan o‘tmagan.

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

CLICK ilovasidagi rad javobidan keyin `9c32636` versiyasida havola, imzo va provayder tanlash bo‘yicha 7 ta birlik testi o‘tdi. Mahalliy `teran_test` bazasida CLICK SHOP API bo‘yicha tanlangan 7 ta integratsion test o‘tdi. Shu ishga tushirishda qolgan 14 ta ssenariy nom filtri bilan o‘tkazib yuborildi.

`772193866290` relizi uchun Animalluz’ning `7543b19` versiyasidagi CLICK va Payme oqimlari provayder hujjatlari bilan solishtirildi. Jonli TERAN konfiguratsiyasida CLICK havolasidagi merchant, xizmat, merchant foydalanuvchisi, buyurtma raqami va 1 000 so‘m tekshirildi. Sayt shu narxda 10 ta qadoqni ko‘rsatdi. Narxlar ochiq va yetkazish o‘chirilgan rejimda 448 ta birlik testi, 182 ta PostgreSQL integratsion testi va kompyuter hamda telefonda 2 ta brauzer xaridi o‘tdi. Brauzerning dastlabki ikki sinovida to‘lov usuli nomi izohga qo‘shilib ketgani aniqlandi. Tuzatishdan keyingi ishga tushirishda ikkala xarid ham muvaffaqiyatli yakunlandi. Bu to‘plamlarda test o‘tkazib yuborilmadi. Mahalliy brauzer nusxasi Webpack, jonli vitrina loyiha Dockerfile’idagi Next.js buyrug‘i bilan yig‘ildi. [CLICK to‘lov havolasi](https://docs.click.uz/click-button)

Payme sinov API’si ham `772193866290` versiyasida. Qayta ishga tushirishda Compose kutgan muhit o‘zgaruvchilari yetishmagani aniqlandi. Test kassasi va sinov bazasi sozlamalari serverdagi `/home/deploy/teran-payment-check/.env` faylida `0600` huquqi bilan saqlandi. Asosiy web sinov API’siga muvaffaqiyatli ulandi. Payme rasmiy portali yangi virtual buyurtma uchun ommaviy endpointga 100 000 tiyin yubordi. `CheckPerformTransaction` tovarning fiskal satri va `allow: true` qaytardi. `CreateTransaction` holati `1`, `PerformTransaction` holati `2`, `CancelTransaction` holati `-2` bo‘ldi. Takroriy tasdiqlardan keyin bazada bitta `PAID` hodisasi, qaytarishdan keyin `REFUNDED` saqlandi. [Payme rasmiy sinov tartibi](https://developer.help.paycom.uz/pesochnitsa/)

Hozirgi tijoriy ustuvorliklar CLICK’dagi birinchi haqiqiy to‘lov va chekni tasdiqlash hamda Payme jonli kassasini ochishdir. Katalog kengaytirilganda tegishli qadoqlarning fiskal ma’lumotlari kiritiladi. Xaridorlarga email orqali parolni tiklash kerak bo‘lsa, keyingi tashqi bog‘lanish SMTP jo‘natuvchisidir.
