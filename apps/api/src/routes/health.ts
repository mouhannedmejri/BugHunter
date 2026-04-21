import type { FastifyInstance } from 'fastify';
import { prisma } from '@bughuntr/db';
import { Redis } from 'ioredis';
import { env } from '../config.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            services: {
              type: 'object',
              properties: {
                database: { type: 'string' },
                redis: { type: 'string' },
              },
            },
          },
        },
      },
    },
    handler: async (_request, reply) => {
      const checks: {
        database: 'healthy' | 'unhealthy';
        redis: 'healthy' | 'unhealthy';
      } = {
        database: 'unhealthy',
        redis: 'unhealthy',
      };

      // Check database
      try {
        await prisma.$queryRaw`SELECT 1`;
        checks.database = 'healthy';
      } catch {
        checks.database = 'unhealthy';
      }

      // Check Redis
      let redis: Redis | null = null;
      try {
        redis = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
        await redis.ping();
        checks.redis = 'healthy';
      } catch {
        checks.redis = 'unhealthy';
      } finally {
        if (redis) {
          await redis.quit().catch(() => {});
        }
      }

      const allHealthy = checks.database === 'healthy' && checks.redis === 'healthy';

      return reply.status(allHealthy ? 200 : 503).send({
        status: allHealthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        services: checks,
      });
    },
  });

  app.get('/health/ready', {
    schema: {
      description: 'Readiness probe',
      tags: ['health'],
    },
    handler: async (_request, reply) => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        return reply.status(200).send({ status: 'ready' });
      } catch {
        return reply.status(503).send({ status: 'not ready' });
      }
    },
  });
}
