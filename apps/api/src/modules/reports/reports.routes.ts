import type { FastifyInstance } from 'fastify';
import { ReportsService } from './reports.service.js';
import { reportsMeQuerySchema } from './reports.schemas.js';

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
}
