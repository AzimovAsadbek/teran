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
  /** Vercel Blob read-write token: image renditions go to Blob instead of UPLOADS_DIR. */
  BLOB_READ_WRITE_TOKEN: z.string().min(20).optional(),
  /** Set by Vercel on its own builds and functions ("1"). */
  VERCEL: z.string().optional(),
  /**
   * Secret for the scheduled-jobs endpoint (GET /api/v1/internal/jobs/run, Bearer token), used where
   * the API cannot run its own timers (Vercel Cron sends it). Unset: the endpoint does not exist.
   */
  CRON_SECRET: z.string().min(32).optional(),

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

  /**
   * Payment methods the store presents at checkout. An online method is only selectable when it can
   * actually be processed (see PAYMENT_PROVIDER_MODE); otherwise it is shown as unavailable.
   */
  PAYMENT_METHODS_ENABLED: commaList
    .pipe(z.array(z.enum(PAYMENT_METHODS)).min(1))
    .default(['CASH_ON_DELIVERY']),

  /**
   * How online payments are processed (docs/architecture/payments.md):
   * - live: by the real provider, and only for providers whose credentials are configured below.
   *   Card payments stay unavailable until a card gateway is integrated.
   * - demo: every enabled online method is simulated by the demo provider. No provider is
   *   contacted, no money moves, and provider callbacks are refused. Refused in production unless
   *   ALLOW_DEMO_PAYMENTS=true records that decision explicitly.
   */
  PAYMENT_PROVIDER_MODE: z.enum(['live', 'demo']).default('live'),
  ALLOW_DEMO_PAYMENTS: flag.default(false),
  /** Minutes an online payment may stay unpaid before the order is cancelled and stock returned. */
  ONLINE_PAYMENT_WINDOW_MINUTES: z.coerce
    .number()
    .int()
    .min(10)
    .max(24 * 60)
    .default(30),

  /** Payme Merchant API: cashbox ID and key from the Payme merchant cabinet (both or neither). */
  PAYME_MERCHANT_ID: z
    .string()
    .regex(/^[A-Za-z0-9]{8,64}$/)
    .optional(),
  PAYME_KEY: z.string().min(16).max(200).optional(),
  /** Basic-auth login Payme uses for its calls ("Paycom" in Payme's official server template). */
  PAYME_LOGIN: z.string().min(1).max(64).default('Paycom'),
  /** https://checkout.paycom.uz, or https://test.paycom.uz with the sandbox key. */
  PAYME_CHECKOUT_URL: z
    .enum(['https://checkout.paycom.uz', 'https://test.paycom.uz'])
    .default('https://checkout.paycom.uz'),
  /** Accept Payme calls only from the address range Payme documents (185.234.113.1–15). */
  PAYME_CHECK_IP: flag.default(true),

  /** Click SHOP API: service ID, merchant ID and secret key from the Click merchant cabinet. */
  CLICK_SERVICE_ID: z
    .string()
    .regex(/^\d{1,12}$/)
    .optional(),
  CLICK_MERCHANT_ID: z
    .string()
    .regex(/^\d{1,12}$/)
    .optional(),
  CLICK_SECRET_KEY: z.string().min(8).max(200).optional(),

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
    if (env.VERCEL && !env.BLOB_READ_WRITE_TOKEN) {
      // Vercel functions have no lasting disk: uploads written to UPLOADS_DIR would vanish.
      ctx.addIssue({
        code: 'custom',
        path: ['BLOB_READ_WRITE_TOKEN'],
        message: 'is required on Vercel (connect a Blob store to the project)',
      });
    }
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
      if (env.PAYMENT_PROVIDER_MODE === 'demo' && !env.ALLOW_DEMO_PAYMENTS) {
        ctx.addIssue({
          code: 'custom',
          path: ['PAYMENT_PROVIDER_MODE'],
          message:
            '"demo" simulates payments; in production it also needs ALLOW_DEMO_PAYMENTS=true',
        });
      }
      for (const key of [
        'APP_SECRET',
        'REVALIDATE_SECRET',
        'INTERNAL_API_KEY',
        'CRON_SECRET',
        'PAYME_KEY',
        'CLICK_SECRET_KEY',
      ] as const) {
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
    if (Boolean(env.PAYME_MERCHANT_ID) !== Boolean(env.PAYME_KEY)) {
      ctx.addIssue({
        code: 'custom',
        path: ['PAYME_KEY'],
        message: 'PAYME_MERCHANT_ID and PAYME_KEY must be set together',
      });
    }
    const click = [env.CLICK_SERVICE_ID, env.CLICK_MERCHANT_ID, env.CLICK_SECRET_KEY];
    if (click.some(Boolean) && !click.every(Boolean)) {
      ctx.addIssue({
        code: 'custom',
        path: ['CLICK_SECRET_KEY'],
        message: 'CLICK_SERVICE_ID, CLICK_MERCHANT_ID and CLICK_SECRET_KEY must be set together',
      });
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
