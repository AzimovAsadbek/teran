# Business information required from TERAN

The platform is complete, but some facts can only come from TERAN. Nothing below has been
invented. Since 2026-10-18 the site is out of demonstration mode (`NEXT_PUBLIC_DEMO_CONTENT=false`:
indexed by search engines) and the legal pages carry no `[placeholders]`: they state what TERAN
supplied and refer to the law where TERAN has not decided. The items below would make them
complete; a lawyer should still review the three legal documents.

How to supply each item: **Admin** = enter it in the admin area yourself; **Text** = send the
wording (in Uzbek, and Russian and English if available) for a developer to place in
`apps/web/src/content` or `apps/web/messages`; **Config** = a deployment setting.

## 1. Company and legal (launch blocker)

Used in the privacy policy, terms of use and returns page (`/privacy`, `/terms`, `/returns`) and
the footer. Already in the texts (2026-10-18): TERAN TRADE MChJ (ООО «TERAN TRADE»), Namangan, the
two phones, the e-mail, the website, the hosting (Vercel and Neon, Frankfurt: true until the move
to the own server, then outdated), the legal bases and retention described generally, and the
competent court of the Republic of Uzbekistan. Still to supply for a complete text:

| Item                                                                                                                                                                                                 | Where it appears        | How             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------- |
| Company legal name and legal form (supplied as "TERAN TRADE MChJ", Namangan — shown in the footer, contact and wholesale pages; still to be placed in the legal texts)                               | Privacy, terms          | Text            |
| State registration details (registration number, date, authority)                                                                                                                                    | Terms                   | Text            |
| Legal address (the packs print the importer's address: Namangan viloyati, Namangan shahri, Dashtbogʻ MFY, Toʻraqoʻrgʻon koʻchasi, 200-uy — confirm it is the legal address)                          | Privacy, terms          | Text            |
| Hosting of the own server: the provider's name and the country and city of the server and its backups (replaces "Vercel and Neon, Frankfurt" in the privacy policy; needed before the move, ADR-046) | Privacy                 | Text            |
| Whether prices include VAT                                                                                                                                                                           | Terms                   | Text            |
| Trademark: confirm "TERAN®" is a registered trademark, the rights holder and registration details — or the ® mark and the footer sentence "TERAN® is a registered trademark" are removed             | Footer, terms, logo     | Text            |
| Competent court for disputes, liability wording                                                                                                                                                      | Terms                   | Text (lawyer)   |
| Legal basis for each purpose of processing personal data                                                                                                                                             | Privacy                 | Text (lawyer)   |
| Authorised state body for personal-data protection                                                                                                                                                   | Privacy                 | Text (lawyer)   |
| E-mail address for privacy requests, and the response period                                                                                                                                         | Privacy                 | Text            |
| Retention periods: enquiries, server logs, accounting records                                                                                                                                        | Privacy                 | Text            |
| Hosting provider and e-mail provider; country and data centre of the servers (must satisfy Uzbek data-localisation requirements)                                                                     | Privacy, deployment     | Text + decision |
| Names of delivery partners that receive customer data                                                                                                                                                | Privacy                 | Text            |
| Date of publication of each legal document                                                                                                                                                           | Privacy, terms, returns | Text            |

## 2. Returns and refunds (launch blocker)

| Item                                                     | Where   | How  |
| -------------------------------------------------------- | ------- | ---- |
| Conditions for returning tea (opened, unopened, damaged) | Returns | Text |
| Number of days a customer has to request a return        | Returns | Text |
| Refund period and refund method (cash, bank transfer)    | Returns | Text |
| Response period for return requests                      | Returns | Text |

## 3. Products (launch blocker)

Supplied on 2026-10-17 and now on the site: the five teas (XC2025, G8810, 8800, 8830, 8009) with
the owner's descriptions in Uzbek and Russian, a 400 g zip pouch each, photographs of the pouches,
the barcodes of 8800 and G8810 (XC2025, 8830 and 8009 followed on 2026-10-18), and the catalogue
reduced to these five (the generic demo range is
archived; see [demo mode](./development/demo-mode.md)).

Prices are hidden on the storefront since 2026-10-17 at the owner's request
([ADR-027](./architecture/decisions.md)): shoppers are asked to order by phone and messengers,
and the admin area keeps the placeholder prices (XC2025 189,000, G8810 179,000, 8800 179,000,
8830 199,000, 8009 159,000 UZS), which staff can change at any time. Still needed for the five
teas: **real prices** (before prices are shown again), real stock and the print file of 8800 (its producer and importer are not on the site yet). The
pouch photographs differ from the print files in three places — the tagline ("Fikirlang …
xush ta’m" on the photographs, "Fikrlang … xushta’m" in the print files), the four values (Sof
tabiat, Yaxshi kayfiyat, Teran bilan o‘zgartir, Premium sifat against Tabiiy mahsulot, Nafis
ta’m, Har kungi tetiklik, Sifatli tanlov) and the characters 龙井茶 (Longjing tea) instead of
绿茶 (green tea): on 2026-10-17 the owner decided that the site keeps the print files' texts.

For each product:

| Item                                                                                        | How                  |
| ------------------------------------------------------------------------------------------- | -------------------- |
| Name and short description (Uzbek required; Russian and English recommended)                | Admin                |
| Full description, ingredients, tasting notes, origin — only what TERAN can verify           | Admin                |
| Category, collections, format (loose leaf, tea bags, pyramids, gift set, accessory)         | Admin                |
| Caffeine level and brewing guidance (temperature, time range, amount), if known             | Admin                |
| Pack sizes: weight or number of bags, SKU, barcode, price in UZS, previous price if on sale | Admin                |
| Opening stock per pack size                                                                 | Admin                |
| Photographs that TERAN owns or has licensed (at least 1200 px wide)                         | Admin (upload)       |
| Certifications or awards, with documents — only if real                                     | Text (needs a field) |

The About page and the categories now describe the five green teas only; new kinds of tea need a
category in the admin first.

## 4. Delivery (launch blocker)

The two delivery methods are demonstration values: "Courier in Tashkent" 25,000 UZS, free from
300,000 UZS, 1–2 business days; and "Delivery to the regions" 45,000 UZS, 3–7 business days. Set
the real ones in Admin → Delivery (administrators only):

| Item                                                         | How   |
| ------------------------------------------------------------ | ----- |
| Delivery methods and the regions each covers                 | Admin |
| Fee per method and free-delivery threshold, if any           | Admin |
| Estimated delivery time per method (in three languages)      | Admin |
| Whether an address is required (for example, pick-up points) | Admin |

## 5. Contact details

Supplied on 2026-10-17 and set by the seed (Admin → Settings can change them): +998 97 570 70 07
and +998 95 110 13 26, terantradellc@gmail.com and teran.trade@mail.ru, Telegram @TeranTrade, the
WhatsApp link from the WhatsApp Business QR code and the city (Namangan). They appear in the
footer, the contact page, the About page and the partnership page; the social networks also on
the home page (a "Social networks" button beside the shop button and a column of icons on the
hero) and, with the phones, wherever the bag would be while prices are hidden.

Still needed: the **Instagram** account name (and a YouTube channel, if there is one), working
hours and the full street address. Each network appears everywhere as soon as it is entered in
Admin → Settings.

## 6. Brand content

The official brand content supplied on 2026-10-14 (name, descriptor, Uzbek tagline and texts,
English tagline, story, philosophy, collection and partnership texts, company, city and website)
is used exactly as supplied, in `apps/web/src/content/brand.ts`. The only change is typographic:
a no-break space before each dash, so a line never starts with "—".

| Item                                                                                                                                                       | Where                                   | How           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------- |
| Approve or correct the **Russian** translation of all brand texts, and the **English** translations other than the supplied tagline (drafted for the site) | Home, About, Wholesale, Contact, footer | Text          |
| Approve the Russian and English labels of the four values printed on the packs ("Tabiiy mahsulot", "Nafis ta’m", "Har kungi tetiklik", "Sifatli tanlov")   | Home, About                             | Text          |
| TERAN's history, production and photographs                                                                                                                | About (`/about`)                        | Text + images |
| Announcement bar message (currently "Welcome to the TERAN online store")                                                                                   | Every page                              | Admin         |
| Journal: the five published demonstration articles (and one draft) contain only general tea knowledge — keep, edit or replace                              | Journal                                 | Admin         |
| Wholesale terms: minimum order, who it is for, how the process works                                                                                       | `/wholesale`                            | Text          |

## 7. Operations to confirm

The help pages describe these processes; confirm or correct them:

- Staff phone customers to confirm each order before delivery.
- Orders can be changed or cancelled until they are sent, by contacting TERAN with the order
  number.
- Payment is in cash to the courier on delivery.
- Who handles enquiries from the contact and wholesale forms, and how quickly.

## 8. Accounts and services (deployment)

| Item                                                                                                                                               | How      |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Domain name, and whether `www` should redirect to it                                                                                               | Config   |
| Server (hosting provider, location — see data localisation above)                                                                                  | Config   |
| SMTP account for password-reset and order-confirmation e-mails, and the sender address                                                             | Config   |
| Names, e-mail addresses and roles (manager or administrator) of staff                                                                              | Admin    |
| Where backups are stored and who checks them                                                                                                       | Decision |
| Contact for security and uptime alerts                                                                                                             | Decision |
| Online payment provider (Payme, Click, Uzum or other) — only if card payments are wanted; requires a merchant agreement and a separate integration | Decision |

## When everything is in place

1. Archive the demonstration products, collections, articles and delivery methods that were not
   replaced.
2. Remove every `[placeholder]` from the legal and help texts; the draft banners disappear
   automatically.
3. Set `DEMO_CONTENT=false` and rebuild the web image (see the
   [deployment guide](./deployment/production.md#go-live-checklist)).
