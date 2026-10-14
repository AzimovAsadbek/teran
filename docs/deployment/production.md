# Production deployment

TERAN runs as five containers on one Linux host, described by
[`docker-compose.prod.yml`](../../docker-compose.prod.yml). Nothing deploys automatically: CI builds
and tests every change, and an operator decides when to deploy.

```
Internet ──► Caddy :80/:443 (HTTPS, automatic certificates)
               ├── /api/v1/*, /uploads/*  ──► api :4000  (NestJS)  ──► postgres :5432
               ├── /api/revalidate*       ──► 404 (internal only)          ▲
               └── everything else        ──► web :3000  (Next.js) ────────┘ via api
migrate (one-off) ──► postgres            runs `prisma migrate deploy` before every API start
```

| Service    | Image                         | Networks  | Persistent data                             |
| ---------- | ----------------------------- | --------- | ------------------------------------------- |
| `postgres` | `postgres:18.6-alpine3.24`    | data      | `postgres-data` volume                      |
| `migrate`  | `apps/api/Dockerfile` `tools` | data      | — (mounts `uploads` for the demo seed)      |
| `api`      | `apps/api/Dockerfile` runtime | data, app | `uploads` volume (product images)           |
| `web`      | `apps/web/Dockerfile`         | app       | — (Next.js caches inside the container)     |
| `caddy`    | `caddy:2.11.7-alpine`         | app       | `caddy-data` (certificates), `caddy-config` |

- Only Caddy publishes ports. The `data` network is internal: PostgreSQL has no route to or from
  the internet.
- The API and web containers run as the unprivileged `node` user with all Linux capabilities
  dropped and `no-new-privileges`. The API's root filesystem is read-only; it writes only to the
  uploads volume and `/tmp`.
- Container logs rotate at 10 MB × 5 files per service.

## Before the first deployment

1. **Hosting location and personal data.** The store processes customers' names, phone numbers
   and addresses. Uzbek personal-data legislation includes data-localisation requirements for the
   personal data of citizens of Uzbekistan. Confirm with a lawyer where the server and its backups
   may be located and whether the database must be registered before launch.
2. **Server.** A Linux host (x86-64 or arm64) with Docker Engine and the Compose plugin
   (v2.24 or newer). 2 vCPU and 4 GB RAM are enough to build and run the stack; building the web
   image is the most memory-hungry step.
3. **DNS and firewall.** Point the domain's A/AAAA records at the server. Allow inbound TCP 80 and
   443 (and UDP 443 for HTTP/3) plus SSH; block everything else. Caddy needs outbound internet
   access to obtain certificates; the API needs it only for SMTP.
4. **Business content.** Replace demonstration data before indexing is enabled. See
   [business information required](../business-information-required.md).

## Configuration

```bash
cp docker/production.env.example .env.production
chmod 600 .env.production
```

Fill in every value. `.env.production` is git-ignored; keep a copy in a password manager or secret
store, never in the repository, a ticket or a chat.

| Variable                                                                                                                         | Required | Notes                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `SITE_ADDRESS`                                                                                                                   | yes      | Host name(s) Caddy serves, e.g. `teran.example` (comma-separate several)                                |
| `PUBLIC_ORIGIN`                                                                                                                  | yes      | Canonical origin, `https://teran.example`. Compiled into the web image                                  |
| `POSTGRES_PASSWORD`                                                                                                              | yes      | URL-safe characters only (it is embedded in the connection URL)                                         |
| `APP_SECRET`                                                                                                                     | yes      | ≥ 32 characters. HMAC key for guest order links and newsletter unsubscribe links                        |
| `INTERNAL_API_KEY`                                                                                                               | yes      | ≥ 32 characters. Shared by API and web; exempts the storefront's cached requests from rate limits       |
| `REVALIDATE_SECRET`                                                                                                              | yes      | ≥ 32 characters. Shared by API and web; authorises cache revalidation                                   |
| `ENABLED_LOCALES`                                                                                                                | no       | Default `uz,ru,en`. Compiled into the web image                                                         |
| `DEMO_CONTENT`                                                                                                                   | no       | Default `true`: demo notices, `noindex`, `robots.txt` disallows everything. Compiled into the web image |
| `MAIL_TRANSPORT`, `SMTP_*`, `MAIL_FROM`                                                                                          | no       | `disabled` (default) or `smtp`. Without SMTP, customers cannot reset forgotten passwords                |
| `TRUST_PROXY_HOPS`                                                                                                               | no       | Default `1` (Caddy). See [Behind a CDN or load balancer](#behind-a-cdn-or-load-balancer)                |
| `POSTGRES_USER`, `POSTGRES_DB`, `LOG_LEVEL`, `DATABASE_POOL_MAX`, `UPLOAD_MAX_BYTES`, `HTTP_PORT`, `HTTPS_PORT`, `TERAN_VERSION` | no       | See the example file                                                                                    |

Fixed in the Compose file because production requires them: `NODE_ENV=production`,
`COOKIE_SECURE=true`, `SWAGGER_ENABLED=false`, `PAYMENT_METHODS_ENABLED=CASH_ON_DELIVERY`,
`UPLOADS_DIR=/data/uploads`, and the internal URLs between the services. The API refuses to start
in production with insecure cookies, the `log` mail transport, a missing `INTERNAL_API_KEY`, a
non-https `WEB_ORIGIN` or a secret that still contains the example placeholder.

Generate each secret separately:

```bash
openssl rand -base64 48 | tr '+/' '-_' | tr -d '=\n'; echo
```

## First deployment

Run every command from the repository root on the server, checked out at the commit or tag you
want to deploy.

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

This builds the three images, starts PostgreSQL, runs the migrations, then starts the API, the
storefront and Caddy, each waiting for the previous one to be healthy. Follow progress with:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f api web caddy
```

To save typing, define an alias for the session:

```bash
alias teran='docker compose -f docker-compose.prod.yml --env-file .env.production'
```

### Create the first administrator

The password is read from the environment, never printed, and must be at least 10 characters.
Read it without echoing so it stays out of your shell history:

```bash
read -r -p 'Admin e-mail: ' ADMIN_EMAIL
read -r -s -p 'Admin password: ' ADMIN_PASSWORD; echo
export ADMIN_EMAIL ADMIN_PASSWORD
teran exec -e ADMIN_EMAIL -e ADMIN_PASSWORD api node dist/cli/create-admin.js --first-name 'Owner'
unset ADMIN_PASSWORD
```

`--reset-password` sets a new password for an existing administrator; `--promote` turns an
existing customer or manager into an administrator. Every use is written to the audit log. Further
staff accounts are created in the admin area (Staff, administrators only).

### Optional: load the demonstration catalogue

Only for a review or staging environment. The seed refuses to run in production unless explicitly
allowed, never overwrites existing records, and writes generated demo images to the uploads volume.
It loads the catalogue only: demo customers and orders (`--with-activity`) do not belong in a
production database, and the demo reset refuses to run there at all
([demo mode](../development/demo-mode.md)).

```bash
teran run --rm -e ALLOW_DEMO_SEED=true migrate prisma db seed
```

### Configure the store

Sign in at `https://<domain>/admin` and work through: contact details and announcement
(Settings), delivery methods and prices (Delivery), categories, collections and products, then
stock (Inventory). Keep `DEMO_CONTENT=true` until real products, prices and legal texts are in
place.

## Updating

```bash
git fetch --tags && git checkout <tag-or-commit>
teran up -d --build
```

The `migrate` job runs again before the new API starts. Each service is replaced in turn, so expect
a few seconds of unavailability. Take a backup first (below). Migrations are written to be
additive; if a release needs a destructive migration its notes say so.

### Rolling back

Check out the previous release and run `teran up -d --build` again. Database migrations are not
reversed automatically: if the release you are leaving applied a migration that the previous code
cannot work with, restore the backup taken before the update.

## Backups

Back up both the database and the uploads volume, keep copies off the server (encrypted), and
test a restore regularly.

```bash
mkdir -p backups
# Database (custom format, compressed)
teran exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' \
  > "backups/teran-$(date +%F-%H%M).dump"
# Product images
docker run --rm -v teran-production_uploads:/data:ro -v "$PWD/backups:/backup" alpine:3.24 \
  tar czf "/backup/uploads-$(date +%F-%H%M).tgz" -C /data .
```

Restore into a stopped application:

```bash
teran stop caddy web api
teran exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' \
  < backups/teran-YYYY-MM-DD-HHMM.dump
docker run --rm -v teran-production_uploads:/data -v "$PWD/backups:/backup:ro" alpine:3.24 \
  sh -c 'tar xzf /backup/uploads-YYYY-MM-DD-HHMM.tgz -C /data'
teran up -d
```

## Secrets: rotation and effects

| Secret              | How to rotate                                                                          | Effect                                                                                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POSTGRES_PASSWORD` | `ALTER USER teran WITH PASSWORD '…'` in `psql`, then update the file and `teran up -d` | The variable only initialises a new volume; changing the file alone does not change the database password.                                                                              |
| `APP_SECRET`        | Update the file, `teran up -d`                                                         | Newsletter unsubscribe links already sent stop working (they are derived, not stored). Existing guest order links keep working; an order retried across the rotation gets a fresh link. |
| `INTERNAL_API_KEY`  | Update the file, `teran up -d` (API and web restart together)                          | None if both restart; a mismatch makes the storefront's cached requests subject to rate limits.                                                                                         |
| `REVALIDATE_SECRET` | Update the file, `teran up -d`                                                         | None if both restart; a mismatch stops immediate cache refresh after admin changes (entries still refresh within an hour).                                                              |
| Admin passwords     | Admin area, or `create-admin.js --reset-password`                                      | Changing a password or deactivating staff signs out their sessions.                                                                                                                     |

## Monitoring

- Health: `https://<domain>/api/v1/health/live` (process up) and `/api/v1/health/ready` (database
  reachable). Container health is visible in `teran ps`; point an external uptime monitor at the
  readiness URL and the home page.
- Logs: the API writes structured JSON (pino) to stdout with request ids and with `token`
  query parameters redacted; Caddy writes JSON access logs with `token` query parameters and the
  `Referer` header removed. Read them with `teran logs`.
- Watch disk usage of the Docker volumes and the backup directory.

## Behind a CDN or load balancer

Every API rate limit is keyed on the client IP, which the API reads from `X-Forwarded-For` after
skipping `TRUST_PROXY_HOPS` trusted proxies. With Caddy alone the correct value is `1`. If another
proxy sits in front of Caddy:

1. Add its address ranges to `trusted_proxies` in `docker/caddy/Caddyfile` (see the comment at the
   top), so Caddy keeps the forwarded client address instead of replacing it.
2. Set `TRUST_PROXY_HOPS=2` (one per proxy in front of Caddy, plus Caddy itself).

Getting this wrong either lets visitors spoof their IP (too many hops) or makes all visitors share
one rate limit (too few).

## Go-live checklist

- [ ] Legal texts reviewed and every highlighted `[placeholder]` replaced
      ([business information](../business-information-required.md)).
- [ ] Real products, prices, stock, delivery methods and contact details entered; demo records
      archived.
- [ ] `DEMO_CONTENT=false`, web image rebuilt; `robots.txt` and page metadata allow indexing.
- [ ] SMTP configured and a password-reset e-mail received.
- [ ] Administrator accounts use unique, strong passwords; unused staff accounts deactivated.
- [ ] Backups scheduled, copied off the server, and a restore tested.
- [ ] Uptime monitoring on `/api/v1/health/ready` and the home page.
- [ ] Hosting location confirmed against Uzbek data-localisation requirements.
- [ ] HTTPS certificate issued (`teran logs caddy`), HTTP redirects to HTTPS, and
      `Strict-Transport-Security` present.
- [ ] A test order placed, confirmed, delivered and its cash payment recorded in the admin area.

## Not included yet

- **Online payments.** Only cash on delivery is offered. An online provider must be integrated
  and its webhook signatures verified before any order can be marked paid automatically; until
  then payments are recorded only by staff.
- **Horizontal scaling.** One web and one API container. Running several web instances requires
  a shared Next.js cache handler (revalidation currently reaches one instance) and several API
  instances require shared upload storage (for example S3-compatible object storage).
- **Image registry.** Images are built on the server. A registry and signed release images can be
  added when a deployment pipeline is authorised.

## Troubleshooting

| Symptom                                               | Check                                                                                                                                                                                |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `required variable … is missing a value`              | The named variable is empty in `.env.production`.                                                                                                                                    |
| `migrate` exits with an error                         | `teran logs migrate`. The API does not start until migrations succeed.                                                                                                               |
| API restarts with `Invalid environment configuration` | `teran logs api` lists every invalid variable.                                                                                                                                       |
| Certificate not issued                                | DNS must point at the server and ports 80/443 must be reachable from the internet (`teran logs caddy`).                                                                              |
| Pages load but admin changes appear late              | `REVALIDATE_SECRET` differs between services; restart both with the same value.                                                                                                      |
| Every visitor gets `429 RATE_LIMITED`                 | A proxy in front of Caddy is not configured as trusted (see above).                                                                                                                  |
| Every unprefixed (Uzbek) page redirects to itself     | The Next.js server was started with `HOSTNAME=127.0.0.1`. Use `0.0.0.0` (as the image does) or `localhost`; with `127.0.0.1`, Next.js 16 treats its own locale rewrites as external. |
