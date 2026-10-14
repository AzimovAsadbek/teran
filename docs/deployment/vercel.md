# Vercel deployment (demonstration site)

TERAN can also run on Vercel: the storefront as a Next.js project, the API as one Node function,
PostgreSQL on Neon (Vercel Marketplace) and product images in Vercel Blob. This is how the public
demonstration site is hosted. The Docker deployment ([production.md](./production.md)) remains the
reference for a self-hosted shop.

## Projects

| Project     | Root directory | What runs                                                                    |
| ----------- | -------------- | ---------------------------------------------------------------------------- |
| `teran-api` | `apps/api`     | `api/index.js` → `dist/serverless.js`: the whole NestJS API in one function  |
| `teran-web` | `apps/web`     | The Next.js storefront and admin; `/api/v1/*` and `/uploads/*` are rewritten |

Both use region `fra1` (Frankfurt) next to the Neon database, and build from the repository root
because they share the `@teran/contracts` workspace package (see each `vercel.json`).

- **API build** (`pnpm run vercel-build`): `prisma generate`, `prisma migrate deploy` against the
  direct database address, `nest build`. Every request is rewritten to the function, which creates
  the Nest application once per instance (`src/serverless.ts`, about 1 s on a cold start) with the
  same `configureApp` as the container.
- **Web build**: the standard Next.js build; `output: 'standalone'` is only used outside Vercel.
- The browser only ever talks to the storefront's origin: API calls and images go through its
  rewrites, so cookies stay first-party and the CSP is unchanged.

## What differs from the container

| Concern        | Container                 | Vercel                                                                                                      |
| -------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Product images | `UPLOADS_DIR` on a volume | Vercel Blob (`BLOB_READ_WRITE_TOKEN`); the storefront rewrites `/uploads/*` to the store (`UPLOADS_ORIGIN`) |
| Scheduled jobs | Timers in the API process | Vercel Cron calls `GET /api/v1/internal/jobs/run` with `Authorization: Bearer $CRON_SECRET`                 |
| Database       | PostgreSQL container      | Neon; the function uses the direct address (`DATABASE_URL_UNPOOLED`), a pool of 3                           |
| Rate limits    | One process               | Counted per function instance (weaker)                                                                      |

On the Hobby plan Vercel Cron runs **once a day** (03:15 UTC): unpaid online orders are then
cancelled and their stock returned once a day rather than within minutes of the payment window
ending. A Pro plan allows a schedule of every few minutes (change `crons` in
`apps/api/vercel.json`). Vercel's Hobby plan is for non-commercial use; a live shop needs Pro or
the Docker deployment.

The API refuses to start on Vercel without a Blob token, because images written to the function's
disk would be lost.

## Environment variables

API (`teran-api`, Production):

| Variable                                                             | Value                                                                   |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, …                           | Added by the Neon integration                                           |
| `BLOB_READ_WRITE_TOKEN`                                              | Added by connecting the Blob store                                      |
| `NODE_ENV`                                                           | `production` (set by Vercel)                                            |
| `WEB_ORIGIN`                                                         | The storefront's address, e.g. `https://teran-web.vercel.app`           |
| `WEB_REVALIDATE_URL`                                                 | `<storefront>/api/revalidate`                                           |
| `APP_SECRET`, `INTERNAL_API_KEY`, `REVALIDATE_SECRET`, `CRON_SECRET` | Random, at least 32 characters each, generated for this deployment      |
| `COOKIE_SECURE`                                                      | `true`                                                                  |
| `DATABASE_POOL_MAX`                                                  | `3`                                                                     |
| `UPLOADS_DIR`                                                        | `/tmp/teran-uploads` (the only writable place; images go to Blob)       |
| `PAYMENT_PROVIDER_MODE`, `ALLOW_DEMO_PAYMENTS`                       | `demo`, `true` — simulated payments, an explicit decision for this site |
| `PAYMENT_METHODS_ENABLED`                                            | `CASH_ON_DELIVERY,CLICK,PAYME,CARD`                                     |

Storefront (`teran-web`, Production):

| Variable                                | Value                                                                   |
| --------------------------------------- | ----------------------------------------------------------------------- |
| `API_INTERNAL_URL`                      | The API's address, e.g. `https://teran-api.vercel.app`                  |
| `API_INTERNAL_KEY`, `REVALIDATE_SECRET` | The same values as the API's `INTERNAL_API_KEY` and `REVALIDATE_SECRET` |
| `UPLOADS_ORIGIN`                        | The Blob store's public address                                         |
| `NEXT_PUBLIC_SITE_URL`                  | The storefront's address                                                |
| `NEXT_PUBLIC_DEMO_CONTENT`              | `true` (demonstration notices, `noindex`)                               |
| `NEXT_PUBLIC_ENABLED_LOCALES`           | `uz,ru,en`                                                              |

Secrets live only in the Vercel projects; nothing is committed.

## Deploying

From the repository root (the CLI uploads the repository minus `.vercelignore`):

```bash
VERCEL_ORG_ID=<team id> VERCEL_PROJECT_ID=<teran-api id> npx vercel deploy --prod
VERCEL_ORG_ID=<team id> VERCEL_PROJECT_ID=<teran-web id> npx vercel deploy --prod
```

Changing an environment variable needs a new deployment of that project.

## Demonstration data and the first administrator

Migrations run with every API build. The demonstration catalogue and activity are loaded once,
from a developer machine, with the production database and Blob token (pulled with
`vercel env pull` into a file outside the repository and deleted afterwards):

```bash
cd apps/api
ALLOW_DEMO_SEED=true DATABASE_URL="<DATABASE_URL_UNPOOLED>" BLOB_READ_WRITE_TOKEN="<token>" \
  corepack pnpm db:seed:demo
```

The administrator is created by the owner, who chooses the password (it is never printed):

```bash
cd apps/api
ADMIN_EMAIL=<e-mail> ADMIN_PASSWORD='<password>' DATABASE_URL="<DATABASE_URL_UNPOOLED>" \
  corepack pnpm admin:create --first-name <name>
```
