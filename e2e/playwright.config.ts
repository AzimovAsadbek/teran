import { defineConfig, devices } from '@playwright/test';
import { E2E_API_URL, E2E_WEB_URL, stackEnv } from './scripts/e2e-env.ts';

/**
 * End-to-end tests drive the real storefront, API and database.
 *
 * - Default: Playwright starts an isolated stack (API on :4100, web on :3100) against the
 *   `teran_e2e` database, which `scripts/prepare-db.ts` migrates, resets and seeds first.
 *   The web app must have been built for that stack: `pnpm --filter @teran/e2e build:stack`.
 * - `E2E_BASE_URL=http://localhost:3000`: run against an already running stack instead (for
 *   example the dev servers). Tests place real orders in whatever database that stack uses.
 */
const external = process.env.E2E_BASE_URL;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests',
  // Orders change shared stock, so tests run one at a time for deterministic results.
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: external ?? E2E_WEB_URL,
    locale: 'en-US',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
  webServer: external
    ? undefined
    : [
        {
          // Resets and seeds the e2e database first, so the API always starts on known data.
          command: 'node scripts/prepare-db.ts && node ../apps/api/dist/main.js',
          url: `${E2E_API_URL}/api/v1/health/ready`,
          env: stackEnv('api'),
          reuseExistingServer: !isCI,
          timeout: 180_000,
          stdout: 'ignore',
          stderr: 'pipe',
        },
        {
          command: 'node ../apps/web/.next/standalone/apps/web/server.js',
          url: `${E2E_WEB_URL}/en`,
          env: stackEnv('web'),
          reuseExistingServer: !isCI,
          timeout: 60_000,
          stdout: 'ignore',
          stderr: 'pipe',
        },
      ],
});
