import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  Locale,
  PaymentMethod,
  PaymentOptionDto,
  PaymentProviderCode,
} from '@teran/contracts';
import type { Env } from '../config/env.js';

export interface PaymeSettings {
  merchantId: string;
  key: string;
  login: string;
  checkoutUrl: string;
  checkIp: boolean;
}

export interface ClickSettings {
  serviceId: string;
  merchantId: string;
  secretKey: string;
}

/**
 * Payment configuration, decided once at start-up from the validated environment. It is the only
 * place that decides whether a method is processed by a real provider, simulated by the demo
 * provider, or unavailable; the two are never mixed (docs/architecture/payments.md).
 */
@Injectable()
export class PaymentConfig {
  private readonly logger = new Logger(PaymentConfig.name);
  readonly mode: 'live' | 'demo';
  readonly windowMinutes: number;
  /** Credentials, only when configured and the mode is live. */
  readonly payme: PaymeSettings | null;
  readonly click: ClickSettings | null;
  private readonly enabled: readonly PaymentMethod[];
  private readonly webOrigin: string;

  constructor(config: ConfigService<Env, true>) {
    this.mode = config.get('PAYMENT_PROVIDER_MODE', { infer: true });
    this.windowMinutes = config.get('ONLINE_PAYMENT_WINDOW_MINUTES', { infer: true });
    this.enabled = config.get('PAYMENT_METHODS_ENABLED', { infer: true });
    this.webOrigin = config.get('WEB_ORIGIN', { infer: true });

    const paymeId = config.get('PAYME_MERCHANT_ID', { infer: true });
    const paymeKey = config.get('PAYME_KEY', { infer: true });
    const clickService = config.get('CLICK_SERVICE_ID', { infer: true });
    const clickMerchant = config.get('CLICK_MERCHANT_ID', { infer: true });
    const clickSecret = config.get('CLICK_SECRET_KEY', { infer: true });
    const live = this.mode === 'live';

    this.payme =
      live && paymeId && paymeKey
        ? {
            merchantId: paymeId,
            key: paymeKey,
            login: config.get('PAYME_LOGIN', { infer: true }),
            checkoutUrl: config.get('PAYME_CHECKOUT_URL', { infer: true }),
            checkIp: config.get('PAYME_CHECK_IP', { infer: true }),
          }
        : null;
    this.click =
      live && clickService && clickMerchant && clickSecret
        ? { serviceId: clickService, merchantId: clickMerchant, secretKey: clickSecret }
        : null;

    if (!live && (paymeId || clickService)) {
      this.logger.warn(
        'Provider credentials are set but PAYMENT_PROVIDER_MODE=demo: no provider is contacted and provider callbacks are refused',
      );
    }
    this.logger.log(
      { mode: this.mode, methods: this.options() },
      live ? 'Payments: live providers only' : 'Payments: DEMO mode, online payments are simulated',
    );
  }

  /** The provider that processes a method right now, or null when the method cannot be used. */
  providerFor(method: PaymentMethod): PaymentProviderCode | null {
    if (!this.enabled.includes(method)) return null;
    if (method === 'CASH_ON_DELIVERY') return 'CASH';
    if (this.mode === 'demo') return 'DEMO';
    if (method === 'PAYME') return this.payme ? 'PAYME' : null;
    if (method === 'CLICK') return this.click ? 'CLICK' : null;
    // CARD: no card gateway is integrated, so cards are never processed for real.
    return null;
  }

  /** Every method the store presents, in the configured order, with how it can be used. */
  options(): PaymentOptionDto[] {
    return this.enabled.map((method) => {
      const provider = this.providerFor(method);
      return {
        method,
        availability: provider === null ? 'unavailable' : provider === 'DEMO' ? 'demo' : 'live',
      };
    });
  }

  selectableMethods(): PaymentMethod[] {
    return this.options()
      .filter((option) => option.availability !== 'unavailable')
      .map((option) => option.method);
  }

  get windowMs(): number {
    return this.windowMinutes * 60_000;
  }

  /** Absolute storefront URL; Uzbek is the default locale and has no prefix. */
  webUrl(locale: Locale, path: string): string {
    return `${this.webOrigin}${this.sitePath(locale, path)}`;
  }

  sitePath(locale: Locale, path: string): string {
    return `${locale === 'uz' ? '' : `/${locale}`}${path}`;
  }
}
