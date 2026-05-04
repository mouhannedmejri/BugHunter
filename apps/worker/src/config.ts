import { z } from 'zod';
import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  FRONTEND_URL: z.string().url().default('http://localhost:8081'),
  EMAIL_FROM: z.string().min(3).default('BugHuntr <onboarding@resend.dev>'),
  RESEND_API_KEY: z.string().min(1),
  CLAMAV_HOST: z.string().default('localhost'),
  CLAMAV_PORT: z.coerce.number().int().default(3310),

  S3_BUCKET: z.string().min(1),
  S3_ENDPOINT: z.string().url(),
  S3_KEY: z.string().min(1),
  S3_SECRET: z.string().min(1),
});

export type WorkerEnv = z.infer<typeof envSchema>;

function preloadEnvFiles(): void {
  const currentFilePath = fileURLToPath(import.meta.url);
  const packageRoot = resolve(dirname(currentFilePath), '..');
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(packageRoot, '.env'),
    resolve(packageRoot, '../../.env'),
  ];

  const loaded = new Set<string>();
  for (const filePath of candidates) {
    if (loaded.has(filePath) || !existsSync(filePath)) {
      continue;
    }

    loadDotenv({ path: filePath, override: false });
    loaded.add(filePath);
  }
}

function loadEnv(): WorkerEnv {
  preloadEnvFiles();
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const formatted = parsed.error.format();
    console.error('❌ Invalid environment variables:', JSON.stringify(formatted, null, 2));
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();
