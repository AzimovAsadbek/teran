/**
 * Safety checks for the demo seed and the demo reset. Pure functions, so they are unit tested.
 */

export interface DatabaseTarget {
  host: string;
  port: string;
  database: string;
}

type Env = Record<string, string | undefined>;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/** Host, port and database name of a connection string, never its credentials. */
export function databaseTarget(url: string | undefined): DatabaseTarget {
  if (!url) throw new Error('DATABASE_URL is not set.');
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('DATABASE_URL is not a valid connection string.');
  }
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!database) throw new Error('DATABASE_URL does not name a database.');
  return { host: parsed.hostname, port: parsed.port || '5432', database };
}

export function describeTarget(target: DatabaseTarget): string {
  return `database "${target.database}" on ${target.host}:${target.port}`;
}

/**
 * Loading demo data: refused in production unless ALLOW_DEMO_SEED=true is set explicitly (for a
 * dedicated demonstration deployment). Never needed for a real launch.
 */
export function assertSeedAllowed(env: Env): DatabaseTarget {
  if (env.NODE_ENV === 'production' && env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error(
      'Refusing to load demo data into production. Set ALLOW_DEMO_SEED=true to override.',
    );
  }
  return databaseTarget(env.DATABASE_URL);
}

/**
 * Material for a presentation on this machine only (a picture manifest marked `localOnly`):
 * refused unless NODE_ENV is not "production", the database runs here and the pictures stay in
 * the local uploads folder (no BLOB_READ_WRITE_TOKEN). There is no override.
 */
export function assertLocalOnly(env: Env): DatabaseTarget {
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to load local-only material while NODE_ENV=production.');
  }
  const target = databaseTarget(env.DATABASE_URL);
  if (!LOCAL_HOSTS.has(target.host)) {
    throw new Error(
      `${describeTarget(target)} is not on this machine; local-only material is never loaded there.`,
    );
  }
  if (env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN is set; local-only material is never uploaded to Vercel Blob.',
    );
  }
  return target;
}

/**
 * Removing demo data is destructive, so every condition must hold:
 * - NODE_ENV is not "production" (there is no override);
 * - `confirm` repeats the name of the target database exactly;
 * - the database runs on this machine, unless `allowRemote` is passed explicitly.
 */
export function assertResetAllowed(options: {
  env: Env;
  confirm: string | undefined;
  allowRemote: boolean;
}): DatabaseTarget {
  const { env, confirm, allowRemote } = options;
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to reset demo data while NODE_ENV=production.');
  }
  const target = databaseTarget(env.DATABASE_URL);
  if (!confirm) {
    throw new Error(
      `This removes demo data from ${describeTarget(target)}. Re-run with --confirm=${target.database} to continue.`,
    );
  }
  if (confirm !== target.database) {
    throw new Error(
      `--confirm=${confirm} does not match the target database "${target.database}". Nothing was changed.`,
    );
  }
  if (!LOCAL_HOSTS.has(target.host) && !allowRemote) {
    throw new Error(
      `${describeTarget(target)} is not on this machine. Re-run with --allow-remote if you really mean to reset it.`,
    );
  }
  return target;
}
