# Architecture overview

TERAN is a storefront and administration area for TERAN® — Premium Chinese Tea, a brand of TERAN
TRADE MChJ in Namangan, Uzbekistan: catalogue,
bag, cash-on-delivery checkout, customer accounts, enquiries, journal, and a staff area for
products, stock, orders, customers, content and settings. Uzbek is the default language, with
Russian and English.

```mermaid
flowchart LR
    browser[Browser] -->|HTTPS| nginx[Nginx on the server<br/>TLS, routing]
    nginx -->|"/api/v1/*, /uploads/*"| api[API<br/>NestJS]
    nginx -->|everything else| web[Storefront and admin UI<br/>Next.js]
    browser -->|pictures and films| r2[(Cloudflare R2)]
    web -->|"server-side data<br/>(X-Internal-Key or visitor cookies)"| api
    api -->|"POST /api/revalidate<br/>(shared secret)"| web
    api --> db[(PostgreSQL)]
    api -->|password reset, order confirmation| smtp[SMTP server]
    api -->|WebP renditions, films| r2
    api -.->|without R2| uploads[(Uploads volume)]
    api -->|channel posts| telegram[Telegram Bot API]
```

In development there is no Nginx: the browser talks to Next.js, which rewrites `/api/v1/*` and
`/uploads/*` to the API, so cookies stay first-party either way. Production runs the containers of
`docker-compose.prod.yml` behind the server's own Nginx, installed and updated by `deploy.sh`
([production deployment](../deployment/production.md), ADR-046, ADR-048).

## Repository layout

```
apps/
  api/            NestJS API, Prisma schema, migrations, seed, admin CLI, Dockerfile
  web/            Next.js storefront and admin UI, messages (uz/ru/en), content modules, Dockerfile
packages/
  contracts/      Zod schemas and types shared by API and web (requests, responses, errors, rules)
e2e/              Playwright end-to-end suite and the scripts that build and seed its stack
docker/           Production env example, Postgres init script, row counts
docs/             Architecture, design, development, deployment and testing documentation
docker-compose.yml        Local PostgreSQL
docker-compose.prod.yml   Production stack
deploy.sh                 Installs and updates the production stack
.github/workflows/ci.yml  Continuous integration (never deploys)
```

Key decisions are recorded in [decisions.md](./decisions.md); the data model in
[database.md](./database.md); security controls in [security.md](./security.md).

## Storefront and admin UI (`apps/web`)

Next.js 16 App Router with React 19, TypeScript in strict mode, Tailwind CSS v4 and next-intl.

### Routes

| Area    | Routes                                                                                                                                                                                                                                                                                                                 |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shop    | `/`, `/catalog` (all products), `/[category]` and `/[category]/[subcategory]` (e.g. `/tea/green-tea`; `/catalog/[category]` redirects), `/collections/[collection]`, `/products/[slug]`, `/search`, `/cart`, `/checkout`, `/orders/[number]` (guest status link), `/payments/demo/[token]`, `/payments/return/[token]` |
| Account | `/account`, `/account/orders`, `/account/orders/[number]`, `/account/purchases`, `/account/addresses`, `/account/profile`, `/account/security`, `/account/login`, `/account/register`, `/account/forgot-password`, `/account/reset-password`                                                                           |
| Content | `/about`, `/wholesale`, `/journal`, `/journal/[slug]`, `/media` (photographs and films), `/contact`, `/faq`, `/delivery`, `/returns`, `/privacy`, `/terms`, `/newsletter/unsubscribe`                                                                                                                                  |
| Admin   | `/admin` (dashboard), `orders`, `products` (+ new, edit), `categories`, `product-types`, `collections`, `inventory`, `customers`, `inquiries`, `newsletter`, `journal`, `media` (+ new, edit), `delivery`, `settings`, `staff`, `audit`                                                                                |
| System  | `/api/health`, `/api/revalidate`, `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest`, icons, branded 404 and error pages                                                                                                                                                                                           |

Every page exists in each enabled language: Uzbek without a prefix, `/ru/...` and `/en/...`
([ADR-007](./decisions.md)).

### Rendering and data

- **Static shell, streamed data.** With Cache Components and partial prerendering, each page's
  shell (header, headings, skeletons) is prerendered; catalogue, content and account data stream
  into `Suspense` boundaries. Data regions call `connection()`, so builds never fetch API data
  ([ADR-008](./decisions.md)).
- **Cached loaders** (`apps/web/src/lib/data`): categories, collections, product lists and details,
  related products, sitemap entries, settings, articles and checkout options use `'use cache'`
  with tags `catalog`, `content` and `settings`. The API calls `POST /api/revalidate` after
  changes; the route verifies the shared secret and expires the tags.
- **API access** (`apps/web/src/lib/api`): `server.ts` (server-only) sends cached requests with
  `X-Internal-Key` and visitor requests with the visitor's cookies and `X-Forwarded-For`
  ([ADR-011](./decisions.md)); `client.ts` calls `/api/v1` from the browser on the same origin.
- **Client state** is limited to the bag (a small external store kept in sync with the API) and
  form state. There is no global client data cache.
- **Forms** validate with the same Zod contracts as the API, show field errors from either side,
  translate messages from shared keys, and move focus to the first problem.

### SEO

Per-page titles and descriptions, canonical URLs, `hreflang` alternates with `x-default` for the
languages each page is written in, Open Graph images, a sitemap of every public page per
language, and JSON-LD: `OnlineStore` and `WebSite` (home), `BreadcrumbList`, `Product` (offers
per pack size once prices are shown; once customers have rated it, `aggregateRating` and the
reviews on the page, [ADR-042](./decisions.md)), `Article`, and `FAQPage`. Private pages are
`noindex` and disallowed in `robots.txt`. A build is indexed only on its public https address
without demonstration content ([ADR-060](./decisions.md)); everything else (demonstration mode,
staging, local) is `noindex` throughout. Modules, rules and tests:
[SEO architecture](./seo.md).

Pages whose metadata depends on data stream it after the shell for browsers and for crawlers
that render JavaScript (Googlebot). Crawlers and link-preview bots that read only HTML — Yandex,
Bing, Apple, Facebook, Telegram, WhatsApp and others in Next.js's `htmlLimitedBots` list — get
every tag in `<head>`.

### Admin UI

Lives in the same application under `/admin` with its own layout: a server-side gate (`/auth/me`)
redirects visitors to sign-in (with a staff heading) and shows customers a "staff only" page;
administrator-only sections are hidden from managers. The API enforces every rule independently.
Admin pages show loading skeletons while data loads, and an error boundary keeps the navigation
available if a page fails.

How it is meant to read for a shop owner:

- **Navigation by task**: Sales (dashboard, orders, inquiries, customers), Catalogue (products,
  inventory, categories, collections), Website (articles, subscribers) and Settings. Orders,
  inquiries and inventory show how much work waits in them (`GET admin/badges`, loaded once per
  request with `React.cache` and streamed into the menu). Below 1024 px the menu is a drawer;
  above it the menu scrolls on its own while the account and sign-out stay at its foot.
- **Dashboard first answers "what do I do now"**: quick actions (post to the gallery, new product,
  new article), new orders to confirm, orders to pack and send, pack sizes running low and new
  inquiries, each a link to the filtered list; then what the site shows now (products on sale,
  the gallery by kind, published articles, reviews of the week). Sales figures appear only while
  prices are shown (ADR-027, ADR-061).
- **Lists** are tables from 768 px and cards below it (each value repeats its column name); a whole
  row opens the record. Filters live in the URL and apply as soon as an option is chosen; the order
  list has status tabs with counts and a payment filter.
- **Staff wording**: order statuses as staff say them ("New", "Being packed"), action buttons that
  name the action ("Confirm order"), no raw codes, slugs or ids on screen (audit entries, payment
  failure reasons and stock reasons are translated).
- **Nothing irreversible happens on one click**: every order step, cancellation, payment, refund,
  role or access change is confirmed in a dialog whose buttons say what they do; the confirm button
  wakes up a moment after the dialog opens, so a double tap cannot confirm. Stock changes are
  "stock in" or "stock out" with a positive quantity and a before → after preview.
- **Forms**: the product form follows the order staff fill it (name, category, status, photos,
  pack sizes, descriptions, brewing, optional details), keeps its save bar on screen, warns about
  unsaved changes, makes addresses and pack codes from the name, takes brewing times in minutes and
  drops an error as soon as its field changes. A confirmation appears at the top of the screen
  after every save or action.

## API (`apps/api`)

NestJS 12 (ESM) under `/api/v1`, Prisma 7 with the `pg` driver adapter.

### Request pipeline

1. Helmet security headers (strict CSP for JSON), CORS for the configured origins, cookie parsing.
2. JSON body parsing only, 100 kB limit.
3. Origin check for state-changing requests (CSRF protection).
4. Static `/uploads/*` (immutable product images).
5. Session middleware: resolves the session cookie to `request.auth`.
6. Global guards: rate limiting, then authorisation (`@RequireAuth`, `@RequireStaff`).
7. Global validation pipe: every body, query and parameter parsed with the shared Zod schemas.
8. Controller and service; Prisma transactions where several writes must succeed together.
9. Global exception filter: one error shape, generic messages for server errors.

### Modules

| Module      | Responsibility                                                                                                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Config      | Validates the environment once at start-up; production rules fail closed                                                                                                                                                 |
| Core        | Audit log, mail, storefront revalidation, sessions                                                                                                                                                                       |
| Health      | Liveness and readiness (database) probes                                                                                                                                                                                 |
| Catalog     | Public category tree and category pages, collections, product list with attribute filters and facets, search, suggestions, detail with characteristics, related products, slug redirects, sitemap                        |
| Content     | Public settings (announcement, contact), journal articles and the media gallery (“Galereya”)                                                                                                                             |
| Orders      | Bag, delivery pricing, checkout quote and order placement, guest and account order lookups                                                                                                                               |
| Payments    | Payment attempts and their state machine, demo provider, Payme and Click callbacks, payment window expiry ([payments](payments.md))                                                                                      |
| Account     | Customer overview, filtered orders, purchases, reorder, address book, e-mail change, signed-in devices ([cart and account](cart-and-account.md))                                                                         |
| Auth        | Registration, sign-in and out, profile, password change, forgotten-password flow                                                                                                                                         |
| Inquiries   | Contact and wholesale enquiries, newsletter subscribe and unsubscribe                                                                                                                                                    |
| Reviews     | Product ratings and reviews: published reviews with their stars' spread, the customer's own review (save, delete), staff moderation (hide, show, delete); keeps each product's rating totals ([ADR-042](./decisions.md)) |
| Admin       | Staff API: dashboard and reports, products and images, categories, collections, stock, orders and payments, customers, staff, enquiries, newsletter, settings, delivery methods, articles, audit log                     |
| Maintenance | Hourly clean-up of expired sessions, carts and reset tokens                                                                                                                                                              |

### Endpoints

All paths are prefixed with `/api/v1`. "Staff" means `MANAGER` or `ADMIN`. OpenAPI documentation
is served at `/api/docs` when `SWAGGER_ENABLED=true` (development).

| Area       | Endpoints                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Access                    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Health     | `GET health/live`, `GET health/ready`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | public                    |
| Catalogue  | `GET catalog/categories`, `catalog/category-page?path=`, `catalog/collections`, `catalog/products` (with `attr.<key>` filters), `catalog/products/:slug`, `catalog/products/:slug/related`, `catalog/redirects/{products,collections}/:slug`, `catalog/search/suggest`, `catalog/sitemap`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | public                    |
| Content    | `GET content/settings`, `content/articles`, `content/articles/:slug`, `content/media` (`kind`, `featured`, pages)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | public                    |
| Bag        | `GET cart`, `POST cart/items`, `PATCH cart/items/:itemId`, `DELETE cart/items/:itemId`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | cart cookie               |
| Checkout   | `GET checkout/options`, `GET checkout/quote`, `POST checkout/orders`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | public                    |
| Orders     | `GET orders/:number?token=` (guest link); `POST orders/:number/payments` (start or retry an online payment: owner or token); `GET account/orders/:number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | token / customer          |
| Payments   | `GET payments/return?token=`, `GET`/`POST payments/demo` (demo mode only); provider callbacks `POST payments/payme` (Basic auth), `POST payments/click/prepare`, `POST payments/click/complete` (signed)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | link secret / provider    |
| Account    | `GET account/summary`, `GET account/orders?status=&page=`, `POST account/orders/:number/reorder`, `GET account/purchases`, `GET account/profile`, `POST account/email`, `GET account/sessions`, `POST account/sessions/revoke-others`, addresses (`GET`/`POST account/addresses`, `PUT`/`DELETE account/addresses/:id`, `POST account/addresses/:id/default`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | customer                  |
| Auth       | `GET auth/features`, `POST auth/register`, `POST auth/login`, `POST auth/logout`, `GET`/`PATCH auth/me`, `POST auth/password/change`, `POST auth/password/forgot`, `POST auth/password/reset`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | public / signed in        |
| Reviews    | `GET catalog/products/:slug/reviews?page=` (public); `GET`/`PUT`/`DELETE catalog/products/:slug/reviews/mine` (customers only, not staff); `GET admin/reviews?status=`, `PATCH admin/reviews/:id` (hide or show), `DELETE admin/reviews/:id` (staff)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | public / customer / staff |
| Enquiries  | `POST inquiries/contact`, `POST inquiries/wholesale`, `POST newsletter/subscribe`, `POST newsletter/unsubscribe`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | public                    |
| Admin      | `GET admin/dashboard`, `GET admin/badges`; products (`GET`/`POST admin/products`, `GET`/`PUT admin/products/:id`, images upload, reorder, delete); categories and collections (CRUD, category parent and redirects); product types (`GET`/`POST admin/product-types`, `PUT`/`DELETE admin/product-types/:id`); media (`GET`/`POST admin/media`, `PUT admin/media/order`, `GET`/`PUT`/`DELETE admin/media/:id`, `POST admin/media/:id/image`, films in pieces under `admin/media/:id/video/uploads`); `GET admin/inventory`, adjustments and movements; `GET admin/orders` (filters: text, status, payment status, dates), `GET admin/orders/:number`, `POST …/status`, `POST …/payments` (cash), `POST …/refunds`; `GET admin/customers`, `GET admin/customers/:id`; enquiries and newsletter lists and updates; `GET admin/settings`; `GET admin/delivery-methods`; articles (list, get, create, update) | staff                     |
| Admin only | `GET admin/reports/orders.csv`, `GET admin/audit`, `GET admin/newsletter/export.csv`, staff (`GET`/`POST admin/staff`, `PATCH admin/staff/:id`), `PUT admin/settings/announcement`, `PUT admin/settings/contact`, `POST`/`PUT admin/delivery-methods`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `ADMIN`                   |

### Errors

Every error has the shape `{ statusCode, code, message, issues?, details?, requestId }`. Codes are
listed in `packages/contracts/src/errors.ts`; the important ones for clients:
`VALIDATION_FAILED` (with field `issues`), `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`,
`CONFLICT`, `RATE_LIMITED`, `INVALID_ORIGIN`, `INVALID_CREDENTIALS`, `EMAIL_TAKEN`,
`INVALID_TOKEN`, `FEATURE_DISABLED`, `CART_EMPTY`, `CART_ITEM_UNAVAILABLE`,
`INSUFFICIENT_STOCK`, `PRICE_CHANGED`, `DELIVERY_METHOD_UNAVAILABLE`,
`INVALID_STATUS_TRANSITION`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`, `INTERNAL_ERROR`.
The storefront translates them into the visitor's language.

### E-mail

Two plain-text messages in the customer's language: password reset and order confirmation (with
the order-status link). The transport is `disabled` (default), `log` (development only) or `smtp`.
Without SMTP, password reset is switched off and orders are still confirmed on screen.

## Main flows

### Browsing a product page

```mermaid
sequenceDiagram
    participant B as Browser
    participant W as Next.js
    participant A as API
    B->>W: GET /products/classic-black-tea
    W-->>B: Static shell (header, layout, skeleton)
    W->>A: GET catalog/products/:slug (cached loader, X-Internal-Key)
    A-->>W: Product with variants, stock levels, images
    W-->>B: Streamed product section, JSON-LD
    B->>A: GET /uploads/... (WebP renditions via srcset, immutable)
```

### Checkout

```mermaid
sequenceDiagram
    participant B as Browser
    participant A as API
    participant D as PostgreSQL
    participant M as SMTP
    B->>A: POST cart/items (cart cookie)
    B->>A: GET checkout/quote?methodCode&regionCode
    A-->>B: Server totals (subtotal, delivery fee, total)
    B->>A: POST checkout/orders {idempotencyKey, customer, delivery, expectedTotal}
    A->>D: Transaction: re-price, reserve stock (conditional), check total, insert order, payment, ledger, empty cart
    A-->>B: 201 {order, accessToken}
    A--)M: Order confirmation e-mail (if the customer gave an address and SMTP is on)
    B->>B: Navigate to /orders/TRN-…?token=…
```

A retry with the same idempotency key returns the same order; a total the customer did not see
returns `409 PRICE_CHANGED` and the page asks them to confirm the new total.

### Staff change reaching the storefront

```mermaid
sequenceDiagram
    participant S as Staff browser
    participant A as API
    participant W as Next.js
    S->>A: PUT admin/products/:id (session cookie, same origin)
    A->>A: Transaction: product, variants, min price, audit entry
    A-->>S: 200 updated product
    A->>W: POST /api/revalidate {tags: ["catalog"]} (after ~1 s, shared secret)
    W->>W: Expire cached catalogue entries
```

## Configuration

Each application validates its own environment; examples with placeholders only are committed:
`apps/api/.env.example`, `apps/web/.env.example` and `docker/production.env.example`. See
[local development](../development/setup.md) and [production deployment](../deployment/production.md).

## Observability

- Structured JSON logs (pino), one line per request with a request id that is also returned in
  `X-Request-Id` and in error bodies, so a customer-visible error can be traced to its log line
  (`apps/api/src/common/logging`; how to read them: [production deployment](../deployment/production.md#reading-the-logs)).
  The storefront's server logs the API calls that fail, with the API's request id.
- Health endpoints for liveness and database readiness; container health checks use them.
- Audit log of every staff action, readable by administrators in the admin area.

## Limits of the current design

- One API and one web instance. Rate-limit counters and the Next.js cache are in process memory,
  and uploads are on a local volume; running several instances needs shared stores.
- No online payments, discounts or refunds yet; cash on delivery only.
- Search is substring matching on normalised text (trigram index), without relevance ranking.
- Films in the media gallery are kept as uploaded (MP4 or WebM, any size, sent in pieces): no
  transcoding, no adaptive streaming and no captions track. Staff upload a web-ready file and a
  poster frame; an iPhone `.MOV` has to be exported as MP4 first.
