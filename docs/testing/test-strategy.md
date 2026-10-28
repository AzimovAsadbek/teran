# Test strategy

Each layer tests what it is best at: pure rules in unit tests, the real API against a real
database in integration tests, and real browsers against production builds end to end. Static
checks catch the rest before any test runs.

| Layer                | Tool                                                      | Runs against                                               | Tests | Command                                                 |
| -------------------- | --------------------------------------------------------- | ---------------------------------------------------------- | ----- | ------------------------------------------------------- |
| Static checks        | TypeScript (strict), ESLint, Prettier, translation parity | Source                                                     | —     | `pnpm typecheck`, `pnpm lint`, `pnpm format:check`      |
| Contracts unit       | Vitest                                                    | Shared schemas and rules                                   | 34    | `pnpm test`                                             |
| API unit             | Vitest                                                    | Pure API logic and the demo seed's fixtures, no database   | 101   | `pnpm test`                                             |
| Web unit             | Vitest, Testing Library, jsdom                            | Formatting, URL state, content, components                 | 70    | `pnpm test`                                             |
| API integration      | Vitest, Supertest                                         | The real Nest application and PostgreSQL (`teran_test`)    | 130   | `pnpm test:integration`                                 |
| End to end           | Playwright (Chromium), axe-core                           | Production builds of API and web, PostgreSQL (`teran_e2e`) | 51    | `pnpm --filter @teran/e2e build:stack && pnpm test:e2e` |
| Production rehearsal | Docker Compose, Nginx, curl, Playwright                   | The production images behind Nginx over HTTPS              | —     | See [below](#rehearsing-the-production-stack)           |

All of them except the production rehearsal run in CI on every push and pull request
([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)), together with production image
builds, Compose and Nginx template validation (`nginx -t`), and a dependency audit.

## Safety rules

- Tests never touch the development or production database. The integration suite refuses any
  database whose name does not end in `_test`; the end-to-end tooling refuses anything not ending
  in `_e2e` or `_test` (`assertTestDatabase`, `assertDisposableDatabase`).
- Both suites reset their database themselves: integration tests truncate between tests, the
  end-to-end stack migrates, truncates and re-seeds before every run.
- Test credentials are fixtures (`e2e/scripts/e2e-env.ts`, `apps/api/test/test-env.ts`), valid only
  for those disposable stacks. Real secrets are never needed to run any test.
- Rate limiting is disabled only on the disposable stacks (`THROTTLE_DISABLED=true`, accepted
  only with `NODE_ENV=test`); a dedicated integration test turns it back on and checks it.

## Unit tests

| File                                                                           | Covers                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/contracts/src/contracts.test.ts`                                     | Phone normalisation and formatting, search normalisation, region names, order status transitions, checkout schema (terms, normalisation, client totals stripped), contact form rules, product list queries, product upsert rules                                                            |
| `apps/api/src/cart/cart-line.spec.ts`                                          | Cart line evaluation (keep, reduce to stock, cap, block) and product visibility                                                                                                                                                                                                             |
| `apps/api/src/catalog/catalog.mapper.spec.ts`                                  | Stock levels, product summary pricing and badges                                                                                                                                                                                                                                            |
| `apps/api/src/common/crypto.spec.ts`                                           | Token generation, order number format, constant-time comparison                                                                                                                                                                                                                             |
| `apps/api/src/common/prisma-errors.spec.ts`                                    | Unique-constraint detection across Prisma error shapes                                                                                                                                                                                                                                      |
| `apps/api/src/common/security/internal-request.spec.ts`                        | Internal key check, URL redaction                                                                                                                                                                                                                                                           |
| `apps/api/src/common/security/origin-check.middleware.spec.ts`                 | CSRF origin rules                                                                                                                                                                                                                                                                           |
| `apps/api/src/config/env.spec.ts`                                              | Environment defaults, readable errors, production rules                                                                                                                                                                                                                                     |
| `apps/api/prisma/seed/demo-seed.spec.ts`                                       | Demo seed guards (production refused, reset never in production, database name confirmation, remote hosts); fixtures: identifiers labelled as demo, no unverified claims, order numbers that cannot collide, valid status histories, stock never oversold, only unreachable contact details |
| `apps/web/src/components/content/article-body.test.tsx`                        | Plain-text article rendering never interprets markup                                                                                                                                                                                                                                        |
| `apps/web/src/content/content.test.ts`                                         | Legal and help pages have the same structure in every language; description lengths                                                                                                                                                                                                         |
| `apps/web/src/features/catalog/query.test.ts`                                  | Catalogue URL filters, canonical API query, non-indexable refinements                                                                                                                                                                                                                       |
| `apps/web/src/lib/format.test.ts`                                              | Exact money arithmetic; numbers and dates identical on server and browser (CLDR patterns, Uzbek without `Intl` data)                                                                                                                                                                        |
| `apps/web/src/lib/safe-next.test.ts`                                           | Sign-in redirect only to same-site paths                                                                                                                                                                                                                                                    |
| `apps/api/src/cart/cart-merge.spec.ts`                                         | Cart merge rules on sign-in: combine by variant, caps at stock and limits, unavailable lines kept, line limit, determinism                                                                                                                                                                  |
| `apps/api/src/payments/*.spec.ts`                                              | Payment state machine (terminal states, paid only from open attempts), awaiting-payment rule, link secrets; Payme Basic auth, address range, checkout link (incl. the documentation's example), JSON-RPC errors; Click signatures over received strings, malformed requests, payment link   |
| `apps/api/src/catalog/attribute-filters.spec.ts`, `product-attributes.spec.ts` | Attribute filter parsing (`attr.<key>`), facets with selected options kept, typed value validation and required attributes, searchable terms                                                                                                                                                |
| `apps/api/src/account/account.service.spec.ts`                                 | Device names from User-Agent headers                                                                                                                                                                                                                                                        |
| `apps/web/src/lib/account-redirect.test.ts`                                    | Proxy sends visitors without a session from private account pages to sign-in, leaves public pages alone                                                                                                                                                                                     |

## API integration tests

The application is booted with the same `configureApp` as production (headers, CORS, origin
check, validation, error filter) and exercised over HTTP.

| File                             | Covers                                                                                                                                                                                                                                                                                                            |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `catalog.int-spec.ts`            | Visibility rules, stock filter and price sort, apostrophe-insensitive search, detail contract, validation errors, cache headers                                                                                                                                                                                   |
| `checkout.int-spec.ts`           | Cart contract and limits, drafts and inactive variants refused, cart isolation, server-side totals, free-delivery threshold, idempotent replay, duplicate-submission race, no overselling under concurrent checkouts, `PRICE_CHANGED` keeps stock, delivery, address and payment rules, token-only guest lookup   |
| `auth-security.int-spec.ts`      | Registration and cookies, weak and duplicate passwords, identical errors for unknown e-mail and wrong password, lockout, reset availability, asynchronous reset issuance, single-use reset with sign-out everywhere, CSRF, account routes, security headers and error shape, body limits, honeypot                |
| `admin.int-spec.ts`              | Role matrix (401/403/200), origin check, product lifecycle, uploads decoded and re-encoded (PNG, AVIF; disguised files refused), stock never below zero, order transitions with restock, cash payment recording, staff safeguards, settings, newsletter export with working unsubscribe links                     |
| `rate-limit.int-spec.ts`         | 121st request in a minute is limited; the internal key is exempt, a wrong key is not                                                                                                                                                                                                                              |
| `maintenance.int-spec.ts`        | Clean-up removes expired sessions and carts and spent reset tokens, keeps live ones, and is idempotent                                                                                                                                                                                                            |
| `demo-seed.int-spec.ts`          | Demo catalogue and activity load completely and idempotently, identifier products seeded before the packs are updated once (edited ones untouched), the inventory ledger matches stock, orders are shaped like checkout's, demo customers cannot sign in, removal deletes only demo data and the data loads again |
| `account.int-spec.ts`            | Guest bag on registration and login, merge rules, repeated sign-in, shared devices, dead session cookies, cart line ownership, account routes need a session, address book, truthful summary, filters, purchases, customer isolation, reorder at today's prices, e-mail change, sign out other devices            |
| `payments-demo.int-spec.ts`      | Demo mode: options, awaiting payment, idempotent checkout, return proves nothing, failure → retry → paid, outcomes, ownership, one open attempt, expiry and grace, callbacks refused, admin refund and cancellation                                                                                               |
| `payments-providers.int-spec.ts` | Live mode with test-only credentials: Payme Merchant API and Click SHOP API calls built from their documentation (auth, signatures, amounts, idempotent repeats, cancellation, refunds, expiry); cards unavailable                                                                                                |
| `catalog-tree.int-spec.ts`       | Category tree, category pages and redirects, reserved slugs, attribute filters and facets with pagination, typed attributes, product types protection, staff-only changes, mixed-category order snapshots, gift-set stock, sitemap paths                                                                          |
| `films.int-spec.ts`              | iPhone films made ready by ffmpeg (ADR-062): HEVC/HDR converted, Safari's H.264 copied, rotation kept, an MP4 kept byte for byte, checked with ffprobe (codec, size, sound, fast start, no place); published on the way with a cover from the film; refusal back to a draft; replacement, deletion, restart       |

The film suite needs ffmpeg and ffprobe (`FFMPEG_PATH`/`FFPROBE_PATH` or on the `PATH`); CI
installs them, and without them it is skipped with a note. `admin.int-spec.ts` and
`publishing.int-spec.ts` run without them on purpose (`helpers/without-video-tools.ts`): their
films are made-up MP4 boxes, and they check that a QuickTime film is then refused. The iPhone films
are made by `apps/api/scripts/make-iphone-films.swift` (macOS, AVFoundation) into
`apps/api/test/fixtures/`.

## End-to-end tests

Playwright starts a disposable stack (API on port 4100, web on 3100, online payments in demo
mode) from production builds:
`pnpm --filter @teran/e2e build:stack` compiles contracts, API and a standalone web build; the
API's start command prepares the database (migrate, reset, seed, create the test administrator).
Desktop Chrome runs everything except `@mobile` tests; a Pixel 7 profile runs the `@mobile` ones.

| File                    | Journeys                                                                                                                                                                                                                                                                                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `checkout.spec.ts`      | Guest browses, adds two packs, sees validation, places a cash-on-delivery order, opens the status link (a forged token reveals nothing), bag is emptied; empty checkout; branded `noindex` 404                                                                                                                                                        |
| `account.spec.ts`       | Register, edit profile, sign out and in; text typed before the page is interactive still reaches the form; off-site `next` ignored; contact and wholesale forms                                                                                                                                                                                       |
| `catalogue.spec.ts`     | Search by collection identifier and name, empty result; stock, format and price filters and sort kept in the URL and restored on reload; clearing keeps the sort; a pack size changes price and URL; a TERAN pack product shows its pack's facts (400 g, the "How to brew" panel) and images                                                          |
| `admin.spec.ts`         | Admin closed to visitors and customers; staff create a product, see it in the store, restock it, fulfil a guest order and record the cash                                                                                                                                                                                                             |
| `mobile.spec.ts`        | Phone: menu drawer, catalogue, sticky purchase bar, bag, checkout — failing on any sideways scrolling                                                                                                                                                                                                                                                 |
| `accessibility.spec.ts` | axe-core with WCAG 2.0/2.1/2.2 A and AA rules on storefront pages in three languages (including category pages), the open bag, checkout and form errors, the account area and menu, the demonstration payment page, an order awaiting payment, admin pages (including categories and product types), and the phone menu and filters                   |
| `journey.spec.ts`       | The full customer journey with demo payments (13 stages, see [customer journeys](customer-journeys.md)); private account pages redirect visitors to sign-in                                                                                                                                                                                           |
| `categories.spec.ts`    | Category pages direct and refreshed, attribute filter in the URL, legacy addresses answer 308, a new category appears in the Shop menu only while active, catalogue changes need staff                                                                                                                                                                |
| `publishing.spec.ts`    | Pictures, covers, articles and the gallery; the composer posts iPhone films (HEVC without a preview, H.264 with one) to the gallery and the home page feed, where the browser plays the MP4s; the editor replaces a film with an iPhone `.MOV` (ADR-062). These need ffmpeg where the stack's API runs (CI installs it; skipped elsewhere without it) |

Notes for writing tests:

- Next.js keeps recently visited pages mounted but hidden, so assertions target the visible
  match (`visible()` helper) and form fields are looked up inside `main`.
- Prefer roles and accessible names over CSS selectors; a test that cannot find an element by its
  role usually points at an accessibility problem.
- `E2E_BASE_URL` runs the suite against an existing stack instead of starting one; tests then
  create real orders in that stack's database.
- If a local build shows styles from before a change to `apps/web/src/styles/globals.css`,
  delete `apps/web/.next/cache/turbopack` and build again: Turbopack's persistent build cache
  served a stale Tailwind stylesheet once during the redesign (CI and Docker builds start
  without that cache and are not affected).

## Rehearsing the production stack

Before a release, or after changing anything in `docker/`, the Dockerfiles, the Compose file or
`deploy.sh`. The stack runs from a separate checkout (a clone outside this one) under its own
Compose project (`teran-smoke`) on free loopback ports, with a TLS proxy standing in for the
server's Nginx:

1. In the clone, create `.env.production` from `docker/production.env.example` with random
   secrets, `PUBLIC_ORIGIN=https://localhost:8443`, and the end-to-end stack's ordering settings:
   `DEMO_CONTENT=true`, `SHOW_PRICES=true`, `CHECKOUT_ENABLED=true`, `PAYMENT_PROVIDER_MODE=demo`,
   `ALLOW_DEMO_PAYMENTS=true`, `PAYMENT_METHODS_ENABLED=CASH_ON_DELIVERY,CLICK,PAYME,CARD`,
   `TELEGRAM_MODE=dry-run`.
2. `TERAN_COMPOSE_PROJECT=teran-smoke TERAN_BACKUP_DIR=<scratch folder> ./deploy.sh --web-port 3300 --api-port 4300 --fresh-database`
3. Load the test catalogue and create the end-to-end administrator (`e2e/scripts/e2e-env.ts`) with
   `docker compose -p teran-smoke -f docker-compose.prod.yml --env-file .env.production --env-file .deploy.env`:
   `run --rm -e ALLOW_DEMO_SEED=true -e SEED_TEST_CATALOGUE=true migrate prisma db seed`, then
   `exec -e ADMIN_EMAIL -e ADMIN_PASSWORD api node dist/cli/create-admin.js --first-name E2E`.
4. Put a TLS proxy on `https://localhost:8443` in front of ports 3300 and 4300 that meets the
   requirements of [production deployment §7](../deployment/production.md#7-nginx) (for example
   an Nginx container whose configuration, like the server's, lives outside the repository).
5. Run the browser suite through it:
   `E2E_BASE_URL=https://localhost:8443 E2E_IGNORE_HTTPS_ERRORS=true pnpm --filter @teran/e2e exec playwright test`
6. Spot-check the headers (`curl -skI https://localhost:8443/en`), the blocked revalidation route,
   a forged `X-Forwarded-For` and `X-Internal-Key`, the access log (no query strings),
   `prisma migrate status`, and the backup, verification and restore commands from the deployment
   guide.
7. `docker compose -p teran-smoke … down -v` (only this throwaway project), removing the proxy and
   the clone leaves nothing behind.

Production rate limits stay on during the rehearsal, and every browser shares one address:
sign-in allows 10 a minute and registration 5 an hour, which the whole suite exceeds. Run the
failed tests again after `docker compose -p teran-smoke … restart api` (the counters live in
memory): `playwright test --last-failed`.

Last run, 2026-10-20 (Nginx 1.27.5 meeting §7 in front of the images built from this tree): all 51 browser
tests passed over HTTPS, in three batches separated by API restarts (44, then 5 of the 7 refused
with "Too many requests", then the last 2 with `TELEGRAM_MODE=dry-run`, which the first env file
lacked). Forged `X-Forwarded-For` headers shared one rate-limit bucket, `X-Internal-Key` sent
through Nginx was removed, `/api/revalidate` answered 404, the access log kept no query strings,
pictures over 12 MB and films over 70 MB were refused by Nginx, and the backup, verification and
restore commands of the deployment guide brought the data back after a simulated loss.

## Manual checks before a release

- Homepage composition against both references
  ([reference audit §8](../design/reference-audit.md#8-homepage-composition-check-to-repeat-before-sign-off)).
- Keyboard-only pass through browse, bag, checkout and the admin order page; a screen reader spot
  check (VoiceOver or NVDA) of the product page and checkout. The redesign's scripted checks
  (skip link, mega menu, search, showcase tabs, pack sizes, bag drawer, price popover, filter
  drawer) are listed in the [redesign checklist](../design/redesign-checklist.md).
- Real phones (iOS Safari and Android Chrome) for the sticky purchase bar and drawers.
- Lighthouse on the home, catalogue and product pages of a production build.

## Not covered yet

- Visual regression screenshots, load and soak tests, and cross-browser runs in Firefox and
  WebKit (Chromium only in CI).
- E-mail delivery through a real SMTP server (the integration suite uses the log transport).
