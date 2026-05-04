import type { FastifyInstance } from 'fastify';
import { OrgRole, PlatformRole } from '@bughuntr/db';
import { OrganizationService } from './organizations.service.js';
import {
  changeMemberRoleBodySchema,
  createOrganizationBodySchema,
  inviteMemberBodySchema,
  inviteTokenParamsSchema,
  orgInviteParamsSchema,
  orgMemberParamsSchema,
  orgSlugParamsSchema,
  updateOrganizationBodySchema,
  submitVerificationBodySchema,
} from './organizations.schemas.js';

export async function organizationsRoutes(app: FastifyInstance) {
  app.post('/organizations', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = createOrganizationBodySchema.parse(request.body);
    const org = await OrganizationService.createOrganization(request.user.sub, body);
    return reply.status(201).send({ data: org });
  });

  app.get(
    '/organizations/:slug',
    { preHandler: [app.orgRoleGuard([])] },
    async (request, reply) => {
      const { slug } = orgSlugParamsSchema.parse(request.params);
      const org = await OrganizationService.getOrganizationDetail(slug, request.user.sub);
      return reply.send({ data: org });
    },
  );

  app.get(
    '/organizations/:slug/audit-logs',
    { preHandler: [app.orgRoleGuard([])] },
    async (request, reply) => {
      const { slug } = orgSlugParamsSchema.parse(request.params);
      const limitRaw = (request.query as any)?.limit;
      const limit = limitRaw ? parseInt(limitRaw) : 8;
      const logs = await OrganizationService.listAuditLogs(
        slug,
        request.user.sub,
        Math.min(limit, 50),
      );
      return reply.send({ data: logs });
    },
  );

  app.put(
    '/organizations/:slug',
    { preHandler: [app.orgRoleGuard([OrgRole.ORG_ADMIN])] },
    async (request, reply) => {
      const { slug } = orgSlugParamsSchema.parse(request.params);
      const body = updateOrganizationBodySchema.parse(request.body);
      const org = await OrganizationService.updateOrganization(slug, request.user.sub, body);
      return reply.send({ data: org });
    },
  );

  app.delete(
    '/organizations/:slug',
    { preHandler: [app.requireRole(PlatformRole.SUPER_ADMIN)] },
    async (request, reply) => {
      const { slug } = orgSlugParamsSchema.parse(request.params);
      const result = await OrganizationService.softDeleteOrganization(slug, request.user.sub);
      return reply.send({ data: result });
    },
  );

  app.get(
    '/organizations/:slug/members',
    { preHandler: [app.orgRoleGuard([])] },
    async (request, reply) => {
      const { slug } = orgSlugParamsSchema.parse(request.params);
      const members = await OrganizationService.listMembers(slug, request.user.sub);
      return reply.send({ data: members });
    },
  );

  app.post(
    '/organizations/:slug/members/invite',
    { preHandler: [app.orgRoleGuard([OrgRole.ORG_ADMIN])] },
    async (request, reply) => {
      const { slug } = orgSlugParamsSchema.parse(request.params);
      const body = inviteMemberBodySchema.parse(request.body);
      const data = await OrganizationService.inviteMember(slug, request.user.sub, body);
      return reply.status(201).send({ data });
    },
  );

  app.get(
    '/organizations/:slug/invites',
    { preHandler: [app.orgRoleGuard([OrgRole.ORG_ADMIN])] },
    async (request, reply) => {
      const { slug } = orgSlugParamsSchema.parse(request.params);
      const data = await OrganizationService.listPendingInvites(slug, request.user.sub);
      return reply.send({ data });
    },
  );

  app.delete(
    '/organizations/:slug/invites/:inviteId',
    { preHandler: [app.orgRoleGuard([OrgRole.ORG_ADMIN])] },
    async (request, reply) => {
      const { slug, inviteId } = orgInviteParamsSchema.parse(request.params);
      const data = await OrganizationService.revokeInvite(slug, request.user.sub, inviteId);
      return reply.send({ data });
    },
  );

  app.delete(
    '/organizations/:slug/members/:userId',
    { preHandler: [app.orgRoleGuard([])] },
    async (request, reply) => {
      const { slug, userId } = orgMemberParamsSchema.parse(request.params);
      const data = await OrganizationService.removeMember(slug, request.user.sub, userId);
      return reply.send({ data });
    },
  );

  app.put(
    '/organizations/:slug/members/:userId/role',
    { preHandler: [app.orgRoleGuard([OrgRole.ORG_ADMIN])] },
    async (request, reply) => {
      const { slug, userId } = orgMemberParamsSchema.parse(request.params);
      const body = changeMemberRoleBodySchema.parse(request.body);
      const data = await OrganizationService.changeMemberRole(slug, request.user.sub, userId, body);
      return reply.send({ data });
    },
  );

  app.post('/invites/accept/:token', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { token } = inviteTokenParamsSchema.parse(request.params);
    const result = await OrganizationService.acceptInvite(
      token,
      request.user.sub,
      request.user.email,
    );
    return reply.send({ data: result });
  });

  app.post(
    '/organizations/:slug/verify',
    { preHandler: [app.orgRoleGuard([OrgRole.ORG_ADMIN], { skipVerificationCheck: true })] },
    async (request, reply) => {
      const { slug } = orgSlugParamsSchema.parse(request.params);
      const body = submitVerificationBodySchema.parse(request.body);
      const result = await OrganizationService.submitVerification(slug, request.user.sub, body);
      return reply.send({ data: result });
    },
  );

    app.get(
      '/organizations/:slug/verify',
      { preHandler: [app.orgRoleGuard([OrgRole.ORG_ADMIN], { skipVerificationCheck: true })] },
      async (request, reply) => {
        const { slug } = orgSlugParamsSchema.parse(request.params);
        const { org } = await OrganizationService.assertOrgMembership(request.user.sub, slug, [
          OrgRole.ORG_ADMIN,
        ]);
        return reply.send({ data: { verificationStatus: org.verificationStatus } });
      },
    );

}
