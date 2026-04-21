import type { FastifyInstance } from 'fastify';
import { PlatformRole } from '@bughuntr/db';
import { UserService } from './users.service.js';
import { OrganizationService } from '../organizations/organizations.service.js';
import {
  adminBanBodySchema,
  adminInviteToOrgBodySchema,
  adminInviteToOrgParamsSchema,
  adminPlatformRoleBodySchema,
  adminUserIdParamsSchema,
  adminUserListQuerySchema,
} from './users.schemas.js';

function staffPreHandlers(app: FastifyInstance) {
  return [app.requireRole(PlatformRole.SUPER_ADMIN, PlatformRole.SUPPORT)];
}

function superAdminPreHandlers(app: FastifyInstance) {
  return [app.requireRole(PlatformRole.SUPER_ADMIN)];
}

export async function adminUsersRoutes(app: FastifyInstance) {
  app.get(
    '/admin/users',
    { preHandler: staffPreHandlers(app) },
    async (request) => {
      const query = adminUserListQuerySchema.parse(request.query);
      const result = await UserService.adminListUsers(query);
      return { data: result };
    },
  );

  app.get<{ Params: { id: string } }>(
    '/admin/users/:id',
    { preHandler: staffPreHandlers(app) },
    async (request, reply) => {
      const { id } = adminUserIdParamsSchema.parse(request.params);
      const user = await UserService.adminGetUser(id);
      return reply.send({ data: user });
    },
  );

  app.put<{ Params: { id: string } }>(
    '/admin/users/:id/ban',
    { preHandler: superAdminPreHandlers(app) },
    async (request, reply) => {
      const { id } = adminUserIdParamsSchema.parse(request.params);
      const body = adminBanBodySchema.parse(request.body);
      const user = await UserService.adminBan(
        request.user.sub,
        request.user.platformRole as PlatformRole,
        id,
        body,
      );
      return reply.send({ data: user });
    },
  );

  app.put<{ Params: { id: string } }>(
    '/admin/users/:id/unban',
    { preHandler: superAdminPreHandlers(app) },
    async (request, reply) => {
      const { id } = adminUserIdParamsSchema.parse(request.params);
      const user = await UserService.adminUnban(request.user.sub, id);
      return reply.send({ data: user });
    },
  );

  app.put<{ Params: { id: string } }>(
    '/admin/users/:id/platform-role',
    { preHandler: superAdminPreHandlers(app) },
    async (request, reply) => {
      const { id } = adminUserIdParamsSchema.parse(request.params);
      const body = adminPlatformRoleBodySchema.parse(request.body);
      const user = await UserService.adminSetPlatformRole(request.user.sub, id, body);
      return reply.send({ data: user });
    },
  );

  app.post<{ Params: { userId: string }; Body: unknown }>(
    '/admin/users/:userId/invite-to-org',
    { preHandler: superAdminPreHandlers(app) },
    async (request, reply) => {
      const { userId } = adminInviteToOrgParamsSchema.parse(request.params);
      const body = adminInviteToOrgBodySchema.parse(request.body);
      const result = await OrganizationService.adminInviteUserToOrg(
        request.user.sub,
        userId,
        body,
      );
      return reply.status(201).send({ data: result });
    },
  );

  app.post<{ Params: { id: string } }>(
    '/admin/users/:id/impersonate',
    { preHandler: superAdminPreHandlers(app) },
    async (request, reply) => {
      const { id } = adminUserIdParamsSchema.parse(request.params);
      const result = await UserService.adminImpersonate(app, request.user.sub, id);
      return reply.send({ data: result });
    },
  );
}
