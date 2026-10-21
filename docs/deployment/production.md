# Production deployment

TERAN runs as four containers on one Linux server, described by
[`docker-compose.prod.yml`](../../docker-compose.prod.yml), behind the server's own Nginx. The
Nginx configuration belongs to the server and its administrator: this repository ships none and no
script here writes, enables or reloads it. [`deploy.sh`](../../deploy.sh) installs the stack the
first time and updates it on every later run. Nothing deploys automatically: CI builds and tests
every change, and an operator decides when to run it (ADR-016, ADR-046, ADR-048).

```
Internet ──► the server's Nginx :80/:443 (HTTPS)
               ├── /api/v1/*, /uploads/*  ──► 127.0.0.1:<API port> ─► api :4000 (NestJS) ──► postgres :5432
               ├── /api/revalidate*       ──► 404 (internal only)                            ▲
               └── everything else        ──► 127.0.0.1:<web port> ─► web :3000 (Next.js) ───┘ via api
migrate (one-off) ──► postgres            `prisma migrate deploy`, run by deploy.sh before the API
Pictures and films: Cloudflare R2 (R2_*), or the `uploads` volume without it
```

The two host ports are chosen on the first run of `deploy.sh` (it suggests 4030 and 4031, or the
ports the server's Nginx already uses for the site) and kept in `.deploy.env`.

| Service    | Image                         | Networks  | Published                          | Persistent data                              |
| ---------- | ----------------------------- | --------- | ---------------------------------- | -------------------------------------------- |
| `postgres` | `postgres:18.6-alpine3.24`    | data      | never                              | `postgres-data` volume                       |
| `migrate`  | `apps/api/Dockerfile` `tools` | data, app | never                              | — (mounts `uploads` for the one-off scripts) |
| `api`      | `apps/api/Dockerfile` runtime | data, app | `127.0.0.1:${TERAN_API_HOST_PORT}` | `uploads` volume (files when R2 is not used) |
| `web`      | `apps/web/Dockerfile`         | app       | `127.0.0.1:${TERAN_WEB_HOST_PORT}` | — (Next.js caches inside the container)      |

- The `data` network is internal: PostgreSQL has no route to or from the internet and is never
  published. The API and the storefront are published on the loopback interface only, for Nginx.
- The API and web containers run as the unprivileged `node` user with all Linux capabilities
  dropped and `no-new-privileges`. The API's root filesystem is read-only; it writes only to the
  uploads volume and `/tmp`.
- Each service logs to stdout; Docker keeps 10 MB × 5 files per service.
- Scheduled jobs run inside the API: unpaid online orders expire and pending Telegram posts are
  sent every minute, expired sessions, carts and reset tokens are removed hourly.

## 1. System requirements

- **Hosting location and personal data.** The store processes customers' names, phone numbers
  and addresses. Uzbek personal-data legislation includes data-localisation requirements for the
  personal data of citizens of Uzbekistan. Confirm with a lawyer where the server and its backups
  may be located, and update the hosting named in the privacy policy
  (`apps/web/src/content/pages/privacy.ts`, it still names the previous hosting) before going live.
- **Server.** Linux (x86-64 or arm64) with Docker Engine and the Compose plugin (v2.24 or newer),
  Git, `curl` (or `wget`) and Bash, run by a user allowed to use Docker (no root needed). 2 vCPU and
  4 GB RAM are enough to build and run the stack; building the web image is the most memory-hungry
  step. Leave room on disk for the images (about 2.5 GB per release kept), the database, the uploads
  volume (without R2) and the backups.
- **Ports.** Two free TCP ports on 127.0.0.1 (1024–65535), one for the storefront and one for the
  API; `deploy.sh` checks them. Nothing else is published.
- **Firewall.** Inbound TCP 80 and 443 plus SSH only. Docker publishes on 127.0.0.1, so the
  application ports are not reachable from outside even where Docker bypasses the host firewall.
- **Outbound access** from the API: Cloudflare R2 (when used), SMTP, the Telegram Bot API and
  OpenStreetMap's geocoder (the admin's store addresses). Payme and Click call the API; it never
  calls them.

## 2. Configuration

```bash
cp docker/production.env.example .env.production
chmod 600 .env.production
```

Fill in every value. `.env.production` is git-ignored; keep a copy in a password manager or secret
store, never in the repository, a ticket or a chat. Generate each secret separately:

```bash
openssl rand -base64 48 | tr '+/' '-_' | tr -d '=\n'; echo
```

| Variable                                                                                | Required      | Notes                                                                                                                                          |
| --------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `PUBLIC_ORIGIN`                                                                         | yes           | Canonical origin, `https://terantrade.uz`. Compiled into the web image; the API's CORS and CSRF origin                                         |
| `POSTGRES_PASSWORD`                                                                     | yes           | ≥ 16 URL-safe characters (it is embedded in the connection URL). Only initialises a new volume                                                 |
| `APP_SECRET`                                                                            | yes           | ≥ 32 characters. HMAC key for guest order links and newsletter unsubscribe links                                                               |
| `INTERNAL_API_KEY`                                                                      | yes           | ≥ 32 characters. Shared by API and web; exempts the storefront's cached requests from rate limits                                              |
| `REVALIDATE_SECRET`                                                                     | yes           | ≥ 32 characters. Shared by API and web; authorises cache revalidation                                                                          |
| `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | all or none   | Cloudflare R2 for pictures and films (ADR-043). Without them, files go to the `uploads` volume. `R2_PUBLIC_URL` is compiled into the web image |
| `DEMO_CONTENT`                                                                          | no            | `false` for the real shop. `true` shows demo notices and keeps search engines out. Compiled into the web image                                 |
| `SHOW_PRICES`, `CHECKOUT_ENABLED`                                                       | no            | Default `false`: no prices, no bag, orders by phone and messengers (ADR-027). Change both together; `SHOW_PRICES` needs a rebuild              |
| `SHOW_GALLERY`                                                                          | no            | Default `false`: no links to `/media`. Compiled into the web image                                                                             |
| `ENABLED_LOCALES`                                                                       | no            | Default `uz,ru,en`. Compiled into the web image                                                                                                |
| `MAIL_TRANSPORT`, `SMTP_*`, `MAIL_FROM`                                                 | no            | `disabled` (default) or `smtp`. Without SMTP, customers cannot reset forgotten passwords                                                       |
| `PAYMENT_*`, `PAYME_*`, `CLICK_*`, `ALLOW_DEMO_PAYMENTS`                                | with checkout | See [payment provider setup](payment-provider-setup.md)                                                                                        |
| `TELEGRAM_MODE`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID`, `TELEGRAM_POST_LOCALE`    | no            | Channel announcements ([telegram](../architecture/telegram.md)); `disabled` by default                                                         |
| `CORS_EXTRA_ORIGINS`, `TRUST_PROXY_HOPS`                                                | no            | Default empty and `1` (Nginx). See [Behind a CDN](#behind-a-cdn)                                                                               |
| `POSTGRES_USER`, `POSTGRES_DB`, `LOG_LEVEL`, `DATABASE_POOL_MAX`, `UPLOAD_MAX_BYTES`    | no            | See the example file                                                                                                                           |

The host ports and the deployed image tag are not set here: `deploy.sh` keeps them in
`.deploy.env` (`TERAN_WEB_HOST_PORT`, `TERAN_API_HOST_PORT`, `TERAN_VERSION`).

Fixed in the Compose file because production requires them: `NODE_ENV=production`,
`COOKIE_SECURE=true`, `SWAGGER_ENABLED=false`, `UPLOADS_DIR=/data/uploads` and the internal URLs
between the services. `deploy.sh` checks the file before it changes anything (without printing a
value): the required variables are present, no secret is still a template placeholder, the secrets
are long enough and all different, the origin is `https://`, R2 and each payment provider are
complete or absent, and the mail, payment and Telegram modes are consistent. The API refuses to
start on the same mistakes, and `teran logs api` then lists every invalid variable.

## 3. Server layout

```
/srv/teran/                    a checkout of the repository on the branch being deployed
├── deploy.sh                  installs and updates the stack
├── .env.production            the configuration (chmod 600, git-ignored; written by you)
├── .deploy.env                ports, image tag, branch, backup folder (chmod 600, git-ignored;
│                              written by deploy.sh, no secrets)
└── docker-compose.prod.yml
~/teran-backups/teran-production/   deploy.sh's database dumps (chmod 700, outside the checkout)
Docker volumes: teran-production_postgres-data, teran-production_uploads
The server's Nginx configuration and certificates: wherever the server keeps them (not touched).
```

Any directory works. For manual Compose commands, define an alias in the checkout; it needs both
env files (the ports and the image tag come from `.deploy.env`):

```bash
cd /srv/teran
alias teran='docker compose -p teran-production -f docker-compose.prod.yml --env-file .env.production --env-file .deploy.env'
```

## 4. Deploy script

### First installation

```bash
cd /srv/teran
./deploy.sh
```

With no `.deploy.env` yet, the script:

1. checks Docker, Compose v2 (2.24+), Docker access, Git, `curl`, the Compose file, the Dockerfiles
   and `.env.production` (missing: it says how to create it and stops; it never invents secrets),
   and validates `.env.production` without printing any value;
2. asks for the storefront port (`Frontend porti [4030]:`), then the API port
   (`Backend API porti [4031]:`). The suggestions are the ports the server's Nginx already sends
   the site to, when its configuration can be read (`/etc/nginx/projects-enabled`,
   `/etc/nginx/projects`, `/etc/nginx/sites-enabled`, `/etc/nginx/conf.d`, read only), else 4030
   and 4031. A port must be a number from 1024 to 65535, the two must differ, and neither may be
   in use: a port held by a host process or another container gets `Port 4030 band (...). Boshqa
port kiriting.` and the question again. `q` (or Ctrl+C) cancels without changing anything;
3. saves the ports in `.deploy.env` (mode 600), then validates the Compose configuration,
   builds the images (tagged with the Git commit), starts PostgreSQL and waits for it;
4. on an empty database, says so and asks whether to continue as a new, empty shop. Answering no
   stops here with PostgreSQL running, ready for the data to be restored
   ([migration from Vercel and Neon](migration-from-vercel.md)); the next run continues;
5. runs `prisma migrate deploy`, starts the API and waits until it is healthy, then the storefront,
   then checks over HTTP on the local ports: the API's readiness (database connected), a catalogue
   request, the storefront's health and its home page;
6. records the deployed image tag in `.deploy.env` and prints the result: containers and their
   health, the local endpoints and port mappings, PostgreSQL's health, the latest migration, the
   backup made, and whether it was a first installation or an update.

Without a terminal, the ports can be given as `--web-port 4030 --api-port 4031` (checked the same
way), and `--fresh-database` accepts an empty database without the question.

### Updates

Run the same command again:

```bash
./deploy.sh
```

With `.deploy.env` present the script updates the same deployment, without questions:

1. checks the saved settings and that the Compose project's containers belong to this checkout;
2. Git: on the branch saved at the first installation (it never switches branches), with an
   upstream configured and no uncommitted changes to tracked files, it fetches that branch and
   updates by fast-forward only. Uncommitted changes stop it with an explanation (nothing is
   discarded; `--no-pull` deploys the local files as they are); a branch that has diverged from
   its upstream stops it too (it never merges). Without an upstream it says that the local
   checkout is deployed as it is. When the update changes `deploy.sh` itself, the new version
   continues;
3. checks that the saved ports are still free or held by this deployment's own containers: a port
   taken by another process or container stops it before anything is touched;
4. validates `.env.production` and the Compose configuration, and that the media storage did not
   change (R2 to the volume or back: stopped, the files would not follow);
5. builds the new images, makes sure PostgreSQL is healthy, **backs up the database**, runs the
   migrations, recreates the API and then the storefront (each only once the previous step
   succeeded), and runs the same HTTP checks.

PostgreSQL and the `uploads` volume are kept as they are; the database is never seeded, reset or
restored by the script.

### Status, ports, help

```bash
./deploy.sh --status              # containers, health, ports, latest migration and backup; changes nothing
./deploy.sh --reconfigure-ports   # choose other host ports; asks for confirmation, then recreates api and web
./deploy.sh --help
```

`--reconfigure-ports` warns that the server's Nginx must then send the site to the new ports (the
script does not change Nginx; it only warns when the Nginx configuration it can read points
elsewhere).

### What the script never does

It never installs, writes, enables or reloads Nginx and never touches certificates, DNS or the
firewall; never runs `docker compose down -v`, `docker volume rm` or `docker system prune`;
never removes other containers or images; never stops or kills a process to free a port; never
seeds, resets or restores the database; never prints secret values; never overwrites
`.env.production`; and never reports success while a container is unhealthy.

### When something fails

The script stops with the failing step's logs (without environment values) and what to do next.
It does not delete `.deploy.env`, volumes or data. A failed build or migration leaves the running
API and storefront as they were. When a new container does not become healthy, the last good
release (`TERAN_VERSION` in `.deploy.env`) is still on the server and can be started again:

```bash
teran up -d --no-build --no-deps api web
```

Exit codes: 0 done, 1 failed, 2 stopped on purpose (an empty database), 130 interrupted.

### Create the first administrator (new installations only)

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

### Optional: a staging copy with the demonstration catalogue

Only for a review or staging environment, never for the live shop (`deploy.sh` never runs it).
The seed refuses to run in production unless explicitly allowed, never overwrites existing
records, and writes generated demo images to the store the API uses. Demo customers and orders
(`--with-activity`) never belong in a production database ([demo mode](../development/demo-mode.md)).

```bash
teran run --rm -e ALLOW_DEMO_SEED=true migrate prisma db seed
```

## 5. Database and migrations

- PostgreSQL 18 in the `postgres` container, reached by the API over the internal network with a
  direct connection (`DATABASE_URL` is built by the Compose file; no pooler: the API sets a
  statement timeout at connection start, which transaction poolers refuse).
- `deploy.sh` runs `prisma migrate deploy` (the `migrate` service) after the backup and before the
  new API starts; it applies pending migrations from `apps/api/prisma/migrations` and never resets
  or drops anything. A plain `teran up` runs the same job first.
- Check the schema against the migration history without changing anything:

  ```bash
  teran run --rm migrate prisma migrate status
  ```

  "Database schema is up to date!" is the expected answer after a deployment.

- Migrations are written to be additive; a release that needs a destructive one says so in its
  notes.

## 6. Pictures and films

- **With Cloudflare R2** (the live shop, ADR-043): the API writes every picture rendition and
  film to the bucket, and its answers carry the bucket's addresses (`R2_PUBLIC_URL`), so visitors
  load them from Cloudflare. The storefront allows that origin in its content security policy
  (compiled in from `R2_PUBLIC_URL`; rebuild the web image after changing it). The bucket's CORS
  rules must allow `PUBLIC_ORIGIN` (page films are fetched by script). An `/uploads/...` address
  (an admin preview, an older link) is redirected by the API to the same key in the bucket.
  `r2.dev` addresses are Cloudflare's rate-limited development addresses: use a custom domain on
  the bucket (for example `media.terantrade.uz`) for production.
- **Without R2:** files live in the `uploads` volume, served by the API under `/uploads` (cached
  for a year, film byte ranges supported). The volume survives container recreation and updates;
  back it up with the database.
- `deploy.sh` remembers which of the two the last deployment used and refuses to switch silently.
- Upload limits: pictures 5 MB each (`UPLOAD_MAX_BYTES`), films 64 MB through the admin area.
  Larger films are added on the server with the tools image (files mounted read-only):

  ```bash
  teran run --rm -v /path/to/films:/import:ro migrate \
    tsx scripts/add-gallery-film.ts --film /import/film.mp4 --poster /import/poster.jpg \
    --title-uz '…' --title-ru '…' --title-en '…'
  ```

## 7. Nginx

The server's Nginx is configured by its administrator; nothing in this repository writes it. For
the site to work, its server block for the domain must:

| Requirement                                                               | Why                                                                                                           |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `/api/v1/` and `/uploads/` → `http://127.0.0.1:<API port>`                | API calls, and files kept in the volume (or redirected to R2)                                                 |
| everything else → `http://127.0.0.1:<web port>`                           | Pages, the admin area and `/_next/static`                                                                     |
| `/api/revalidate` answers 404                                             | The cache webhook is called by the API over Docker's network only                                             |
| `X-Forwarded-For` set to the client's address (`$remote_addr`)            | The API's rate limits read it after one trusted hop (`TRUST_PROXY_HOPS=1`); a forwarded value could be forged |
| the `X-Internal-Key` request header removed                               | It exempts the storefront's own requests from rate limits; it must never come from the internet               |
| `Host` and `X-Forwarded-Proto` passed on                                  | Redirects and absolute addresses are built from them                                                          |
| request bodies up to 12 MB, and 70 MB on `/api/v1/admin/media/<id>/video` | Two pictures of 5 MB in one request; films up to 64 MB (with longer read timeouts there)                      |
| responses of the storefront not buffered                                  | Pages stream as they render                                                                                   |
| `http://` and `www.` redirected to `PUBLIC_ORIGIN`, HSTS added            | Cookies are `Secure` and `__Host-` prefixed: the site works over HTTPS only                                   |
| access log without query strings and without `Referer`                    | Order-status, password-reset and unsubscribe links carry tokens there                                         |

`deploy.sh` reads the Nginx configuration where it can (never writes it) to suggest the ports and
to warn when the site is sent to other ports than the deployment uses. These requirements were
rehearsed with Nginx 1.27 in front of the production images (docs/testing/test-strategy.md).

## 8. HTTPS

- DNS: the domain's A record (and `www`) must point at the server before an HTTP certificate
  challenge can succeed. Plan the switch from the current hosting as described in the
  [migration guide](migration-from-vercel.md).
- Certificates are the server's (for example certbot); `deploy.sh` does not request or renew them.
- Cookies are `Secure` and `__Host-` prefixed (`COOKIE_SECURE=true`): the site works over HTTPS
  only, which the redirects and HSTS enforce.

## 9. Health checks and logs

- Health: `/api/v1/health/live` (process up) and `/api/v1/health/ready` (database reachable)
  answer `{"status":"ok"}` without any configuration detail; the storefront's `/api/health`
  likewise. The containers' own health checks use them, and `./deploy.sh --status` shows them.
  Point an external uptime monitor at the readiness URL and the home page.
- Errors: the API answers server errors with a generic message and a request id; stack traces,
  SQL and file paths go to its log only.
- Logs: `teran logs api`, `teran logs web`, `teran logs migrate` (add `-f` to follow, `--since 1h`
  to start an hour back); see [Reading the logs](#reading-the-logs). Nginx's logs are wherever the
  server keeps them.
- Watch disk usage of the Docker volumes, the images kept for rollbacks and the backup folder.

### Reading the logs

The API writes one JSON object per line: `time` (UTC), `level`, `msg` (the line in words) and the
facts behind it. Every request gets one line when its answer is complete:

```json
{"level":"info","time":"2026-10-21T05:55:05.164Z","reqId":"1d449ca0-…","method":"GET","url":"/api/v1/catalog/categories","status":200,"ms":99,"msg":"GET /api/v1/catalog/categories 200 99ms"}
{"level":"info","time":"2026-10-21T05:55:05.344Z","reqId":"c93e60ee-…","method":"POST","url":"/api/v1/auth/login","status":400,"ms":16,"code":"VALIDATION_FAILED","msg":"POST /api/v1/auth/login 400 16ms VALIDATION_FAILED"}
```

- **Levels.** `error`: the API failed (status 5xx); look at these first. `warn`: refused for a
  reason worth a look (`429 RATE_LIMITED`; `403 INVALID_ORIGIN`, an attack or a `WEB_ORIGIN` that
  no longer matches the site's address), or a background task or outside service failed (e-mail,
  Telegram, cache refresh, map search, payment expiry, clean-up). `info`: everything else, client
  errors included; their `code` says why.
- **A server error** writes two lines with the same `reqId`: first `Unexpected error in GET …`
  from `ExceptionFilter` with the error (`err`: type, message, Prisma `code`, `stack`), then the
  request's own line at `error`.
- **One request, end to end.** Every answer carries its id in `X-Request-Id`, and error answers
  in `requestId`: a customer's or the storefront's report leads to the lines with
  `teran logs api | grep <id>`. With `proxy_set_header X-Request-Id $request_id;` the API uses
  Nginx's id, so its access log matches too.
- **Other lines** have a `context`: the part of the API that wrote them (`OrdersService` "Order
  placed", `PaymentConfig` the payment mode at start, `Bootstrap` "TERAN API listening on …" with
  the media store, mail transport, Telegram mode and checkout switch).
- **Left out:** health checks, stored files and CORS preflights that worked, and Nest's list of
  modules and routes at start (`LOG_LEVEL=debug` shows it). Never logged: cookies, passwords,
  request bodies, IP addresses, and the `token` / `accessToken` values in addresses (`[redacted]`).
- **The storefront** (`teran logs web`) writes a line when it cannot get an answer from the API,
  once a minute per kind of failure, with the API's request id when there is one:
  `[api] GET /catalog/products?pageSize=8 failed: 500 INTERNAL_ERROR after 45 ms (API request 7bce04be-…)`
  or `… failed: the API at http://api:4000 is unreachable (ECONNREFUSED) after 3 ms`. Next.js
  adds its own entry for each part of a page whose cached load failed,
  `⨯ [Error [ApiUnavailableError]: GET /catalog/categories?locale=en: the API at http://api:4000 is unreachable (ECONNREFUSED)] { digest: '…' }`;
  the pages still answer, without the parts the API could not give.

```bash
teran logs --since 1h api | grep -E '"level":"(warn|error)"'   # the last hour's problems
teran logs api | grep 1d449ca0                                  # everything about one request
teran logs --no-log-prefix api | jq -r '"\(.time) \(.level) \(.msg)"'   # plain lines, if jq is installed
```

`LOG_LEVEL` (`.env.production`, default `info`) sets how much is written: `warn` keeps only the
problems, `debug` adds detail.

## 10. Backups and restore

**Automatic, before every migration.** When the database already holds data, `deploy.sh` dumps it
before running the migrations (`pg_dump --format=custom`) into `TERAN_BACKUP_DIR` (default
`~/teran-backups/<project>`, outside the checkout, folder mode 700, files mode 600), named
`<project>-<UTC time>-before-<image tag>.dump`. It first checks the free space, then checks
that the dump is not empty and can be read (`pg_restore --list`, including the migrations table);
if any of this fails the migration does not run. The script never deletes or restores backups:
copy them off the server and remove old ones yourself.

**Manual.** Back up the database (and the uploads volume when R2 is not used), keep copies off the
server (encrypted), and test a restore regularly.

```bash
mkdir -p backups
# Database (custom format, compressed)
teran exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' \
  > "backups/teran-$(date +%F-%H%M).dump"
# Files kept in the volume (without R2)
docker run --rm -v teran-production_uploads:/data:ro -v "$PWD/backups:/backup" alpine:3.24 \
  tar czf "/backup/uploads-$(date +%F-%H%M).tgz" -C /data .
```

Verify a dump without touching the live database: restore it into a scratch database next to it,
compare its row counts with the live ones ([`row-counts.sql`](../../docker/postgres/row-counts.sql),
read-only), then drop the scratch database.

```bash
DUMP=backups/teran-YYYY-MM-DD-HHMM.dump
teran exec -T postgres sh -c 'createdb -U "$POSTGRES_USER" teran_restore_check'
teran exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d teran_restore_check --no-owner --exit-on-error' < "$DUMP"
teran exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d teran_restore_check' < docker/postgres/row-counts.sql
teran exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < docker/postgres/row-counts.sql
teran exec -T postgres sh -c 'dropdb -U "$POSTGRES_USER" teran_restore_check'
```

Restore into a stopped application (replaces the current data; a deliberate decision, never done
by `deploy.sh`):

```bash
teran stop web api
teran exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' \
  < backups/teran-YYYY-MM-DD-HHMM.dump
docker run --rm -v teran-production_uploads:/data -v "$PWD/backups:/backup:ro" alpine:3.24 \
  sh -c 'tar xzf /backup/uploads-YYYY-MM-DD-HHMM.tgz -C /data'
teran up -d
```

**R2** keeps the live pictures and films. Cloudflare does not back the bucket up for you: mirror it
regularly to storage you control with any S3-compatible sync tool (for example `rclone sync` with an
R2 remote and a read-only API token). Files are never overwritten (every upload gets a new key),
so a mirror only grows. This step is not automated or exercised by this repository. The local
source folders of imported pictures can rebuild them as well (`scripts/restore-media.ts`, ADR-043).

## 11. Updating and rolling back

`./deploy.sh` is the update (section 4): code by fast-forward, images, a backup, migrations, the
API, the storefront and the checks. Each release's images are tagged with its Git commit, and
`.deploy.env` keeps the deployed tag and the one before (`TERAN_VERSION`,
`TERAN_PREVIOUS_VERSION`).

**Rolling back the application:** start the images of the last good release again. After a failed
update `.deploy.env` still names it, so `teran up -d --no-build --no-deps api web` is enough; for
an earlier one, check that release out and run `./deploy.sh --no-pull`. Migrations are not
reversed automatically: if the release you are leaving applied a migration the previous code
cannot work with, restore the backup taken before the update (section 10) as a deliberate step.

Old images stay on the server for rollbacks; remove the ones no longer needed yourself
(`docker image ls teran-api`, `docker image rm teran-api:<tag>`, likewise `teran-web` and
`teran-api-tools`).

## 12. External services

| Service                          | Used for                                                    | Required                                                                |
| -------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------- |
| Cloudflare R2                    | Pictures and films (ADR-043)                                | Yes for the live shop (its media are there); optional for a new install |
| SMTP server                      | Password-reset e-mails                                      | Optional (`MAIL_TRANSPORT=disabled`)                                    |
| Telegram Bot API                 | Channel announcements                                       | Optional (`TELEGRAM_MODE`)                                              |
| Payme, Click                     | Online payments (they call the API)                         | Only with `CHECKOUT_ENABLED=true` and an online method                  |
| OpenStreetMap (Nominatim, tiles) | Store address search in the admin area; the store map       | Yes for those features; no account                                      |
| Google Fonts                     | Fonts, downloaded once at build time and served by the site | At build time only                                                      |
| The server's Nginx and certbot   | HTTPS and routing (configured outside this repository)      | Yes                                                                     |

## 13. Removed integrations

Removed when the shop moved to its own server (ADR-046, ADR-047), with nothing in the running
application depending on them:

- **Vercel** (hosting, serverless functions, Cron, request caps, build branches): replaced by this
  Compose stack and the server's Nginx; the jobs run on the API's own timers.
- **Vercel Blob** (suspended since 2026-10-19): replaced by R2 or the uploads volume; films go
  through the API (64 MB) instead of direct browser uploads.
- **Neon**: replaced by the PostgreSQL container; the data moves once
  ([migration guide](migration-from-vercel.md)).
- **Caddy**: replaced by the server's existing Nginx.
- **The AI product advisor** (Anthropic API): removed at the owner's request; no AI provider is
  used.

## Behind a CDN

Every API rate limit is keyed on the client IP, which the API reads from `X-Forwarded-For` after
skipping `TRUST_PROXY_HOPS` trusted proxies. With Nginx alone the correct value is `1`. If a CDN
or load balancer sits in front of Nginx, configure Nginx's `real_ip` module for its address ranges
(so `$remote_addr` is the visitor again) or keep the forwarded chain and set `TRUST_PROXY_HOPS=2`.
Getting this wrong either lets visitors spoof their IP or makes them share one rate limit.

## Secrets: rotation and effects

| Secret              | How to rotate                                                                              | Effect                                                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POSTGRES_PASSWORD` | `ALTER USER teran WITH PASSWORD '…'` in `psql`, then update the file and run `./deploy.sh` | The variable only initialises a new volume; changing the file alone does not change the database password.                                                                              |
| `APP_SECRET`        | Update the file, `./deploy.sh`                                                             | Newsletter unsubscribe links already sent stop working (they are derived, not stored). Existing guest order links keep working; an order retried across the rotation gets a fresh link. |
| `INTERNAL_API_KEY`  | Update the file, `./deploy.sh` (API and web restart together)                              | None if both restart; a mismatch makes the storefront's cached requests subject to rate limits.                                                                                         |
| `REVALIDATE_SECRET` | Update the file, `./deploy.sh`                                                             | None if both restart; a mismatch stops immediate cache refresh after admin changes (entries still refresh within an hour).                                                              |
| `R2_*` keys         | Create a new API token in Cloudflare, update the file, `./deploy.sh`, revoke the old one   | None; the bucket and its addresses stay the same.                                                                                                                                       |
| Admin passwords     | Admin area, or `create-admin.js --reset-password`                                          | Changing a password or deactivating staff signs out their sessions.                                                                                                                     |

## Go-live checklist

- [ ] Data moved from the current database and checked ([migration guide](migration-from-vercel.md)).
- [ ] Privacy policy names the new server's provider and location; legal texts reviewed
      ([business information](../business-information-required.md)).
- [ ] `R2_*` set to the live bucket, its CORS rules allow the site, ideally on a custom domain.
- [ ] `DEMO_CONTENT=false`, `SHOW_PRICES` and `CHECKOUT_ENABLED` as the shop sells today.
- [ ] `./deploy.sh` finished with "TERAN muvaffaqiyatli ishga tushdi." and `./deploy.sh --status`
      shows both containers healthy.
- [ ] The server's Nginx sends the site to the ports in `.deploy.env` and meets section 7; HTTPS
      certificate issued, `http://` and `www` redirect to the canonical origin, HSTS present.
- [ ] `teran run --rm migrate prisma migrate status` reports the schema up to date.
- [ ] Administrators sign in; unused staff accounts deactivated.
- [ ] SMTP configured and a password-reset e-mail received (if enabled).
- [ ] Backups copied off the server; a restore tested; the R2 bucket mirrored.
- [ ] Uptime monitoring on `/api/v1/health/ready` and the home page.
- [ ] The old hosting no longer deploys (Vercel's Git connection removed) and DNS points here.

## Not included yet

- **Online payments.** Payme and Click are implemented but have not been run against the
  providers; cash on delivery is the only method until they are configured and tested.
- **Horizontal scaling.** One web and one API container. Several web instances need a shared
  Next.js cache handler (revalidation reaches one instance); several API instances need R2 (shared
  files) and run the scheduled jobs in each (the jobs are idempotent).
- **Image registry.** Images are built on the server. A registry and signed release images can be
  added when a deployment pipeline is authorised.

## Troubleshooting

| Symptom                                               | Check                                                                                                                                                                                |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `deploy.sh`: `.env.production topilmadi`              | Create it from `docker/production.env.example` (section 2).                                                                                                                          |
| `deploy.sh`: `Port … band`                            | Another process or container uses that port: choose another, or free it yourself. The script never stops other services.                                                             |
| `deploy.sh`: uncommitted changes                      | Commit or set aside the changes in the checkout, or deploy them as they are with `./deploy.sh --no-pull`.                                                                            |
| `required variable … is missing a value`              | A manual `docker compose` command without `--env-file .deploy.env` (use the alias in section 3), or an empty variable in `.env.production`.                                          |
| `migrate` exits with an error                         | `teran logs migrate` or the script's output. The API and storefront keep running the previous release; the backup made just before is named in the output.                           |
| API restarts with `Invalid environment configuration` | `teran logs api` lists every invalid variable.                                                                                                                                       |
| `502 Bad Gateway` from Nginx                          | The containers are not up, or Nginx sends the site to other ports than `.deploy.env` (`./deploy.sh --status` shows both).                                                            |
| `413 Request Entity Too Large` on an upload           | Nginx's `client_max_body_size` for that route (12 MB, films 70 MB).                                                                                                                  |
| Pictures or films blocked in the browser console      | `R2_PUBLIC_URL` changed without rebuilding the web image (content security policy), or the bucket's CORS rules do not allow the site.                                                |
| Pages load but admin changes appear late              | `REVALIDATE_SECRET` differs between services; restart both with the same value.                                                                                                      |
| Every visitor gets `429 RATE_LIMITED`                 | A proxy in front of Nginx is not accounted for (see [Behind a CDN](#behind-a-cdn)).                                                                                                  |
| Every unprefixed (Uzbek) page redirects to itself     | The Next.js server was started with `HOSTNAME=127.0.0.1`. Use `0.0.0.0` (as the image does) or `localhost`; with `127.0.0.1`, Next.js 16 treats its own locale rewrites as external. |
