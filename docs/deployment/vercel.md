# Vercel deployment (demonstration site)

TERAN can also run on Vercel: the storefront as a Next.js project, the API as one Node function,
PostgreSQL on Neon (Vercel Marketplace) and product images in Vercel Blob. This is how the public
demonstration site is hosted. The Docker deployment ([production.md](./production.md)) remains the
reference for a self-hosted shop.

Live demonstration (2026-10-15): storefront **https://teran-demo.vercel.app**, API
https://teran-api.vercel.app, database `teran-db-eu` (Neon, Frankfurt), images `teran-media`
(Vercel Blob, Frankfurt), in the owner's Vercel team.

## Projects

| Project     | Root directory | What runs                                                                                  |
| ----------- | -------------- | ------------------------------------------------------------------------------------------ |
| `teran-api` | `apps/api`     | `api/index.js` → `dist/vercel/handler.mjs`: the whole NestJS API, bundled, in one function |
| `teran-web` | `apps/web`     | The Next.js storefront and admin; `/api/v1/*` and `/uploads/*` are rewritten               |

Both use region `fra1` (Frankfurt) next to the Neon database, and build from the repository root
because they share the `@teran/contracts` workspace package (see each `vercel.json`).
Create the database in the same region (`vercel integration add neon -m region=fra1`): Neon's
default is the US east coast, which adds a transatlantic round trip to every query.

- **API build** (`pnpm run vercel-build`): `prisma generate`, `prisma migrate deploy` against the
  direct database address, `nest build`, then `scripts/bundle-serverless.ts` bundles
  `dist/serverless.js` into one ES module (`dist/vercel/handler.mjs`). The bundle is needed because
  Vercel's function runtime cannot `require()` an ES module from CommonJS, and two dependencies
  (`@nestjs/throttler`, `nestjs-pino`) are CommonJS packages that require the ESM-only NestJS 12;
  native modules (sharp, argon2) stay external. Every request is rewritten to the function, which
  creates the Nest application once per instance (`src/serverless.ts`, about 0.5 s on a cold start)
  with the same `configureApp` as the container.
- **Web build**: the standard Next.js build; `output: 'standalone'` is only used outside Vercel.
- The browser only ever talks to the storefront's origin: API calls and images go through its
  rewrites, so cookies stay first-party and the CSP is unchanged.

## What differs from the container

| Concern        | Container                  | Vercel                                                                                                                                                                                                                            |
| -------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product images | `UPLOADS_DIR` on a volume  | Vercel Blob (`BLOB_READ_WRITE_TOKEN`); the storefront rewrites `/uploads/*` to the store (`UPLOADS_ORIGIN`)                                                                                                                       |
| Gallery films  | `UPLOADS_DIR`, up to 64 MB | Blob as well. A function accepts request bodies of at most 4.5 MB, so films (up to 512 MB) are uploaded from the browser straight to Blob with a short-lived token from the API, which then checks the file; photos stay ≤ 4.5 MB |
| Scheduled jobs | Timers in the API process  | Vercel Cron calls `GET /api/v1/internal/jobs/run` with `Authorization: Bearer $CRON_SECRET`                                                                                                                                       |
| Database       | PostgreSQL container       | Neon; the function uses the direct address (`DATABASE_URL_UNPOOLED`), a pool of 3                                                                                                                                                 |
| Rate limits    | One process                | Counted per function instance (weaker)                                                                                                                                                                                            |

On the Hobby plan Vercel Cron runs **once a day** (03:15 UTC): unpaid online orders are then
cancelled and their stock returned once a day rather than within minutes of the payment window
ending. A Pro plan allows a schedule of every few minutes (change `crons` in
`apps/api/vercel.json`). Vercel's Hobby plan is for non-commercial use; a live shop needs Pro or
the Docker deployment.

The API refuses to start on Vercel without a Blob token, because images written to the function's
disk would be lost.

Vercel's CDN keeps what Blob answers through the `/uploads` rewrite (Blob sends a one-year
`Cache-Control`) under the file's address alone, whatever byte range was asked for. A film played
straight from a `<video>` element is asked for in ranges (Safari first asks for two bytes), so one
cached part was answered to every later request and the film failed with a format error (found
2026-10-18 on the product films). The storefront therefore marks range requests to `/uploads` with
`x-vercel-enable-rewrite-caching: 0` (`next.config.ts`): Blob answers each range itself, while
whole files (pictures, and the page films, which are fetched whole) are still kept on the CDN.
After a change like this, purge the CDN cache once: `vercel cache purge --type cdn`.

Films: the admin area asks the API for an upload permission (`POST
/api/v1/admin/media/:id/video/direct`: one file, its type, at most 512 MB, 30 minutes), sends the
file to Blob itself (`@vercel/blob/client`, in parts above 32 MB), then asks the API to record it
(`…/video/direct/complete`), which reads the file's first bytes and movie header from Blob to check
the type and the running time and deletes anything that is not an MP4 or WebM. Only admin pages may
connect to `vercel.com` / `*.blob.vercel-storage.com` (Content Security Policy). **Not yet run
against the real Blob store**: after the next deployment, upload a short test film as a draft and
check that it plays and shows its length.

Telegram posts and the product advisor need nothing from Vercel beyond their environment variables;
a post that waits for a retry is processed by the daily cron on the Hobby plan.

## Environment variables

API (`teran-api`, Production):

| Variable                                                             | Value                                                                                                                                                                |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, …                           | Added by the Neon integration                                                                                                                                        |
| `BLOB_READ_WRITE_TOKEN`                                              | Added by connecting the Blob store                                                                                                                                   |
| `NODE_ENV`                                                           | `production` (set by Vercel)                                                                                                                                         |
| `WEB_ORIGIN`                                                         | The storefront's address, e.g. `https://teran-web.vercel.app`                                                                                                        |
| `WEB_REVALIDATE_URL`                                                 | `<storefront>/api/revalidate`                                                                                                                                        |
| `APP_SECRET`, `INTERNAL_API_KEY`, `REVALIDATE_SECRET`, `CRON_SECRET` | Random, at least 32 characters each, generated for this deployment                                                                                                   |
| `COOKIE_SECURE`                                                      | `true`                                                                                                                                                               |
| `DATABASE_POOL_MAX`                                                  | `3`                                                                                                                                                                  |
| `UPLOADS_DIR`                                                        | `/tmp/teran-uploads` (the only writable place; images go to Blob)                                                                                                    |
| `CHECKOUT_ENABLED`                                                   | Not set: online ordering is closed (carts, orders, payments refused) while the storefront takes orders by phone; `true` together with `NEXT_PUBLIC_SHOW_PRICES=true` |
| `PAYMENT_PROVIDER_MODE`, `ALLOW_DEMO_PAYMENTS`                       | `demo`, `true` — simulated payments, an explicit decision for this site                                                                                              |
| `PAYMENT_METHODS_ENABLED`                                            | `CASH_ON_DELIVERY,CLICK,PAYME,CARD`                                                                                                                                  |
| `TELEGRAM_MODE`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID`         | **Not configured.** `disabled` by default; see ../architecture/telegram.md                                                                                           |
| `ANTHROPIC_API_KEY`                                                  | **Not configured.** The advisor runs rule-based; see ../architecture/product-advisor.md                                                                              |

Storefront (`teran-web`, Production):

| Variable                                | Value                                                                                                             |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `API_INTERNAL_URL`                      | The API's address, e.g. `https://teran-api.vercel.app`                                                            |
| `API_INTERNAL_KEY`, `REVALIDATE_SECRET` | The same values as the API's `INTERNAL_API_KEY` and `REVALIDATE_SECRET`                                           |
| `UPLOADS_ORIGIN`                        | The Blob store's public address                                                                                   |
| `NEXT_PUBLIC_SITE_URL`                  | The storefront's address                                                                                          |
| `NEXT_PUBLIC_DEMO_CONTENT`              | `false` since 2026-10-18 (TERAN's own teas and texts: indexable). `true` adds demonstration notices and `noindex` |
| `NEXT_PUBLIC_SHOW_PRICES`               | Not set: prices hidden, orders by phone and messengers (ADR-027)                                                  |
| `NEXT_PUBLIC_SHOW_ADVISOR`              | Not set: no links to the product advisor (ADR-029)                                                                |
| `NEXT_PUBLIC_SHOW_GALLERY`              | Not set: no links to the photo and video gallery (ADR-033)                                                        |
| `NEXT_PUBLIC_ENABLED_LOCALES`           | `uz,ru,en`                                                                                                        |

Secrets live only in the Vercel projects; nothing is committed.

## Deploying

Both projects are connected to the GitHub repository: **every push to `main` deploys both to
production** (each build installs the workspace, migrates the database for the API and replaces
the live deployment once it is ready). Other branches get preview deployments, but only the
production environment has settings, so previews of the API do not build: work on `main`, or add
preview settings first.

A deployment can also be made from a developer machine, from the repository root (the CLI uploads
the repository minus `.vercelignore`):

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

The administrator is created by the owner, who chooses the password (it is never printed). The
password is read without echo, so it never reaches the screen or the shell history:

```bash
cd apps/api
read -rs ADMIN_PASSWORD && export ADMIN_PASSWORD
ADMIN_EMAIL=<e-mail> DATABASE_URL="<DATABASE_URL_UNPOOLED>" \
  corepack pnpm admin:create --first-name <name>
unset ADMIN_PASSWORD
```
