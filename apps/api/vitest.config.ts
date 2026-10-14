import { defineConfig } from 'vitest/config';

/** Unit tests: pure business rules and the demo seed's fixtures and guards, no database. */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts', 'prisma/**/*.spec.ts'],
  },
});
