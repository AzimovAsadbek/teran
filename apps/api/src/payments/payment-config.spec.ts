import { ConfigService } from '@nestjs/config';
import { validateEnv } from '../config/env.js';
import { PaymentConfig } from './payment-config.js';

describe('customer payment availability', () => {
  it('offers live CLICK and shows Payme disabled while the cashbox awaits activation', () => {
    const config = new PaymentConfig(
      new ConfigService(
        validateEnv({
          NODE_ENV: 'test',
          DATABASE_URL: 'postgresql://test:test@localhost/test',
          WEB_ORIGIN: 'https://example.test',
          APP_SECRET: 'test-secret-for-local-availability-only-12345',
          PAYMENT_PROVIDER_MODE: 'live',
          PAYMENT_METHODS_ENABLED: 'CLICK,CARD',
          CLICK_SERVICE_ID: '123',
          CLICK_MERCHANT_ID: '456',
          CLICK_SECRET_KEY: 'fixture-click-key-long',
          PAYME_MERCHANT_ID: 'abcdef0123456789abcdef01',
          PAYME_KEY: 'test-fixture-payme-key-12345678',
        }),
      ),
    );
    expect(config.options()).toEqual([
      { method: 'CLICK', availability: 'live' },
      { method: 'PAYME', availability: 'unavailable' },
    ]);
    expect(config.selectableMethods()).toEqual(['CLICK']);
    expect(config.providerFor('PAYME')).toBeNull();
    expect(config.providerFor('CARD')).toBeNull();
  });
});
