# Customer journeys

The journeys a customer takes through TERAN, and where each step is verified automatically. All
of them run on disposable databases (`teran_test` for API integration tests, `teran_e2e` for the
browser tests, which use production builds with online payments in **demo mode**). Commands:

```bash
pnpm --filter @teran/api test:integration
pnpm --filter @teran/e2e build:stack && pnpm test:e2e
```

## The full journey (browser, `e2e/tests/journey.spec.ts`)

| #   | Step                                                                   | Checked                                                                                      |
| --- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | A visitor opens a category page and adds a product to the bag          | Category page from the tree; bag drawer shows the product                                    |
| 2   | Refreshes the page                                                     | Bag still has 1 item; nothing about the session or bag is in `localStorage`                  |
| 3   | Registers from the header ("Register")                                 | Header shows Sign in / Register to visitors                                                  |
| 4   | Arrives in the account                                                 | Bag still has 1 item; the header shows the account menu                                      |
| 5   | Checks out with Click, saving the address                              | Online methods are labelled "Demo · no money is charged"; server total on the button         |
| 6   | Demonstration payment page: declines the payment                       | No card fields anywhere; clearly labelled; result "Payment failed"                           |
| 7   | Returns to the order and retries with Payme; the demo payment succeeds | Nothing marked paid on return; "Waiting for payment" with the failure message; method switch |
| 8   | Order page                                                             | "Payment received" and "no money was charged" (demo)                                         |
| 9   | Order history and address book                                         | The order is listed; the checkout address was saved                                          |
| 10  | Order detail                                                           | Status history; both attempts (Click failed, Payme paid)                                     |
| 11  | Signs out from the header menu and signs back in                       | Back to Sign in / Register; after signing in the order is still listed                       |
| 12  | Another customer opens the order's URL and the API                     | "Page not found" and HTTP 404 — no other customer's data                                     |
| 13  | Staff open the order in the admin                                      | Payments panel lists the attempts as "Demo (simulated)", "no money moved"                    |

Also in that file: a visitor without a session who opens a private account page gets a 307 to
sign-in (with `next`) before anything renders.

## Other browser journeys

| File                    | Journey                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `categories.spec.ts`    | Category pages load directly and after a refresh; breadcrumbs follow the tree; an attribute filter ("Flavoured") is kept in the URL and survives a reload; old `/catalog/<slug>` addresses answer 308; a category created through the admin API appears in the Shop menu and gets its page, and disappears (404) when deactivated; catalogue changes need a staff session |
| `checkout.spec.ts`      | Guest cash-on-delivery order, validation, status link, forged token, empty bag afterwards                                                                                                                                                                                                                                                                                 |
| `account.spec.ts`       | Register, profile (account → Profile), sign out and in, text typed before hydration, off-site `next` ignored                                                                                                                                                                                                                                                              |
| `catalogue.spec.ts`     | Search; filters, price range and sort on `/tea/pu-erh` kept in the URL                                                                                                                                                                                                                                                                                                    |
| `admin.spec.ts`         | Admin closed to visitors and customers; product created, shown, restocked; guest order fulfilled and cash recorded                                                                                                                                                                                                                                                        |
| `mobile.spec.ts`        | Phone menu, catalogue, sticky purchase bar, bag and checkout without sideways scrolling                                                                                                                                                                                                                                                                                   |
| `accessibility.spec.ts` | axe WCAG 2.2 AA on storefront pages including `/en/tea`, `/en/tea/black-tea`, `/en/gift-sets`, and admin pages including categories and product types                                                                                                                                                                                                                     |

## API journeys (integration tests)

| File                             | Covers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `account.int-spec.ts`            | Guest bag kept on **registration** (today's prices) and merged on **login** (combined, capped at stock, no duplicates, device lines first); signing in twice merges once; shared device: a later visitor neither sees nor takes over the previous customer's bag, which comes back when they sign in; dead session cookie cleared; another visitor's cart line cannot be changed; every account route needs a session; address book (default, ownership, Uzbek validation, limit of 10); truthful summary; filters; purchases; customer A cannot read or reorder customer B's order; reorder at today's prices without ordering; e-mail change needs the password and signs out other devices; sign out other devices |
| `payments-demo.int-spec.ts`      | Demo options labelled; online order awaiting payment with stock reserved; idempotent checkout returns the same order and payment; returning proves nothing; failure → retry with another method → paid; a failed payment never becomes paid; cancel and pending outcomes; only the owner or link holder can start a payment; one open attempt per order (database and concurrent requests); expiry cancels the order and returns stock, idempotently; grace period for payments in progress; provider callbacks refused in demo mode; admin sees attempts and records a refund (customers cannot); admin cancellation closes the attempt and keeps staff notes internal                                               |
| `payments-providers.int-spec.ts` | Live mode with test-only credentials: Click and Payme live, cards unavailable (orders refused); Payme checkout link format; Payme auth, parse and method errors; order and amount validation; create, perform and refund with identical answers to repeated calls; second transaction refused; cancel then retry; perform refused after the payment window; unknown transactions; Click payment link; signature, order, amount and action errors; prepare and complete once with documented repeat answers; failed payment never completed; completion after the window cancelled                                                                                                                                     |
| `catalog-tree.int-spec.ts`       | New category visible only while active; category pages, subcategory products under the parent, redirects for flat, mis-parented and renamed paths; reserved slugs and the two-level rule; attribute filters with facets and pagination; typed values validated, required on publish; product page attributes and breadcrumbs; product types protected while in use; staff-only changes; cross-category collection; mixed-category bag and order; purchase-time snapshots after rename, reprice, archive; product slug redirects; gift-set stock independent of its teas; sitemap and suggestions with paths                                                                                                           |

## Unit tests for the rules behind them

`cart-merge.spec.ts` (merge rules), `payment-state.spec.ts` (state machine, awaiting payment),
`payme-protocol.spec.ts` and `click-protocol.spec.ts` (authentication, signatures, link formats,
including the example from Payme's documentation), `attribute-filters.spec.ts` and
`product-attributes.spec.ts` (filter parsing, facets, value validation, search terms),
`account.service.spec.ts` (device names), `env.spec.ts` (demo payments refused in production,
half-configured providers), and on the web `account-redirect.test.ts` (proxy sign-in redirect)
and `query.test.ts` (attribute filters in the URL).

## What these tests do not prove

- Click and Payme were exercised with simulated calls built from their documentation, not against
  the providers. Payme's sandbox and Click's test suite must be run on a staging deployment with
  real merchant credentials before going live ([setup](../deployment/payment-provider-setup.md)).
- Fiscal receipts are not implemented; card payments have no gateway.
- Browser tests run in Chromium only (desktop and a phone profile).
