import type { FastifyInstance } from 'fastify';
import { OrgRole, PlatformRole } from '@bughuntr/db';
import { RewardsService } from './rewards.service.js';
import {
  orgSlugParamsSchema,
  programSlugParamsSchema,
  rejectRewardBodySchema,
  reportIdParamsSchema,
  retryPayoutBodySchema,
  rewardDecisionBodySchema,
  rewardIdParamsSchema,
  triggerPayoutBodySchema,
} from './rewards.schemas.js';

export async function rewardsRoutes(app: FastifyInstance) {
  app.post(
    '/reports/:id/reward',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = reportIdParamsSchema.parse(request.params);
      const body = rewardDecisionBodySchema.parse(request.body);
      const result = await RewardsService.createOrUpdateRewardDecision(
        id,
        request.user.sub,
        body,
      );
      return reply.status(201).send({ data: result });
    },
  );

  app.get(
    '/reports/:id/reward',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = reportIdParamsSchema.parse(request.params);
      const reward = await RewardsService.getReportReward(id, request.user.sub);
      return reply.send({ data: reward });
    },
  );

  app.post(
    '/rewards/:id/approve',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = rewardIdParamsSchema.parse(request.params);
      const payout = await RewardsService.approveReward(id, request.user.sub);
      return reply.send({ data: payout });
    },
  );

  app.post(
    '/rewards/:id/reject',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = rewardIdParamsSchema.parse(request.params);
      const body = rejectRewardBodySchema.parse(request.body);
      const payout = await RewardsService.rejectReward(id, request.user.sub, body);
      return reply.send({ data: payout });
    },
  );

  app.post(
    '/rewards/:id/payout',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = rewardIdParamsSchema.parse(request.params);
      const body = triggerPayoutBodySchema.parse(request.body);
      const payout = await RewardsService.triggerPayout(id, request.user.sub, body);
      return reply.send({ data: payout });
    },
  );

  app.get(
    '/organizations/:slug/rewards',
    { preHandler: [app.orgRoleGuard([OrgRole.FINANCE, OrgRole.ORG_ADMIN])] },
    async (request, reply) => {
      const { slug } = orgSlugParamsSchema.parse(request.params);
      const rewards = await RewardsService.listOrganizationRewards(slug, request.user.sub);
      return reply.send({ data: rewards });
    },
  );

  app.get(
    '/organizations/:slug/rewards/stats',
    { preHandler: [app.orgRoleGuard([OrgRole.FINANCE, OrgRole.ORG_ADMIN])] },
    async (request, reply) => {
      const { slug } = orgSlugParamsSchema.parse(request.params);
      const stats = await RewardsService.getOrganizationRewardStats(
        slug,
        request.user.sub,
      );
      return reply.send({ data: stats });
    },
  );

  app.get(
    '/users/me/rewards',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const data = await RewardsService.getMyRewards(request.user.sub);
      return reply.send({ data });
    },
  );

  app.get(
    '/users/me/payouts',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const data = await RewardsService.getMyPayouts(request.user.sub);
      return reply.send({ data });
    },
  );

  app.post(
    '/admin/payouts/:id/retry',
    { preHandler: [app.requireRole(PlatformRole.SUPER_ADMIN)] },
    async (request, reply) => {
      const { id } = rewardIdParamsSchema.parse(request.params);
      const body = retryPayoutBodySchema.parse(request.body);
      const payout = await RewardsService.retryFailedPayout(
        id,
        request.user.sub,
        request.user.platformRole,
        body,
      );
      return reply.send({ data: payout });
    },
  );

  app.get('/leaderboard', async (_request, reply) => {
    const data = await RewardsService.getLeaderboard();
    return reply.send({ data });
  });

  app.get('/leaderboard/:programSlug', async (request, reply) => {
    const { programSlug } = programSlugParamsSchema.parse(request.params);
    const data = await RewardsService.getLeaderboard(programSlug);
    return reply.send({ data });
  });

  app.get('/programs/:programSlug/leaderboard', async (request, reply) => {
    const { programSlug } = programSlugParamsSchema.parse(request.params);
    const data = await RewardsService.getLeaderboard(programSlug);
    return reply.send({ data });
  });
}
