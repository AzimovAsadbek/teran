# Implementation checklist

Every requirement from the project brief, how it is accepted, and where the evidence is.
Status: **Done** (implemented and verified), **Partial** (implemented, something specific still
open), **Needs TERAN** (blocked on information only the owner has).

## Foundation and delivery

| Requirement                                                  | Acceptance criteria                                                                     | Status | Evidence                                                                                                              |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------- |
| pnpm monorepo (`apps/web`, `apps/api`, `packages/*`, `docs`) | One workspace, one lockfile, frozen installs                                            | Done   | `pnpm-workspace.yaml`, CI `--frozen-lockfile`                                                                         |
| Next.js App Router, TypeScript strict                        | `pnpm typecheck` passes with `strict`                                                   | Done   | `tsconfig.base.json`, CI quality job                                                                                  |
| NestJS modular monolith under `/api/v1`                      | Versioned routes, one module per domain                                                 | Done   | [Overview](architecture/overview.md#api-appsapi)                                                                      |
| PostgreSQL with Prisma                                       | Migrations deploy cleanly; invariants enforced in the database                          | Done   | [Data model](architecture/database.md)                                                                                |
| Docker for development                                       | `pnpm db:up` starts PostgreSQL bound to localhost                                       | Done   | `docker-compose.yml`                                                                                                  |
| Production artefacts                                         | Images build in CI; the Compose stack serves the site over HTTPS end to end             | Done   | `apps/*/Dockerfile`, `docker-compose.prod.yml`, [rehearsal](testing/test-strategy.md#rehearsing-the-production-stack) |
| GitHub Actions CI without auto-deploy                        | Lint, types, unit, integration, E2E, images, audit on every push; no deploy step        | Done   | `.github/workflows/ci.yml`; first run on GitHub succeeded                                                             |
| Unit, integration and E2E tests                              | All three layers run in CI and pass                                                     | Done   | 135 tests — [test strategy](testing/test-strategy.md)                                                                 |
| Commits under the owner's identity                           | Repository-local `AzimovAsadbek <asadbekazimov0629@gmail.com>`; global config untouched | Done   | `git log`                                                                                                             |
| Push only verified work                                      | Each push preceded by the checks that cover it                                          | Done   | One push (`034923c`) missed an E2E type error; fixed in the next commit (`06bbd07`) before anything else              |

## Design and brand

| Requirement                                         | Acceptance criteria                                                                                                | Status  | Evidence                                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------- | -------------------------------------------------------------------------------------------- |
| DAVIDsTEA reference audit                           | Patterns kept, adapted and rejected are documented                                                                 | Done    | [Reference audit](design/reference-audit.md)                                                 |
| Navbar inspired by DAVIDsTEA                        | Utility bar, left category menus, centred logo, right utilities, mega menus, mobile drawer                         | Done    | `components/layout/*`                                                                        |
| TERAN concept screenshot used for identity only     | Homepage composition check passes                                                                                  | Done    | [Audit §8](design/reference-audit.md#8-homepage-composition-check-to-repeat-before-sign-off) |
| Logo-derived colour tokens with verified contrast   | Every text pairing ≥ 4.5:1, focus indicators ≥ 3:1                                                                 | Done    | [Design system](design/design-system.md#contrast-wcag-22-aa)                                 |
| Serif and sans-serif through `next/font`            | Self-hosted, `display: swap`, shared by every root layout                                                          | Done    | `apps/web/src/styles/fonts.ts`                                                               |
| The actual logo asset                               | Derived from the supplied raster without tracing or re-typesetting                                                 | Done    | `apps/web/scripts/generate-brand-assets.mjs`                                                 |
| Original, licensed or clearly demonstration imagery | No third-party photos; demo images labelled                                                                        | Done    | [ADR-014](architecture/decisions.md)                                                         |
| Restrained glassmorphism with fallback              | Glass only on floating UI; solid fallback without `backdrop-filter` or with reduced transparency                   | Done    | `globals.css`                                                                                |
| Motion that respects reduced motion                 | Animations off and marquee static under `prefers-reduced-motion`                                                   | Done    | `globals.css`, `components/home/tea-ribbon.tsx`                                              |
| Mobile first                                        | No page scrolls sideways at 360 px or Pixel 7 width                                                                | Done    | `e2e/tests/mobile.spec.ts`, layout scan of every storefront and admin page                   |
| WCAG 2.2 AA                                         | No axe violations (WCAG 2.0–2.2 A/AA) on storefront, admin, dialogs and error states; Lighthouse accessibility 100 | Partial | `e2e/tests/accessibility.spec.ts`; a manual screen-reader pass is still recommended          |

## Pages

| Page                                                                    | Status      | Notes                                                                                                                 |
| ----------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------- |
| Home                                                                    | Done        | Hero, ribbon, tabbed showcase, tea types, featured collection, story, brewing guide, business call to action, journal |
| Catalogue, category, collection                                         | Done        | Filters, sort, pagination, crawlable links, `noindex` refinements                                                     |
| Product detail                                                          | Done        | Pack sizes, stock, sticky mobile purchase bar, brewing guidance, related products, Product JSON-LD                    |
| Search                                                                  | Done        | Instant suggestions dialog and results page                                                                           |
| Bag and checkout                                                        | Done        | Drawer and page; single-page checkout for Uzbekistan (+998 phone, region, address, landmark)                          |
| About, contact, wholesale, journal, FAQ                                 | Done        | About story awaits TERAN's content; contact channels appear once configured                                           |
| Delivery (shipping)                                                     | Done        | Lists the delivery methods configured in the admin (demonstration values until TERAN sets them)                       |
| Returns, privacy, terms                                                 | Needs TERAN | Drafts with highlighted placeholders and a draft banner                                                               |
| Sign in, register, forgotten and reset password, account, order history | Done        | Reset requires SMTP in production                                                                                     |
| 404 and error pages                                                     | Done        | Branded, `noindex`; global 404 and global error page included                                                         |

## Commerce

| Requirement                                       | Acceptance criteria                                                                         | Status | Evidence                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------- |
| Server-authoritative cart and checkout            | Client never supplies prices or totals; totals recomputed in the order transaction          | Done   | `checkout.int-spec.ts`                          |
| Exact UZS amounts                                 | Decimal strings and `NUMERIC(12,2)`, never floats; consistent display on server and browser | Done   | `apps/web/src/lib/format.ts`, database `CHECK`s |
| Variants and stock                                | Pack sizes with SKU and stock; stock never negative or oversold under concurrency           | Done   | `checkout.int-spec.ts` (concurrent checkouts)   |
| Order lifecycle with transactions and idempotency | Allowed transitions only; replays return the same order; cancellation restocks              | Done   | `checkout.int-spec.ts`, `admin.int-spec.ts`     |
| Cash on delivery first                            | Only enabled method; online methods addable without schema changes                          | Done   | [ADR-005](architecture/decisions.md)            |
| Never mark paid without trusted confirmation      | Only staff can record cash, audited; no client path sets paid                               | Done   | `admin.int-spec.ts`, admin E2E journey          |

## Administration (staff only)

| Area                                                              | Status | Notes                                                              |
| ----------------------------------------------------------------- | ------ | ------------------------------------------------------------------ |
| Protected access with manager and administrator roles             | Done   | Role matrix tested; admin-only areas hidden from managers          |
| Dashboard and reporting (30-day sales, low stock, CSV exports)    | Done   | Exports are administrator-only and formula-safe                    |
| Products, variants and prices, images, translations               | Done   | Images decoded and re-encoded; variants deactivated, never deleted |
| Categories and collections                                        | Done   |                                                                    |
| Inventory with ledger                                             | Done   |                                                                    |
| Orders: workflow, cancellation, cash recording                    | Done   |                                                                    |
| Customers                                                         | Done   |                                                                    |
| Enquiries (contact, wholesale) and newsletter                     | Done   | Newsletter export includes working unsubscribe links               |
| Content: journal, announcement, contact details, delivery methods | Done   |                                                                    |
| Staff accounts and audit log                                      | Done   | Self-demotion and last-administrator safeguards                    |

## Cross-cutting

| Requirement                                | Acceptance criteria                                                                                                                                                                                                                                                                        | Status  | Evidence                                                                                                                                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Security                                   | Controls documented and tested; production configuration fails closed                                                                                                                                                                                                                      | Done    | [Security](architecture/security.md) (gaps listed there)                                                                                                                                             |
| Core Web Vitals                            | Lighthouse 13 on the production images behind Caddy (Uzbek home, catalogue, product page). Desktop: performance 99–100, LCP 0.6 s, CLS ≤ 0.05, TBT 0 ms. Simulated mobile (slow 4G, 4× CPU): performance 88–93, LCP 2.7–3.4 s, CLS 0, TBT 190–230 ms. Accessibility 100, no console errors | Partial | Mobile LCP is above the 2.5 s target under simulated slow 4G because catalogue data streams at request time ([ADR-008](architecture/decisions.md)); observed LCP on a fast connection is under 0.5 s |
| SEO without fabricated claims              | Metadata, canonical and hreflang for the languages each page is written in, sitemap, robots, JSON-LD with customers' own ratings only, no invented facts; only the public https build is indexed (demo, staging and local are not)                                                         | Done    | [SEO architecture](architecture/seo.md), [checklist](seo-implementation-checklist.md)                                                                                                                |
| Languages: Uzbek default, Russian, English | Every message in three languages with matching arguments (lint); Uzbek without prefix                                                                                                                                                                                                      | Done    | `scripts/check-messages.mjs`                                                                                                                                                                         |
| Documentation                              | README, architecture, data model, security, decisions, design system, setup, deployment, testing, business information                                                                                                                                                                     | Done    | [README](../README.md#documentation)                                                                                                                                                                 |

## Owner actions before launch

See [business information required](business-information-required.md): legal texts and company
details, the real catalogue and photography, delivery prices, contact details, SMTP, hosting
location, then `DEMO_CONTENT=false`.
