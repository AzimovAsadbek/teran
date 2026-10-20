import { validateEnv } from './env.js';

const valid = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/teran',
  WEB_ORIGIN: 'http://localhost:3000',
  APP_SECRET: 'x'.repeat(40),
};

describe('validateEnv', () => {
  it('applies defaults and coerces types', () => {
    const env = validateEnv({ ...valid, PORT: '4100', COOKIE_SECURE: 'false', SMTP_HOST: '' });
    expect(env.PORT).toBe(4100);
    expect(env.COOKIE_SECURE).toBe(false);
    expect(env.SMTP_HOST).toBeUndefined();
    expect(env.PAYMENT_METHODS_ENABLED).toEqual(['CASH_ON_DELIVERY']);
  });

  it('fails fast with a readable message', () => {
    expect(() => validateEnv({ WEB_ORIGIN: 'not-a-url' })).toThrow(/DATABASE_URL/);
  });

  it('refuses insecure production settings', () => {
    const production = {
      ...valid,
      NODE_ENV: 'production',
      COOKIE_SECURE: 'false',
      MAIL_TRANSPORT: 'log',
      APP_SECRET: 'replace-with-a-long-random-string-at-least-32-chars',
      THROTTLE_DISABLED: 'true',
      CORS_EXTRA_ORIGINS: 'http://admin.example.com',
    };
    const error = (() => {
      try {
        validateEnv(production);
        return '';
      } catch (caught) {
        return (caught as Error).message;
      }
    })();
    for (const key of [
      'COOKIE_SECURE',
      'MAIL_TRANSPORT',
      'APP_SECRET',
      'WEB_ORIGIN',
      'CORS_EXTRA_ORIGINS',
      'THROTTLE_DISABLED',
    ]) {
      expect(error).toContain(key);
    }
  });

  it('requires a secret whenever revalidation is configured', () => {
    expect(() =>
      validateEnv({ ...valid, WEB_REVALIDATE_URL: 'http://localhost:3000/api/revalidate' }),
    ).toThrow(/REVALIDATE_SECRET/);
  });

  it('keeps simulated payments out of production unless explicitly allowed', () => {
    const production = {
      ...valid,
      NODE_ENV: 'production',
      COOKIE_SECURE: 'true',
      WEB_ORIGIN: 'https://teran.example',
      INTERNAL_API_KEY: 'k'.repeat(40),
      PAYMENT_PROVIDER_MODE: 'demo',
    };
    expect(() => validateEnv(production)).toThrow(/PAYMENT_PROVIDER_MODE/);
    expect(validateEnv({ ...production, ALLOW_DEMO_PAYMENTS: 'true' }).PAYMENT_PROVIDER_MODE).toBe(
      'demo',
    );
    // Live is the default everywhere.
    expect(validateEnv(valid).PAYMENT_PROVIDER_MODE).toBe('live');
  });

  it('refuses half-configured payment providers', () => {
    expect(() => validateEnv({ ...valid, PAYME_MERCHANT_ID: 'abcdef0123456789abcdef01' })).toThrow(
      /PAYME_KEY/,
    );
    expect(() =>
      validateEnv({ ...valid, CLICK_SERVICE_ID: '123', CLICK_SECRET_KEY: 's'.repeat(20) }),
    ).toThrow(/CLICK_SECRET_KEY/);
    expect(() => validateEnv({ ...valid, PAYME_CHECKOUT_URL: 'https://evil.example.com' })).toThrow(
      /PAYME_CHECKOUT_URL/,
    );
  });

  it('keeps Telegram off by default and needs the bot and channel to post for real', () => {
    const env = validateEnv(valid);
    expect(env.TELEGRAM_MODE).toBe('disabled');
    expect(validateEnv({ ...valid, TELEGRAM_MODE: 'dry-run' }).TELEGRAM_MODE).toBe('dry-run');
    expect(() => validateEnv({ ...valid, TELEGRAM_MODE: 'live' })).toThrow(/TELEGRAM_MODE/);
    expect(() =>
      validateEnv({ ...valid, TELEGRAM_MODE: 'live', TELEGRAM_BOT_TOKEN: 'not-a-token' }),
    ).toThrow(/TELEGRAM_BOT_TOKEN/);
    expect(() =>
      validateEnv({
        ...valid,
        TELEGRAM_MODE: 'live',
        TELEGRAM_BOT_TOKEN: `123456789:${'A'.repeat(35)}`,
        TELEGRAM_CHANNEL_ID: 'teran channel',
      }),
    ).toThrow(/TELEGRAM_CHANNEL_ID/);
    const live = validateEnv({
      ...valid,
      TELEGRAM_MODE: 'live',
      TELEGRAM_BOT_TOKEN: `123456789:${'A'.repeat(35)}`,
      TELEGRAM_CHANNEL_ID: '@teran_uz',
    });
    expect(live.TELEGRAM_CHANNEL_ID).toBe('@teran_uz');
  });

  it('takes R2 only complete, with its public address over https in production', () => {
    const r2 = {
      R2_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
      R2_ACCESS_KEY_ID: 'a'.repeat(32),
      R2_SECRET_ACCESS_KEY: 's'.repeat(64),
      R2_BUCKET: 'teran-media',
      R2_PUBLIC_URL: 'https://media.teran.example',
    };
    expect(validateEnv({ ...valid, ...r2 }).R2_BUCKET).toBe('teran-media');
    expect(() => validateEnv({ ...valid, ...r2, R2_PUBLIC_URL: '' })).toThrow(/R2_ENDPOINT/);
    expect(() =>
      validateEnv({
        ...valid,
        ...r2,
        NODE_ENV: 'production',
        COOKIE_SECURE: 'true',
        WEB_ORIGIN: 'https://teran.example',
        INTERNAL_API_KEY: 'k'.repeat(40),
        R2_PUBLIC_URL: 'http://media.teran.example',
      }),
    ).toThrow(/R2_PUBLIC_URL/);
  });
});
