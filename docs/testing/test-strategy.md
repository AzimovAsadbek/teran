# Test strategy

Each layer tests what it is best at: pure rules in unit tests, the real API against a real
database in integration tests, and real browsers against production builds end to end. Static
checks catch the rest before any test runs.

| Layer                | Tool                                                      | Runs against                                               | Tests | Command                                                 |
| -------------------- | --------------------------------------------------------- | ---------------------------------------------------------- | ----- | ------------------------------------------------------- |
| Static checks        | TypeScript (strict), ESLint, Prettier, translation parity | Source                                                     | —     | `pnpm typecheck`, `pnpm lint`, `pnpm format:check`      |
| Contracts unit       | Vitest                                                    | Shared schemas and rules                                   | 24    | `pnpm test`                                             |
| API unit             | Vitest                                                    | Pure API logic, no database                                | 26    | `pnpm test`                                             |
| Web unit             | Vitest, Testing Library, jsdom                            | Formatting, URL state, content, components                 | 27    | `pnpm test`                                             |
| API integration      | Vitest, Supertest                                         | The real Nest application and PostgreSQL (`teran_test`)    | 44    | `pnpm test:integration`                                 |
| End to end           | Playwright (Chromium), axe-core                           | Production builds of API and web, PostgreSQL (`teran_e2e`) | 14    | `pnpm --filter @teran/e2e build:stack && pnpm test:e2e` |
| Production rehearsal | Docker Compose, curl, Playwright                          | The production images behind Caddy over HTTPS              | —     | See [below](#rehearsing-the-production-stack)           |

All of them except the production rehearsal run in CI on every push and pull request
([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)), together with production image
builds, Compose and Caddyfile validation, and a dependency audit.

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

| File                                                           | Covers                                                                                                                                                                                                                           |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/contracts/src/contracts.test.ts`                     | Phone normalisation and formatting, search normalisation, region names, order status transitions, checkout schema (terms, normalisation, client totals stripped), contact form rules, product list queries, product upsert rules |
| `apps/api/src/cart/cart-line.spec.ts`                          | Cart line evaluation (keep, reduce to stock, cap, block) and product visibility                                                                                                                                                  |
| `apps/api/src/catalog/catalog.mapper.spec.ts`                  | Stock levels, product summary pricing and badges                                                                                                                                                                                 |
| `apps/api/src/common/crypto.spec.ts`                           | Token generation, order number format, constant-time comparison                                                                                                                                                                  |
| `apps/api/src/common/prisma-errors.spec.ts`                    | Unique-constraint detection across Prisma error shapes                                                                                                                                                                           |
| `apps/api/src/common/security/internal-request.spec.ts`        | Internal key check, URL redaction                                                                                                                                                                                                |
| `apps/api/src/common/security/origin-check.middleware.spec.ts` | CSRF origin rules                                                                                                                                                                                                                |
| `apps/api/src/config/env.spec.ts`                              | Environment defaults, readable errors, production rules                                                                                                                                                                          |
| `apps/web/src/components/content/article-body.test.tsx`        | Plain-text article rendering never interprets markup                                                                                                                                                                             |
| `apps/web/src/content/content.test.ts`                         | Legal and help pages have the same structure in every language; description lengths                                                                                                                                              |
| `apps/web/src/features/catalog/query.test.ts`                  | Catalogue URL filters, canonical API query, non-indexable refinements                                                                                                                                                            |
| `apps/web/src/lib/format.test.ts`                              | Exact money arithmetic; numbers and dates identical on server and browser (CLDR patterns, Uzbek without `Intl` data)                                                                                                             |
| `apps/web/src/lib/safe-next.test.ts`                           | Sign-in redirect only to same-site paths                                                                                                                                                                                         |

## API integration tests

The application is booted with the same `configureApp` as production (headers, CORS, origin
check, validation, error filter) and exercised over HTTP.

| File                        | Covers                                                                                                                                                                                                                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `catalog.int-spec.ts`       | Visibility rules, stock filter and price sort, apostrophe-insensitive search, detail contract, validation errors, cache headers                                                                                                                                                                                 |
| `checkout.int-spec.ts`      | Cart contract and limits, drafts and inactive variants refused, cart isolation, server-side totals, free-delivery threshold, idempotent replay, duplicate-submission race, no overselling under concurrent checkouts, `PRICE_CHANGED` keeps stock, delivery, address and payment rules, token-only guest lookup |
| `auth-security.int-spec.ts` | Registration and cookies, weak and duplicate passwords, identical errors for unknown e-mail and wrong password, lockout, reset availability, asynchronous reset issuance, single-use reset with sign-out everywhere, CSRF, account routes, security headers and error shape, body limits, honeypot              |
| `admin.int-spec.ts`         | Role matrix (401/403/200), origin check, product lifecycle, uploads decoded and re-encoded (PNG, AVIF; disguised files refused), stock never below zero, order transitions with restock, cash payment recording, staff safeguards, settings, newsletter export with working unsubscribe links                   |
| `rate-limit.int-spec.ts`    | 121st request in a minute is limited; the internal key is exempt, a wrong key is not                                                                                                                                                                                                                            |
| `maintenance.int-spec.ts`   | Clean-up removes expired sessions and carts and spent reset tokens, keeps live ones, and is idempotent                                                                                                                                                                                                          |

## End-to-end tests

Playwright starts a disposable stack (API on port 4100, web on 3100) from production builds:
`pnpm --filter @teran/e2e build:stack` compiles contracts, API and a standalone web build; the
API's start command prepares the database (migrate, reset, seed, create the test administrator).
Desktop Chrome runs everything except `@mobile` tests; a Pixel 7 profile runs the `@mobile` ones.

| File                    | Journeys                                                                                                                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `checkout.spec.ts`      | Guest browses, adds two packs, sees validation, places a cash-on-delivery order, opens the status link (a forged token reveals nothing), bag is emptied; empty checkout; branded `noindex` 404 |
| `account.spec.ts`       | Register, edit profile, sign out and in; off-site `next` ignored; contact and wholesale forms                                                                                                  |
| `admin.spec.ts`         | Admin closed to visitors and customers; staff create a product, see it in the store, restock it, fulfil a guest order and record the cash                                                      |
| `mobile.spec.ts`        | Phone: menu drawer, catalogue, sticky purchase bar, bag, checkout — failing on any sideways scrolling                                                                                          |
| `accessibility.spec.ts` | axe-core with WCAG 2.0/2.1/2.2 A and AA rules on storefront pages in three languages, the open bag, checkout and form errors, admin pages, and the phone menu and filters                      |

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

Before a release, or after changing anything in `docker/`, the Dockerfiles or the Compose file:

1. Create a throwaway env file outside the repository with random secrets,
   `SITE_ADDRESS=localhost`, `PUBLIC_ORIGIN=https://localhost:8443`, `HTTP_PORT=8080` and
   `HTTPS_PORT=8443`.
2. `docker compose -p teran-smoke -f docker-compose.prod.yml --env-file <file> up -d --build`
3. Load the demo catalogue (`run --rm -e ALLOW_DEMO_SEED=true migrate prisma db seed`) and create
   the end-to-end administrator with `exec … api node dist/cli/create-admin.js`.
4. Run the browser suite through Caddy:
   `E2E_BASE_URL=https://localhost:8443 E2E_IGNORE_HTTPS_ERRORS=true pnpm --filter @teran/e2e exec playwright test`
5. Spot-check headers (`curl -skI https://localhost:8443/en`), the blocked revalidation route,
   access-log token redaction and the backup and restore commands from the deployment guide.
6. `docker compose -p teran-smoke … down -v` removes everything.

Production rate limits stay on during the rehearsal. Registration allows 5 per hour per IP and a
full run registers three accounts, so a second run within the hour needs
`docker compose -p teran-smoke … restart api` first (the counters live in memory).

This rehearsal has been run for the current release: all browser journeys passed over HTTPS with
secure cookies, forged `X-Forwarded-For` headers could not bypass rate limits, and the documented
backup and restore commands worked.

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
