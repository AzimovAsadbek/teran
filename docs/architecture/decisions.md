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
