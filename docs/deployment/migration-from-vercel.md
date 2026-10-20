# Moving the live shop from Vercel and Neon to the own server

A one-time, controlled move (ADR-046). Until it is done, the live shop keeps running where it is:

| Part               | Before the move                                                      | After the move                                      |
| ------------------ | -------------------------------------------------------------------- | --------------------------------------------------- |
| Storefront and API | Vercel projects `teran-web` (serves `terantrade.uz`) and `teran-api` | `docker-compose.prod.yml` behind the server's Nginx |
| Database           | Neon `teran-db-eu` (PostgreSQL, Frankfurt)                           | The `postgres` container (`postgres-data` volume)   |
| Pictures and films | Cloudflare R2 bucket `teran-media`                                   | Unchanged: the same bucket and keys (ADR-043)       |
| Old Blob store     | Suspended since 2026-10-19, kept                                     | Unchanged (not used by the code any more)           |

Nothing in this guide was run against the live services while it was written; the database steps
were rehearsed locally with a copy of a development database (see the end). Run them in order, and
do not point the domain at the new server before the data check in step 6 passes. `deploy.sh`
itself refuses to start the shop on an empty database unless told so (`--fresh-database`).

**Do not push the self-hosting changes to `main` before step 8:** both Vercel projects are
connected to the repository and deploy every push to `main`; the Vercel build files are gone from
this code, so a push would replace or break the live Vercel deployment.

## 0. Before the day

1. Prepare the server as in [production deployment](production.md) §1–3, check the repository out
   on the branch to deploy, and fill `.env.production` (the live settings: `DEMO_CONTENT=false`,
   `SHOW_PRICES=false`, `CHECKOUT_ENABLED=false`, the five `R2_*` values the Vercel API project
   uses, and fresh secrets).
2. Run `./deploy.sh` once. It checks everything, asks for the two host ports (the ones the
   server's Nginx will send the site to), saves them in `.deploy.env`, builds the images and starts
   PostgreSQL. On the new, empty database it asks whether to continue as an empty shop: answer
   **no**. It stops there (exit code 2), with PostgreSQL running and nothing else started, ready
   for step 4. Define the `teran` alias (production deployment §3) for the commands below.
3. Update the privacy policy's hosting paragraph (provider and location of the new server) and
   deploy that text with the release.
4. Lower the TTL of the domain's `@` and `www` records at the DNS host (ahost) to 300 seconds at
   least a day ahead; it was 14 440 s (four hours), which is how long some resolvers would keep
   sending visitors to the old address.
5. Optional but recommended: obtain the certificate before the switch with a DNS challenge
   (`certbot certonly --manual --preferred-challenges dns -d terantrade.uz -d www.terantrade.uz`,
   one TXT record at the DNS host), so HTTPS works the moment DNS moves. Otherwise use the HTTP
   challenge right after step 7 and expect a few minutes without a valid certificate.
6. Keep the Neon connection string at hand: the **direct** address (its host has no `-pooler`), as
   in the Vercel API project's `DATABASE_URL_UNPOOLED` or Neon's console. Do not write it to a file
   in the repository or to shell history.

## 1. Freeze changes

Agree a short window (the database is small; the copy takes minutes). During it nobody edits in
the admin area. The storefront stays up on Vercel; anything visitors do in the window (an account,
a review) would stay behind on Neon, so keep the window short and quiet.

## 2. Copy the database out of Neon

On the server, from the checkout, with the PostgreSQL 18 client from the same image as the
database (a newer `pg_dump` reads older servers; Neon runs PostgreSQL 14–18):

```bash
mkdir -p backups
read -r -s -p 'Neon direct connection string: ' NEON_URL; echo; export NEON_URL
docker run --rm -e NEON_URL postgres:18.6-alpine3.24 \
  sh -c 'pg_dump "$NEON_URL" --format=custom --no-owner --no-acl' > backups/neon.dump
docker run --rm -i -e NEON_URL postgres:18.6-alpine3.24 \
  sh -c 'psql "$NEON_URL" -X -q' < docker/postgres/row-counts.sql > backups/neon-counts.txt
unset NEON_URL
```

`row-counts.sql` only reads. Keep `backups/neon.dump`: it is also the backup of the old database.

## 3. Check the dump

```bash
docker run --rm -v "$PWD/backups:/b:ro" postgres:18.6-alpine3.24 \
  sh -c 'pg_restore --list /b/neon.dump' > backups/neon.list
grep -c 'TABLE DATA' backups/neon.list
grep 'EXTENSION' backups/neon.list
```

Every table appears once under `TABLE DATA` (including `_prisma_migrations`). The only extension
the schema needs is `pg_trgm` (the first migration creates it). If the list names an extension
the plain PostgreSQL image does not have (a Neon-specific one), delete those lines from
`backups/neon.list` and add `-L /b/neon.list` to the restore below.

## 4. Restore into the new database

PostgreSQL is running on a new, empty volume (step 0.2), then restore:

```bash
teran exec -T postgres sh -c \
  'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl --exit-on-error' \
  < backups/neon.dump
```

`--exit-on-error` stops at the first problem instead of leaving a half-restored database. If it
stops, read the message, empty the new database (only here, before the shop runs on this server)
and restore again:

```bash
teran exec -T postgres sh -c 'dropdb -U "$POSTGRES_USER" "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
```

## 5. Check the schema

The migration history came with the data, so nothing is applied:

```bash
teran run --rm migrate prisma migrate status
```

Expect "Database schema is up to date!". If it lists pending migrations, the release is newer than
the live code: that is fine, `deploy.sh` applies them in step 7, after its own backup (additive
migrations only; read the release notes).

## 6. Compare the records

```bash
teran exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -X -q' \
  < docker/postgres/row-counts.sql > backups/server-counts.txt
diff backups/neon-counts.txt backups/server-counts.txt && echo 'identical'
```

Every table's count must be identical (`row-counts.sql` counts each table of the copy it reads:
products, variants, images, reviews, users, orders, articles, media, settings, inquiries, the
audit log, the applied migrations and the rest). Do not go on otherwise.

## 7. Start the shop and check it before DNS moves

```bash
./deploy.sh
```

Now the database holds the data, so the script continues without questions: it backs the
restored database up, runs the migrations, starts the API and the storefront on the saved ports and
checks them over HTTP. It ends with "TERAN muvaffaqiyatli ishga tushdi." and the port mappings;
`./deploy.sh --status` shows the same at any time.

With the server's Nginx sending the site to those ports (production deployment §7) and the
certificate present, check the site through Nginx while DNS still points at Vercel (`--resolve`
sends the request to the server):

```bash
SERVER_IP=<the server's address>
curl -sI --resolve terantrade.uz:443:$SERVER_IP https://terantrade.uz/ | head -1
curl -s  --resolve terantrade.uz:443:$SERVER_IP https://terantrade.uz/api/v1/health/ready
curl -sI --resolve terantrade.uz:443:$SERVER_IP https://terantrade.uz/api/revalidate | head -1
```

Expect 200, `{"status":"ok","database":"up"}` and 404. Pictures and films are read from R2 as
before; existing accounts and their passwords came with the data.

## 8. Switch DNS and stop the old deployment

1. At the DNS host: `@` A record → the server's address; `www` → the same address (A) or a CNAME to
   the apex. Leave the mail records (`MX`, `mail`) and the TXT records untouched. Before the move
   they were `@` A `216.198.79.1` and `www` CNAME `497cb01d113f8f1f.vercel-dns-017.com` (Vercel);
   note them for a rollback.
2. If the certificate was not obtained in advance, obtain it now (HTTP challenge) and reload Nginx.
3. In Vercel, disconnect both projects from the Git repository (project → Settings → Git), so a
   push to `main` no longer deploys there, and remove `terantrade.uz` and `www.terantrade.uz` from
   `teran-web` once DNS has moved. From now on the self-hosting changes may be pushed.
4. Watch `teran logs -f api web` and the Nginx log; open the home page, the catalogue and a tea in
   all three languages, sign in to the admin area, check that a picture and a film load, and that
   the store map shows.
5. Raise the DNS TTL again after a day.

## 9. Rolling back

In the first hours, if something is wrong with the new server: point the DNS records back to the
values noted in step 8 (Vercel keeps serving its last deployment and Neon its data). Anything
written on the new server since the switch (orders, accounts, admin edits) is then not on Neon;
copy it back the same way in reverse (dump on the server, restore into Neon) or re-enter it.
After that window, roll back on the server itself (production deployment §11) instead.

## 10. Afterwards

- Keep the Vercel projects and the Neon database (unused) until the new server's backups have run
  and a restore was tested; deleting them is the owner's decision. Their `*.vercel.app` addresses
  still answer and write to Neon: do not use them.
- The suspended Blob store stays as it is (ADR-043).
- Move R2's public address from `r2.dev` to a custom domain (`R2_PUBLIC_URL` in `.env.production`,
  then `./deploy.sh`); the bucket's CORS rules must allow the site.

## Rehearsal

The database steps 2–6 and the migration of step 7 were rehearsed on 2026-10-20 with a local
development database standing in for Neon
(one migration behind the release): `pg_dump --format=custom --no-owner --no-acl` from the
`postgres:18.6` image listed 46 tables under `TABLE DATA` and only `pg_trgm` among the
extensions; `pg_restore --no-owner --no-acl --exit-on-error` into a fresh stack finished without
errors; `prisma migrate status` named the one missing migration; the counts of all 46 tables were
identical; `prisma migrate deploy` then added the missing (empty) table and left every other count
unchanged. Neon itself was not contacted.
