# Local development

This guide takes a fresh clone to a running storefront, API and administration area with the
demonstration catalogue.

## Prerequisites

| Tool    | Version                                                        |
| ------- | -------------------------------------------------------------- |
| Node.js | 24.15 or newer (`.nvmrc` pins the major version, 24)           |
| pnpm    | 12.11.2, provided by Corepack from `packageManager`            |
| Docker  | Docker Desktop or Docker Engine with Compose v2 (for Postgres) |

Corepack ships with Node.js 24. Enable it once so `pnpm` resolves to the pinned version:

```bash
corepack enable
```

If you prefer not to enable it globally, prefix every command with `corepack`, for example
`corepack pnpm install`.

## First run

1. Install dependencies. Install scripts are blocked except for the packages reviewed in
   `pnpm-workspace.yaml` (`allowBuilds`).

   ```bash
   pnpm install
   ```

2. Create the local environment files from the committed examples. They hold placeholders only.

   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env.local
   ```

   Generate three random values and fill them in. The API and the web app must share two of them:

   | apps/api/.env       | apps/web/.env.local | Purpose                                                          |
   | ------------------- | ------------------- | ---------------------------------------------------------------- |
   | `APP_SECRET`        | —                   | Signs guest order links and newsletter unsubscribe links         |
   | `INTERNAL_API_KEY`  | `API_INTERNAL_KEY`  | Exempts the storefront's cached server requests from rate limits |
   | `REVALIDATE_SECRET` | `REVALIDATE_SECRET` | Authorises cache revalidation calls from the API                 |

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```

   Both `.env` files are git-ignored. Never commit them.

3. Start PostgreSQL (bound to `127.0.0.1:5434` only). On first start the container also creates
   the `teran_test` and `teran_e2e` databases used by the automated tests.

   ```bash
   pnpm db:up
   ```

4. Apply the migrations and generate the Prisma client.

   ```bash
   pnpm db:migrate
   ```

5. Load the demonstration data (placeholder products and prices, code-drawn images). `db:seed`
   loads the catalogue and content; `db:seed:demo` also adds demo customers, orders and enquiries
   for the admin area. Both are idempotent and never overwrite records changed in the admin area;
   see [demo mode](./demo-mode.md), including the guarded reset.

   ```bash
   pnpm db:seed:demo
   ```

6. Create an administrator. The password is read from the environment and never printed. Use a
   leading space or `read -s` so it does not end up in your shell history.

   ```bash
   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='at-least-10-characters' pnpm --filter @teran/api admin:create --first-name You
   ```

   `--reset-password` changes the password of an existing administrator and `--promote` turns an
   existing customer or manager into an administrator.

7. Start everything (contracts watcher, API and web app):

   ```bash
   pnpm dev
   ```

| URL                            | What                                               |
| ------------------------------ | -------------------------------------------------- |
| http://localhost:3000          | Storefront (Uzbek; `/ru` and `/en` for the others) |
| http://localhost:3000/admin    | Administration (sign in with the account above)    |
| http://localhost:4000/api/v1   | API (also proxied by the web app at `/api/v1`)     |
| http://localhost:4000/api/docs | OpenAPI documentation (`SWAGGER_ENABLED=true`)     |

The browser talks only to the web origin: Next.js rewrites `/api/v1/*` and `/uploads/*` to the
API, so cookies stay first-party and no CORS is involved.

## Everyday commands

| Command                                                     | What it does                                                  |
| ----------------------------------------------------------- | ------------------------------------------------------------- |
| `pnpm dev`                                                  | Contracts in watch mode, API with reload, Next.js dev server  |
| `pnpm generate`                                             | Builds the contracts and generates the Prisma client          |
| `pnpm lint`                                                 | ESLint in every package plus translation-key parity (web)     |
| `pnpm typecheck`                                            | TypeScript in every package (runs `next typegen` for the web) |
| `pnpm test`                                                 | Unit tests (contracts, API, web)                              |
| `pnpm test:integration`                                     | API integration tests against `teran_test`                    |
| `pnpm --filter @teran/e2e build:stack` then `pnpm test:e2e` | Playwright end-to-end tests                                   |
| `pnpm format` / `pnpm format:check`                         | Prettier                                                      |
| `pnpm db:migrate`                                           | Creates and applies a migration after editing `schema.prisma` |
| `pnpm db:down`                                              | Stops PostgreSQL (data stays in the `postgres-data` volume)   |
| `pnpm audit:prod`                                           | Known vulnerabilities (high and critical) in production deps  |

See [the test strategy](../testing/test-strategy.md) for what each test layer covers.

## How the pieces fit while developing

- **Contracts first.** `packages/contracts` holds the Zod schemas and types shared by the API and
  the web app. Both import its compiled `dist/`, so `pnpm dev` builds it once and keeps it in
  watch mode. After pulling changes that touch contracts outside `pnpm dev`, run
  `pnpm generate`.
- **API reloads into `.nest-dev/`.** The dev watcher compiles to `apps/api/.nest-dev` instead of
  `dist/`, so a production build (`nest build`, used by the end-to-end stack and the Docker image)
  can run while the dev server is up without deleting its files.
- **API configuration is validated at start-up.** A missing or malformed variable stops the API
  with a list of problems (`apps/api/src/config/env.ts`). Restart the API after editing
  `apps/api/.env`; the watcher does not watch it.
- **Storefront caching is real in development.** Catalogue, content and settings loaders use
  `'use cache'` with tags. The API calls `POST /api/revalidate` after admin changes when
  `WEB_REVALIDATE_URL` and `REVALIDATE_SECRET` are set; otherwise catalogue and content refresh
  in the background within an hour and checkout options within a minute or two.
- **Language detection.** The storefront ignores `Accept-Language`. Visitors without a saved
  choice get Uzbek; the switcher stores the choice in the `TERAN_LOCALE` cookie.
- **Translations.** Every message key exists in `uz`, `ru` and `en` with the same ICU arguments
  and tags; `pnpm lint` fails otherwise (`apps/web/scripts/check-messages.mjs`).
- **Rate limits apply in development.** The API limits each client IP (registration, for example,
  is limited per hour). Automated suites disable throttling on their own disposable stacks
  (`THROTTLE_DISABLED=true` is accepted only with `NODE_ENV=test`).

## Database workflow

- Edit `apps/api/prisma/schema.prisma`, then `pnpm db:migrate` and give the migration a
  descriptive name. Invariants Prisma cannot express (non-negative stock, price ordering, …) are
  added as SQL in the migration; see [the data model](../architecture/database.md).
- Never edit a migration that has been applied anywhere else; add a new one.
- Tests use separate databases whose names must end in `_test` or `_e2e`; the test tooling
  refuses to reset anything else.

## Troubleshooting

| Symptom                                                 | Fix                                                                                                                                                                        |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Invalid environment configuration` when the API starts | Fix the listed variables in `apps/api/.env`.                                                                                                                               |
| Storefront shows the error page for every page          | The API is not reachable at `API_INTERNAL_URL`, or `API_INTERNAL_KEY` differs from the API's `INTERNAL_API_KEY`.                                                           |
| `429 RATE_LIMITED` while clicking around                | Expected after many requests from one IP; wait a minute.                                                                                                                   |
| Prisma client types missing in the editor               | `pnpm generate`.                                                                                                                                                           |
| `teran_test` or `teran_e2e` does not exist              | The init script runs only on a fresh volume. Create them: `docker compose exec postgres createdb -U teran teran_test` (the end-to-end tooling creates `teran_e2e` itself). |
