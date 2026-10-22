# Security

What the platform protects, how, and what is deliberately not done yet. Every control below is
implemented in the repository; file references point at the code.

**Assets:** customers' personal data (name, phone, address, e-mail), staff accounts and the admin
functions behind them, order integrity (prices, totals, payment status), stock levels, and the
secrets that tie the services together.

**Principles:** the server is authoritative for prices, stock and order state; configuration fails
closed in production; least privilege for staff roles, containers and the network; no third-party
code or origins in the browser; personal data and secrets stay out of logs and URLs where possible.

## Authentication

| Control          | Implementation                                                                                                                                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Password hashing | Argon2id (`@node-rs/argon2`), memory 19 MiB, 2 iterations, parallelism 1 (`apps/api/src/auth/password.ts`). A malformed stored hash counts as a failed check.                                                                     |
| Password policy  | 10–128 characters (`packages/contracts/src/auth.ts`). No composition rules, no breached-password check.                                                                                                                           |
| Unknown accounts | Unknown e-mail, wrong password and inactive account give the same `401 INVALID_CREDENTIALS`; unknown e-mails are verified against a dummy hash so timing matches.                                                                 |
| Lockout          | 5 consecutive failures lock the account for 15 minutes. A locked account receives the same `429 RATE_LIMITED` code and message as IP throttling and the password is still verified, so neither content nor timing singles it out. |
| Per-IP limits    | Login 10/min, registration 5/h, password change 5/15 min, forgot password 5/h, reset 10/h (`apps/api/src/auth/auth.controller.ts`).                                                                                               |
| Staff sign-ins   | Recorded in the audit log (`auth.staff_login`).                                                                                                                                                                                   |

Whether an e-mail address is registered is not treated as secret: registration answers
`409 EMAIL_TAKEN`, which customers need. The controls above avoid leaking anything beyond that,
for example whether a password was right or an account is locked.

## Sessions and cookies

- Opaque 256-bit random tokens; the database stores only their SHA-256 (`Session.tokenHash`), so
  a database leak does not reveal usable sessions (`apps/api/src/auth/session.service.ts`).
- Cookies (`apps/api/src/common/cookies.ts`): `__Host-teran_session` and `__Host-teran_cart` in
  production (`COOKIE_SECURE=true` is enforced), `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`,
  no `Domain`.
- Lifetime fixed at sign-in: 30 days for customers (`SESSION_TTL_DAYS`), 12 hours for staff
  (`STAFF_SESSION_TTL_HOURS`). The role and `isActive` flag are re-read on every request, so a
  role change or deactivation takes effect immediately.
- Signing in replaces any session the browser already had (also on registration). Password
  change, password reset and staff deactivation delete all of the user's sessions.
- Expired sessions, expired carts and spent reset tokens are deleted hourly
  (`apps/api/src/maintenance/maintenance.service.ts`).
- A session cookie that no longer matches a session (expired or revoked) is cleared by the API on
  the next request (`session.middleware.ts`).
- Customers see their signed-in devices (browser and system only: no ids, no IP addresses) and can
  sign out of every other device; changing the sign-in e-mail requires the current password and
  signs out the other devices (`apps/api/src/account`).
- **Carts are private to their owner** (`CartService.findCart`): a guest cart belongs to whoever
  holds its cookie, an account's cart only to that account's session. On a shared device a later
  visitor neither sees nor takes over the previous customer's cart; signing in merges only a guest
  cart (or the customer's own), in one transaction that cannot run twice
  ([cart and account](cart-and-account.md)).

## Password reset

- 256-bit token, SHA-256 stored, valid 60 minutes, single use (conditional update), all older
  unused tokens deleted when a new one is issued. A successful reset clears the lockout and signs
  out every session; the user then signs in normally.
- The forgot-password endpoint answers `202` for any address, and creates the token and sends the
  e-mail only after answering, so response time does not reveal whether the account exists.
- Links are built from the configured `WEB_ORIGIN`, never from request headers.
- With `MAIL_TRANSPORT=disabled` the feature is switched off (`503 FEATURE_DISABLED`) and the
  storefront hides the link. The `log` transport, which would write reset links to the log, is
  refused in production.

## Authorisation

- Global `AuthGuard` with `@RequireAuth()` and `@RequireStaff(roles)` decorators
  (`apps/api/src/auth/auth.guard.ts`). Routes are public unless decorated; every admin controller
  is decorated at class level.
- Roles: `CUSTOMER`, `MANAGER` (day-to-day operations), `ADMIN` (additionally staff accounts,
  settings, delivery prices, CSV exports and the audit log).
- Staff safeguards (`apps/api/src/admin/people.service.ts`): administrators cannot demote or
  deactivate themselves, and the last active administrator cannot be removed. Registration always
  creates customers; promoting a customer requires the server-side CLI (`--promote`).
- Customers only ever see their own orders (`where: { userId }`) and their own cart lines.
- The admin layout redirects visitors and shows a "staff only" page to customers, but it is not
  the security boundary; the API enforces every rule.

## Audit log

Every staff change (products, categories, collections, stock, orders, payments, enquiries,
delivery methods, articles, staff, settings) and every export and staff sign-in writes an
`AuditLog` row with actor, action, entity, JSON metadata and IP. Most are written in the same
transaction as the change. The log is append-only by convention: the application never updates
or deletes it, but it shares the database role with the API.

## CSRF and CORS

- **Origin check** (`apps/api/src/common/security/origin-check.middleware.ts`): every request
  other than `GET`, `HEAD` and `OPTIONS` must carry an `Origin` equal to `WEB_ORIGIN` (or one of
  `CORS_EXTRA_ORIGINS`); without `Origin`, `Sec-Fetch-Site` must not be `cross-site`. Otherwise
  `403 INVALID_ORIGIN`. Browsers always send at least one of these headers on such requests, so a
  request with neither comes from a server or a tool, not from a cross-site page riding on a
  visitor's cookies.
- Combined with `SameSite=Lax` cookies, no CSRF tokens are needed.
- **CORS** allows only the configured origins with credentials. In production the browser calls
  the API on the same origin through Nginx, so CORS is not exercised at all.

## Rate limiting and abuse

- `@nestjs/throttler`: 120 requests per minute per IP and route by default; stricter limits on
  authentication, checkout (10/min), order lookup (30/min), cart (60/min), saving or deleting a
  product review (10/min), the chat's AI assistant (10/min) and the enquiry and newsletter forms
  (5 per 10 minutes). Responses carry `Retry-After` / `X-RateLimit-*`.
- The AI assistant also answers at most `ASSISTANT_DAILY_LIMIT` questions a day for all visitors
  together (default 2000), so abuse from many addresses cannot run up the Gemini bill; past it the
  chat offers TERAN's messengers, phones and contact page.
- The client IP comes from `X-Forwarded-For` after `TRUST_PROXY_HOPS` trusted proxies (1 = the
  server's Nginx). Nginx replaces any client-supplied `X-Forwarded-For` with the client's address
  (a requirement for the server's configuration, production deployment §7), so the header cannot
  be spoofed (verified on the production stack with Caddy, which behaved the same, and again behind
  Nginx on 2026-10-20).
- The storefront's cached server-side requests carry `X-Internal-Key` (compared in constant time)
  and are exempt; without that, every visitor would share the web server's limit. Nginx strips the
  header from internet requests.
- Forms have a hidden honeypot field; filled-in submissions are acknowledged and discarded.

## Input validation and errors

- Every body, query and route parameter is parsed with the shared Zod contracts
  (`packages/contracts`) by a global pipe; unknown fields are stripped; failures return
  `400 VALIDATION_FAILED` with field-level issues.
- Only JSON bodies are parsed, limited to 100 kB; multipart only on the image upload route.
- Errors follow one shape (`{ statusCode, code, message, issues?, details?, requestId }`). Server
  errors return a generic message; the stack trace is logged with the request id only.
- Prices, totals, stock and payment state are never taken from the client: checkout re-reads
  every price inside the order transaction and refuses a total the customer did not see
  (`409 PRICE_CHANGED`).

## File uploads

Product images (`apps/api/src/media/image-processing.ts`), staff only:

- Size limit `UPLOAD_MAX_BYTES` (default 5 MB), one file per request, at most 12 images per
  product.
- The file is decoded by sharp; the client's MIME type and file name are ignored. JPEG, PNG,
  WebP and AVIF are accepted; at most 40 megapixels (decompression bombs) and at least 200 px.
- Always re-encoded to WebP at fixed widths with EXIF orientation applied and all metadata
  (including GPS) dropped; stored under a random key, with path traversal checks on write and
  delete.
- Served with `nosniff`, `immutable` caching and the API's restrictive CSP.

## HTTP headers and Content Security Policy

**Storefront** (`apps/web/next.config.ts`), production policy:

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://tile.openstreetmap.org; media-src 'self' blob:;
font-src 'self'; connect-src 'self'; object-src 'none';
base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
```

plus `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Cross-Origin-Opener-Policy: same-origin`
and a `Permissions-Policy` that disables camera, microphone, payment and USB and allows
geolocation to this origin only (`geolocation=(self)`), for the store locator's "use my
location" button; the browser still asks the visitor. With Cloudflare R2 the bucket's public
address (`UPLOADS_ORIGIN`) is added to `img-src`, `media-src` and `connect-src`. Nginx adds
`Strict-Transport-Security: max-age=31536000` and hides its version (`server_tokens off`).

**The one third-party origin.** The store locator (`/stores`) draws its map from OpenStreetMap's
tiles, so `img-src` allows `https://tile.openstreetmap.org` (images only: no script, style or
connection reaches it; the browser sends it the page's origin as the referrer, as the tile usage
policy asks). It is allowed on every page rather than on `/stores` alone because a page opened
through an in-app link keeps the policy of the document the visitor first loaded. The map credits
OpenStreetMap's contributors, as its licence requires.

The admin area's address search (Admin → Store addresses, ADR-044) does not loosen the policy: the
browser asks the API (`GET /admin/settings/stores/geocode`, administrators only, rate-limited), and
the API asks OpenStreetMap's Nominatim with an identifying User-Agent, at most once a second, sending
only the address the administrator typed.

**Why `'unsafe-inline'` instead of nonces.** A nonce must be unique per response, which forces
every page to render on each request and gives up static prerendering and the partial
prerendering of Cache Components. Next.js inlines its hydration data, so a static policy has to
allow inline scripts. The policy compensates by allowing no third-party origin for anything that
can run or send data (scripts, styles, fonts, connections and form targets are same-origin only;
the map tiles above are images), by never rendering
user-supplied HTML (journal articles are plain text, rendered as text), and by escaping the only
inline JSON (JSON-LD: `<` is written as `\u003c`). `eval` stays forbidden: the browser runs Zod
in jitless mode (`apps/web/src/instrumentation-client.ts`), so nothing even attempts it. Revisit with nonces or hashes if third-party scripts
are ever required.

**API** (`apps/api/src/configure-app.ts`, helmet): `default-src 'none'` CSP with
`frame-ancestors 'none'`, `Cross-Origin-Resource-Policy: same-site`, `Referrer-Policy:
no-referrer`, HSTS and helmet's other defaults. Swagger UI, when enabled, gets its own policy; it
is disabled in the production Compose file and Nginx does not route it (only `/api/v1/` and
`/uploads/` reach the API).

## Secrets and configuration

- The API validates its environment at start-up and refuses to run in production with insecure
  cookies, the `log` mail transport, a missing `INTERNAL_API_KEY`, an `http` `WEB_ORIGIN`, extra
  origin or `R2_PUBLIC_URL`, half of the R2 settings, or a secret (including the R2 keys) that
  still contains the `.env.example` placeholder (the Gemini key included)
  (`apps/api/src/config/env.ts`). `THROTTLE_DISABLED` is accepted only with `NODE_ENV=test`.
- Secrets live only in git-ignored env files (`.env`, `.env.local`, `.env.production`); the
  repository contains placeholders. `.dockerignore` keeps env files out of image builds, and no
  secret is a build argument.
- `APP_SECRET` is the HMAC key for guest order links (`order-access:<idempotency key>`; only the
  token's SHA-256 is stored) and newsletter unsubscribe links (`newsletter-unsubscribe:<id>`; not
  stored). All token comparisons are constant-time.
- Rotation procedures and their effects: [production deployment](../deployment/production.md#secrets-rotation-and-effects).

## Logging and privacy

- API access logs contain only request id, method, URL, status, duration and the error code of a
  failed request. `token` / `accessToken` query values are replaced with `[redacted]` (also in
  server-error logs and the storefront's API-failure lines); cookies, `Authorization`,
  `Set-Cookie` and `password` fields are removed; no IP addresses or bodies are logged; health
  checks, stored files and CORS preflights are logged only when they fail.
- Nginx's access log (`teran_access` format) records the path without its query string and no
  `Referer`, so tokens in links never reach the disk.
- Pages whose URL carries a token (order status, password reset, newsletter unsubscribe) are
  `noindex, nofollow` and send no referrer; account, cart, checkout, search and admin pages are
  `noindex` and disallowed in `robots.txt`.
- The `next` parameter after sign-in only accepts same-site paths (`apps/web/src/lib/safe-next.ts`).
- CSV exports prefix cells starting with `=`, `+`, `-`, `@`, tab or carriage return so spreadsheets
  do not execute them (`apps/api/src/admin/admin-support.ts`).
- No analytics, tracking pixels or third-party embeds are loaded.
- The chat's AI assistant (ADR-055) sends a visitor's question and the conversation so far to
  Google's Gemini API, from the server (the key, `GEMINI_API_KEY`, never reaches a browser; it goes
  in a header, never in an address). Phone numbers and e-mail addresses are removed from questions
  before they leave; nothing of the conversation is stored or logged (only a failure's reason, such
  as `Gemini answered HTTP 429 RESOURCE_EXHAUSTED`). What the assistant is told is public data only:
  the catalogue, contacts, stores, delivery methods and TERAN's text from Admin → Settings, which
  the form says may be told to visitors. Its answers are plain text, and only products and
  categories that are visible become cards and links. Google's unpaid tier may use questions to
  improve its products; a key on a paid (billing) project does not.

## Accounts, orders and payments

- Every `/api/v1/account` route requires a session and acts only on the session's own user; no
  route takes a user id. Another customer's order or address answers 404, like a missing one
  (integration-tested with two customers). Guest orders are never attached to an account that
  registers later with the same e-mail.
- Order numbers are random (`TRN-` + 8 base-32 characters), not sequential.
- Guest order pages require the order's secret token; an unknown number and a wrong token get the
  same 404, and lookups are limited to 30 per minute per IP. Starting a payment for an order needs
  the signed-in owner or that token.
- Customer order views never include staff notes, internal ids or provider internals.
- Only staff can record a cash payment or a refund, audited. No customer request can mark an order
  paid: online payments become `PAID` only from an authenticated provider confirmation — Payme's
  Basic auth with the cashbox key (constant-time) from Payme's documented addresses, Click's MD5
  signature over the received values with the secret key (constant-time) — with the amount and
  currency checked against the order, idempotent handling of repeated calls, and a conditional
  state machine; returning from a payment page changes nothing
  ([payments](payments.md)).
- At most one open payment attempt per order (database index), so the same order cannot be charged
  twice by TERAN; confirmations for closed attempts are refused, so the provider does not keep the
  money. Unpaid online orders expire and return their stock.
- No card data is collected, stored or logged: customers pay on the provider's hosted page.
- Provider keys are API-only environment variables, validated at start-up, never sent to the
  browser; the `Authorization` header is removed from request logs and provider request bodies are
  not logged. Demo payments are refused in production unless explicitly allowed, and real and
  simulated payments never run side by side.

## Catalogue administration

- Category, product type and product changes require a staff session (`@RequireStaff`);
  integration and end-to-end tests check 401/403 for visitors and customers.
- Admin text (category text, product descriptions, attribute values) is stored and rendered as
  plain text, never as HTML; attribute values are validated against their typed definitions, and
  attribute filter keys and values are validated before they reach a query.

## Infrastructure

See [production deployment](../deployment/production.md). In short: only the server's Nginx faces
the internet; the API and the storefront are published on 127.0.0.1 for it, and PostgreSQL sits on
an internal network, never published; API and web run as the unprivileged `node` user without
package managers, with all capabilities dropped and `no-new-privileges`; the API filesystem is
read-only apart from the uploads volume; the revalidation webhook is unreachable from the internet;
certificates come from Let's Encrypt through the server's certbot.

## Supply chain

- Exact versions for every dependency, a committed lockfile and `--frozen-lockfile` installs.
- Install scripts are blocked except for the reviewed Prisma engines (`allowBuilds` in
  `pnpm-workspace.yaml`).
- Base images are pinned to exact versions. GitHub Actions are pinned to commit SHAs, run with
  `contents: read` and do not persist credentials. CI audits production dependencies
  (`pnpm audit --prod --audit-level high`) and never deploys.

## Known gaps and recommendations

| Gap                                                                 | Recommendation                                                                     |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| No multi-factor authentication                                      | Add TOTP or passkeys for staff accounts first.                                     |
| No CAPTCHA; forms rely on rate limits and a honeypot                | Add a privacy-friendly challenge if spam appears.                                  |
| Account lockout can be triggered by anyone who knows an e-mail      | Acceptable at current scale; consider per-IP-and-account limits if abused.         |
| No e-mail verification at registration; newsletter is single opt-in | Use double opt-in in the e-mail tool the exported list is imported into.           |
| No breached-password check or security notification e-mails         | Add once SMTP is configured in production.                                         |
| Sessions have no idle timeout                                       | Staff sessions are short (12 h); customers can sign out other devices.             |
| No notification to the old address when the sign-in e-mail changes  | Add once SMTP is configured in production.                                         |
| Payme and Click not yet run against the providers                   | Run Payme's sandbox and Click's test suite on staging before going live.           |
| Rate-limit counters are in memory per API process                   | Use a shared store (e.g. Redis) before running several API replicas.               |
| Audit log shares the database role with the API                     | Grant the API `INSERT`/`SELECT` only on `AuditLog` with a separate migration role. |
| CSP allows inline scripts (see above)                               | Revisit with nonces if third-party scripts are ever added.                         |
| HSTS without `includeSubDomains`/`preload`                          | Add both once every subdomain serves HTTPS.                                        |
