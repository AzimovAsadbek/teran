import { TEST_ENV, assertTestDatabase } from './test-env.js';

// Runs before every test file, before the application modules are imported.
Object.assign(process.env, TEST_ENV);
assertTestDatabase(TEST_ENV.DATABASE_URL ?? '');
