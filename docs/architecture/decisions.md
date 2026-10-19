# Architecture decision records

Short records of decisions that shape the code, with the alternatives that were rejected. Code
comments refer to them by number. Status is "Accepted" unless stated otherwise; a superseded
record stays here with a pointer to its replacement.

## ADR-001: Two applications in one pnpm monorepo, sharing contracts

**Context.** A storefront with server rendering, an administration area, and business rules
(prices, stock, order states) that must hold no matter which client calls them.

**Decision.** `apps/web` (Next.js App Router) renders the storefront and the admin UI; `apps/api`
(NestJS, modular monolith under `/api/v1`) owns all business rules and the database;
`packages/contracts` holds Zod schemas and TypeScript types used by both, so validation messages
and request shapes cannot drift. One pnpm workspace with a single lockfile.

**Consequences.** One deployable per runtime, clear ownership of rules (the API) and of
presentation (the web app). Contracts must be built before either app (`pnpm generate`,
`pnpm dev` does it). Splitting a service out later is possible along the Nest module boundaries.

## ADR-002: PostgreSQL with Prisma 7, invariants in the database

**Context.** Money, stock and order state need strong guarantees; Prisma cannot express every
constraint.

**Decision.** PostgreSQL 18, Prisma 7 with the `pg` driver adapter, UUIDv7 keys, `NUMERIC(12,2)`
money, and `CHECK` constraints written into migrations for invariants such as non-negative stock,
consistent order totals and normalised e-mails. See [the data model](./database.md).

**Consequences.** A bug in application code cannot store a negative stock level or an order whose
total does not add up. Constraint changes are hand-written SQL in migrations and must be reviewed.

## ADR-003: Server-authoritative cart and idempotent order placement

**Context.** Prices and stock change; customers double-click and retry on bad connections.

**Decision.** The cart lives on the server (cookie token). Every read re-prices lines and caps
quantities to stock. Placing an order runs one transaction that re-reads prices, reserves stock
with conditional updates and compares the total with the one the customer saw (`expectedTotal`;
mismatch → `409 PRICE_CHANGED`). The checkout page sends a client-generated idempotency key, unique
in the database, so retries and double submissions return the same order.

**Consequences.** No overselling and no client-controlled prices; integration tests cover
concurrent checkouts and duplicate submissions. Carts do not reserve stock, so an item can sell out
between adding it and checking out (the customer is told why).

## ADR-004: Opaque database sessions instead of JWTs

**Context.** Staff must be revocable immediately; customers stay signed in for weeks.

**Decision.** Random 256-bit session tokens in `HttpOnly`, `Secure`, `SameSite=Lax` `__Host-`
cookies; only their SHA-256 is stored. Role and active status are read on every request.

**Consequences.** Deactivating staff or changing a password takes effect at once; one indexed
lookup per request. No token parsing on the client and nothing to leak through `localStorage`.

## ADR-005: Cash on delivery first; payments recorded only by staff

**Context.** Online payment providers in Uzbekistan (for example Payme, Click, Uzum) need merchant
contracts and credentials that do not exist yet.

**Decision.** `CASH_ON_DELIVERY` is the only enabled method (`PAYMENT_METHODS_ENABLED`). An order
starts with a pending payment; only staff can record the cash as received, and every record is
audited. No client request can set a payment to paid.

**Consequences.** The checkout works without a provider. Adding one requires an integration that
verifies signed callbacks server-side before changing payment state; `Payment.providerReference`
and the `FAILED`/`REFUNDED` statuses are reserved for it.

## ADR-006: Stock ledger and deactivation instead of deletion

**Context.** Stock must be explainable and orders must keep pointing at what was sold.

**Decision.** Every stock change writes an `InventoryMovement` (reason, delta, resulting quantity,
actor, order). Manual adjustments and checkout use conditional updates. Variants removed from a
product are deactivated; products are archived; orders snapshot names, SKUs and prices.

**Consequences.** A full history per variant, no orphaned order lines, and reports that survive
catalogue edits.

## ADR-007: Uzbek by default, language chosen explicitly

**Context.** The main market is Uzbekistan; Russian and English are secondary. Redirecting by the
`Accept-Language` header makes the same URL show different content to different visitors and
crawlers.

**Decision.** next-intl with `localePrefix: 'as-needed'`: Uzbek URLs have no prefix, Russian and
English use `/ru` and `/en`. The proxy (`apps/web/src/proxy.ts`) removes `Accept-Language`
before locale detection, so only an explicit choice (the `TERAN_LOCALE` cookie set by the language
switcher) redirects an unprefixed URL. Every page declares `hreflang` alternates and `x-default`.

**Consequences.** Stable, cacheable URLs per language and predictable indexing. Visitors who
prefer Russian or English switch once; the choice is remembered for a year.

## ADR-008: Cache Components with tagged revalidation; no data baked into builds

**Context.** The catalogue changes through the admin area, must appear quickly, and builds happen
where the database may not be reachable (CI, Docker).

**Decision.** Next.js 16 Cache Components. Catalogue, content and settings loaders use
`'use cache'` with `cacheTag` (`catalog`, `content`, `settings`) and `cacheLife` (hours; minutes
for checkout options). The API calls the storefront's `/api/revalidate` webhook (shared secret)
after changes, which expires the tag immediately. Data regions sit inside `Suspense` and call
`connection()`, so `next build` prerenders only the static shell and never fetches API data.
Loaders return `null` for "not found" instead of throwing, because an error thrown inside a cached
function loses its class.

**Consequences.** Fast static shells with streamed data, edits visible within about a second,
and builds that do not depend on a running API. Partial prefetching prerenders admin child
segments separately, so each has its own `loading.tsx`. (Amended by ADR-039: the home page's
pictures join the prerendered shell when the API answers, and stream as before when it does not.)

## ADR-009: Product images as API renditions served with `<img srcset>`

**Context.** Product photos are uploaded through the admin area. They are already decoded,
stripped of metadata and re-encoded on upload.

**Decision.** The API stores WebP renditions at fixed widths (320–1600 px, never larger than the
source) under immutable URLs (`/uploads/...`). The storefront renders them with a plain `<img>`
with `srcset`, `sizes`, intrinsic `width`/`height`, lazy loading and `fetchpriority="high"` for
the first visible images (`apps/web/src/components/catalog/product-image.tsx`). The Next.js image
optimiser is used only for local brand assets (`remotePatterns` is empty).

**Consequences.** No second resize pipeline, no image cache growing inside the web container, and
no open optimiser endpoint that could be used to fetch arbitrary URLs. Layout stays stable
because dimensions are known. The trade-off is no AVIF output for uploads; WebP is supported by
every target browser.

## ADR-010: Soft 404 for streamed dynamic pages

**Context.** With Cache Components and partial prerendering, Next.js sends the HTTP status with
the static shell, before the data for a product, category, collection or article slug has been
loaded. Calling `notFound()` after streaming has started cannot change the status; calling it in
the shell (with `instant = false` and a top-level fetch) produced a real 404 in development but an
empty error shell in the production build.

**Decision.** Unknown slugs render the branded "not found" page inside the stream with HTTP 200
and `<meta name="robots" content="noindex">`. URLs outside the route tree return a real 404
(`global-not-found`). The sitemap lists only existing pages.

**Consequences.** Search engines treat these pages as soft 404s and drop them; visitors see the
same page either way; the end-to-end suite checks the UI and the `noindex`. Revisit if a real
status is required: the proxy could check slug existence against a cached list before rendering,
at the cost of an extra lookup per request.

## ADR-011: Trusted server-to-server calls and the client IP

**Context.** The API rate-limits per client IP. The storefront renders on the server and would
otherwise look like one very busy visitor.

**Decision.** Cached loaders (public data, no cookies) send `X-Internal-Key`, compared in constant
time and exempt from rate limits. Requests made on a visitor's behalf (account, cart, checkout)
forward the visitor's `Cookie` and `X-Forwarded-For`, and are limited like the visitor.
`TRUST_PROXY_HOPS` tells the API how many proxies to trust (1 = Caddy); Caddy sends `/api/v1/*`
and `/uploads/*` straight to the API, replaces client-supplied forwarding headers and strips
`X-Internal-Key` from internet requests.

**Consequences.** Real per-visitor limits that cannot be bypassed with forged headers (verified on
the production stack). The internal key is a shared secret that must be rotated on both services
together.

## ADR-012: Demonstration mode until real content exists

**Context.** The owner has not yet supplied verified product data, prices, photography or legal
details, but the store must be reviewable.

**Decision.** `NEXT_PUBLIC_DEMO_CONTENT` (default on) marks every page `noindex`, makes
`robots.txt` disallow everything, appends "(demonstration image)" to product image descriptions
and shows a demonstration notice on listings, product pages and checkout. The seed refuses to run
in production unless explicitly allowed. Legal texts highlight every `[placeholder]` and show a
draft banner.

**Consequences.** Nothing fabricated can be indexed or mistaken for a real offer. Going live is a
rebuild with `DEMO_CONTENT=false` after the content checklist in
[business information required](../business-information-required.md) is complete.

## ADR-013: Derived tokens for links in e-mails and exports

**Context.** Newsletter exports and e-mails need working unsubscribe links; storing raw tokens
would expose them in a database leak.

**Decision.** Unsubscribe tokens are `HMAC-SHA256(APP_SECRET, "newsletter-unsubscribe:" + id)`,
computed when needed and compared in constant time; nothing is stored. Guest order links use
`HMAC-SHA256(APP_SECRET, "order-access:" + idempotencyKey)` and store only the token's SHA-256,
so an idempotent retry can return the same link.

**Consequences.** Links survive exports and re-sends without token storage. Rotating
`APP_SECRET` invalidates unsubscribe links already sent; issued order links keep working.

## ADR-014: Original, code-drawn demonstration imagery

**Context.** No product photography exists yet. Third-party photos (including the reference
sites') may not be used, and paid image generation was declined by the owner.

**Decision.** Demonstration product images are drawn in code: SVG pack shots carrying the real
TERAN emblem and leaf studies, rendered with sharp in the seed. Storefront illustrations
(hero landscape, tea-type art) are inline SVG components. Real photography replaces them through
the admin upload.

**Consequences.** No licensing risk and a consistent look; the images are clearly marked as
demonstration material.

## ADR-015: Reference priorities for the design

**Context.** Two references were supplied: DAVIDsTEA for structure and UX, and a TERAN concept
screenshot for brand identity only.

**Decision.** Page structure, navigation (utility bar, centred logo, mega menus, drawer bag) and
shopping flows follow the DAVIDsTEA audit, adapted for TERAN. Colours, typography and mood come
from the TERAN logo and the concept's identity signals. The concept's composition (navbar layout,
hero arrangement, side slogan, three promo cards, proportions) is not reproduced, and no
DAVIDsTEA copy, imagery, illustration style or palette is reused. See the
[reference audit](../design/reference-audit.md) and the [design system](../design/design-system.md).

## ADR-016: Single-host Docker Compose behind Caddy, deployed by hand

**Context.** A first production deployment for a single store, without an authorised deployment
pipeline.

**Decision.** Production images for the API (plus a tools target for migrations, the demo seed
and the admin CLI) and the web server; `docker-compose.prod.yml` with PostgreSQL on an internal
network, a one-off migration job before every API start, and Caddy for HTTPS. CI builds and tests
everything, including the images, and never deploys. See
[production deployment](../deployment/production.md).

**Consequences.** Simple operations and an exact local rehearsal of production (the end-to-end
suite passes against the HTTPS stack). Scaling beyond one host needs a shared cache handler,
shared upload storage and a shared rate-limit store.

## ADR-017: Separate output directory for the API dev watcher

**Context.** `nest build` empties `dist/`. The end-to-end stack and the Docker build use `dist/`,
which crashed a running dev server whenever they ran.

**Decision.** The dev watcher compiles to `apps/api/.nest-dev` (`tsconfig.dev.json`); `dist/` is
only for production builds.

**Consequences.** Development and production builds can run side by side. Both directories are
git- and lint-ignored.

## ADR-018: Static Content Security Policy without nonces

**Context.** A nonce-based policy requires rendering every page per request.

**Decision.** A header-based policy that allows inline scripts but no third-party origin of any
kind; user content is never rendered as HTML. The full reasoning is in
[security](./security.md#http-headers-and-content-security-policy).

**Consequences.** Static prerendering and Cache Components keep working. Adding any third-party
script requires revisiting this record.

## ADR-019: Formatting that does not depend on the runtime's locale data

**Context.** Chromium (Chrome, Android WebView) ships without Uzbek locale data: in the browser,
`Intl` formats Uzbek numbers as `1,234,567.5` and dates as `2026 M10 14`, while Node.js on the
server produces `1 234 567,5` and `5-oktabr, 2026`. Uzbek pages therefore showed foreign formats
in the browser, and every client-rendered price failed hydration, making React re-render the page
on the client (Lighthouse found the console error and a 470 ms blocking time on the home page).

**Decision.** `apps/web/src/lib/format.ts` formats numbers for every language, and dates for
Uzbek, itself, following the CLDR patterns that Node.js produces; Russian and English dates still
use `Intl`, whose data both runtimes share. Unit tests pin the exact output, including no-break
spaces.

**Consequences.** Identical text on server and client, correct Uzbek formats on Android and
desktop Chrome, and no hydration errors (home page on simulated mobile: performance 71 → 98).
New formatting must go through this module; ICU message arguments formatted by next-intl still use
`Intl` and are fine for the small counts used today.

## ADR-021: Publication readiness decided by the API

(ADR-020 is used by the scoped client messages work on its own branch.)

**Context.** Products, articles, gallery items and categories could be published half-finished:
a product without a picture fell back to a tea illustration, an article without a cover went out
with a placeholder, a film without its file showed an empty tile.

**Decision.** Each content type has a readiness list in `apps/api/src/admin/readiness.ts`: required
items (a product's main image, an active priced pack, required characteristics; an article's
title, body and cover; a photo's file; a film's file and poster) and recommended ones (alternative
text, SEO description, translations). Drafts may be incomplete; saving as published with a required
item missing is refused with `422 PUBLICATION_BLOCKED` and the missing codes, which the admin area
explains and links to the field. The same list is returned with every item for the editor's
checklist and the lists' "n missing" badges. Removing the last picture of a product on sale, or the
cover of a published article, is refused too. Existing published items are not unpublished.

**Consequences.** One rule set for the API, the editors and the tests; the storefront can rely on
published items having their pictures. A new required field is added in one place.

## ADR-022: Telegram announcements through an outbox

**Context.** Publishing should optionally post to the brand's Telegram channel without ever
blocking or duplicating, and Telegram can be slow, rate limited or refuse a post.

**Decision.** After an item's transaction commits, one `TelegramPost` row is created per item
(unique on the item). Delivery claims the row, sends, and records the outcome; failures keep their
reason for the admin area, transient ones retry automatically, an unknown outcome is never retried
by itself, and a sent post is never sent again. `TELEGRAM_MODE=dry-run` composes and records
without contacting Telegram. Details: [telegram](./telegram.md).

**Consequences.** Publishing works when Telegram is down, retries cannot duplicate posts, and the
history is auditable. One post per item: later edits are not re-announced.

## ADR-023: Product advisor grounded in catalogue tools

**Context.** A shopping assistant must not invent products, prices, links or qualities, and model
output must never become a database query.

**Decision.** The advisor finds products only through a validated search over the catalogue
(category, type, formats, price range, attribute options, a text word, stock). With an AI provider,
the model can only call that search and name products it returned; anything else is dropped.
Without a provider, or when it fails, a rule-based reader of the request does the same. Details:
[product-advisor](./product-advisor.md).

**Consequences.** Every recommendation is a real, purchasable product with real facts, in every
mode. Qualities the catalogue does not record are named as such instead of being guessed.

## ADR-024: Films uploaded straight to object storage

**Context.** On Vercel a function accepts request bodies of at most 4.5 MB, far below a short film;
routing films through the API there would simply fail.

**Decision.** When the API uses object storage (Vercel Blob), it grants the admin area a
short-lived token for exactly one file (type, maximum size, place under the item); the browser
uploads it to Blob itself, and the API then checks what arrived with ranged reads (type from the
first bytes, running time from the movie header) before recording it. Without object storage, films
go through the API as before (64 MB). Only admin pages may connect to Blob's upload address.

**Consequences.** Films up to 512 MB on Vercel without a larger function body; the API still
validates every file. The path depends on Vercel Blob and has to be checked once on the real store.

## ADR-025: No inlined copy of the page for cached navigations

**Context.** With Cache Components, Next.js 16.4 turns `experimental.cachedNavigations` on by
default. Together with Partial Prefetching (ADR-008) every page view then renders the route a
second time and inlines that copy into the HTML, so the browser can cache it while hydrating: on
the homepage about 95 kB of the 550 kB document, plus a second server render per request.

**Decision.** `experimental.cachedNavigations: false` in `apps/web/next.config.ts`. Partial
Prefetching stays on: links still prefetch one App Shell per route.

**Consequences.** Smaller documents (homepage 80 → 60 kB compressed), one render per request and
less hydration work on phones. A route opened again by a link is not served from that inlined
copy; it uses its prefetched App Shell and streams its data, as any other navigation does.

## ADR-026: The seed loads TERAN's catalogue; a generic range only for tests

**Context.** The seed's demonstration catalogue (21 generic teas around TERAN's five) was loaded
everywhere, including the live site. On 2026-10-17 the owner supplied the real data for the five
teas and asked for the site to show only those. The end-to-end journeys, however, need other tea
types, pack sizes and formats, a sale price, low and no stock and a draft.

**Decision.** `db:seed` loads the five TERAN teas (owner's descriptions, 400 g pouches, pouch
photographs, barcodes) and the contact channels the owner supplied. The generic range is marked
`testOnly` and loaded only with `SEED_TEST_CATALOGUE=true`, which `e2e/scripts/prepare-db.ts`
sets. Without it, a database seeded earlier has its generic range archived and its empty
categories and collections switched off, once; renamed TERAN products move to their new slugs with
redirects, and their packs keep their rows.

**Consequences.** The live catalogue and the tested catalogue differ: tests cover the platform's
capabilities, the site shows the shop. Nothing is deleted (orders keep their products); staff can
bring any archived product back from the admin area. Records changed after the retirement date are
left alone by later seeds.

## ADR-027: Prices hidden behind a build flag; orders by phone and messengers

**Context.** On 2026-10-17 the owner asked for every price to be removed from the site for now,
without deleting them: staff must still be able to enter prices in the admin area. Until prices
return, shoppers order by phone, Telegram and WhatsApp.

**Decision.** `NEXT_PUBLIC_SHOW_PRICES` (web, build time; off unless `true`), read as `showPrices`
from `apps/web/src/lib/site.ts`. Off: no price, sale badge, price filter or price sort; no bag,
quick-add or checkout (`/checkout` redirects to `/cart`, which says how to order); product pages
show the pack and TERAN's contact channels where the bag button was; product structured data has
no offers; delivery fees, payment methods and the demonstration notice about prices are hidden;
the delivery page and the FAQ describe ordering by phone and messengers. The advisor is asked
with `prices: false`, so its answers name no price and ignore budgets. The API, the admin area
and the data are unchanged; the end-to-end tests build with the flag on.

**Consequences.** One variable and a rebuild bring prices back. The catalogue API still returns
prices (the storefront does not display them; they are not secret), and customer accounts still
show the amounts of earlier orders.

## ADR-028: Page pictures set in the admin area; reference pictures loaded from ignored folders

**Context.** The 1:1 reference clone (docs/design/reference-map.md) fills its banners, slides,
bento tiles, menus and about page with photographs. TERAN's pages drew those places from product
cut-outs and brand art, and the owner needs to change the pictures without a release. On
2026-10-17 the owner also stated that TERAN may reuse the reference's pictures (written permission)
and asked for the site to match the reference, pictures included, for a presentation to a client.

**Decision.** A `visuals` site setting maps fixed places (`home.hero.1`, `home.bento.3`,
`menu.shop`, `about.hero`, `banner:catalog`, and a banner per category or collection, stored
under its id) to a stored picture, an optional taller phone crop and its source. Settings → Page
pictures uploads, replaces and removes them through the API's image pipeline (WebP renditions up
to 2560 px, plus the picture's own width for full-width places). A place without a picture keeps
TERAN's artwork, so the pages stay complete without any. Reference pictures are never committed
(the repository is public): `apps/api/scripts/import-visuals.ts` loads them from git-ignored
folders by manifest (page pictures, article and category covers, product photographs) and takes
them out again with `--remove` (docs/design/reference-assets.md). A manifest marked `localOnly`
(the presentation mockup with DAVIDsTEA's packs and products) is refused unless the database runs
on this machine, outside production and without Blob storage.

**Consequences.** Editors control every large picture of the storefront. The mockup can be shown
on the owner's machine without reaching terantrade.uz, and removed with one command before any
launch; until then the local database differs from the live one.

## ADR-029: The reference's palette; the advisor hidden behind a build flag

**Context.** The owner asked for the reference's colours as well as its layouts, and for the
product advisor to be left out of the storefront for now (its code kept).

**Decision.** The design tokens in `apps/web/src/styles/globals.css` keep their names (forest,
gold, jade, ivory, sage) and take the reference's values: its teal for the brand band, footer and
buttons, its black promo strip, white and warm greys, and its campaign colours as named tokens
(lavender, cherry, wine, blush, tangerine, navy, sky, ocean, matcha, cream, sun, reef). Background
colours are the reference's exactly; where its text fails WCAG 2.2 AA (white or teal words on its
lighter colours), the text takes a darker ink of the same hue (`tangerine-ink`, `matcha-ink`,
`teal-ink`, `blush-light`, `forest-800`) or solid white on the teal. `NEXT_PUBLIC_SHOW_ADVISOR`
(web, build time; off unless `true`, read as `showAdvisor` from `apps/web/src/lib/site.ts`) shows
the advisor's links in the menus, footer, catalogue, about page and sitemap, and its home banner
(an ordering banner takes its place).

**Consequences.** The storefront reads as the reference while passing the automated
accessibility suite. TERAN's own brand colours return by changing the token values in one file.
`/assistant` still works for a direct visit and in the tests; one variable and a rebuild bring the
advisor's links back.

## ADR-030: The reference's widgets and interaction tokens

**Context.** On 2026-10-17 the owner asked for the storefront to behave as well as look like the
reference: the same clickable parts and links, the same changes under the pointer, its chat in
the lower right corner, its 1920 px page width, and no social-network blocks it does not have.

**Decision.** Pointer feedback comes from shared tokens and utilities in
`apps/web/src/styles/globals.css` measured on the reference (`--hover-duration` 0.2 s ease, pills
lightening 8 % with a soft shadow, outlined pills frosting, rules thickening from 1 to 2 px,
pictures brightening in 0.35 s, panels opening in 0.22 s); components use the utilities
(`pill-hover`, `outline-hover`, `rule-hover`, `underline-reveal`, `picture-hover`) rather than
their own colours. The page container is 1920 px wide (`container-page`), the footer 1600 px. The
chat (`components/chat`) is a light disc that opens a teal window over the page: TERAN's advisor
answers from the live catalogue, its delivery answer and contacts come from the site's settings,
and the last conversation stays in the browser only; other controls open it with
`OPEN_CHAT_EVENT`. The offer card (`layout/promo-popup.tsx`) appears after 20 s at the lower left
and stays away for ten days once closed. The language menu is the reference's dropdown panel. The
hero's social rail and the "social networks" pill beside the shop button were removed; the
footer keeps its row of marks, as the reference's.

**Consequences.** New components get the reference's behaviour by using the utilities. Colours the
reference uses for text that fails WCAG 2.2 AA are darkened (see ADR-029), so a few hover and link
colours differ slightly from its own.

## ADR-031: The help centre as pages of the storefront

**Context.** The reference's contact form and help centre are embedded third-party widgets
(Gorgias): a teal panel with the form beside a portrait picture, and a help centre with a banner,
search, category cards (grid or list), category pages, article pages and a results page. TERAN's
form sends to its own API and its FAQ is part of the site's copy.

**Decision.** The contact page draws the reference's panel and option cards itself (container
queries follow the panel's width, as the embedded form follows its frame), keeping TERAN's fields
(a phone as well as an e-mail; a subject chosen from a list). The FAQ groups become the help
centre's categories and each question an article with one address in every language (made from
its English question): `/faq`, `/faq/articles`, `/faq/[group]`, `/faq/[group]/[article]` and
`/faq/search?q=` (not indexed). Category and article pages are prerendered from
`generateStaticParams`; their address-dependent parts stream inside Suspense, as Partial
Prefetching requires. Search runs in the browser over the same entries (all words, title matches
first) and on the results page on the server. "Was this article helpful?" records nothing: it
thanks the reader or, after "No", points to the contact page. Policy pages (privacy, terms,
returns, delivery) follow the reference's page template: its warm banner with the title in lower
case, a 920 px column of 16 px text, and on returns and delivery its promise card and teal
headings; delivery shows the configured methods as its table.

**Consequences.** No third-party script or frame is added and the answers stay editable in code
with the rest of the copy. The help centre's pictures, the contact picture and the for-business
page's pictures are page-picture places (ADR-028); the API now reads that setting place by place,
so a place it does not know (data saved by a newer build) is left out on its own instead of
hiding every picture.

## ADR-032: The store locator from the admin's stores, on OpenStreetMap tiles

**Context.** The reference's footer and header lead to a store locator (an embedded Storepoint
widget on Google Maps): a search row with "use my location", a radius and a kind filter, the
stores listed beside a map with pins, clusters and directions. TERAN had no list of points of
sale, and the storefront's policy allowed no third-party origin.

**Decision.** Stores are a site setting (`stores`: a list of up to 200 entries with a name, the
address and opening hours in the three languages, a phone, latitude and longitude, kinds — shop,
official dealer, wholesale — and whether it is shown), edited under Admin → Store addresses
(Settings until ADR-044) and saved with `PUT /admin/settings/stores` (admins only). Each store's picture is a page-picture place
(`store:<id>`, ADR-028). The public settings carry the shown stores with the address and hours in
the visitor's language. `/stores` draws the reference's panel itself: the search matches names and
addresses in the browser; "use my location" asks the browser (the visitor is prompted) and then
keeps the stores within the chosen radius, nearest first; the map is a small component of our own
over OpenStreetMap's tiles (no map library, no key), with the attribution its licence asks for;
directions open Google Maps with the store's coordinates. With no stores entered, the page says so
and points to the contact and wholesale pages; nothing is invented.

**Consequences.** The content security policy allows one third-party origin, for images only
(`img-src https://tile.openstreetmap.org`), and the permissions policy allows geolocation to this
origin (`geolocation=(self)`). Both apply site-wide because a page opened through an in-app link
keeps the policy of the first document loaded (docs/architecture/security.md). The tile servers'
usage policy suits a low-traffic page; a busier site would move to a tile provider with an
agreement. The map is hard to use with a screen reader; the list carries the same facts, and the
accessibility statement says so.

## ADR-033: Footer pages, footer variants and the gallery behind a build flag

**Context.** The owner asked for the reference's footer pages that are not specific to its company
(its impact report, rewards, ambassadors, careers, gift cards, contests, investors and order
tracking are), a footer that changes where the reference's does, and the photo and video gallery
only if the reference has one (it does not).

**Decision.** Tea 101 (`/tea-101`) follows the reference's page with general tea knowledge for the
Chinese teas TERAN deals in (white, green, oolong, black, pu'erh); a kind gets a pill and a row of
products only when TERAN's catalogue has that kind. It closes, as the reference's, with how much
tea a pack makes (beside a page picture, `tea101.amount`) and three brewing steps, in the
amounts, temperatures and times of TERAN's own teas. The accessibility page (`/accessibility`) is a
statement of what this website does and does not do yet, not the reference's Canadian employer
policy. The footer's link columns change on the for-business page as the reference's wholesale
page does. The gallery stays in the code behind `NEXT_PUBLIC_SHOW_GALLERY` (off by default): when
off it leaves the menus, the footer, the about page, the home page and the sitemap, and its pages
are not indexed. The language menu shows each language's flag.

**Consequences.** Turning the gallery on is a build setting, like prices and the advisor (ADR-027,
ADR-029). Tea 101's words are the same for every shop and need no business details; its products
follow the catalogue.

## ADR-034: Pictures do what they show, and only unbranded pictures go live

**Context.** The owner (2026-10-18) found an article previewed with a picture its own page does
not have (the home page's pair showed a page picture, `home.pair.1`, beside a link to an article
without a cover), asked that pictures not "just stand there" when they stand for something, and
that the pictures stay when the site goes live with the current design.

**Decision.** A picture shown with a link to an item is that item's own picture, so the page it
opens shows the same one: the home pair's article card shows the newest article that has a cover
(an article without one shows its illustration, as its page does), and the menus' cards show the
category's, collection's or article's own picture; the menus' page pictures (`menu.*`) only stand
in for an item without one, and `home.pair.1` is no longer shown (it stays a valid place so saved
settings read). Where a picture stands for a link, a pointer on it follows the link (hero slides,
bento tiles, the brewing and values bands, the pair, packs of the five teas on the about and
for-business pages, which open their tea, and an order's or past purchase's product picture, as
the bag's already did); the keyboard and screen readers keep the one named link
(the pill), the pictures' links being hidden from them. A product's picture opens the reference's
zoomed gallery (every picture full width, thumbnails, Escape to close; its code loads when the
shopper reaches for the pictures). The reference pictures were sorted: the 27 without DAVIDsTEA's
name, packs or products, and none shown as a TERAN product, are the set that goes live
(`storage/reference-assets`, under the owner's stated permission); the 43 that show DAVIDsTEA's
brand, products, staff, shops or store map, or other teas as TERAN's, stay a local mockup.

**Consequences.** The live site keeps the design with those 27 pictures and TERAN's own pouches
and paintings in the other places until TERAN uploads photographs; importing them into production
is part of a deploy the owner asks for. A pointer can now reach a link from more of the page than
the reference allows; keyboard and screen-reader behaviour is unchanged.

**Update (2026-10-18, later the same day).** TERAN and the owner decided that the live site shows
the 43 reference pictures as well, exactly as the local presentation: the campaign pictures with
the DAVIDsTEA name (the owner wants to advertise DAVIDsTEA, under the written permission the owner
states TERAN holds) and the leaf and cup photographs as the first pictures of the five teas, before
their own pack photographs (TERAN preferred them). They were loaded from
`storage/reference-partner` (docs/design/reference-assets.md).

## ADR-035: Ordering closed at the API, prices out of the page data, real status codes for crawlers

**Context.** A security and search review before the 2026-10-18 release found three gaps. The
storefront hides prices and takes orders by phone (ADR-027), but the API still accepted carts,
orders and simulated payments from anyone calling it directly, so a script could reserve every
pack in stock. The placeholder prices kept in the admin area were in the pages' data (the
React payload of the product rows), where scrapers and AI crawlers read them. And because pages
stream, an unknown or renamed product, article, category or collection answered 200 with a
`noindex` tag (a renamed one by a meta refresh) instead of 404 or 308.

**Decision.**

- `CHECKOUT_ENABLED` (API, off unless `true`) guards adding to and changing a cart, placing an
  order and starting or simulating a payment (`orders/checkout-enabled.guard.ts`, 503
  `FEATURE_DISABLED`); reading a cart, an order or a payment's state stays open. It goes on
  together with the storefront's `NEXT_PUBLIC_SHOW_PRICES`; the end-to-end and integration
  environments set it.
- While prices are hidden, the storefront's catalogue loaders send every price as 0 and no price
  range (`lib/data/prices.ts`); nothing displays a price in that mode.
- `generateMetadata` of those pages looks the item up and calls `permanentRedirect()` or
  `notFound()` itself, and Googlebot joins Next.js's list of crawlers that get pages only once
  their metadata is settled (`htmlLimitedBots` in next.config.ts), so they receive real 404s and
  308s. Visitors keep the streamed pages.
- The home page describes the shop as a schema.org `OnlineStore` built from Admin → Settings →
  Contact (phones, e-mail, networks), with TERAN TRADE MChJ in Namangan; product pages add `url`,
  `@id` and the packs' barcodes (`gtin13`). next-intl's `Link` header is off (pages state their own
  language versions), and `NEXT_PUBLIC_DEMO_CONTENT` is `false` in production now that the
  catalogue holds TERAN's own teas and texts.

**Consequences.** Opening online sales takes two switches, one per project. Googlebot's requests
are rendered without streaming (a little slower for it only). Admin-entered Instagram and YouTube
addresses appear in the networks menu, the footer and the structured data as soon as they are
saved.

## ADR-036: Only what is for sale is shown; tea photographs throughout

**Context.** TERAN sells five green teas and nothing else for now. The storefront still listed
empty categories and collections left from the demonstration catalogue (black tea, gift sets, a
test collection, gift ideas) as "coming soon" in its menus, home ribbon, tiles and catalogue chips,
and many page pictures (ADR-034) showed other products: mugs, tins, gift boxes, branded cups and
bags, lattes and iced drinks. On 2026-10-18 the owner asked for tea only, with the rest to appear
by itself once TERAN adds such products (coffee is planned).

**Decision.**

- The navigation tree (`categoryTree`, `navCollections` in `lib/navigation.ts`) holds only
  categories and collections with visible products; every menu, the ribbon, the bento and collage,
  the hero's collection slide, the catalogue's chips and the search sidebar use it or filter the
  same way. The API leaves empty categories and collections out of the sitemap and the search
  suggestions. An empty category's or collection's own page still answers ("coming soon") with
  `noindex`, so a link shared early does not break.
- Every page picture that showed another product was replaced by a free tea photograph (Unsplash
  License; docs/design/reference-assets.md, sections 3 and 4), bright as well as dark ones. The
  bento's third and fourth campaign pictures, the unused pair picture, the gift-sets cover (another
  brand's tin) and the genmaicha photograph shown first for TERAN 8009 were taken out.

**Consequences.** A new category or collection appears everywhere once its first product is
published, and its pictures should be chosen then; nothing in code names a category. The
end-to-end journeys check that an empty category or collection stays out of the menus until its
first product.

## ADR-037: Films in the home page's first view and large banners, without rotation

**Context.** On 2026-10-18 the owner asked for the home page's first view to be one film of tea
gardens they supplied, with TERAN's words over it and no carousel, and for films in the three large
banners ("A choice for every taste", "Contact us to order", "Tea school"), chosen from Pinterest
pins they sent. Both films had to repeat without the repetition being noticeable. A first version
dissolved the film's end into its start in the browser with two players taking turns; the moving
footage then showed both moments at once, half-transparent, for a second and a half, and the
players' timing depended on the device.

**Decision.**

- The first view is one view: TERAN's words over `home.hero.1`'s film (or its picture, or the lake
  painted on the packs). The slider, its dots, arrows and rotation are gone; `home.hero.2` stays in
  the settings' schema for stored data but is no longer shown or offered in Admin.
- A page picture can carry a film (`video`) and a phone film (`mobileVideo`, under 750 px), each
  with the point kept in view (`focusX`, `focusY`); the picture is the film's first frame, painted
  at once and shown instead of the film with reduced motion or a data-saving connection. Films are
  set by the import script (`visuals:import`, variants `video` and `video-mobile`); a new picture
  uploaded in Admin replaces the place's film too, and Admin says so on places that play one.
- Films are prepared as loops before upload: the part of the source where the least changes is
  kept, and its last second or two dissolve into its first in the file itself (with any camera
  movement measured and matched during the dissolve, so nothing doubles), or a still scene plays
  forwards then backwards. The file's end then continues exactly into its start, and the storefront
  plays it with the browser's own `loop` (`LoopingFilm`), one player, no timing of its own. The
  films are re-encoded muted at 1.2–2 Mbit/s: the first view's film went from 4.1 MB to 2.2 MB.
- A film is fetched whole once the page has loaded and the place comes within a screen of view,
  fades in over its poster and plays only while on screen. (Its round pause button was removed
  the same day at the owner's request: ADR-038.) A veil darkens the words' side over a banner's
  film; the first view keeps its film's own light from 1024 px (the owner found the veil too dark)
  and shades the letters instead, its veil staying on phones, where the words lie over the sky.

**Consequences.** A film uploaded without preparation would show a cut at each repetition; the
steps are in docs/design/reference-assets.md, section 5. The banner films come from third-party
creators on Pinterest and the first view's from the owner: TERAN should confirm it may use them
(section 5). Films are decorative; the words carry the meaning, so search engines and screen
readers lose nothing without them.

## ADR-038: Living product pictures, films shown only where they move, no pause buttons

**Context.** On 2026-10-18 the owner sent a photograph of a steaming cup of tea and asked for it
to be each tea's first picture, with the tea moving and the steam slowly rising, each tea in its
own colour; for another film in the "A choice for every taste" banner; for crisper videos; and,
the same day, for no pause buttons. Films repeating in a plain loop showed a small flicker in their
still parts as each loop began: encoders refine still areas frame by frame, and the restart falls
back to the key frame.

**Decision.**

- A product picture can carry a film (ProductImage `videoKey`, `videoType`, `videoWidth`,
  `videoHeight`, `videoFiles`; migration `20261018150000_product_image_film`, additive): the
  picture is its first frame; beside it a 512 px copy for product cards (`card.mp4`) and a mask of
  where it moves (`mask.png`). The import script sets them (`film`, `cardFilm`, `filmMask` on a
  product photograph); a picture replaced or deleted in Admin takes its film along. Page films
  (ADR-037) can carry a mask too.
- A film shows only where it moves (CSS `mask-image`, cropped as the film is: cover at its focus
  point); elsewhere the sharp picture under it shows. The still parts never flicker and the films'
  hidden parts are blurred in the files, so they cost almost nothing.
- Product cards play the cards' copy while on screen; the product page's gallery plays the film on
  the slide shown (`ProductFilm`). Banner and first-view films play as in ADR-037.
- No film has a button of its own (the owner's choice). Films never play with reduced motion, on a
  data-saving connection or off screen, and the footer's "Videolarni to'xtatish" switch stops them
  all (remembered on the device, `lib/motion.ts`): the WCAG 2.2.2 way to pause them.
- The living pictures are made from stills: the owner's cup with the tea's hue turned per tea in
  OKLab (lightness and the window's reflection kept), the steam flowing upward in two copies half a
  cycle apart (each fading out before it starts over: no seam), rings running outwards on the tea;
  the banner's three gaiwans (an Unsplash photograph already composed for that place) with steam
  painted rising from each cup. The low-resolution films (the owner's first-view film, the order
  and tea-school banners) were re-encoded twice the size with Lanczos and a little sharpening, and
  the first view has a phone film of the part phones show.

**Consequences.** The home page loads more video (each film after the page, near its place, the
cards' copies about 270 KB each); data-saving connections and reduced motion get the pictures
alone. The tea liquors in the cup are an illustration and the cup photograph is the owner's (a
reference with its teapot removed), as the Pinterest films are third-party: real photographs of
TERAN's brews and filmed footage should replace them in time (docs/design/reference-assets.md).

## ADR-039: The home page's pictures prerendered with the page; pictures sized for their frames

**Context.** The owner asked on 2026-10-18 for a faster site and crisper pictures. Lighthouse
(mobile) gave the home page 75: its largest paint, the first view's picture, came in a part of the
page streamed at request time (ADR-008), 200 to 300 KB into the HTML, so the browser found it only
when nearly the whole page had arrived. Each banner drew its own artwork in the page's shell until
its photograph streamed in, so the artwork's pictures (four or eight pack pictures) were fetched
and never seen. An audit of the pictures (each file's width against the device pixels it fills)
found that pictures covering a frame of another shape (a landscape photograph in a tall card) told
the browser only the frame's width, so it chose files up to 2.5 times too narrow; the About page's
welcome band asked for 75 % of the window it fills.

**Decision.**

- The home page reads the settings itself while it is prerendered (`getPrerenderSettings`, cached
  under the `settings` tag like `getPublicSettings`) and hands the first view and the banners
  their pictures: they are part of the page's prerendered shell, without a Suspense fallback, and
  the first view's picture is announced in the head (`preload` with each crop's media query,
  `VisualPicture`). Every change in Admin → Settings expires the tag, so the page is prerendered
  again with it.
- Without an answer from the API (a build without one: CI, Docker; ADR-008) the loader returns
  null instead of throwing (an error inside a cached function stops `next build` even when the
  caller catches it), kept a minute only, and each place reads its picture at request time as
  before. Builds still never depend on the API. Catalogue sections stay streamed.
- `apiGet` fetches with `no-store`: otherwise a build keeps what it fetched in
  `.next/cache/fetch-cache` and the next build prerenders with that copy. Caching is the
  `'use cache'` loaders' alone.
- A picture covering a frame of another shape gets `sizes` worked out from both shapes
  (`coverSizes`, lib/navigation.ts): the home page's gallery cards, category tiles and their
  product photographs, the About page's timeline pictures; the media page's rows allow for their
  growth on phones. Page bands use their full width; the wordmark is asked for at the width it is
  drawn; the story banner's packs at theirs.

**Consequences.** The first view's picture is in the first 21 KB of the home page's HTML and in
its head instead of 200 to 300 KB in, and the browser fetches it with the styles and fonts; the
shell is smaller (no fallback copies) and no unseen artwork is fetched. A change in Admin →
Settings still shows within seconds (checked on a local production build: 3.5 s from the upload
to the regenerated page, for the first view and a banner, and back on removal). After an outage
of the API during a build or a revalidation, the page streams its pictures until it is prerendered
again, within minutes of the API answering. Pictures in covering frames download larger files,
below the fold only. The product and catalogue pages still stream their main content (they read
the address's query): the next place to look for speed.

## ADR-040: Films and pictures sharp on the largest screens

**Context.** On 2026-10-18 the owner showed the home page in Chrome on a large Retina screen: the
first view's film and the banners were blurry, and the gaiwan banner's painted steam would not do.
They asked for every picture and film to open sharp on every screen, the largest included. An audit
(each picture's and film's own pixels against the device pixels it fills, at 1875 and 1440 px
windows at 2× and a 390 px phone at 3×) found 64 of 108 short: the first view's film was 596 × 336
at its source and drawn 3750 device pixels wide; page pictures stopped at 2560 px (or their source:
900 px for the values band); films had one size for every screen.

**Decision.**

- Page pictures get renditions up to 5120 px (`WIDE_IMAGE_WIDTHS`: 3200, 3840 and 5120 added),
  made only as far as the source allows, so a full-width picture is sharp in a 2560 px window at 2×
  while smaller screens keep files their size (`sizes`, ADR-039).
- A page film can carry copies at other widths (`widths` on the stored film, `w<width>.mp4` beside
  `video.mp4`; `sources` in the public film, narrowest first). `LoopingFilm` measures its frame when
  the film is fetched and plays the narrowest copy whose width fills the frame's device pixels (a
  covering film is drawn at the frame's height when it is wider than the frame), or the widest.
- The four home films are 4K footage (Pexels, free licence), prepared as seamless loops at full
  size and copied at 1280, 1920, 2560, 3200 and 3840 px and as the phone's 9:16 part at 1080 and
  720 px; their posters are their first frames at full size. Pictures too small for their places
  were replaced by Pexels photographs of the same subjects, cropped to the places' proportions
  (docs/design/reference-assets.md, section 9).
- Journal covers get the page pictures' renditions too (admin uploads and `visuals:import`): a
  tall journal card shows a slice of a wide cover, so it needs a file two to three times its own
  width, and the card's `sizes` say so (`coverSizes`, as the home cards since ADR-039). Category
  and collection covers keep `IMAGE_WIDTHS` (their sources are 258 to 1200 px).
- A product card plays the tea's film itself (1024 px) instead of the 512 px card copy where the
  card is drawn wider than the copy on the screen (a 316 to 431 px card at 2×), so the steam is as
  sharp as the picture around it; phones keep the copy.

**Revised 2026-10-19.** The owner found the first view's film "strange" and soft. Its loop
dissolved the clip's end into its start while the camera drifts, so for 1.5 s of every 7.7 s two
views showed at once (doubled trees); the three banners doubled the same way (a pitcher, a teapot,
a hand). The films were made again without any blend: the first view plays forwards and back with
its speed easing to a stop at each end (`loop-film.swift` `mode=bounce ease=1.15`: wind-blown
leaves read the same either way), the banners play straight from the two frames most alike and
start again with a plain cut (`mode=cut`; pouring cannot play backwards). Their copies have a
little more bitrate (0.09 bits per pixel for the first view, 0.06 for the banners) and sharpening.
The first view then got a sharper, brighter clip chosen by the owner (sunlit tea gardens, a 69
Mbit/s 4K source; `storage/hd-hero-3`), its copies at 0.14 bits per pixel: a drone moving over
leaves changes every pixel, and less smudged them at 100 %.

**Revised again 2026-10-19.** The owner found that film too short (4 s of footage over 10 s) and
disliked it playing backwards. It now plays the whole 19.3 s shot forwards only and starts again
with a plain cut (`mode=cut`; no two moments of the flight look alike, so the cut is a scene
change, every 19 s instead of a reversal every 5 s; `storage/hd-hero-4`). To keep the bytes in
check its copies hold only what the first view shows: wide screens get the middle 2.4:1 band of
the frame (the view is 1.6:1 to 3.1:1 from 900 px), phones a 3:4 part (0.78:1 to 1.1:1), so
3200 px is 37 MB, 1920 px 14.5 MB and the phone's 1080 px 10 MB (0.09 to 0.14 bits per pixel; 0.09
visibly smudged the leaves at 100 %). The bento's first two tiles became films too (tea poured into
a glass pitcher and into a glass teapot, `storage/hd-bento-films`): both are still shots, so a
short dissolve joins two moments where the kettle stands in the same place and no hand is in view;
16:9 parts put the vessel right of the tile's words, phones get square parts.

**And once more, that evening.** The owner wanted a real tea plantation (the Bangladesh garden reads
as trees) and picked the curving rows of Moc Chau, Vietnam, from four mock-ups: a 10.75 s shot
whose clean part is 7.4 s (a visitor at the start, a building and a large national flag at the
end). Rather than repeat or blend frames, every filmed frame is kept and played at 24 fps instead
of 30 (`loop-film.swift play=24`: 0.8×, 9.25 s), forwards only with a plain cut
(`storage/hd-hero-5`); the crops keep the hilltop flag out. A slower flight reads as calm, and 24
fps is film's own rate, so nothing judders.

**Consequences.** On a 1440 px window at 2× the first view now draws a 3200 px film (10.7 MB, after
the page has loaded) instead of a 1192 px one; a 1× screen gets 1920 px (3.9 MB) and a phone 1080 ×
1920 (4 MB). Storage holds seven files per film. Pictures and films whose sources are small (the
owner's tea cup and leaves at 1024 to 1254 px, the gallery's 1280 px photographs) are as sharp as
they can be until larger originals come.

## ADR-041: The menus show the range TERAN plans, marked "coming soon" until stocked

**Context.** ADR-036 kept every category without products out of the menus. On 2026-10-19 the
owner found the menus too bare (one category, Tea, with one subcategory) and asked for more
categories to show in them, coffee and confectionery among them, whether they have products or
not.

**Decision.**

- The header's panels and the phone drawer use `menuCategoryTree`: every active category with its
  subcategories, in the admin's order. One without products carries a "coming soon" mark (the
  desktop row and subcategory links, the drawer's tiles and rows), its panel says products are on
  their way instead of offering "newest" and "recommended", and its card keeps its own art (the
  menu's photograph shows TERAN's teas). Its own page already answered "coming soon" with
  `noindex` (ADR-036).
- The drawer's picture tiles list stocked categories and collections first; categories still to
  come fill the remaining tiles.
- Everything that shows products keeps `categoryTree` (stocked only): the home page's ribbon,
  tiles and collage, the catalogue's chips, the search and the sitemap. Collections are unchanged.
- Three illustrations join the built-in art for non-tea categories: `coffee` (coffee beans),
  `sweets` (a wrapped sweet) and `teaware` (a cup), TERAN's leaves staying in each medallion.
- Production data (2026-10-19): the demonstration catalogue's black tea, white tea, oolong, pu-erh
  and gift-set categories are active again (their products stay archived), green tea leads Tea, and
  Coffee (whole bean, ground), Confectionery (chocolate, oriental sweets, biscuits and wafers) and
  Teaware (teapots, tea bowls) were added in three languages, with audit rows. The admin area
  renames, reorders or switches off any of them.

**Consequences.** A visitor can open a category with nothing in it yet; the mark sets the
expectation and the page leads back to the teas. A category the owner does not plan should be
switched off rather than left empty. The end-to-end journey checks that a new category shows as
"coming soon" until its first product.

## ADR-042: Customers' own ratings and reviews, shown at once, moderated by staff

**Context.** On 2026-10-19 the owner found the product card too plain and asked for it to be
richer and more modern, ratings first. Until then the site said, on purpose, that TERAN had no
reviews and invented none (product card, JSON-LD, demo rules). Stars that nobody gave would be
fabricated; the honest way to show them is to let customers give them.

**Decision.**

- A signed-in customer gives a visible product 1 to 5 stars with an optional comment (up to 1000
  characters), once: saving again replaces it, deleting removes it (`ProductReview`, unique per
  product and customer). Staff accounts cannot rate (`RequireAuth({ roles: ['CUSTOMER'] })`): the
  shop does not rate itself. A review is marked "verified buyer" when the customer had a delivered
  order with one of the product's pack sizes when saving it. Nothing is ever written for a
  customer, imported or seeded.
- Reviews show at once (post-moderation). Staff hide a review (it leaves the page and the average;
  its author still sees it, marked hidden, and saving again keeps it hidden), show it again or
  delete it for good, each with an audit entry (`review.hide`, `review.show`, `review.delete`; a
  deletion records what was removed). Admin → Reviews lists all, shown or hidden.
- Each product keeps `ratingCount` and `ratingSum` of its published reviews, recomputed in the same
  transaction as every change with the product row locked (two reviews saved together cannot miss
  each other) and with raw SQL so the product's `updatedAt` stays its own edits. Product lists and
  cards therefore carry `rating { average, count }` (null before the first) without a join, and the
  storefront's catalogue cache is refreshed (`catalog` tag) after every change.
- The product card shows the stars, the average to one decimal and the count, leading to the
  product page's reviews; before the first review, empty stars and "Rate it". The card also shows,
  from the product's own data, the origin and chips for the brewing temperature and time and the
  pack size (`origin` and `brewing` joined the product summary), a lift and a slowly growing
  picture while pointed at, and a permanent "Order" button while prices are hidden (the pill over
  the picture went away).
- The product page shows the stars under the name and a "Customer reviews" section after the
  brand's difference: the average, the five-to-one star bars, the way to rate (a visitor is sent
  to sign in or register and comes back), and the published reviews newest first, each in its own
  language, six at a time. Its JSON-LD carries `aggregateRating` and those reviews once there are
  some.

**Consequences.** Cards and pages show empty stars until customers rate, which is the truth. A
review appears before anyone reads it, so staff should check Admin → Reviews; spam is limited by
sign-in, one review per customer and product, and 10 saves a minute. Demo customers cannot sign
in, so the demo reset never leaves rating totals behind.

## ADR-043: Pictures and films in Cloudflare R2, read straight from it

**Context.** Pictures and films lived in Vercel Blob behind the storefront's `/uploads` rewrite. On
2026-10-19 the Hobby plan's included Blob usage ran out (4K films of tens of megabytes, repeated
imports, checks) and Vercel suspended the store: every picture and film answered 403, the files
could be listed but not read back, and only an upgrade or the next billing period would lift it.
Each visit's films also counted as Vercel traffic. The owner chose to move the pictures and films to
Cloudflare.

**Decision.**

- The API stores files in Cloudflare R2 through its S3 API when `R2_*` is set (`media/r2-store.ts`:
  PUT, GET with ranges, HEAD, DELETE and listing, signed with Signature Version 4 by hand, checked
  against AWS's published examples; no SDK). R2 comes before Blob and the uploads directory. The
  keys are unchanged (`<area>/<id>/<key>/<width>.webp`, `video.mp4`, `w<width>.mp4`, `card.mp4`,
  `mask.png`).
- Picture and film addresses in the API's answers start with the bucket's public address
  (`R2_PUBLIC_URL`) instead of `/uploads`, so visitors load them from Cloudflare (free traffic), not
  through Vercel. The storefront allows that origin in its Content Security Policy (`img-src`,
  `media-src`, `connect-src`, from `UPLOADS_ORIGIN`), keeps the `/uploads` rewrite (to the bucket)
  for addresses already shared, and turns absolute addresses into absolute ones only where it had
  prefixed the site (structured data). The bucket allows the site in its CORS rules: page films are
  fetched whole and masks are CSS images. A page film that cannot be fetched streams from its address
  instead.
- `scripts/restore-media.ts` rebuilds the files from the local source folders under the keys the
  database holds: page pictures by place and recorded source, product photographs by the SHA-256 of
  their original (or, with `--stand-ins`, the same product's local photograph in the same order and
  size), covers by slug and size; renditions are made at the stored widths with storeImage's own
  code (`renderRenditions`). The archived demonstration products' pictures are code-drawn, so they
  were drawn again with the seed's own code at their stored sizes. Pictures uploaded in the admin
  area had no local source; with the owner's agreement their places were cleared so nothing shows
  broken: category and article covers removed (the cards show their tea medallion), gallery
  photographs made drafts without their picture (titles kept, so each can be uploaded again and
  published). Their old keys are saved outside the repository (`apps/api/storage/`), should the
  Blob store ever hand its files back.
- With R2 the admin area uploads films through the API (4.5 MB on Vercel); larger gallery films are
  added with `scripts/add-gallery-film.ts`. Direct browser uploads remain a Blob feature for now.

**Consequences.** The site's media no longer depends on Vercel's Blob allowance or traffic; R2's
free tier (10 GB stored, a million writes and ten million reads a month) covers the shop. The
bucket's `r2.dev` address is Cloudflare's development address (rate-limited); a custom domain on
Cloudflare (the domain's DNS moved there) is the production step, with only `R2_PUBLIC_URL` and
`UPLOADS_ORIGIN` to change. Files in the suspended Blob store stay there.

## ADR-044: Store addresses on their own admin page, placed on a map

**Context.** On 2026-10-19 the owner gave TERAN's first address (Namangan, Dashtbogʻ MFY,
Turaqoʻrgʻon koʻchasi, 200-uy) and asked for stores to be added and their addresses changed in the
admin area, and for the store page to look better. Stores could already be edited (ADR-032), but
inside the long Settings page, with the place on the map typed as "latitude, longitude"; and the
store page showed its search, radius and kind filter even with one store.

**Decision.**

- Stores have their own admin page, Admin → Store addresses (`/admin/stores`, administrators only,
  under "Site"), with each store's picture under the list; Settings no longer carries them. The
  data stays the `stores` site setting, saved whole as before.
- Each store is a card folded to its name, address and state, opened to edit it. Its place is set
  on the storefront's own map: a click (not a drag) puts the pin there (`StoreMap` `onPick`); a
  search sends the address to OpenStreetMap's geocoder through the API
  (`GET /admin/settings/stores/geocode`, administrators only, 20 a minute), which keeps its usage
  policy (an identifying User-Agent, one request a second, answers remembered for a day, no
  autocomplete) and, when the address finds nothing, tries it without the house and the
  neighbourhood council, then its region and city alone. Typed or found places bring the map to
  them; the coordinates field stays for pasting from Google or Yandex Maps. A new store starts
  with the shop's contact phone and hours.
- The store page: with one store there is nothing to search, so its card stands beside the map
  (above it on phones) and the store starts chosen, its bubble open; every card has icons for
  address, hours and phone, and Yandex Maps beside Google's directions (Yandex is the map most
  used in Uzbekistan). The banner is the ordinary height, so the store shows on the first screen.
  (A band of contact buttons under the stores went again the same night: ADR-045.)

**Consequences.** The API makes one outbound request per search, from the server (the browser's
policy is unchanged); the address an administrator types is the only thing sent. Nominatim knows
Namangan's streets but not every house: the owner's address finds the street's side lanes and the
town, and the exact house is clicked on the map (house 200 is in OpenStreetMap at 40.990448,
71.641952, which is where TERAN Namangan was placed).

## ADR-045: Contact channels only where they serve

**Context.** With prices hidden (ADR-027) orders go through TERAN's phones and messengers, and the
"To order, get in touch" panel with every channel had spread: under each tea, as a large banner on
the home page, and (for a few hours) as a band under the stores. On 2026-10-19 the owner asked for
it to stay only where it is needed, as on ordinary shop sites: not everything everywhere.

**Decision.** Each place shows contact for its own purpose, once:

- the footer (every page) lists every channel, and the contact page is where they are explained;
- the floating button (every page) opens them in one tap, as Uzbek shops do;
- "To order, get in touch" stands only where an order is made: each tea's page (where the cards'
  "Order" button leads, `#order`) and the bag (`/cart`, which says orders are taken by phone and
  messenger while there are no prices);
- a page with a purpose of its own keeps its own line: wholesale (call or write first, as dealers
  do), the help centre (a phone when an answer is missing), a store's card (its phone);
- the home page has no ordering banner: while the advisor is hidden its place stays empty (the
  `home.banner.3` picture and film stay saved for when it, or another banner, returns).

**Consequences.** One fewer full-width banner on the home page (two product rows now meet there),
and the contact panel appears on the pages a buyer is about to order from.
