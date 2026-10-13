import { z } from 'zod';
import { PAYMENT_METHODS } from '@teran/contracts';

const flag = z.stringbool();

/** "a, b ,c" → ["a", "b", "c"] */
const commaList = z
  .string()
  .default('')
  .transform((value) =>
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

const envObjectSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),

  WEB_ORIGIN: z.url({ protocol: /^https?$/ }),
  CORS_EXTRA_ORIGINS: commaList.pipe(z.array(z.url({ protocol: /^https?$/ }))),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),

  /**
   * Server-side HMAC key for guest order links and newsletter unsubscribe links. Rotating it
   * invalidates unsubscribe links already sent; issued order links keep working (only their hash
   * is stored).
   */
  APP_SECRET: z.string().min(32),

  /**
   * Shared with the storefront server. Its cached catalogue/content requests send this key and are
   * exempt from per-IP rate limits (they serve every visitor from a single IP). Required in production.
   */
  INTERNAL_API_KEY: z.string().min(32).optional(),

  COOKIE_SECURE: flag.default(false),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  STAFF_SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(72).default(12),
  CART_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),

  UPLOADS_DIR: z.string().min(1).default('./storage/uploads'),
  UPLOAD_MAX_BYTES: z.coerce.number().int().min(100_000).max(20_000_000).default(5_242_880),

  WEB_REVALIDATE_URL: z.url().optional(),
  REVALIDATE_SECRET: z.string().min(32).optional(),

  SWAGGER_ENABLED: flag.default(false),

  /** Test-only escape hatch so integration suites can exceed rate limits; rejected elsewhere. */
  THROTTLE_DISABLED: flag.default(false),

  MAIL_TRANSPORT: z.enum(['disabled', 'log', 'smtp']).default('disabled'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65_535).default(587),
  SMTP_SECURE: flag.default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().optional(),

  /** Payment methods offered at checkout. Online providers are added once integrated. */
  PAYMENT_METHODS_ENABLED: commaList
    .pipe(z.array(z.enum(PAYMENT_METHODS)).min(1))
    .default(['CASH_ON_DELIVERY']),

  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
});

export const envSchema = z
  .preprocess(
    // Treat empty values from .env files (e.g. "SMTP_HOST=") as "not set".
    (raw) =>
      raw && typeof raw === 'object'
        ? Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== ''))
        : raw,
    envObjectSchema,
  )
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      if (!env.COOKIE_SECURE) {
        ctx.addIssue({
          code: 'custom',
          path: ['COOKIE_SECURE'],
          message: 'must be true in production',
        });
      }
      if (env.MAIL_TRANSPORT === 'log') {
        ctx.addIssue({
          code: 'custom',
          path: ['MAIL_TRANSPORT'],
          message: '"log" is not allowed in production',
        });
      }
      if (!env.INTERNAL_API_KEY) {
        ctx.addIssue({
          code: 'custom',
          path: ['INTERNAL_API_KEY'],
          message: 'is required in production (shared with the web server)',
        });
      }
      for (const key of ['APP_SECRET', 'REVALIDATE_SECRET', 'INTERNAL_API_KEY'] as const) {
        if (env[key]?.includes('replace-with')) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: 'still contains the .env.example placeholder',
          });
        }
      }
      if (!env.WEB_ORIGIN.startsWith('https://')) {
        ctx.addIssue({
          code: 'custom',
          path: ['WEB_ORIGIN'],
          message: 'must use https in production',
        });
      }
      if (env.CORS_EXTRA_ORIGINS.some((origin) => !origin.startsWith('https://'))) {
        ctx.addIssue({
          code: 'custom',
          path: ['CORS_EXTRA_ORIGINS'],
          message: 'must use https in production',
        });
      }
    }
    if (env.THROTTLE_DISABLED && env.NODE_ENV !== 'test') {
      ctx.addIssue({
        code: 'custom',
        path: ['THROTTLE_DISABLED'],
        message: 'may only be enabled when NODE_ENV=test',
      });
    }
    if (env.MAIL_TRANSPORT === 'smtp' && (!env.SMTP_HOST || !env.MAIL_FROM)) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_HOST'],
        message: 'SMTP_HOST and MAIL_FROM are required for smtp',
      });
    }
    if (env.WEB_REVALIDATE_URL && !env.REVALIDATE_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['REVALIDATE_SECRET'],
        message: 'required when WEB_REVALIDATE_URL is set',
      });
    }
  });

export type Env = z.output<typeof envObjectSchema>;

/** Validates process.env once at startup and fails fast with a readable list of problems. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return result.data;
}
