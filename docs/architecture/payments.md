# Payments

How TERAN takes payment for an order: cash on delivery, Click, Payme and (later) bank cards.
Everything here is implemented in `apps/api/src/payments` and verified by
`apps/api/test/payments-demo.int-spec.ts`, `apps/api/test/payments-providers.int-spec.ts` and
the unit tests next to the code. Setting up the real providers is described in
[../deployment/payment-provider-setup.md](../deployment/payment-provider-setup.md).

> **Status (2026-10-14).** Click and Payme are implemented from their official documentation and
> tested against simulated provider calls built exactly to those specifications. They have **not**
> been run against Click or Payme themselves: no merchant credentials exist yet. Card payments
> (Visa) have **no gateway**: the method is shown as unavailable outside demo mode. Fiscal receipts
> (required for online sales in Uzbekistan) are **not** implemented. See "Before going live".

## Principles

1. **Only the API decides whether an order is paid**, and only from a provider's authenticated
   server-to-server confirmation (or staff recording cash). Returning from a payment page proves
   nothing: the return page only shows what the API recorded.
2. **No card data reaches TERAN.** Customers pay on the provider's hosted page. The database has no
   column for card numbers, expiry dates or CVV, and nothing logs them.
3. **Real and simulated payments are never mixed.** `PAYMENT_PROVIDER_MODE` is either `live` (real
   providers only) or `demo` (every online method simulated). In demo mode no provider is
   contacted and provider callbacks are refused.
4. **A method is offered only when it can actually be processed.** Otherwise it is shown as
   unavailable (or not at all).
5. **Secrets stay on the server**: provider keys are API environment variables, never sent to the
   browser, never logged (the `Authorization` header is redacted from request logs, provider
   request bodies are not logged).
6. **Stock is never held indefinitely**: an online payment has a deadline; when it passes, the
   order is cancelled and its stock returned automatically.

## Methods, providers and availability

| Method (`PaymentMethod`) | Live provider | Live availability                                                        | Demo mode          |
| ------------------------ | ------------- | ------------------------------------------------------------------------ | ------------------ |
| `CASH_ON_DELIVERY`       | `CASH`        | always (staff record the cash)                                           | unchanged (`CASH`) |
| `CLICK`                  | `CLICK`       | when `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_SECRET_KEY` are set | `DEMO`             |
| `PAYME`                  | `PAYME`       | when `PAYME_MERCHANT_ID` and `PAYME_KEY` are set                         | `DEMO`             |
| `CARD` (Visa)            | none yet      | **never** — no card gateway is integrated                                | `DEMO`             |

`PAYMENT_METHODS_ENABLED` lists the methods the store presents, in order. `GET /checkout/options`
returns each with its availability (`live`, `demo`, `unavailable`); checkout shows unavailable
methods disabled ("Not available yet") and demo methods labelled "Demo · no money is charged".
The API refuses an order or a payment attempt for a method that is not available
(`PAYMENT_METHOD_UNAVAILABLE`), whatever the browser sends. The decision lives in one place:
`PaymentConfig.providerFor()`.

Demo mode is refused at start-up in production unless `ALLOW_DEMO_PAYMENTS=true` records the
decision explicitly (`apps/api/src/config/env.ts`). Half-configured providers (a Payme ID without
a key, two of the three Click values) also stop the API at start-up.

## Payment attempts

An order has one or more **payment attempts** (`Payment` rows): the first is created with the
order; a customer whose online payment failed can start another (same or different online
method). `Order.paymentStatus` always mirrors the latest attempt.

- **At most one open attempt per order** (`PENDING`, `REQUIRES_ACTION`, `PROCESSING`), enforced by
  the partial unique index `Payment_one_open_attempt_per_order`. Starting a new attempt closes the
  open one in the same transaction; two concurrent starts cannot both succeed. This is what makes a
  duplicate charge impossible on TERAN's side: a provider confirmation for a closed attempt is
  refused (Payme: `-31008`, Click: `-9`), so the provider does not take the money.
- At most 10 attempts per order.
- Every status change is recorded in `PaymentEvent` (from, to, source — customer, provider, staff,
  system, demo — detail and acting staff member). Staff see this history in the admin order page.
- Each online attempt has a secret link token (an HMAC of the attempt id with `APP_SECRET`; only
  its SHA-256 is stored) for its return page and, in demo mode, its demo page.

### State machine

Enforced by `transitionPayment()` (`payment-state.ts`) with `PAYMENT_STATUS_TRANSITIONS` from
`@teran/contracts`; every update is conditional on the status the caller read, so a provider
callback racing the expiry job (or a second callback) cannot apply twice.

```
            ┌──────────────► PROCESSING ─────┐
 PENDING ───┤                    │            ├──► PAID ──► REFUND_PENDING ──► REFUNDED
   │        └──► REQUIRES_ACTION ┘            │      │            │              ▲
   │                    │                     │      └────────────┴──► PARTIALLY_REFUNDED
   └──────┬─────────────┴─────────────────────┘
          ▼
   FAILED · CANCELLED · EXPIRED   (terminal: a failed payment never becomes paid)
```

| Status                                             | Meaning                                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `PENDING`                                          | Created; cash on delivery stays here until staff record the cash.                     |
| `REQUIRES_ACTION`                                  | The customer must pay on the provider's (or demo) page.                               |
| `PROCESSING`                                       | The provider has opened a transaction (Payme CreateTransaction, Click Prepare).       |
| `PAID`                                             | Money captured (provider confirmation) or cash recorded by staff.                     |
| `FAILED`                                           | The provider reported a failure (declined card, Click error).                         |
| `CANCELLED`                                        | Cancelled by the customer, the provider, a replacement attempt or staff.              |
| `EXPIRED`                                          | The payment window ended before payment.                                              |
| `REFUND_PENDING`, `PARTIALLY_REFUNDED`, `REFUNDED` | Money returned (Payme cancellation of a performed transaction, or recorded by staff). |

### Payment window and stock

Stock is reserved when the order is placed (unchanged from before). For an online order the first
attempt gets `expiresAt = order time + ONLINE_PAYMENT_WINDOW_MINUTES` (default 30, 10–1440). Later
attempts keep the same deadline, so retrying never extends how long stock is held.

`PaymentExpiryService` runs `PaymentsService.expireOverdue()` every minute in every API process
(idempotent; all changes are conditional):

- `PENDING`/`REQUIRES_ACTION` attempts past `expiresAt`, and `PROCESSING` attempts past
  `expiresAt` + 15 minutes (someone may be paying at that moment), become `EXPIRED`;
- if nothing else can still pay the order and it is still `PENDING`, the order is cancelled
  (`cancelReason = PAYMENT_NOT_COMPLETED`, shown to the customer as "payment not completed"), its
  stock returned with `ORDER_CANCELLED` ledger entries, and a status event written;
- orders staff have already confirmed are left alone (staff decide).

## Customer flow

```
checkout ──POST /checkout/orders──► order + attempt (REQUIRES_ACTION)
   │                                 response.payment.redirectUrl
   ▼
window.location → provider page (Click / Payme)  or  /payments/demo/<token> (demo)
   │                         │
   │        provider ──server to server──► /api/v1/payments/{payme|click/...}  → PAID / FAILED …
   ▼
/payments/return/<token> ──► GET /payments/return ──► redirect to the order page
                                                        (shows the status the API recorded)
```

- The redirect is a top-level navigation, so the strict CSP (`form-action 'self'`,
  `connect-src 'self'`) is unchanged.
- The order page (guest link or account) shows "Waiting for payment" with the deadline, the last
  attempt's outcome, and "Pay with …" to start another attempt (`POST /orders/:number/payments`,
  allowed for the signed-in owner or with the guest link token).
- A cart is emptied when the order is placed: the items are held by the order until it is paid or
  expires. If it expires, "Add these items to the bag" (account) puts them back at today's prices.

## Adapter responsibilities

Each online provider is a `PaymentProviderAdapter` (`apps/api/src/payments/providers/payment-provider.ts`):
`paymentAdapters(config)` returns only the adapters usable with the current configuration — the
demo adapter alone in demo mode, and in live mode only providers whose credentials are set — so a
link to an unconfigured or real provider in demo mode can never be produced. Callback verification
lives in each provider's endpoint, because the protocols have nothing in common.

| Responsibility    | Demo                              | Payme                                                                                   | Click                                                            |
| ----------------- | --------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Create session    | attempt + demo page link          | attempt + checkout link (`paymeCheckoutUrl`)                                            | attempt + payment link (`clickPaymentUrl`)                       |
| Initiate checkout | `/payments/demo/<token>`          | `https://checkout.paycom.uz/<base64 params>`                                            | `https://my.click.uz/services/pay?…`                             |
| Verify callback   | secret link token                 | Basic auth with the cashbox key + documented IP range                                   | MD5 `sign_string` with the secret key                            |
| Query status      | from the database                 | Payme pushes status (`CheckTransaction` is Payme → TERAN)                               | Click pushes status (Prepare/Complete)                           |
| Cancel            | customer outcome on the demo page | Payme `CancelTransaction`; local attempts expire or are replaced                        | Complete with `error < 0`; local attempts expire or are replaced |
| Refund            | staff "Record refund" (simulated) | made in the Payme cabinet → `CancelTransaction` on a performed transaction → `REFUNDED` | made in the Click cabinet, then staff "Record refund"            |

## Demo provider

`PAYMENT_PROVIDER_MODE=demo`. The demo page (`/[locale]/payments/demo/[token]`) shows the order,
amount and method, says plainly that it is a demonstration, never asks for card details, and offers
four deterministic outcomes (`POST /payments/demo`): success → `PAID`, failure → `FAILED`
(`DEMO_DECLINED`), cancel → `CANCELLED` (`CUSTOMER_CANCELLED`), pending → `PROCESSING`. Attempts are
stored with provider `DEMO`; the order page, the account and the admin label them "Demo" / "Demo
(simulated): no money moved". When the API runs in live mode the demo endpoints answer 404, so a
leftover demo link can never complete a payment on a live site.

## Payme (Merchant API)

Source: https://developer.help.paycom.uz (protocol, request and response format, errors, methods,
data types, sandbox). Endpoint: `POST /api/v1/payments/payme` (JSON-RPC 2.0, HTTP 200 for every
answer, errors with Russian, Uzbek and English messages).

- **Authentication**: `Authorization: Basic base64(login:key)`, compared in constant time; the
  login is `PAYME_LOGIN` (default `Paycom`, as in Payme's official server template — confirm with
  Payme), the key is the cashbox key (`PAYME_KEY`; `TEST_KEY` for the sandbox). Requests from
  outside Payme's documented addresses 185.234.113.1–15 are refused unless `PAYME_CHECK_IP=false`.
  Failures answer `-32504`.
- **Account**: the cashbox's account field must be named `order_id`; its value is the TERAN order
  number. **Amounts** are in tiyin and must equal the order total × 100 (`-31001` otherwise).
- **Methods**: `CheckPerformTransaction` (order exists `-31050`, payable `-31051`, amount),
  `CreateTransaction` (creates or reuses the order's open Payme attempt → `PROCESSING`; a second
  open Payme transaction for the order → `-31008`, as Payme's sandbox expects; transactions older
  than 12 hours → `-31008`), `PerformTransaction` (→ `PAID`; refused with `-31008` and the
  transaction cancelled with reason 4/3 if the attempt expired, was replaced or the order was
  cancelled), `CancelTransaction` (state 1 → `-1`, attempt `CANCELLED`; state 2 → `-2`, attempt
  `REFUNDED`; `-31007` is never returned because cancellations of performed transactions are
  refunds TERAN staff start in the Payme cabinet), `CheckTransaction`, `GetStatement` (field
  `transactions`, as in every example of the documentation).
- **Idempotency**: Payme repeats calls; `PaymeTransaction` stores Payme's id, times (milliseconds,
  exactly as returned), state and reason, and repeated calls get the stored answer. A concurrent
  duplicate `CreateTransaction` is resolved by the unique `paymeId`.
- **Not implemented**: `SetFiscalData` and `ChangePassword` answer `-32601` (method not found)
  rather than pretending to store data; checkout `detail` (fiscal items) is not sent.
- Documentation discrepancies noted during implementation: the CheckPerformTransaction and
  CheckTransaction pages have swapped URLs; the sandbox expects `-31008` where Payme's template
  returns `-31050` for a second transaction on an order (TERAN follows the sandbox).

## Click (SHOP API)

Source: https://docs.click.uz (payment button, SHOP API requests and errors, Merchant API).
Endpoints: `POST /api/v1/payments/click/prepare` and `/complete` (form-encoded; JSON answers).

- **Authentication**: `sign_string = md5(click_trans_id + service_id + SECRET_KEY +
merchant_trans_id [+ merchant_prepare_id] + amount + action + sign_time)` over the exact strings
  received, compared in constant time (`-1` on mismatch). The service id must match
  `CLICK_SERVICE_ID`; missing or malformed fields answer `-8`.
- **Order and amount**: `merchant_trans_id` is the order number (`-5` if unknown); the amount (in
  sum) must match the order total within 0.01, as Click's reference implementation allows (`-2`).
- **Prepare** (`action=0`): creates or reuses the order's open Click attempt → `PROCESSING`, stores
  a `ClickTransaction` and answers its integer `merchant_prepare_id`. Repeats get the same id; an
  already paid order answers `-4`; a cancelled or no-longer-payable order `-9`.
- **Complete** (`action=1`): checks the prepare id belongs to this `click_trans_id` and order
  (`-6`), then marks the attempt `PAID` (`merchant_confirm_id` = prepare id). A repeat answers
  `-4`. With `error < 0` Click reports a failed payment: the attempt becomes `FAILED` (or a paid
  one `REFUNDED`, as Click's test scenario 8 requires) and the answer is `-9`. A completion for an
  attempt that expired, was replaced or whose order was cancelled answers `-9`, so Click does not
  keep the money.
- **Not implemented**: the Merchant API (payment status, reversal, card tokens, fiscal data) — it
  needs `merchant_user_id` and is not required for checkout. Refunds are made in the Click merchant
  cabinet and recorded by staff.
- Documentation discrepancy: Click's Postman scenario 8 expects `-9` for `error < 0` on an
  already confirmed payment where the PHP reference returns `-4`; TERAN follows the test suite.

## Cards (Visa)

No card acquirer or gateway is integrated, so `CARD` is unavailable in live mode (and the Visa
label never implies otherwise). Options found in official sources (2026-10-14), none verified with
a contract: Payme Business lists Visa/Mastercard acceptance for its own channels (whether Payme's
hosted checkout shows Visa for a Merchant-API cashbox is not documented); Octo, Uzum Checkout and
ATMOS offer hosted card pages with 3-D Secure; Click's merchant checkout documents Uzcard and
Humo only. Integrating one means a new adapter behind the same `PaymentProvider` boundary, using a
**hosted** payment page so TERAN stays within PCI DSS SAQ A (no card data on TERAN's servers).

## Before going live

1. Merchant contracts and credentials (Payme cashbox ID and key, Click service ID, merchant ID and
   secret key); the cashbox account field `order_id` (Payme); the Prepare/Complete URLs (Click).
2. Run Payme's sandbox scenarios (test.paycom.uz with `TEST_KEY`) and Click's Playground or
   Postman suite against a staging deployment, and record the results.
3. **Fiscal receipts**: online payments in Uzbekistan need fiscal data per product (ИКПУ/MXIK code,
   package code, VAT). TERAN must supply these; then Payme `detail`/`SetFiscalData` and Click's
   fiscalization endpoints can be implemented.
4. Decide the card gateway, if cards are wanted.
5. Keep `PAYMENT_PROVIDER_MODE=live` in production; never set `ALLOW_DEMO_PAYMENTS` on a site that
   takes real orders.
