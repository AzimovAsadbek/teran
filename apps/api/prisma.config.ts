import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma 7 does not load .env files by itself; dotenv above loads apps/api/.env for CLI commands.
// `prisma generate` does not need a database, so a missing DATABASE_URL is only an error for
// commands that actually connect (migrate, db seed, studio).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed/index.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
