import type { FastifyInstance } from 'fastify';
import { createOrgOnboardingBodySchema } from './onboarding.schemas.js';
import { OnboardingService } from './onboarding.service.js';

export async function onboardingRoutes(app: FastifyInstance) {
  app.post(
    '/onboarding/create-org',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const body = createOrgOnboardingBodySchema.parse(request.body);
      const result = await OnboardingService.createOrg(request.user.sub, body);
      return reply.status(201).send({ data: result });
    },
  );

  app.post(
    '/onboarding/skip',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const result = await OnboardingService.skipInviteWait(request.user.sub);
      return reply.send({ data: result });
    },
  );
}
