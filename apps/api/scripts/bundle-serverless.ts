/**
 * Bundles the compiled serverless entry (dist/serverless.js) into one ES module for Vercel:
 * dist/vercel/handler.mjs, loaded by api/index.js.
 *
 * Why: Vercel's Node.js function runtime cannot require() an ES module from CommonJS, and two
 * dependencies (@nestjs/throttler, nestjs-pino) are CommonJS packages that require the ESM-only
 * NestJS 12. Resolving the module graph at build time removes those runtime requires. Native
 * modules stay external and are traced from node_modules by Vercel.
 *
 * Usage (from apps/api, after `nest build`): tsx scripts/bundle-serverless.ts
 */
import { build } from 'esbuild';

await build({
  entryPoints: ['dist/serverless.js'],
  outfile: 'dist/vercel/handler.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  // Nest reads class names (loggers, injection error messages); keep them intact.
  keepNames: true,
  legalComments: 'none',
  logLevel: 'warning',
  external: [
    // Native modules.
    'sharp',
    '@node-rs/argon2',
    'pg-native',
    // Optional integrations NestJS and its dependencies load only when installed.
    '@nestjs/microservices',
    '@nestjs/websockets',
    'class-transformer',
    'class-validator',
    '@fastify/static',
    'pino-pretty',
  ],
  // CommonJS code inside the bundle still calls require() and reads __dirname.
  banner: {
    js: [
      "import { createRequire as __bundleCreateRequire } from 'node:module';",
      "import { dirname as __bundleDirname } from 'node:path';",
      "import { fileURLToPath as __bundleFileUrlToPath } from 'node:url';",
      'const require = __bundleCreateRequire(import.meta.url);',
      'const __filename = __bundleFileUrlToPath(import.meta.url);',
      'const __dirname = __bundleDirname(__filename);',
    ].join('\n'),
  },
});
console.log('dist/vercel/handler.mjs written');
