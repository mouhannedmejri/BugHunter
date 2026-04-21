import type { ConnectionOptions } from 'bullmq';
import { env } from '../config.js';

export function buildRedisConnection(): ConnectionOptions {
  const redisUrl = new URL(env.REDIS_URL);
  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port) || 6379,
    password: redisUrl.password || undefined,
    db: Number(redisUrl.pathname.slice(1)) || 0,
  };
}
