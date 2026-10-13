import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import {
  assertDisposableDatabase,
  E2E_DATABASE_URL,
  E2E_UPLOADS_DIR,
  stackEnv,
} from './e2e-env.ts';

const API_DIR = fileURLToPath(new URL('../../apps/api', import.meta.url));

async function ensureDatabase(url: string): Promise<void> {
  const target = new URL(url);
  const name = target.pathname.replace(/^\//, '');
  const admin = new URL(url);
  admin.pathname = '/postgres';
  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    // The name is validated by assertDisposableDatabase, so it is a plain identifier.
    if (exists.rowCount === 0) await client.query(`CREATE DATABASE "${name}"`);
  } finally {
    await client.end();
  }
}

async function truncateAll(url: string): Promise<void> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
    );
    if (rows.length > 0) {
      const list = rows.map(({ tablename }) => `"public"."${tablename}"`).join(', ');
      await client.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
    }
  } finally {
    await client.end();
  }
}

function runInApi(args: string[], env: Record<string, string>): void {
  const result = spawnSync('corepack', ['pnpm', ...args], {
    cwd: API_DIR,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  if (result.status !== 0) throw new Error(`"pnpm ${args.join(' ')}" failed`);
}

/*
 * Migrates, empties and re-seeds the end-to-end database so every run starts from the same data.
 * Runs as part of the API server command (before the API starts), not as Playwright globalSetup,
 * because Playwright starts web servers before global setup.
 */
assertDisposableDatabase(E2E_DATABASE_URL);
await ensureDatabase(E2E_DATABASE_URL);
const env = stackEnv('api');
runInApi(['exec', 'prisma', 'migrate', 'deploy'], env);
await truncateAll(E2E_DATABASE_URL);
rmSync(E2E_UPLOADS_DIR, { recursive: true, force: true });
runInApi(['exec', 'prisma', 'db', 'seed'], env);
