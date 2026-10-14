# Cart, sign-in and the customer account

How a visitor's bag, signing in, the account area and order history work, and the rules that keep
one customer's data away from another. Code: `apps/api/src/cart`, `apps/api/src/auth`,
`apps/api/src/account`, `apps/web/src/app/[locale]/(store)/account`.

## Signed-in state in the header

The header knows who is signed in **in the same response as the page** (`SiteHeader` →
`loadAccount()`), streamed into a fixed-size slot so nothing shifts:

- without a session cookie no request is made at all and the slot shows **Sign in · Register**;
- with one, a single `GET /auth/me` decides between the customer's **account menu** (My account,
  My orders, Saved addresses, Administration for staff, Sign out) and the signed-out links (an
  expired or revoked session counts as signed out).

The menu is a `<details>` disclosure: it opens with Enter, Space or a click even before the page is
interactive; Esc closes it and returns focus, a click outside or a followed link closes it. The
phone menu drawer shows the same links.

### Why sign-in used to feel slow (fixed)

The header had no sign-in link, only an account icon pointing at the protected dashboard. A visitor
went `/account` → empty dashboard skeleton → API call → redirect → `/account/login` → second
skeleton → API call → form: about 1.06 s with 150 ms latency. Now:

- the header links straight to `/account/login`;
- the proxy (`apps/web/src/proxy.ts`, `lib/account-redirect.ts`) sends a visitor **without a
  session cookie** from any private account page to sign-in with a 307 before rendering
  (`?next=` keeps the destination);
- the sign-in and registration pages only ask the API who is signed in when a session cookie is
  present (`currentUser()`), so their form is in the first HTML response.

A session cookie that is no longer valid is cleared by the API on the next request, so the browser
stops presenting it.

## The bag (cart)

- Stored on the **server** (`Cart`, `CartItem`), identified by an opaque 256-bit token in an
  HttpOnly, SameSite=Lax cookie (`__Host-teran_cart` over HTTPS, 30-day sliding expiry). Only the
  token's SHA-256 is stored. Browser storage holds nothing: no prices, no identity, no tokens.
- Every read re-prices and re-validates each line against the catalogue (`evaluateCartLine`):
  unavailable products and out-of-stock lines are flagged, quantities above stock are reduced for
  display, and checkout refuses a bag that cannot be ordered as shown.
- **Ownership**: a guest bag belongs to whoever holds its cookie; a bag attached to an account is
  visible only to that account's session (`CartService.findCart`). A cart line can only be changed
  in the caller's own cart (every query is scoped by cart id). So on a shared device the next
  visitor never sees — or takes over — the previous customer's bag.
- Signing out drops the bag cookie; the bag stays on the account for the next sign-in.

### Bag on sign-in and registration (merge rules)

`AuthService.attachCart`, run after both login and registration:

1. If the device's bag belongs to another account, its cookie is dropped and never attached.
2. A guest bag (or the customer's own) on this device is attached to the account. If the account
   also has a bag from an earlier visit, the two are merged by `mergeCartLines`:
   - the same variant in both becomes one line with the quantities added;
   - the result is capped at the per-line limit and at the stock available now; unavailable or
     out-of-stock lines are kept (flagged) for the customer to see;
   - at most 30 lines: the device's lines first (most recent intent), then the account's;
   - prices are never merged — the bag is priced from the catalogue when read.
3. The merge runs in **one transaction**. The account bag is deleted inside it and the merge only
   continues if that delete removed exactly one row, so a repeated or concurrent sign-in cannot
   merge twice. The guest bag is updated in place (never destroyed); if anything fails, the
   transaction rolls back, both bags stay as they were, the sign-in still succeeds and the merge is
   tried again at the next sign-in.
4. A customer signing in on a new device without a bag gets their account bag back.

Guest orders are **not** attached to an account that registers later with the same e-mail address:
an order is visible to an account only if it was placed while signed in to it.

## Account area

`/account` (overview), `/account/orders`, `/account/orders/[number]`, `/account/purchases`,
`/account/addresses`, `/account/profile`, `/account/security`. Every page checks the session on the
server (the proxy only short-cuts visitors without a cookie). Every API route under
`/api/v1/account` requires a session and acts only on the session's own user — no route accepts a
user id, and another customer's order or address answers 404, exactly like a missing one.

| Page      | Content (all from the API, nothing invented)                                                                                                                                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Overview  | Name, customer-since date, counts of orders / orders in progress / saved addresses, orders waiting for payment, the three latest orders.                                                                                                                           |
| Orders    | Filters (all, in progress, delivered, cancelled), 10 per page, number, date, items, status, payment status, total.                                                                                                                                                 |
| Order     | Payment block when an online payment is still due (deadline, retry with another method), progress, cancel reason, items and totals as recorded at purchase, delivery and contact, payment attempts, status history (no staff notes), "Add these items to the bag". |
| Purchases | Products bought in non-cancelled orders (last 500 lines), with times bought and whether the same pack is on sale today.                                                                                                                                            |
| Addresses | Up to 10 addresses (label, recipient, phone, region, city, address, landmark), one default; add, edit, delete, make default. Chosen at checkout to fill in delivery details; checkout can also save the address it used.                                           |
| Profile   | Name, phone, preferred language; e-mail change (current password required, other devices signed out).                                                                                                                                                              |
| Security  | Password change (signs out other devices), signed-in devices (browser and system only — no ids, no IP addresses), "sign out of all other devices", whether password reset by e-mail is available.                                                                  |

### Reorder

`POST /account/orders/:number/reorder` puts the order's items back in the bag **at today's prices
and stock**: products no longer sold or out of stock are reported and skipped, quantities are
capped by stock and the bag's limits. Nothing is ordered; the customer checks out as usual. Order
history itself always shows the purchase-time snapshot (names, pack sizes, unit prices, totals),
never today's prices.

### Password reset

Unchanged: reset by e-mail exists only when SMTP is configured (`GET /auth/features`); otherwise
the sign-in page has no "Forgot your password?" link and the security page says that reset is not
available. Changing the password or resetting it signs out every other session.

## Guest orders

A guest order is reachable only through its secret link (`/orders/:number?token=…`; the token is an
HMAC of the order's idempotency key, only its SHA-256 is stored). Order numbers are random
(`TRN-` + 8 Crockford base32 characters), never sequential. The payment return page and the demo
payment page use their own per-attempt secrets.
