# Business information required from TERAN

The platform is complete, but some facts can only come from TERAN. Nothing below has been
invented: where a fact is missing, the site shows a highlighted `[placeholder]`, a draft banner,
an empty slot (hidden until filled), or clearly labelled demonstration data. The site stays in
demonstration mode (`DEMO_CONTENT=true`: notices shown, not indexed by search engines) until the
items marked **launch blocker** are done.

How to supply each item: **Admin** = enter it in the admin area yourself; **Text** = send the
wording (in Uzbek, and Russian and English if available) for a developer to place in
`apps/web/src/content` or `apps/web/messages`; **Config** = a deployment setting.

## 1. Company and legal (launch blocker)

Used in the privacy policy, terms of use and returns page (`/privacy`, `/terms`, `/returns`) and
the footer. Have a lawyer review all three documents; they are drafts.

| Item                                                                                                                                                                                     | Where it appears        | How             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------- |
| Company legal name and legal form (supplied as "TERAN TRADE MChJ", Namangan — shown in the footer, contact and wholesale pages; still to be placed in the legal texts)                   | Privacy, terms          | Text            |
| State registration details (registration number, date, authority)                                                                                                                        | Terms                   | Text            |
| Legal address                                                                                                                                                                            | Privacy, terms          | Text            |
| Whether prices include VAT                                                                                                                                                               | Terms                   | Text            |
| Trademark: confirm "TERAN®" is a registered trademark, the rights holder and registration details — or the ® mark and the footer sentence "TERAN® is a registered trademark" are removed | Footer, terms, logo     | Text            |
| Competent court for disputes, liability wording                                                                                                                                          | Terms                   | Text (lawyer)   |
| Legal basis for each purpose of processing personal data                                                                                                                                 | Privacy                 | Text (lawyer)   |
| Authorised state body for personal-data protection                                                                                                                                       | Privacy                 | Text (lawyer)   |
| E-mail address for privacy requests, and the response period                                                                                                                             | Privacy                 | Text            |
| Retention periods: enquiries, server logs, accounting records                                                                                                                            | Privacy                 | Text            |
| Hosting provider and e-mail provider; country and data centre of the servers (must satisfy Uzbek data-localisation requirements)                                                         | Privacy, deployment     | Text + decision |
| Names of delivery partners that receive customer data                                                                                                                                    | Privacy                 | Text            |
| Date of publication of each legal document                                                                                                                                               | Privacy, terms, returns | Text            |

## 2. Returns and refunds (launch blocker)

| Item                                                     | Where   | How  |
| -------------------------------------------------------- | ------- | ---- |
| Conditions for returning tea (opened, unopened, damaged) | Returns | Text |
| Number of days a customer has to request a return        | Returns | Text |
| Refund period and refund method (cash, bank transfer)    | Returns | Text |
| Response period for return requests                      | Returns | Text |

## 3. Products (launch blocker)

The current catalogue is **demonstration data** (see [demo mode](./development/demo-mode.md)):
21 products — the five TERAN premium collection identifiers (XC2025, G8810, HET8800, 8830,
STD8009), shown with provisional tea types, and generic Chinese tea styles — with placeholder
prices and pack sizes, code-drawn images and tasting notes that describe a style, not a product.
None has ingredients, origins, caffeine levels, certifications or reviews. Replace it product by
product in the admin (archive the demo products when done); photographs are specified in the
[asset replacement brief](./design/asset-replacement-brief.md).

For the five collection identifiers in particular: the real product name, tea type, description,
pack sizes and prices. The site currently shows each one as "TERAN XC2025" etc. with a provisional
tea type that is labelled as such.

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

Also confirm the product range described on the About page (loose leaf, tea bags, pyramids and
gift sets) and the category names (black, green, white, oolong, pu-erh, gift sets).

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

All contact channels are currently empty, so the site hides them. Fill in what should be public
in Admin → Settings (administrators only): phone, e-mail, Telegram, Instagram, address, working
hours. They appear in the footer, the contact page and structured data.

## 6. Brand content

The official brand content supplied on 2026-10-14 (name, descriptor, Uzbek tagline and texts,
English tagline, story, philosophy, collection and partnership texts, company, city and website)
is used exactly as supplied, in `apps/web/src/content/brand.ts`. The only change is typographic:
a no-break space before each dash, so a line never starts with "—".

| Item                                                                                                                                                       | Where                                   | How           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------- |
| Approve or correct the **Russian** translation of all brand texts, and the **English** translations other than the supplied tagline (drafted for the site) | Home, About, Wholesale, Contact, footer | Text          |
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
