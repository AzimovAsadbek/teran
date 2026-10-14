# TERAN — online tea store

Storefront and administration platform for TERAN® — Premium Chinese Tea (TERAN TRADE MChJ,
Namangan, Uzbekistan). Shoppers
browse the catalogue in Uzbek, Russian or English, fill a bag, and order with cash on delivery as
a guest or with an account. Staff manage products, stock, orders, customers, enquiries, the
journal, delivery prices and settings in a protected admin area.

> **Demonstration mode.** The catalogue, prices, delivery fees and some texts are placeholders
> until TERAN supplies real data, and the site tells visitors so and asks search engines not to
> index it. See [demo mode](docs/development/demo-mode.md) and
> [business information required](docs/business-information-required.md).

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
- **Quality:** WCAG 2.2 AA checked automatically, mobile first with no sideways scrolling,
  Core Web Vitals-friendly rendering (static shells with streamed data, pre-sized images),
  search-engine metadata, and security controls documented in
  [security](docs/architecture/security.md).

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
pnpm install
cp apps/api/.env.example apps/api/.env          # then fill in the secrets
cp apps/web/.env.example apps/web/.env.local    # shares two of them with the API
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
