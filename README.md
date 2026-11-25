# TERAN · tea retail platform

TERAN is a tea retailer in Namangan, Uzbekistan. Customers browse the catalogue in Uzbek, Russian
or English. Store staff use a shared admin panel to translate product pages, track stock, handle
enquiries and publish announcements to Telegram. [Visit the storefront](https://terantrade.uz/)

## Inside the application

- **Product recommendations.** A request such as “green tea under 100,000 soʻm” becomes a set of
  catalogue filters. The advisor accepts product IDs returned by the search and falls back to
  rule-based matching when the model is unavailable.
  [Advisor implementation](apps/api/src/assistant/assistant.service.ts) · [Integration tests](apps/api/test/assistant.int-spec.ts)
- **Storefront chat.** The Gemini version of the chat passes catalogue data in the shopper's
  language and verifies product suggestions before displaying them.
  [Gemini implementation and tests, November 2026 snapshot](https://github.com/AzimovAsadbek/teran/tree/a1dd23cafaa94e11a5034599bb199b336bdf96a1/apps/api/src/assistant)
- **Telegram publishing.** A staff member can announce a product or article when publishing it.
  The API records the announcement, tracks its delivery and handles retries. Dry-run mode lets a
  developer inspect the message locally.
  [Delivery flow](docs/architecture/telegram.md) · [Bot API integration tests](apps/api/test/telegram.int-spec.ts)

The default storefront takes enquiries through the contact page. Online ordering is configurable
through `NEXT_PUBLIC_SHOW_PRICES` in the web build and `CHECKOUT_ENABLED` in the API. The local
seed supplies a sample catalogue. [Demo data and settings](docs/development/demo-mode.md)

## Features

- **Shopping:** catalogue with categories, collections, filters, sorting and search; product pages
  with pack sizes, brewing guidance and structured data; a bag drawer; a server-priced checkout
  with delivery by region; order status pages for guests and customers.
- **Accounts:** registration, sign-in, profile, password change and reset, order history.
- **Administration:** dashboard and sales chart, products with images and translations,
  categories, collections, stock ledger, order workflow and cash recording, customers, staff
  roles, enquiries, newsletter export, journal, delivery methods, settings, audit log, CSV reports.
- **Languages:** Uzbek (default, no URL prefix), Russian (`/ru`), English (`/en`), with every
  message in all three.
- **Accessibility and rendering.** Playwright journeys include automated accessibility checks.
  The storefront uses streamed data and pre-sized images. [Test strategy](docs/testing/test-strategy.md)

## Technology

| Area       | Choice                                                                                        |
| ---------- | --------------------------------------------------------------------------------------------- |
| Web        | Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS 4, next-intl                |
| API        | NestJS 12 (modular monolith, `/api/v1`), Zod validation, pino logging                         |
| Data       | PostgreSQL 18, Prisma 7 with the `pg` driver adapter                                          |
| Shared     | `packages/contracts`: Zod schemas and types used by both applications                         |
| Tooling    | TypeScript (strict), pnpm workspaces, ESLint, Prettier, Vitest, Playwright, axe-core          |
| Operations | Docker images, Docker Compose with Caddy (HTTPS), GitHub Actions CI (no automatic deployment) |

## Quick start

Requirements: Node.js 24.15+, Docker, and pnpm through Corepack (`corepack enable`).

```bash
pnpm install --frozen-lockfile
cp apps/api/.env.example apps/api/.env          # then fill in the secrets
cp apps/web/.env.example apps/web/.env.local    # shares two of them with the API
pnpm generate
pnpm db:up && pnpm db:migrate && pnpm db:seed
pnpm dev
```

The storefront runs at http://localhost:3000 and the API at http://localhost:4000/api/v1. The full
walkthrough, including creating an administrator, is in
[local development](docs/development/setup.md).

## Commands

| Command                                                  | Purpose                                             |
| -------------------------------------------------------- | --------------------------------------------------- |
| `pnpm dev`                                               | Run contracts (watch), API and web in development   |
| `pnpm generate`                                          | Build contracts and generate the Prisma client      |
| `pnpm lint` / `pnpm typecheck` / `pnpm format:check`     | Static checks (lint includes translation parity)    |
| `pnpm test`                                              | Unit tests                                          |
| `pnpm test:integration`                                  | API integration tests (PostgreSQL `teran_test`)     |
| `pnpm --filter @teran/e2e build:stack` + `pnpm test:e2e` | End-to-end and accessibility tests                  |
| `pnpm db:migrate` / `pnpm db:seed`                       | Database migrations and the demonstration catalogue |
| `pnpm db:seed:demo`                                      | Catalogue plus demo customers, orders and enquiries |
| `pnpm db:demo:reset -- --confirm=<database>`             | Remove and reload the demo data (guarded, local)    |
| `pnpm --filter @teran/api admin:create`                  | Create or reset an administrator                    |
| `pnpm audit:prod`                                        | Known vulnerabilities in production dependencies    |

## Repository

```
apps/api            NestJS API, Prisma schema and migrations, seed, admin CLI
apps/web            Next.js storefront and admin UI, translations, content
packages/contracts  Shared schemas and types
e2e                 Playwright suite and its disposable stack
docker              Caddyfile, production env example, Postgres init
docs                Documentation (below)
```

## Documentation

| Document                                                               | Contents                                                   |
| ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| [Architecture overview](docs/architecture/overview.md)                 | Components, routes, endpoints, main flows                  |
| [Data model](docs/architecture/database.md)                            | Entities, invariants, order lifecycle, inventory, payments |
| [Security](docs/architecture/security.md)                              | Controls, headers, secrets, known gaps                     |
| [Decisions](docs/architecture/decisions.md)                            | Architecture decision records                              |
| [Design system](docs/design/design-system.md)                          | Colours, contrast, typography, components, accessibility   |
| [Typography](docs/design/typography.md)                                | Typefaces, type scale, Uzbek and Russian rules             |
| [Component audit](docs/design/component-audit.md)                      | Every control: variants, states, keyboard behaviour        |
| [Design audit](docs/design/current-design-audit.md)                    | Findings before the redesign, by severity                  |
| [Competitive benchmark](docs/design/competitive-benchmark.md)          | DAVIDsTEA compared with TERAN, dimension by dimension      |
| [Redesign checklist](docs/design/redesign-checklist.md)                | Route by route: before, problems, changes, verification    |
| [Reference audit](docs/design/reference-audit.md)                      | What was taken from the references, and what was not       |
| [Local development](docs/development/setup.md)                         | Setup, commands, troubleshooting                           |
| [Test strategy](docs/testing/test-strategy.md)                         | Test layers, coverage, production rehearsal                |
| [Production deployment](docs/deployment/production.md)                 | Docker Compose with Caddy, configuration, backups, go-live |
| [Business information required](docs/business-information-required.md) | Facts TERAN must supply before launch                      |
| [Implementation checklist](docs/implementation-checklist.md)           | Requirements with acceptance criteria and status           |

## Licence

Proprietary. No licence is granted to use, copy or distribute this code.
