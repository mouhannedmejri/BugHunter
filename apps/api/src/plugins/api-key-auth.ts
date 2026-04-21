import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { Redis } from 'ioredis';
import { prisma } from '@bughuntr/db';
import { UnauthorizedError, RateLimitError } from '@bughuntr/shared';
import { env } from '../config.js';
import { hashToken } from '../lib/crypto.js';

const redis = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
const LAST_USED_SET = 'api_key:last_used';

async function ensureRedis() {
  if (redis.status === 'wait') await redis.connect();
}

declare module 'fastify' {
  interface FastifyRequest {
    apiKeyAuth?: { id: string; userId: string | null; orgId: string | null; scopes: string[] };
  }
  interface FastifyInstance {
    authenticateApiKey: (request: FastifyRequest) => Promise<void>;
  }
}

async function flushLastUsedToDb() {
  await ensureRedis();
  const ids = await redis.smembers(LAST_USED_SET);
  if (!ids.length) return;
  await prisma.apiKey.updateMany({
    where: { id: { in: ids } },
    data: { lastUsedAt: new Date() },
  });
  await redis.del(LAST_USED_SET);
}

async function apiKeyAuthPlugin(app: FastifyInstance) {
  setInterval(() => {
    void flushLastUsedToDb();
  }, 5 * 60 * 1000).unref();

  app.decorate('authenticateApiKey', async (request: FastifyRequest) => {
    const auth = request.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing API key');
    }
    const token = auth.slice('Bearer '.length).trim();
    if (!token.startsWith('bh_')) {
      throw new UnauthorizedError('Invalid API key format');
    }

    const keyHash = hashToken(token);
    const key = await prisma.apiKey.findFirst({
      where: { keyHash, revokedAt: null },
      select: {
        id: true,
        userId: true,
        orgId: true,
        scopes: true,
        expiresAt: true,
      },
    });
    if (!key) throw new UnauthorizedError('API key not found');
    if (key.expiresAt && key.expiresAt < new Date()) {
      throw new UnauthorizedError('API key expired');
    }

    await ensureRedis();
    const redisKey = `ratelimit:api_key:${key.id}:${new Date().toISOString().slice(0, 13)}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, 60 * 60);
    }
    if (count > 1000) {
      throw new RateLimitError('API key rate limit exceeded');
    }

    request.apiKeyAuth = key;
    await redis.sadd(LAST_USED_SET, key.id);
  });
}

export default fp(apiKeyAuthPlugin, { name: 'api-key-auth' });
