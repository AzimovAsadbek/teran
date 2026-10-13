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
});
