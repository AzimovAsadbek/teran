# TERAN xaridor hisobi

## Amaldagi tizim auditi va o‘tish tartibi

27-noyabr holatida NestJS email va Argon2id parol orqali kirishni ta’minlaydi. PostgreSQL sessiya tokenining SHA-256 xeshini saqlaydi, brauzer HttpOnly cookie oladi. Kirishda mehmon savati xaridorga biriktiriladi. Rollar har so‘rovda bazadan olinadi. Ro‘yxatdan o‘tish emailni tasdiqlashdan oldin hisob ochardi. Profil telefon raqamini erkin, emailni joriy parol bilan o‘zgartirardi. SMTP adapteri bor, jonli xizmatda pochta o‘chiq. Telegram modulining vazifasi kontentni kanalga jo‘natish. Xaridor uchun Google yoki Telegram identifikatorlari avval saqlanmagan.

Avval bazaga tasdiqlash va tashqi identifikatorlar uchun jadvallar qo‘shiladi. So‘ng kanal sozlamalari, bir martalik kod va OAuth tekshiruvi ulanadi. Brauzer tasdiqlanganidan keyin mavjud sessiya va savat mexanizmini ishlatadi. Oxirida lokalizatsiya, vaqt cheklovlari, takroriy urinishlar, bekor qilish va eski akkauntlar alohida tekshiriladi.

## Xaridorning yo‘li

Xaridorning kirish sahifasi email va parol maydonlari bilan ochiladi. «Kirish» tugmasidan keyin mavjud kanallar Telegram, Google va email kodi tartibida chiqadi. Har bir parol maydoni dastlab belgilarni yashiradi. Yonidagi ko‘z tugmasi faqat shu maydondagi yozuvni ko‘rsatadi va ikkinchi bosishda yana yashiradi. Ko‘z tugmasi xodim kirishida, parolni tiklashda, kabinetdagi xavfsizlik formasida va xodim yaratishda ham ishlaydi.

Xaridor ismi, familiyasi, elektron pochtasi va telefon raqamini kiritadi. Keyin u email yoki Telegram orqali tasdiqlaydi. Google bilan kirishda Google tasdiqlagan email olinadi, xaridor yetishmayotgan profil maydonlarini to‘ldiradi. Mavjud parolli hisoblar va xodimlarning kirish sahifasi avvalgidek ishlaydi. Eski parolli hisob egasi email orqali kirishni yoqish uchun avval paroli bilan kirib, xavfsizlik bo‘limida emailini tasdiqlaydi. Hisobga kirilgach avvalgi savat saqlanadi va xaridor boshlagan sahifasiga qaytadi.

Telegram telefon raqamini faqat botning o‘z kontaktingizni ulash tugmasi orqali tasdiqlaydi. Telegram bilan ro‘yxatdan o‘tilganda kiritilgan email profilning aloqa manzili sifatida saqlanadi. Shu manzilda kod tasdiqlangach u email orqali kirish uchun ham ishlaydi. Google yoki Telegram profilini bog‘lash uchun avval mavjud TERAN hisobida kirish talab qilinadi. Xavfsizlik sozlamalari oxirgi 15 daqiqada ochilgan sessiyani talab qiladi. Oxirgi ishlaydigan kirish usulini uzishga ruxsat berilmaydi.

## Server va brauzer shartnomasi

Barcha URL manzillarining umumiy prefiksi `/api/v1/auth`.

| Amal                       | Manzil                                                | Natija                                                                                                                |
| -------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Mavjud kanallar            | `GET /features`                                       | Email, Telegram, Google, parolni tiklash va ro‘yxatdan o‘tish imkoniyati                                              |
| Kodni so‘rash              | `POST /verification/start`                            | `202`, so‘rov IDsi, amal qilish muddati, qayta yuborish vaqti. Telegram uchun bot havolasi ham keladi                 |
| Kodni tasdiqlash           | `POST /verification/confirm`                          | `id` va olti xonali `code`. Ro‘yxatdan o‘tish va kirishda HttpOnly sessiya cookie beriladi                            |
| Telegram so‘rovi holati    | `GET /verification/:id/telegram-status`               | Jarayonni boshlagan brauzer bot ochilganini yoki so‘rov yakunlanganini ko‘radi. Telegram identifikatori qaytarilmaydi |
| Google’ga o‘tish           | `POST /google/start`                                  | Server yaratgan Google ruxsat sahifasi manzili                                                                        |
| Google natijasi            | `GET /google/callback`                                | Tekshirilgan kirish yoki mijoz profilini to‘ldirish sahifasiga qaytish                                                |
| Google profilini yakunlash | `GET /google/profile/:id`, `POST /google/profile/:id` | Faqat jarayon boshlangan brauzerda profil ma’lumotlarini o‘qish va hisob ochish                                       |
| Telegram xabari            | `POST /telegram/webhook`                              | Telegram webhook maxfiy sarlavhasi, shaxsiy chat va jo‘natuvchi IDsi tekshiriladi                                     |
| Ulangan usullar            | `GET /connections`, `DELETE /connections/:provider`   | Tasdiqlangan kontaktlar va bog‘langan hisoblar                                                                        |
| Sessiya                    | `POST /session/refresh`, `POST /logout`               | Cookie kalitini yangilash yoki sessiyani bekor qilish                                                                 |

PostgreSQL bir martalik kodning HMAC qiymatini, brauzer bog‘lanishini, muddatni va urinishlar sonini saqlaydi. Kod 5 daqiqa amal qiladi. Har bir qayta yuborish orasida kamida 60 soniya bor. Bir doiraga soatiga oltita yuborish va har bir kodga beshta tekshirish ajratilgan. Mail orqali kirishda mavjud va noma’lum manzillar bir xil HTTP javobini oladi. Kod va tashqi havola bir martalik. Google imzosi rasmiy JWKS orqali tekshiriladi. Brauzerga bog‘langan state, PKCE S256, nonce, issuer, audience, amal qilish muddati va tasdiqlangan email talab qilinadi. Google uchun `sub`, Telegram uchun raqamli foydalanuvchi IDsi identifikator sifatida ishlatiladi. Sessiya cookie kaliti aylantiriladi, oldingi kalit yo‘ldagi parallel so‘rovlar uchun 10 soniya amal qiladi. Sessiyaning asl tugash vaqti saqlanadi.

## Lokal ishga tushirish

1. `pnpm install --frozen-lockfile` va `pnpm generate`ni bajaring. Mahalliy bazaga `pnpm --filter @teran/api prisma:migrate:deploy`ni qo‘llang. Jadvallarni tozalash talab qilinmaydi.
2. Sinov pochtasini `docker run -d --name teran-auth-mailpit -p 127.0.0.1:1025:1025 -p 127.0.0.1:8025:8025 axllent/mailpit:v1.33.1` bilan oching. Mavjud konteynerni qayta ishga tushirish uchun `docker start teran-auth-mailpit` kifoya.
3. Lokal API uchun `MAIL_TRANSPORT=smtp`, `SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025`, `SMTP_SECURE=false`, `MAIL_FROM=TERAN <auth@example.test>`. Kodlar faqat [mahalliy sinov pochtasiga](http://localhost:8025) keladi.
4. Telegram uchun quyidagi uchta qiymatni maxfiy muhitda saqlang. `apps/api` ichida `node --env-file=.env scripts/auth-telegram.ts poll` lokal API portiga xabarlarni yetkazadi. Agar botga allaqachon webhook o‘rnatilgan bo‘lsa, poller ishga tushmaydi.

## Jonli muhitga chiqarish

| Xizmat   | Sozlamalar                                                                                                                                                                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Email    | `MAIL_TRANSPORT=smtp`, `MAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, provayder talab qilsa `SMTP_USER` va `SMTP_PASSWORD`. Domenning jo‘natuvchisini tasdiqlang. 465 port uchun TLS, 587 port uchun STARTTLS ishlating                                           |
| Telegram | `AUTH_TELEGRAM_USERNAME`, `AUTH_TELEGRAM_BOT_TOKEN`, `AUTH_TELEGRAM_WEBHOOK_SECRET`. Maxfiy sarlavha uchun kamida 32 tasodifiy URL-xavfsiz belgi. Xaridor botining foydalanuvchi nomi `terantrade_auth_bot`                                                              |
| Google   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Google Auth Platform’da Web application mijozini yarating. Production callback aynan `https://terantrade.uz/api/v1/auth/google/callback`. Lokal mijozda API’ga proksi qiladigan vitrining callback manzilini ro‘yxatga oling |
| Umumiy   | `WEB_ORIGIN` xaridor ochadigan vitrini ko‘rsatadi. Ishlab chiqarishda HTTPS, `COOKIE_SECURE=true` va barqaror `APP_SECRET` kerak                                                                                                                                         |

Joylashtirishdan oldin baza nusxasini tekshiring. `20261127232000_customer_identity` migratsiyasi jadvallar va nullable ustunlar qo‘shadi. Mavjud parollar va sessiyalar saqlanadi. API va web birga yangilangandan keyin kanallarni yoqing. Yangi parolsiz xaridorlar paydo bo‘lgach, eski versiyaga qaytishdan oldin uning nullable email va parolni o‘qiy olishini tekshiring. Reverse proxy Google callback so‘rovining query qismi, cookie yoki Telegram maxfiy sarlavhasini access logga yozmasligi kerak. PostgreSQL nusxalarida xaridorlar va ulangan shaxsiy identifikatorlar mavjud.

Webhook o‘rnatish uchun lokal pollerni to‘xtating. Yangilangan API tashqaridan HTTPS orqali javob bera boshlagach, ishchi muhit o‘zgaruvchilari bilan `node scripts/auth-telegram.ts webhook`ni bajaring. Skript bot nomi va Telegram qaytargan webhook URLni tekshiradi. Kalitlar brauzerga berilmaydi. Google yoki pochta administratori kerakli credential ajratmaguncha tegishli kanalni yoqmang. Yangi registratsiyani ishga chiqarishda kamida bitta ishlaydigan kanal bo‘lsin.

Google Cloud’dagi `TERAN Trade` loyihasi va Resend jo‘natuvchisini Asadbek boshqaradi. Xaridorga ko‘rinadigan jo‘natuvchi `TERAN <kod@auth.terantrade.uz>`. `MAIL_REPLY_TO=terantradellc@gmail.com` bo‘lsa, xaridor xatga javob berganda korxona pochtasi ochiladi. [TERAN ofertasi](https://terantrade.uz/terms) · [Resend SMTP](https://resend.com/docs/send-with-smtp) · [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)

`terantrade.uz` aHOST’da ro‘yxatdan o‘tgan, DNS Cloudflare’da boshqariladi. `auth.terantrade.uz` uchun Resend Ireland hududida uchta yozuv berdi. DKIM ochiq kaliti `resend._domainkey.auth` TXT yozuviga, `rsend.auth` va `send.auth` esa tegishli Resend manzillariga CNAME sifatida, `DNS only` rejimida kiritiladi. Qiymatlarni Resend’dagi domen sahifasidan oling. Asosiy domenning `mail.terantrade.uz`ga yo‘naltirilgan MX yozuvi korxonaning kiruvchi pochtasiga tegishli. [Resend va Cloudflare](https://resend.com/docs/guides/dns/cloudflare)

## O‘zgargan asosiy fayllar

| Qism                 | Fayllar                                                                                                                                                                                                                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baza va shartnoma    | [Prisma schema](../../apps/api/prisma/schema.prisma), [SQL migratsiyasi](../../apps/api/prisma/migrations/20261127232000_customer_identity/migration.sql), [verifikatsiya maydonlari](../../packages/contracts/src/verification.ts)                                                                                                      |
| Kirish va sessiyalar | [API manzillari](../../apps/api/src/auth/verification.controller.ts), [bir martalik kodlar](../../apps/api/src/auth/verification.service.ts), [Google OAuth](../../apps/api/src/auth/google-sign-in.service.ts), [provayderlar](../../apps/api/src/auth/identity-providers.ts), [sessiyalar](../../apps/api/src/auth/session.service.ts) |
| Xabarlar va sozlash  | [SMTP](../../apps/api/src/mail/mail.service.ts), [uch tildagi xabarlar](../../apps/api/src/auth/verification-copy.ts), [Telegram ulanishi](../../apps/api/scripts/auth-telegram.ts), [muhit sozlamalari](../../apps/api/.env.example), [production Compose](../../docker-compose.prod.yml)                                               |
| Vitrina              | [Kirish va ro‘yxatdan o‘tish](../../apps/web/src/components/account/identity-form.tsx), [kod kiritish](../../apps/web/src/components/account/verification-code.tsx), [hisob bog‘lash](../../apps/web/src/components/account/identity-settings.tsx), [uch til tarjimalari](../../apps/web/messages)                                       |
| Sinovlar va to‘lov   | [API integratsiyasi](../../apps/api/test/customer-identity.int-spec.ts), [Google token sinovlari](../../apps/api/src/auth/google-token.spec.ts), [brauzerda kirish](../../e2e/tests/identity.spec.ts), [to‘lov UX o‘zgarishlari](../audit/2026-11-27-payment-ux.md)                                                                      |

Qayta tekshirish uchun `pnpm test`, alohida `*_test` bazada `pnpm test:integration` va Mailpit ishlayotgan `*_e2e` muhitida Playwright sinovlaridan foydalaning.

## 28-noyabrdagi tekshiruv

Asosiy commit `918dd85`, sinovlar mahalliy ishchi nusxada, narxlar ochiq va yetkazib berish o‘chiq rejimda o‘tkazildi. 457 modul sinovi va PostgreSQL bilan 192 integratsion sinov o‘tdi. Alohida brauzer tekshiruvlarida uch tilda kod bilan ro‘yxatdan o‘tish, savat va to‘lovning yettita ssenariysi, profil va murojaatlarning beshta ssenariysi hamda sharhni boshqarish o‘tdi. Takroriy sharh sinovida oldingi sinov mahsulotining saqlangan bahosi kutilgan natijaga mos kelmadi. Lokal mahsulot bahosi haqiqiy sinov sharhlaridan qayta hisoblangach va kesh yangilangach ssenariy qayta o‘tdi.

Jo‘natuvchi va javob manzili qo‘shilgach, lokal SMTP orqali Mailpit’ga bitta sinov xati yuborildi. Qabul qilingan xatda `From` va `Reply-To`, o‘zbekcha mavzu, HTML va oddiy matndagi bir xil olti xonali kod tekshirildi. Sozlamalar, Google imzosi va jo‘natish bo‘yicha 10 ta modul sinovi hamda alohida `teran_test` bazasida xaridor identifikatsiyasining 10 ta integratsion sinovi o‘tdi.

BotFather orqali `@terantrade_auth_bot` tokeni yangilandi. Telegram yangi tokenni qabul qildi, eskisiga `401` qaytardi. Lokal sayt boshlagan yangi kirish so‘rovida bot shaxsiy Telegram chatiga olti xonali kod yubordi va sayt bot ochilganini ko‘rsatdi.

Resend `auth.terantrade.uz` uchun uchta DNS yozuvini tasdiqladi. Lokal saytdan yuborilgan haqiqiy kod Gmail’ning kiruvchi xatlari orasiga tushdi. Xatda jo‘natuvchi `TERAN <kod@auth.terantrade.uz>`, javob manzili `terantradellc@gmail.com`, DKIM imzosi esa `auth.terantrade.uz` bo‘ldi. Shu kod bilan sinov xaridorining kabineti ochildi.

Asadbek boshqaradigan `teran-trade` Google Cloud loyihasi `Testing` rejimida. Lokal OAuth mijozi `http://localhost:3100/api/v1/auth/google/callback` manziliga qaytadi. TERAN Google hisobi bilan kirishda ism va email olindi, sinov profili to‘ldirildi va kabinet ochildi. Kabinetdan chiqib, ayni Google hisobini qayta tanlash darhol shu kabinetga olib keldi. Oldindan mavjud, Google hali bog‘lanmagan parolli hisobda sayt avval parol bilan kirib, «Xavfsizlik» bo‘limida Google’ni ulashni so‘radi.

Kirish tartibi yangilangach, vitrinaning 226 ta modul sinovi va ishlayotgan lokal saytga qarshi 10 ta Playwright sinovi o‘tdi. Brauzer sinovlari mobil va kompyuter ekran o‘lchamlarida uch tildagi tugmalar tartibini, klaviatura fokusini va parolni ko‘rsatib-yashirishni tekshirdi. Parolni tiklashda, xavfsizlik formasida va yangi xodim formasida har bir ko‘z tugmasi o‘z maydonini boshqardi. Uch tildagi kirish formasida axe tekshiruvi WCAG 2 A, AA va 2.1 AA bo‘yicha avtomatik aniqlanadigan xato topmadi.
