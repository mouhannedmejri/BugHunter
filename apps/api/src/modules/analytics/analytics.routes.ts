import type { FastifyInstance } from 'fastify';
import { AnalyticsService } from './analytics.service.js';
import {
  analyticsExportQuerySchema,
  exportJobParamsSchema,
  orgSlugParamsSchema,
  periodQuerySchema,
} from './analytics.schemas.js';

export async function analyticsRoutes(app: FastifyInstance) {
  app.get(
    '/organizations/:slug/analytics/overview',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { slug } = orgSlugParamsSchema.parse(request.params);
      const data = await AnalyticsService.getOverview(slug, request.user.sub);
      return reply.send({ data });
    },
  );

  app.get(
    '/organizations/:slug/analytics/trends',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { slug } = orgSlugParamsSchema.parse(request.params);
      const query = periodQuerySchema.parse(request.query);
      const data = await AnalyticsService.getTrends(slug, request.user.sub, query);
      return reply.send({ data });
    },
  );

  app.get(
    '/organizations/:slug/analytics/assets',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { slug } = orgSlugParamsSchema.parse(request.params);
      const data = await AnalyticsService.getAssets(slug, request.user.sub);
      return reply.send({ data });
    },
  );

  app.get(
    '/organizations/:slug/analytics/researchers',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { slug } = orgSlugParamsSchema.parse(request.params);
      const data = await AnalyticsService.getResearchers(slug, request.user.sub);
      return reply.send({ data });
    },
  );

  app.get(
    '/organizations/:slug/analytics/categories',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { slug } = orgSlugParamsSchema.parse(request.params);
      const data = await AnalyticsService.getCategories(slug, request.user.sub);
      return reply.send({ data });
    },
  );

  app.get(
    '/organizations/:slug/analytics/sla',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { slug } = orgSlugParamsSchema.parse(request.params);
      const data = await AnalyticsService.getSla(slug, request.user.sub);
      return reply.send({ data });
    },
  );

  app.get(
    '/organizations/:slug/analytics/export',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { slug } = orgSlugParamsSchema.parse(request.params);
      const query = analyticsExportQuerySchema.parse(request.query);
      const data = await AnalyticsService.createExportJob(slug, request.user.sub, query);
      return reply.send({ data });
    },
  );

  app.get('/exports/:jobId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { jobId } = exportJobParamsSchema.parse(request.params);
    const data = await AnalyticsService.getExportJob(jobId);
    return reply.send({ data });
  });

  app.get('/exports/:jobId/download', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { jobId } = exportJobParamsSchema.parse(request.params);
    const file = await AnalyticsService.getExportFile(jobId);
    if (!file) {
      return reply.status(404).send({
        error: {
          code: 'EXPORT_NOT_FOUND',
          message: 'Export file not found or not ready',
        },
      });
    }
    reply.header('Content-Disposition', `attachment; filename="${file.fileName}"`);
    return reply.type(file.contentType).send(file.body);
  });

  app.get('/users/me/analytics', { preHandler: [app.authenticate] }, async (request, reply) => {
    const analytics = await AnalyticsService.getMyAnalytics(request.user.sub);
    return reply.send({ data: analytics });
  });
}
