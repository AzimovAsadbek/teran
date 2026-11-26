# Payment provider setup

How to turn on online payments for a TERAN deployment. The design is described in
[../architecture/payments.md](../architecture/payments.md). The storefront takes product-only orders with `CHECKOUT_DELIVERY_ENABLED=false` (the default). Choose the online methods and configure their credentials before opening checkout.

All values below are API environment variables (`apps/api/.env` locally, `.env.production` with
`docker-compose.prod.yml`). They are read only by the API: never put them in the web app's
environment, a commit, a ticket or a chat. The API checks them at start-up and refuses to start
with a half-configured provider.

In production Compose, `CHECKOUT_DELIVERY_ENABLED` configures both the API and the storefront build. Locally, keep the web build’s `NEXT_PUBLIC_CHECKOUT_DELIVERY_ENABLED` in sync. With delivery paused, checkout collects contact details and charges the product total. Stored orders keep their original delivery details and fees.

## 1. Choose the mode

| Situation                                    | Settings                                                                                                                                             |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Real shop offering delivery and cash         | `CHECKOUT_DELIVERY_ENABLED=true`, `PAYMENT_METHODS_ENABLED=CASH_ON_DELIVERY`                                                                         |
| Real shop with Click and/or Payme            | `PAYMENT_PROVIDER_MODE=live`, the provider credentials, `PAYMENT_METHODS_ENABLED=CLICK,PAYME`                                                        |
| Demonstration site (no real payments at all) | `PAYMENT_PROVIDER_MODE=demo`, `PAYMENT_METHODS_ENABLED=CASH_ON_DELIVERY,CLICK,PAYME,CARD`, and on a production build also `ALLOW_DEMO_PAYMENTS=true` |

Demo and live never mix: in demo mode every online method is simulated, no provider is contacted
even if credentials are present, and provider callbacks are refused. Only use demo mode on a site
whose orders are not real (with `DEMO_CONTENT=true`).

`ONLINE_PAYMENT_WINDOW_MINUTES` (default 30) is how long an unpaid online order keeps its stock
before it is cancelled automatically.

## 2. Payme (Merchant API)

Prerequisites: a contract with Payme and a web cashbox ("касса") in the merchant cabinet
(https://merchant.paycom.uz).

1. In the cashbox settings, set the **endpoint URL** to
   `https://<your-domain>/api/v1/payments/payme`.
2. Define one account field («реквизит») named **`order_id`** (TERAN order numbers look like
   `TRN-7K4Q2M9X`; a validation pattern `^TRN-[0-9A-Z]{8}$` may be set).
3. Copy the **cashbox ID** and the **key** from «Инструменты разработчика».
4. Configure the API:
   ```
   PAYME_MERCHANT_ID=<cashbox id>
   PAYME_KEY=<key>                  # for the sandbox: TEST_KEY
   PAYME_CHECKOUT_URL=https://checkout.paycom.uz   # sandbox: https://test.paycom.uz
   # PAYME_LOGIN=Paycom             # the login Payme authenticates with; confirm it with Payme
   # PAYME_CHECK_IP=true            # only accept Payme's addresses 185.234.113.1–15
   ```
   With `PAYME_CHECK_IP=true` (default) the API must see the real client address: keep
   `TRUST_PROXY_HOPS` equal to the number of proxies in front of the API (1 with the server's
   Nginx, which replaces `X-Forwarded-For` with the client's address).
5. Restart the API and add `PAYME` to `PAYMENT_METHODS_ENABLED`.
6. **Sandbox test** before taking real payments: in the Payme sandbox (https://test.paycom.uz) with
   the cashbox ID and `TEST_KEY`, run both scenarios (create and cancel an unconfirmed transaction
   with the security checks; create, perform and cancel a transaction) against a staging
   deployment. Record the results. Test cards and SMS code are listed in the Payme documentation.
7. Refunds: made in the Payme merchant cabinet; Payme then calls `CancelTransaction` and the order
   shows "Refunded" automatically.

### Test a payment from the public storefront

`PAYME_TRIAL_ENABLED=true` on the web service adds a footer link to `/payme-sinov`. A signed-in
tester can open Payme’s sandbox for a virtual 1,000 UZS order and return to see its recorded
status. This switch works independently of `SHOW_PRICES` and `CHECKOUT_ENABLED`.

Connect the isolated sandbox API to the storefront’s private `payme-trial` Compose network
with the alias `payme-trial-api`. TERAN’s sandbox fixture uses the product `teran-payment-sandbox`,
the variant `TERAN-SANDBOX-ONLY` at 1,000 UZS and `CHECKOUT_DELIVERY_ENABLED=false`. Enable online ordering for this fixture and enter the test item’s fiscal fields when testing itemized mode. Each attempt uses a private synthetic shopper in the isolated database. On 26 November Payme asked for three pending order IDs and each total in tiyin before referring the cashbox for activation. Create those orders on the provider-accessible sandbox shortly before their test, then send only the public order numbers and amounts. The fixture totals 100,000 tiyin per unit. Use the sandbox key and `https://test.paycom.uz` there, with outbound customer
notifications disabled. Payme’s test callbacks must reach this same isolated API.
TERAN's public `/api/v1/payments/payme` routes the sandbox authorization to the isolated API. Other requests reach the live API. Both validate the caller's address and credentials. When rotating `PAYME_TEST_KEY`, update the isolated API and the root-readable Nginx include `/etc/nginx/projects/teran/payme-backend.inc` together. Validate and reload Nginx, then run `CheckPerformTransaction` from Payme’s sandbox against a fresh unpaid sandbox order. The endpoint log records the upstream and HTTP status. Payme's JSON-RPC result identifies the outcome of the call.

To withdraw the preview, turn off `PAYME_TRIAL_ENABLED` and recreate the web service.

## 3. Click (SHOP API)

Prerequisites: a contract with Click and a service in the Click merchant cabinet.

1. In the service settings, set the **Prepare URL** to
   `https://<your-domain>/api/v1/payments/click/prepare` and the **Complete URL** to
   `https://<your-domain>/api/v1/payments/click/complete`.
2. Configure the API (all three or none):
   ```
   CLICK_SERVICE_ID=<service id>
   CLICK_MERCHANT_ID=<merchant id>
   CLICK_SECRET_KEY=<secret key>
   ```
3. Restart the API and add `CLICK` to `PAYMENT_METHODS_ENABLED`.
4. **Test** with Click's Playground (https://docs.click.uz/testing/playground) or its Postman
   collection generator against a staging deployment, and record the results. Click documents no
   test card environment.
5. Refunds: make the reversal in the Click merchant cabinet, then press "Record refund" on the
   order in the TERAN admin (with a note).

   In TERAN's cabinet the two production URLs were saved and verified after reloading on
   2026-11-24. The service showed «Не активен». For a read-only credential check use the
   signed `GET /v2/merchant/payment/status/{service_id}/{payment_id}`; an unknown payment
   returns `-44` with valid credentials. This check does not establish that the service accepts
   payments. Confirm activation with Click.

## 4. Cards (Visa)

Not available: no card gateway is integrated. The `CARD` method is shown as "Not available yet" in
live mode when it is enabled; leave it out of `PAYMENT_METHODS_ENABLED` until a gateway is chosen
(see the options in the payments architecture document).

## Product receipts

In **Admin → Products → Variants**, choose how customers order the product. The category default enables checkout for tea and its subcategories. Choose online sales to enable a specific product in another category, or enquiry ordering to hide its price.

For each sellable pack, enter its official 17-digit MXIK, package code and VAT percentage under **Admin → Products → Variants**. Preserve leading zeroes. Enter an explicit `0` for a zero rate. The checkout copies these fields onto the order. Existing orders keep their original values. Missing fields on a new itemized online attempt leave the cart and stock intact.

The five TERAN 400 g green tea pouches (XC2025, G8810, 8800, 8830 and 8009) use MXIK `00902001001000000` and package code `1653256` for a 400 g bag. The merchant letter specifies 12% VAT. The migration fills empty fiscal fields only when product, SKU, barcode and weight match. Check each future pack in the [Soliq catalogue](https://tasnif.soliq.uz/).

CLICK and Payme issue TERAN's fiscal receipts. Set both fiscal modes to `items` so each provider receives the purchased lines, including the codes for any future product. The `provider` setting uses the provider's own preset receipt configuration.

| Setting                                                                            | Value for itemized receipts                                                                        |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `PAYME_FISCAL_MODE`                                                                | `items` makes Payme receive the purchased product lines on its initial check.                      |
| `CLICK_FISCAL_MODE`                                                                | `items` for CLICK Type 3. After a successful Complete, TERAN submits the purchased items to CLICK. |
| `CLICK_MERCHANT_USER_ID`, `CLICK_COMMISSION_TIN`                                   | The Merchant API user and the TIN agreed with CLICK for CommissionInfo.                            |
| `CLICK_DELIVERY_MXIK`, `CLICK_DELIVERY_PACKAGE_CODE`, `CLICK_DELIVERY_VAT_PERCENT` | Only needed if paid delivery is reintroduced. Leave empty for product-only orders.                 |

On 26 November 2026 CLICK activated service 115697 in Type 3 mode. Its cabinet showed an active service and a minimum payment of 1,000 UZS. CLICK confirmed that it generates the final receipt after receiving the item data. TERAN sends `submit_items` and retrieves the resulting QR link by CLICK payment ID. `submit_qrcode` is for a merchant that already issued its own receipt.

Payme confirmed that the three-order sandbox test passed on the public callback and referred the cashbox for activation with merchant-provided item details. TERAN supplies those lines in `CheckPerformTransaction` and receives the fiscal result through `SetFiscalData`. Enable Payme at checkout after the cashbox manager confirms live activation.

The API worker needs outbound HTTPS to `api.click.uz`. After a submission timeout it polls the existing payment for the QR. A record marked for review requires checking that payment in the merchant cabinet. The order stays paid while its fiscal receipt is pending. [CLICK fiscal API](https://docs.click.uz/merchant-api/fiscalization) · [Payme receipt callback](https://developer.help.paycom.uz/metody-merchant-api/setfiscaldata/)

## 5. Go-live checklist

- [ ] Contracts signed; credentials stored only in the server's secret store.
- [ ] Payme sandbox scenarios and Click playground or Postman scenarios passed on staging.
- [ ] Confirm receipt handling with each provider. If TERAN supplies receipt lines, verify the
      MXIK, package codes and VAT for the teas being sold. See the [payments guide](../architecture/payments.md#before-going-live).
- [ ] `PAYMENT_PROVIDER_MODE=live`; `ALLOW_DEMO_PAYMENTS` not set.
- [ ] `TRUST_PROXY_HOPS` correct (Payme address check).
- [ ] One real low-value order paid and refunded through each provider, checked in the admin order
      page (payment history) and in the provider cabinet.
