# Xaridorning to‘lov yo‘li

## Ekranlar

| Yo‘l                                       | Xaridor nima ko‘radi                                                                                                                                                                                                    |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/checkout`                                | Hisobga kirgan xaridorning aloqa ma’lumotlari, API taklif qilgan to‘lov usullari, mahsulot rasmlari, miqdori, jami summa va shartlar. Yetkazish bo‘yicha maydonlar va haq shu xizmat yoqilganda chiqadi.                |
| `/checkout/confirm/[number]`               | Saqlangan buyurtma raqami, tovar satrlari, aniq summa, rezerv muddati va tanlangan provayder. Tasdiq tugmasi mavjud to‘lov sessiyasini ochadi. Shu manzilni yangilash yangi buyurtma yaratmaydi.                        |
| `/payments/return/[token]`                 | Server qaytish tokenidan buyurtmani aniqlaydi. Akkaunt sessiyasi yoki eski mehmon havolasidagi alohida buyurtma tokeni tafsilotlarga kirish huquqini beradi. Natija buyurtmaning oxirgi qayd etilgan holatidan olinadi. |
| Akkaunt, eski mehmon buyurtmalari va admin | Bir xil to‘lov holati belgisi. Xaridor to‘langan summa, mahsulotlar, to‘lov tarixi va mavjud fiskal chekni ko‘radi. Takroriy to‘lovga buyurtma hali to‘lanishi mumkin bo‘lganda o‘tiladi.                               |
| `/payments/demo/[token]`, `/payme-sinov`   | Eski demo havolasi to‘lov holati sahifasiga olib boradi. Payme kassasining alohida sinov sahifasi o‘z sinov API’sidan foydalanadi.                                                                                      |

## Ochiq manbalardan olingan mezonlar

- Uzum xarid qo‘llanmasi mahsulot va miqdorni tekshirishni, rezerv muddatini va buyurtmaga hisob orqali qaytishni tushuntiradi. TERAN tasdiqlash sahifasi server bergan rezerv muddatini ko‘rsatadi. [Uzum Market savol-javoblari](https://uzum.uz/ru/faq)
- Asaxiy to‘lov shartlarida CLICK va Payme alohida xizmat sifatida ko‘rsatilgan. TERAN’da qaysi provayder ochilishi tugmada nomi va summa bilan yoziladi. [Asaxiy to‘lov usullari](https://asaxiy.uz/page/usloviya-rassrochki?slug=usloviya-rassrochki)
- Olcha qo‘llanmasida xaridor savatda jami summani ko‘rib, keyin aloqa va to‘lov usulini tanlaydi. TERAN’da telefon ekranida buyurtma tarkibini ochib tekshirish mumkin. [Olcha xarid bo‘yicha yordam](https://olcha.uz/ru/help)
- Texnomart ochiq vitrinasida to‘lov usullari va buyurtma holatini ko‘rish uchun alohida havolalar bor. TERAN’da xaridor natijadan buyurtma tafsilotlari va yordamga o‘ta oladi. [Texnomart to‘lov sahifasi](https://texnomart.uz/page/purchase-online/)

Taqqoslash ochiq sahifalar va xarid yo‘riqnomalariga asoslangan. Raqobatchilarning shaxsiy tranzaksiyalari, bank ilovasidan qaytishi va yopiq natija ekranlari kuzatilmagan. Logotip fayllari provayderlarning o‘z manbalaridan olingan. [CLICK logotipi](https://click.uz/click/images/logo.svg) · [Payme Business resurslari](https://developer.help.paycom.uz/resursy/)

## Aniqlangan muammolar va chegaralar

- Avval xaridor buyurtma raqami va summani alohida ko‘rishga ulgurmasdan provayderga o‘tardi. Qaytishda bekor qilingan va muvaffaqiyatsiz urinishlar bitta izohga ega edi. Endi ikkalasining o‘z sarlavhasi, izohi va tegishli keyingi amali bor.
- Provayder qaytish havolasi ochilishi yoki ilova yopilishi pul qayerdaligini tasdiqlamaydi. Tasdiq kechiksa xaridor holatni qayta tekshira oladi. Server to‘lovni ishlayotgan paytda jonli provayder uchun qayta to‘lash tugmasi ko‘rsatilmaydi.
- Xaridorga beriladigan API javobida provayder tranzaksiyasining identifikatori yo‘q. Ekranda TERAN buyurtma raqami hamda API qaytargan fiskal chek ko‘rsatiladi. Eski urinish havolasi ham buyurtmaning hozirgi holatini ochadi.
- CLICK xizmatida 26-noyabr kuni kuzatilgan rad javobi alohida integratsiya masalasi. Vizual sinovlar provayderning jonli xizmatini faollashtirganini yoki kartadan pul yechilganini tasdiqlamaydi. [Jonli urinish tafsilotlari](2026-11-26-loyiha-holati.md)
- Namoyish katalogi va to‘lov provayderining sinov rejimi alohida sozlanadi. Checkout endi narx haqidagi izohni katalog sozlamasidan, pul o‘tkazilishi haqidagi izohni esa tanlangan usulning API holatidan oladi.

## O‘zgargan fayllar

| Qism                                               | Asosiy fayllar                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Savat, mahsulot satrlari, summa va to‘lov usullari | [Savat](../../apps/web/src/components/cart/cart-view.tsx), [checkout formasi](../../apps/web/src/components/checkout/checkout-form.tsx), [buyurtma tarkibi](../../apps/web/src/components/payments/receipt.tsx), [provayder tanlash](../../apps/web/src/components/payments/payment-method-card.tsx), [rasmiy logotiplar](../../apps/web/public/brand/payments)      |
| Tasdiqlash, qaytish va xatodan chiqish             | [Tasdiqlash sahifasi](<../../apps/web/src/app/[locale]/(checkout)/checkout/confirm/[number]/page.tsx>), [qaytish sahifasi](<../../apps/web/src/app/[locale]/(checkout)/payments/return/[token]/page.tsx>), [buyurtmani tekshirish](../../apps/web/src/lib/payment-order.ts), [to‘lov amallari](../../apps/web/src/components/orders/order-actions.tsx)               |
| Xaridor, admin va mahalliylashtirish               | [To‘lov natijasi](../../apps/web/src/components/payments/payment-result.tsx), [holat ko‘rinishi](../../apps/web/src/components/payments/payment-outcome.tsx), [umumiy belgilar](../../apps/web/src/components/payments/payment-ui.tsx), [buyurtma tafsilotlari](../../apps/web/src/components/orders/order-view.tsx), [uch tildagi matnlar](../../apps/web/messages) |
| Testlar                                            | [Uch tilda brauzer sinovi](../../e2e/tests/payment-experience.spec.ts), [faqat mahsulotga buyurtma](../../e2e/tests/order-only.spec.ts), [xarid yo‘li](../../e2e/tests/journey.spec.ts), [accessibility](../../e2e/tests/accessibility.spec.ts), [buyurtma holatlari](../../apps/web/src/components/orders/order-view.test.tsx)                                      |

## Mahalliy tekshiruv

2026-yil 27-noyabr. Asosiy commit `918dd85bc61a` ustidagi ishchi nusxa. Node 24.21.0, pnpm 12.11.2, Next.js 16.4.5. Brauzerga ishlab chiqarish Dockerfile’i va Turbopack bilan yig‘ilgan nusxalar berildi. Savdo ochiq, bazalar `teran_e2e` va `teran_test`.

- `pnpm lint` va `pnpm typecheck` o‘tdi. `pnpm test` orqali 454 ta test (34 shartnoma, 194 API, 226 web), `pnpm test:integration` orqali 182 ta test o‘tdi. Integratsion sinovlar CLICK Prepare/Complete takrorlanishini, Payme tranzaksiyalarini va fiskal javoblar kechikishini ham qamradi.
- Yetkazish o‘chiq rejimda 7 ta Playwright ssenariysi o‘tdi. Xaridorning kirishi va savati, raqam va summa, mobil CLICK, desktop Payme, ikki marta bosish, orqaga qaytish va server buyurtmani saqlaganidan keyin tarmoq uzilishi tekshirildi.
- Yetkazish yoqilgan yig‘mada 9 ta brauzer ssenariysi o‘tdi. Manzil va naqd to‘lov, ikki tabdan savat bilan ishlash, akkauntga qaytish, CLICK rad etilgach Payme’ni tanlash hamda xaridor va xodim ko‘radigan holat tekshirildi.
- O‘zbek, rus va ingliz tillarida 360, 390, 430, 768, 1024, 1440 va 1920 px kengliklar sinovdan o‘tdi. Har tilda tasdiq kutilishi, tekshiruv, bekor qilish, rad etish, muvaffaqiyat va yaroqsiz havola tekshirildi. Mobil tarkib ochilib yopildi. O‘zbekcha sakkizta ko‘rinishning har biri 390 va 1440 px da axe orqali tekshirildi. Tekshirilgan qoidalarda buzilish topilmadi.
- Alohida brauzer sinovida ikkala adapter sinov kalitlari bilan yoqildi. Har bir provayder uchun bittadan 45 000 so‘mlik buyurtma berildi. Havoladagi buyurtma raqami bazadagi raqamga mos keldi. CLICK havolasida summa 45 000,00 so‘m, Payme sandbox havolasida 4 500 000 tiyin edi. Brauzer tashqi navigatsiyani mahalliy javob bilan yakunladi. Har bir buyurtmada bittadan to‘lov urinishi saqlandi. Provayder tasdig‘i kelmaganida qaytish havolasiga `status=paid` qo‘shilsa ham xaridor tasdiq kutilayotganini ko‘rdi.

Yakuniy tanlangan ssenariylarda muvaffaqiyatsiz yoki tashlab ketilgan sinov bo‘lmadi. Boshqa vitrina bo‘limlarining to‘liq E2E to‘plami, alohida ruxsat bilan yoqiladigan /payme-sinov kassasi, jismoniy telefonlardagi bank ilovalari va haqiqiy pul o‘tkazmasi ushbu tekshiruvga kirmaydi. O‘zgarishlar mahalliy ishchi nusxada.

## Ekran namunalari

Buyurtma va tasdiqlash tasvirlari mahalliy sinov adapterlari bilan olingan. Natija ekranlari namoyish to‘lovining bazada saqlangan holatini ko‘rsatadi.

- [Desktop checkout](../../output/payment-ux-20261127/checkout-1440.png) · [Mobil checkout](../../output/payment-ux-20261127/checkout-390.png) · [Mobil tasdiqlash](../../output/payment-ux-20261127/review-390.png)
- [Tasdiq kutilmoqda](../../output/payment-ux-20261127/awaiting-390.png) · [Tekshirilmoqda](../../output/payment-ux-20261127/processing-390.png) · [Muvaffaqiyatli](../../output/payment-ux-20261127/paid-1440.png) · [Rad etildi](../../output/payment-ux-20261127/failed-390.png) · [Bekor qilindi](../../output/payment-ux-20261127/cancelled-390.png)
