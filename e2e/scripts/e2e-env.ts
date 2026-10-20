import { fileURLToPath } from 'node:url';

/*
 * Configuration of the disposable end-to-end stack. The values below are test-only fixtures, not
 * secrets: the stack listens on 127.0.0.1, holds generated demo data and is reset on every run.
 */

export const E2E_API_PORT = 4100;
export const E2E_WEB_PORT = 3100;
export const E2E_API_URL = `http://127.0.0.1:${E2E_API_PORT}`;
/**
 * The web server binds to "localhost", not 127.0.0.1: Next.js 16 addresses proxy rewrites to
 * "localhost", and when the server listens on 127.0.0.1 it treats them as external and proxies
 * them back through the proxy, so every unprefixed (Uzbek) URL redirects to itself.
 */
export const E2E_WEB_URL = `http://localhost:${E2E_WEB_PORT}`;

/** Docker compose's Postgres by default; CI points this at its service container. */
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  'postgresql://teran:teran_dev_password@127.0.0.1:5434/teran_e2e?schema=public';

export const E2E_UPLOADS_DIR = fileURLToPath(
  new URL('../../apps/api/storage/e2e-uploads', import.meta.url),
);

const INTERNAL_API_KEY = 'e2e-only-internal-key-not-a-secret-000000';
const REVALIDATE_SECRET = 'e2e-only-revalidate-secret-not-a-secret-0';

/** Administrator created for the admin journeys (test-only credentials for the disposable stack). */
export const E2E_ADMIN = {
  email: 'e2e-admin@example.test',
  password: 'e2e-admin-password-not-a-secret',
};

/** Refuses to reset anything but a dedicated end-to-end or test database. */
export function assertDisposableDatabase(url: string): void {
  const name = new URL(url).pathname.replace(/^\//, '');
  if (!/_(e2e|test)$/.test(name)) {
    throw new Error(
      `Refusing to reset "${name}": the database name must end with "_e2e" or "_test".`,
    );
  }
}

export function stackEnv(service: 'api' | 'web' | 'web-build'): Record<string, string> {
  switch (service) {
    case 'api':
      return {
        NODE_ENV: 'test',
        HOST: '127.0.0.1',
        PORT: String(E2E_API_PORT),
        LOG_LEVEL: 'warn',
        DATABASE_URL: E2E_DATABASE_URL,
        DATABASE_POOL_MAX: '5',
        WEB_ORIGIN: E2E_WEB_URL,
        CORS_EXTRA_ORIGINS: '',
        TRUST_PROXY_HOPS: '1',
        APP_SECRET: 'e2e-only-app-secret-not-a-secret-00000000',
        INTERNAL_API_KEY,
        COOKIE_SECURE: 'false',
        UPLOADS_DIR: E2E_UPLOADS_DIR,
        MAIL_TRANSPORT: 'disabled',
        SWAGGER_ENABLED: 'false',
        // Every test runs from one IP; rate limiting is covered by the API integration tests.
        THROTTLE_DISABLED: 'true',
        WEB_REVALIDATE_URL: `${E2E_WEB_URL}/api/revalidate`,
        REVALIDATE_SECRET,
        // The stack sells online (its storefront is built with prices) ...
        CHECKOUT_ENABLED: 'true',
        // ... and online payments are simulated by the demo provider: no provider is contacted.
        PAYMENT_PROVIDER_MODE: 'demo',
        PAYMENT_METHODS_ENABLED: 'CASH_ON_DELIVERY,CLICK,PAYME,CARD',
        // Telegram posts are composed and recorded, never sent: no bot or channel is contacted.
        TELEGRAM_MODE: 'dry-run',
      };
    case 'web-build':
      // Rewrites to the API are resolved at build time, so the web app is built for this stack.
      return {
        API_INTERNAL_URL: E2E_API_URL,
        NEXT_PUBLIC_SITE_URL: E2E_WEB_URL,
        NEXT_PUBLIC_DEMO_CONTENT: 'true',
        // The journeys buy things: prices and the bag on (the live site hides them for now).
        NEXT_PUBLIC_SHOW_PRICES: 'true',
      };
    case 'web':
      return {
        ...stackEnv('web-build'),
        NODE_ENV: 'production',
        HOSTNAME: 'localhost',
        PORT: String(E2E_WEB_PORT),
        API_INTERNAL_KEY: INTERNAL_API_KEY,
        REVALIDATE_SECRET,
      };
  }
}
