# Payment provider setup

How to turn on online payments for a TERAN deployment. The design is described in
[../architecture/payments.md](../architecture/payments.md). Nothing here is done by default: a new
deployment offers **cash on delivery only** (`PAYMENT_METHODS_ENABLED=CASH_ON_DELIVERY`,
`PAYMENT_PROVIDER_MODE=live`).

All values below are API environment variables (`apps/api/.env` locally, `.env.production` with
`docker-compose.prod.yml`). They are read only by the API: never put them in the web app's
environment, a commit, a ticket or a chat. The API checks them at start-up and refuses to start
with a half-configured provider.

## 1. Choose the mode

| Situation                                    | Settings                                                                                                                                             |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Real shop, cash only (default)               | `PAYMENT_METHODS_ENABLED=CASH_ON_DELIVERY`                                                                                                           |
| Real shop with Click and/or Payme            | `PAYMENT_PROVIDER_MODE=live`, the provider credentials, `PAYMENT_METHODS_ENABLED=CASH_ON_DELIVERY,CLICK,PAYME`                                       |
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

## 4. Cards (Visa)

Not available: no card gateway is integrated. The `CARD` method is shown as "Not available yet" in
live mode when it is enabled; leave it out of `PAYMENT_METHODS_ENABLED` until a gateway is chosen
(see the options in the payments architecture document).

## 5. Go-live checklist

- [ ] Contracts signed; credentials stored only in the server's secret store.
- [ ] Payme sandbox scenarios and Click playground or Postman scenarios passed on staging.
- [ ] Fiscal data (ИКПУ/MXIK, package codes, VAT) supplied by TERAN and fiscal receipts
      implemented — required for online sales in Uzbekistan, **not implemented yet**.
- [ ] `PAYMENT_PROVIDER_MODE=live`; `ALLOW_DEMO_PAYMENTS` not set.
- [ ] `TRUST_PROXY_HOPS` correct (Payme address check).
- [ ] One real low-value order paid and refunded through each provider, checked in the admin order
      page (payment history) and in the provider cabinet.
