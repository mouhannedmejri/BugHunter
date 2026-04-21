import { Queue } from 'bullmq';
import { buildRedisConnection } from './redis-connection.js';

export const ASSET_VERIFICATION_QUEUE_NAME = 'asset-verification';

let queue: Queue<{ assetId: string }> | null | undefined;

function getQueue(): Queue<{ assetId: string }> | null {
  if (process.env['NODE_ENV'] === 'test') {
    return null;
  }
  if (queue === undefined) {
    queue = new Queue<{ assetId: string }>(ASSET_VERIFICATION_QUEUE_NAME, {
      connection: buildRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 2000 },
        attempts: 2,
        backoff: { type: 'exponential', delay: 3000 },
      },
    });
  }
  return queue;
}

/**
 * Async verification (DNS, etc.) for an asset. No-op in test env.
 */
export async function enqueueAssetVerification(assetId: string): Promise<void> {
  const q = getQueue();
  if (!q) return;
  await q.add(
    'verify',
    { assetId },
    { jobId: `asset-verify-${assetId}`, removeOnComplete: true },
  );
}
