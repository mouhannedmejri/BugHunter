import type { FastifyInstance } from 'fastify';
import { SearchService } from './search.service.js';
import {
  searchAssetsQuerySchema,
  searchProgramsQuerySchema,
  searchReportsQuerySchema,
  searchResearchersQuerySchema,
} from './search.schemas.js';

export async function searchRoutes(app: FastifyInstance) {
  app.get('/search/reports', { preHandler: [app.authenticate] }, async (request, reply) => {
    const query = searchReportsQuerySchema.parse(request.query);
    const data = await SearchService.searchReports(request.user.sub, query);
    return reply.send({ data });
  });

  app.get('/search/programs', async (request, reply) => {
    const query = searchProgramsQuerySchema.parse(request.query);
    const data = await SearchService.searchPrograms(query);
    return reply.send({ data });
  });

  app.get('/search/researchers', async (request, reply) => {
    const query = searchResearchersQuerySchema.parse(request.query);
    const data = await SearchService.searchResearchers(query);
    return reply.send({ data });
  });

  app.get('/search/assets', async (request, reply) => {
    const query = searchAssetsQuerySchema.parse(request.query);
    const data = await SearchService.searchAssets(query);
    return reply.send({ data });
  });
}
