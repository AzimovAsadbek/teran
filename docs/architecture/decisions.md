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
segments separately, so each has its own `loading.tsx`.

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
official dealer, wholesale — and whether it is shown), edited under Admin → Settings → Stores and
saved with `PUT /admin/settings/stores` (admins only). Each store's picture is a page-picture place
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
  fades in over its poster, plays only while on screen, and has a round pause button (WCAG 2.2.2):
  at the bottom left of the first view, in line with the words, and in the banners at the bottom
  left on phones and the top right from 1024 px, away from the words and from the chat and
  networks buttons floating at the bottom right. A veil darkens the words' side over a banner's
  film; the first view keeps its film's own light from 1024 px (the owner found the veil too dark)
  and shades the letters instead, its veil staying on phones, where the words lie over the sky.

**Consequences.** A film uploaded without preparation would show a cut at each repetition; the
steps are in docs/design/reference-assets.md, section 5. The banner films come from third-party
creators on Pinterest and the first view's from the owner: TERAN should confirm it may use them
(section 5). Films are decorative; the words carry the meaning, so search engines and screen
readers lose nothing without them.
