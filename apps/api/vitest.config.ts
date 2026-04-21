import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
    },
    env: {
      DATABASE_URL: 'postgresql://bughuntr:do691p9Lk9JO@localhost:5432/bughuntr',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'testsecret1234567890123456789012',
      JWT_REFRESH_SECRET: 'testsecret1234567890123456789012',
      S3_BUCKET: 'test',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_KEY: 'test',
      S3_SECRET: 'test',
      RESEND_API_KEY: 'test',
      STRIPE_SECRET: 'test',
      WISE_API_KEY: 'test',
      TOTP_ENCRYPTION_KEY: 'testsecret1234567890123456789012',
      FRONTEND_URL: 'http://localhost:3000',
      EMAIL_FROM: 'BugHuntr <test@example.com>',
    },
  },
});
