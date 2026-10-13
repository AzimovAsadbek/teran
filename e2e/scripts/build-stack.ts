import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { stackEnv } from './e2e-env.ts';

/*
 * Builds what the end-to-end stack runs: the shared contracts, the API (dist/) and a standalone
 * production build of the web app configured for the stack's ports.
 */

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const WEB_DIR = `${ROOT}/apps/web`;

function pnpm(args: string[], env: Record<string, string> = {}): void {
  const result = spawnSync('corepack', ['pnpm', ...args], {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: 'inherit',
  });
  if (result.status !== 0) throw new Error(`"pnpm ${args.join(' ')}" failed`);
}

pnpm(['--filter', '@teran/contracts', 'build']);
pnpm(['--filter', '@teran/api', 'build']);
pnpm(['--filter', '@teran/web', 'build'], stackEnv('web-build'));

// A standalone server serves public/ and .next/static only when they sit next to it.
const standalone = `${WEB_DIR}/.next/standalone/apps/web`;
if (!existsSync(standalone)) throw new Error(`Standalone build not found at ${standalone}`);
rmSync(`${standalone}/public`, { recursive: true, force: true });
rmSync(`${standalone}/.next/static`, { recursive: true, force: true });
cpSync(`${WEB_DIR}/public`, `${standalone}/public`, { recursive: true });
cpSync(`${WEB_DIR}/.next/static`, `${standalone}/.next/static`, { recursive: true });
console.log('End-to-end stack built.');
