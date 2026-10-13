import { defineConfig } from 'vitest/config';

/**
 * Integration tests: the real NestJS application (same configureApp as production) against the
 * dedicated test database. Files run one after another because they share that database.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.int-spec.ts'],
    setupFiles: ['test/setup-env.ts'],
    globalSetup: ['test/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
