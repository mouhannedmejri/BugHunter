import type { FastifyInstance } from 'fastify';
import { ReportsService } from './reports.service.js';
import { reportsMeQuerySchema } from './reports.schemas.js';
import { reportIdParamsSchema } from '../comments/comments.schemas.js';
import { PlatformRole } from '@bughuntr/db';
import { createReportSchema } from '@bughuntr/shared';

export async function reportsRoutes(app: FastifyInstance) {
  app.get(
    '/reports/me',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const query = reportsMeQuerySchema.parse(request.query);
      const result = await ReportsService.getMyReports(
        request.user.sub,
        query.page,
        query.limit
      );
      return reply.send({ data: result });
    }
  );


   app.get(
     '/reports/:id',
     { preHandler: [app.authenticate] },
     async (request, reply) => {
       const { id } = reportIdParamsSchema.parse(request.params);
       const result = await ReportsService.getReportById(id, request.user.sub);
       return reply.send({ data: result });
     }
   );
  app.get('/reports/this-week', { preHandler: [app.authenticate,app.requireRole(PlatformRole.SUPER_ADMIN)] }, async (request, reply) => {
    const result = await ReportsService.getReportsThisWeek();
    return reply.send({ data: result });
  });
  app.get('/reports/this-month', { preHandler: [app.authenticate,app.requireRole(PlatformRole.SUPER_ADMIN)] }, async (request, reply) => {
    const result = await ReportsService.getReportsThisMonth();
    return reply.send({ data: result });
  });
  app.get('/reports/this-year', { preHandler: [app.authenticate,app.requireRole(PlatformRole.SUPER_ADMIN)] }, async (request, reply) => {
    const result = await ReportsService.getReportsThisYear();
    return reply.send({ data: result });
  });

  app.post(
    '/reports',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const body = createReportSchema.parse(request.body);
      const report = await ReportsService.createReport(request.user.sub, body);
      return reply.status(201).send({ data: report });
    }
  );
}
