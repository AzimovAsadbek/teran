import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Default points at the docker compose test database; CI overrides TEST_DATABASE_URL. */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://teran:teran_dev_password@127.0.0.1:5434/teran_test?schema=public';

/** Refuses to touch anything but a database whose name ends in "_test". */
export function assertTestDatabase(url: string): void {
  const name = new URL(url).pathname.replace(/^\//, '');
  if (!name.endsWith('_test')) {
    throw new Error(
      `Refusing to run tests against "${name}": the database name must end with "_test".`,
    );
  }
}

export const TEST_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  DATABASE_URL: TEST_DATABASE_URL,
  DATABASE_POOL_MAX: '5',
  WEB_ORIGIN: 'http://localhost:3000',
  CORS_EXTRA_ORIGINS: '',
  TRUST_PROXY_HOPS: '1',
  APP_SECRET: 'test-app-secret-0123456789-abcdefghijklmnop',
  COOKIE_SECURE: 'false',
  UPLOADS_DIR: join(tmpdir(), 'teran-api-test-uploads'),
  SWAGGER_ENABLED: 'false',
  MAIL_TRANSPORT: 'log',
  LOG_LEVEL: 'silent',
  THROTTLE_DISABLED: 'true',
  WEB_REVALIDATE_URL: '',
  REVALIDATE_SECRET: '',
  CRON_SECRET: 'test-cron-secret-0123456789-abcdefghijkl',
  // Online ordering is on in tests (it is off unless set, see CHECKOUT_ENABLED).
  CHECKOUT_ENABLED: 'true',
  // Payments: live mode without provider credentials (cash only) unless a suite overrides it.
  PAYMENT_PROVIDER_MODE: 'live',
  PAYMENT_METHODS_ENABLED: 'CASH_ON_DELIVERY',
  ALLOW_DEMO_PAYMENTS: '',
  ONLINE_PAYMENT_WINDOW_MINUTES: '30',
  PAYME_MERCHANT_ID: '',
  PAYME_KEY: '',
  PAYME_CHECK_IP: '',
  CLICK_SERVICE_ID: '',
  CLICK_MERCHANT_ID: '',
  CLICK_SECRET_KEY: '',
};
