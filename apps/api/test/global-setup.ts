import { execFileSync } from 'node:child_process';
import { TEST_DATABASE_URL, assertTestDatabase } from './test-env.js';

/** Applies all migrations to the test database once before the integration suite. */
export default function setup(): void {
  assertTestDatabase(TEST_DATABASE_URL);
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
