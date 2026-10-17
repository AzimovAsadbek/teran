# Demo mode

The site can run as a complete, working demonstration before TERAN supplies real products,
prices, photographs and legal texts. Everything in the demonstration is ordinary data in the
database, created by the seed commands below and handled by the same code paths as real data:
no page falls back to invented content, and nothing is faked in the browser.

Three independent switches make up "demo mode":

| Switch                                       | What it does                                                                                                                                                                                                                                                                      |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_DEMO_CONTENT` (web, build time) | Default on. Demo notices on listings, product pages, checkout and in the admin; product images labelled "demonstration image"; every page `noindex`; `robots.txt` disallows everything.                                                                                           |
| Demonstration data (database)                | Loaded by `db:seed` (catalogue and content) and optionally `db:seed:demo` (customers, orders, enquiries). Removed or reloaded by the guarded `db:demo:reset`.                                                                                                                     |
| `PAYMENT_PROVIDER_MODE=demo` (API)           | Off by default. Simulates every enabled online payment method (Click, Payme, card) with a labelled demonstration payment page; no provider is contacted and no money moves. Refused in production unless `ALLOW_DEMO_PAYMENTS=true`. See [payments](../architecture/payments.md). |

## What the demonstration contains

### Catalogue and content — `pnpm db:seed`

The same command production uses for an optional review environment (`prisma db seed`). Since
2026-10-17 it loads **TERAN's own catalogue**; the generic test range is loaded only with
`SEED_TEST_CATALOGUE=true` (the end-to-end tests: `e2e/scripts/prepare-db.ts`).

| Records                                                                 | Count                                                     |
| ----------------------------------------------------------------------- | --------------------------------------------------------- |
| Categories (Tea → Green tea)                                            | 2                                                         |
| Collections (TERAN premium)                                             | 1                                                         |
| Products: XC2025, G8810, 8800, 8830, 8009                               | 5                                                         |
| Pack sizes: one 400 g zip pouch each (G8810 and 8800 with their EAN-13) | 5                                                         |
| Product images: the pouch cut out, its photograph, the back of the pack | 14 (the back only where a print file exists: not 8800)    |
| Gallery: pack artwork, the five pouch photographs, three films          | 12                                                        |
| Delivery methods                                                        | 2 (courier in Tashkent, delivery to the regions)          |
| Journal articles                                                        | 6 (5 published, 1 draft)                                  |
| Settings                                                                | announcement; contact channels as the owner supplied them |

The five teas carry the owner's own descriptions (2026-10-17): description, taste and aroma,
brewing (with ranges such as 80–90 °C or 3–5 g), origin (Hunan; G8810 Yunnan), storage and shelf
life, Uzbek and Russian as supplied and English translated. Producer and importer come from the
four print files (not yet for 8800). **Prices are still placeholders** until the owner confirms
them; the site-wide demo notice says so. Nothing claims ingredients, caffeine, certifications,
health benefits or reviews. The contact setting holds both phone numbers, both e-mail addresses,
Telegram @TeranTrade, the WhatsApp link from the WhatsApp Business QR code and the city;
Instagram and working hours were not supplied.

The **test range** (`testOnly` in `apps/api/prisma/seed/demo-catalog.ts`) adds black, white,
oolong and pu-erh teas and gift sets in other pack sizes and formats, a sale price (Earl Grey), low
and no stock (Jasmine green tea, Mini pu-erh) and a draft (Spring green tea): the states the
journeys exercise.

A database seeded by an earlier version is brought up to date by the next `pnpm db:seed`, once
and only for records nobody has edited since: the TERAN products get the owner's copy, a single
400 g pack (earlier pack sizes stay but are switched off; HET8800 and STD8009 move to 8800 and 8009
with redirects from their old addresses), demo stock of 50 without discounts and the pouch images;
the generic range is archived (not deleted: orders keep their snapshots) and its categories and
collections switched off once nothing of the shop is left in them; gallery items still carrying an
earlier file (the flat 8009 and G8810 renders, the four-pack film) get the current one.

### Activity — `pnpm db:seed:demo`

Runs the catalogue seed, then adds what makes the admin area worth demonstrating. **Never loaded
by `db:seed`, and refused in production unless `ALLOW_DEMO_SEED=true` is set explicitly.**

| Records                      | Count | Details                                                                                                                                       |
| ---------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Customers                    | 8     | Cannot sign in (see below); 3 locales                                                                                                         |
| Orders `TRN-DEMO0001`–`0024` | 24    | Over the last 45 days: 15 delivered (14 with cash recorded, 1 awaiting payment), 2 shipped, 1 processing, 1 confirmed, 2 pending, 3 cancelled |
| Contact enquiries            | 6     | New, in progress, resolved and spam                                                                                                           |
| Wholesale enquiries          | 5     | Café, hotel, retail, distributor and corporate                                                                                                |
| Newsletter subscribers       | 10    | 2 unsubscribed                                                                                                                                |

Orders are written the way checkout and the admin write them: purchase-time snapshots, prices
from the catalogue, delivery fees from the delivery methods, stock reserved with a conditional
update and recorded in the inventory ledger (stock returns when an order is cancelled), one
cash-on-delivery payment per order, and a status event for every step (actor "System"). Cash is
marked as collected only on delivered orders, as staff would record it; nothing is ever marked as
paid online. The admin dashboard, low-stock list and top products are computed from these rows.

### How demonstration records are recognisable

- E-mail addresses use `example.com`, a domain reserved for examples (RFC 2606): nothing can be
  delivered to them.
- Phone numbers follow the pattern `+998 90 000 0X XX`.
- Order numbers start with `TRN-DEMO`. Real order numbers use an alphabet without the letter O,
  so they can never collide.
- Companies end in "(demo)"; newsletter sign-ups have the source `demo`; product descriptions
  say "demonstration"; the admin shows a "Demo mode" note while `NEXT_PUBLIC_DEMO_CONTENT` is on.
- Fixtures live in `apps/api/prisma/seed/` (`demo-catalog.ts`, `demo-content.ts`,
  `demo-activity.ts`), never in components.

## Commands

```bash
pnpm db:up                      # PostgreSQL in Docker (127.0.0.1:5434)
pnpm db:migrate                 # migrations and Prisma client
pnpm db:seed                    # catalogue and content only
pnpm db:seed:demo               # catalogue, content and activity
pnpm db:demo:reset -- --confirm=teran   # remove the demo data and load it again (see below)
```

Both seeds are **idempotent and insert-only**: every record is matched by a key (slug, code,
order number, e-mail, company name) and skipped if it exists, so re-running adds nothing and never
overwrites a change made in the admin area. Each run that adds something writes a `demo.seed`
entry to the audit log and asks the storefront to refresh its cache (when `WEB_REVALIDATE_URL` and
`REVALIDATE_SECRET` are set; otherwise cached pages expire within the hour).

### Reset (destructive, guarded)

`db:demo:reset` removes the demonstration data and loads catalogue and activity again, so a demo
database returns to its starting state (for example after a presentation in which products were
edited or orders placed). It refuses to run:

- when `NODE_ENV=production` — there is no override;
- unless `--confirm=<database name>` repeats the name of the target database exactly;
- when the database is not on this machine, unless `--allow-remote` is also given.

It prints the target (host, port, database; never credentials) before changing anything.

What it removes: demo products (with their image files), demo categories and collections unless
products created in the admin still use them, demo articles, `TRN-DEMO` orders, the demo
customers (only accounts the seed created), demo enquiries and demo newsletter sign-ups.

What it keeps: staff accounts, customers who registered themselves, orders placed through the
checkout (they keep their purchase-time snapshots), delivery methods and settings (configuration
the owner may have changed), and the audit log (a `demo.reset` entry is added).

## Signing in during a demonstration

- **Administrator:** create one with the CLI, with your own e-mail address and a password of your
  choosing. There is no shared demo password.

  ```bash
  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='at-least-10-characters' pnpm --filter @teran/api admin:create --first-name You
  ```

- **Demo customers cannot sign in.** Their password field holds a marker that is not a valid
  Argon2 hash, so every login attempt fails like a wrong password. To show the customer account,
  register a new account in the storefront.
- In development `MAIL_TRANSPORT=log` prints e-mails (password reset, order confirmation) to the
  API log; with the default `disabled` nothing is sent. No SMS integration exists.

## A demonstration checkout

Use fictional details, for example name "Test Mijoz", phone `90 000 09 99`, region Tashkent,
address "Namuna koʻchasi, 1". Cash on delivery is always offered. With
`PAYMENT_PROVIDER_MODE=demo` the online methods are offered too, labelled "Demo · no money is
charged": placing the order opens the demonstration payment page, which never asks for card
details and lets you choose the outcome (success, declined, cancelled, left pending); the order,
the account and the admin then show the simulated payment as "Demo". Without demo payments the
online methods are shown as unavailable (or not at all) until a real provider is configured. The server validates the details, recalculates prices, delivery and stock,
stores the order in one transaction (submitting twice does not create two orders) and shows its
number. The order appears in Admin → Orders, where staff move it through the statuses and record
the cash.

The journey verified end to end on 2026-10-14 (see the [QA report](../testing/qa-report.md)):
home → catalogue → search (by name and identifier) → filters, price range and sort (kept in the
URL) → product → pack size → add to bag → change quantity → checkout validation → order placed
→ order, items, payment and ledger in the database → admin sign-in → find the order → change its
status → publish the draft product → the product appears in the catalogue → empty and error
states → admin closed to visitors.

## Safety rules

- Production is never seeded with demo customers or orders by default; the reset never runs in
  production.
- The browser bundle contains only public settings (`NEXT_PUBLIC_*`: site URL, enabled locales,
  demo flag). Secrets stay on the servers.
- No reviews, ratings or testimonials exist, demo or otherwise.
- Simulated payments are never mixed with real ones: demo mode simulates every online method and
  refuses provider callbacks; a demo payment is stored with provider `DEMO` and labelled
  everywhere it appears.
- Legal and help texts are marked as drafts; contact channels stay empty until TERAN fills them in.
- No phone number, e-mail address, registration number or social account is invented for TERAN.

## Moving to real data

1. **Launch on a fresh database** (recommended): run the migrations, create the administrator, and
   enter settings, delivery methods, categories, collections and products in the admin. Do not run
   either seed.
2. If a demonstration database must become the live one instead: replace or archive every demo
   product in the admin, delete the demo articles, and do not keep `TRN-DEMO` orders or demo
   customers — use a fresh database if they were loaded.
3. Supply the facts listed in [business information required](../business-information-required.md)
   and the photographs in the [asset replacement brief](../design/asset-replacement-brief.md).
4. Build the web image with `NEXT_PUBLIC_DEMO_CONTENT=false` (`DEMO_CONTENT=false` in the
   production environment file): notices disappear and search engines may index the site.
