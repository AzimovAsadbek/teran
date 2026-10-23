import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // next-intl imports "next/navigation" without an extension, which Node's ESM loader cannot
    // resolve; bundled by Vite, the locale routing (lib/seo) is tested as it runs in the app.
    server: { deps: { inline: ['next-intl'] } },
  },
});
