import type { FastifyInstance } from 'fastify';
import { AiService } from './ai.service.js';
import {
  reportIdParamSchema,
  submissionCopilotBodySchema,
} from './ai.schemas.js';

export async function aiRoutes(app: FastifyInstance) {
  // ─── GET /reports/:id/ai-assessment ───────────────────────────
  app.get(
    '/reports/:id/ai-assessment',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = reportIdParamSchema.parse(request.params);
      let assessment = await app.prisma.aiTriageAssessment.findUnique({
        where: { reportId: id },
      });

      // If assessment does not exist yet, compute on-demand
      if (!assessment) {
        assessment = await AiService.performAiTriage(id);
      }

      return reply.send({ data: assessment });
    }
  );

  // ─── POST /reports/:id/ai-assessment/rerun ────────────────────
  app.post(
    '/reports/:id/ai-assessment/rerun',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = reportIdParamSchema.parse(request.params);
      const assessment = await AiService.performAiTriage(id);
      return reply.send({ data: assessment });
    }
  );

  // ─── POST /ai/submission-copilot ─────────────────────────────
  app.post(
    '/ai/submission-copilot',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const body = submissionCopilotBodySchema.parse(request.body);
      const result = await AiService.submissionCopilot(body);
      return reply.send({ data: result });
    }
  );
}
