import { Queue } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import { env } from './config.js';

const redisUrl = new URL(env.REDIS_URL);

export const redisConnection: ConnectionOptions = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port) || 6379,
  password: redisUrl.password || undefined,
  db: Number(redisUrl.pathname.slice(1)) || 0,
};

// ─── Queue Names ─────────────────────────────────────────

export const QUEUE_NAMES = {
  EMAIL: 'email',
  NOTIFICATION: 'notification',
  WEBHOOK: 'webhook',
  VIRUS_SCAN: 'virus-scan',
  DUPLICATE_DETECTION: 'duplicate-detection',
  ASSET_VERIFICATION: 'asset-verification',
  SLA_CHECK: 'sla-check',
  EXPORT: 'export',
  AUTO_CLOSE: 'auto-close',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ─── Queue Instances ─────────────────────────────────────

export const emailQueue = new Queue(QUEUE_NAMES.EMAIL, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
    attempts: 3,
    backoff: { type: 'fixed', delay: 60000 }, // 1 minute backoff
  },
});

export const notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATION, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  },
});

export const webhookQueue = new Queue(QUEUE_NAMES.WEBHOOK, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 2000 },
    attempts: 5,
    backoff: { type: 'exponential', delay: 5000 },
  },
});

export const virusScanQueue = new Queue(QUEUE_NAMES.VIRUS_SCAN, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
    attempts: 2,
    backoff: { type: 'fixed', delay: 10000 },
  },
});

export const duplicateDetectionQueue = new Queue(QUEUE_NAMES.DUPLICATE_DETECTION, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
    attempts: 1,
  },
});

export const assetVerificationQueue = new Queue(QUEUE_NAMES.ASSET_VERIFICATION, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 2000 },
    attempts: 2,
    backoff: { type: 'exponential', delay: 3000 },
  },
});

export const slaCheckQueue = new Queue(QUEUE_NAMES.SLA_CHECK, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
    attempts: 1,
  },
});

export const exportQueue = new Queue(QUEUE_NAMES.EXPORT, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 1000 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
});

export const autoCloseQueue = new Queue(QUEUE_NAMES.AUTO_CLOSE, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
    attempts: 1,
  },
});
