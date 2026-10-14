import type { Locale, PaymentProviderCode } from '@teran/contracts';
import type { Prisma } from '../../generated/prisma/client.js';
import type { PaymentConfig } from '../payment-config.js';
import { clickPaymentUrl } from './click-protocol.js';
import { paymeCheckoutUrl } from './payme-protocol.js';

/** What an adapter needs to send a customer to pay one attempt. */
export interface CheckoutRequest {
  orderNumber: string;
  amount: Prisma.Decimal;
  locale: Locale;
  /** The attempt's secret link token. */
  token: string;
  /** Absolute URL of the attempt's return page. */
  returnUrl: string;
}

/**
 * One online payment provider. Attempts, the state machine and expiry are provider-neutral
 * (PaymentsService); an adapter describes how its provider is reached
 * (docs/architecture/payments.md, "Adapter responsibilities"):
 *
 * - create session / initiate checkout: `checkoutUrl` — a hosted payment page (or the demo page),
 *   so card data never reaches TERAN;
 * - verify callbacks and receive status: the provider's own endpoint (PaymeService,
 *   ClickService), because the protocols have nothing in common;
 * - cancel: an unpaid attempt is closed locally (replaced, expired, order cancelled) and the
 *   provider's later confirmation is refused;
 * - refund: `refunds` says how a refund reaches TERAN.
 */
export interface PaymentProviderAdapter {
  readonly code: Exclude<PaymentProviderCode, 'CASH'>;
  /** Only the demo provider: never contacts anyone, never moves money. */
  readonly simulated: boolean;
  readonly refunds: 'provider-callback' | 'recorded-by-staff' | 'simulated';
  checkoutUrl(request: CheckoutRequest): string;
}

/**
 * The adapters that can be used with the current configuration. A provider without credentials,
 * or any real provider in demo mode, has no adapter, so no link to it can ever be produced.
 */
export function paymentAdapters(
  config: PaymentConfig,
): Partial<Record<PaymentProviderAdapter['code'], PaymentProviderAdapter>> {
  if (config.mode === 'demo') {
    return {
      DEMO: {
        code: 'DEMO',
        simulated: true,
        refunds: 'simulated',
        checkoutUrl: ({ locale, token }) => config.sitePath(locale, `/payments/demo/${token}`),
      },
    };
  }
  const adapters: Partial<Record<PaymentProviderAdapter['code'], PaymentProviderAdapter>> = {};
  const payme = config.payme;
  if (payme) {
    adapters.PAYME = {
      code: 'PAYME',
      simulated: false,
      // A refund made in the Payme cabinet arrives as CancelTransaction on a performed transaction.
      refunds: 'provider-callback',
      checkoutUrl: ({ orderNumber, amount, locale, returnUrl }) =>
        paymeCheckoutUrl(payme, {
          orderNumber,
          amountTiyin: BigInt(amount.times(100).toFixed(0)),
          locale,
          returnUrl,
        }),
    };
  }
  const click = config.click;
  if (click) {
    adapters.CLICK = {
      code: 'CLICK',
      simulated: false,
      // Reversals are made in the Click cabinet; staff record them on the order.
      refunds: 'recorded-by-staff',
      checkoutUrl: ({ orderNumber, amount, returnUrl }) =>
        clickPaymentUrl(click, { orderNumber, amount: amount.toFixed(2), returnUrl }),
    };
  }
  return adapters;
}
