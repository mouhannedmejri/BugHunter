import { Worker } from 'bullmq';
import pino, { type Logger } from 'pino';
const { pino: createLogger } = pino;
import { redisConnection, QUEUE_NAMES } from './queues.js';
import { processAssetVerificationJob } from './processors/asset-verification.ts';
import { processEmailJob } from './processors/email.ts';
import { processNotificationJob } from './processors/notification.ts';
import { processVirusScanJob } from './processors/virus-scan.ts';
import { processWebhookJob } from './processors/webhook.ts';
import { processDuplicateDetectionJob } from './processors/duplicate-detection.ts';
import { processSlaCheckJob } from './processors/sla-check.ts';
import { processExportJob } from './processors/export.ts';
import { processAutoCloseJob } from './processors/auto-close.ts';

const logger: Logger = createLogger({
  level: process.env['LOG_LEVEL'] || 'info',
  transport: {
    target: 'pino-pretty',
  },
});

logger.info('🏭 BugHuntr Worker starting...');

// ─── Workers ─────────────────────────────────────────────

const emailWorker = new Worker(QUEUE_NAMES.EMAIL, processEmailJob, {
  connection: redisConnection,
  concurrency: 5,
});

const notificationWorker = new Worker(QUEUE_NAMES.NOTIFICATION, processNotificationJob, {
  connection: redisConnection,
  concurrency: 10,
});

const webhookWorker = new Worker(QUEUE_NAMES.WEBHOOK, processWebhookJob, {
  connection: redisConnection,
  concurrency: 5,
});

const virusScanWorker = new Worker(QUEUE_NAMES.VIRUS_SCAN, processVirusScanJob, {
  connection: redisConnection,
  concurrency: 2,
});

const assetVerificationWorker = new Worker(
  QUEUE_NAMES.ASSET_VERIFICATION,
  processAssetVerificationJob,
  {
    connection: redisConnection,
    concurrency: 5,
  },
);

const duplicateDetectionWorker = new Worker(
  QUEUE_NAMES.DUPLICATE_DETECTION,
  processDuplicateDetectionJob,
  {
    connection: redisConnection,
    concurrency: 5, // CPU bound, limit concurrency
  },
);

const slaCheckWorker = new Worker(
  QUEUE_NAMES.SLA_CHECK,
  processSlaCheckJob,
  {
    connection: redisConnection,
    concurrency: 1, // Single instance for repeatable jobs
  },
);

const exportWorker = new Worker(
  QUEUE_NAMES.EXPORT,
  processExportJob,
  {
    connection: redisConnection,
    concurrency: 2, // Limited due to resource intensive operations
  },
);

const autoCloseWorker = new Worker(
  QUEUE_NAMES.AUTO_CLOSE,
  processAutoCloseJob,
  {
    connection: redisConnection,
    concurrency: 1, // Single instance for repeatable jobs
  },
);

const workers = [
  emailWorker,
  notificationWorker,
  webhookWorker,
  virusScanWorker,
  assetVerificationWorker,
  duplicateDetectionWorker,
  slaCheckWorker,
  exportWorker,
  autoCloseWorker,
];

// ─── Event Logging ───────────────────────────────────────

for (const worker of workers) {
  worker.on('completed', (job) => {
    logger.info(`✅ [${worker.name}] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`❌ [${worker.name}] Job ${job?.id} failed:`, { error: err.message, jobId: job?.id });
  });

  worker.on('error', (err) => {
    logger.error(`🔥 [${worker.name}] Worker error:`, { error: err.message, workerName: worker.name });
  });
}

logger.info(`🏭 Workers started: ${workers.map((w) => w.name).join(', ')}`);

// ─── Graceful Shutdown ───────────────────────────────────

async function shutdown(signal: string) {
  logger.info(`\n🛑 Received ${signal}, shutting down workers...`);

  await Promise.all(workers.map((w) => w.close()));

  logger.info('👋 All workers closed. Goodbye!');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
