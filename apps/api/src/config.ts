import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  /** Defaults to JWT_SECRET when unset; used only for org invite tokens. */
  ORG_INVITE_JWT_SECRET: z.string().min(32).optional(),

  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  /** Resend `from` address (verified domain in production). */
  EMAIL_FROM: z.string().min(3).default('BugHuntr <onboarding@resend.dev>'),

  S3_BUCKET: z.string().min(1),
  S3_ENDPOINT: z.string().url(),
  S3_KEY: z.string().min(1),
  S3_SECRET: z.string().min(1),

  RESEND_API_KEY: z.string().min(1),
  STRIPE_SECRET: z.string().min(1),
  WISE_API_KEY: z.string().min(1),

  TOTP_ENCRYPTION_KEY: z.string().min(16),

  CLAMAV_HOST: z.string().default('localhost'),
  CLAMAV_PORT: z.coerce.number().int().default(3310),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const formatted = parsed.error.format();
    console.error('❌ Invalid environment variables:', JSON.stringify(formatted, null, 2));
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();
