import type { FastifyInstance } from 'fastify';
import { BadRequestError } from '@bughuntr/shared';
import { UserService } from './users.service.js';
import {
  payoutProfileBodySchema,
  publicUsernameParamsSchema,
  reputationQuerySchema,
  updateMeBodySchema,
} from './users.schemas.js';

export async function usersRoutes(app: FastifyInstance) {
  app.get(
    '/users/me',
    { preHandler: [app.authenticate] },
    async (request) => {
      const result = await UserService.getMe(request.user.sub);
      return { data: result };
    },
  );

  app.put(
    '/users/me',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const body = updateMeBodySchema.parse(request.body);
      const profile = await UserService.updateMe(request.user.sub, body);
      return reply.send({ data: profile });
    },
  );

  app.put(
    '/users/me/avatar',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const part = await request.file();
      if (!part) {
        throw new BadRequestError('Missing multipart file field');
      }
      const buffer = await part.toBuffer();
      const mimetype = part.mimetype ?? '';
      const updated = await UserService.updateAvatar(
        request.user.sub,
        buffer,
        mimetype,
      );
      return reply.send({ data: updated });
    },
  );

  app.delete(
    '/users/me',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const result = await UserService.softDeleteMe(request.user.sub);
      return reply.send({ data: result });
    },
  );

  app.get(
    '/users/me/payout-profile',
    { preHandler: [app.authenticate] },
    async (request) => {
      const profile = await UserService.getPayoutProfile(request.user.sub);
      return { data: profile };
    },
  );

  app.put(
    '/users/me/payout-profile',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const body = payoutProfileBodySchema.parse(request.body);
      const profile = await UserService.upsertPayoutProfile(request.user.sub, body);
      return reply.send({ data: profile });
    },
  );

  app.get(
    '/users/me/reputation',
    { preHandler: [app.authenticate] },
    async (request) => {
      const query = reputationQuerySchema.parse(request.query);
      const result = await UserService.listReputation(request.user.sub, query);
      return { data: result };
    },
  );

  app.get(
    '/users/me/stats',
    { preHandler: [app.authenticate] },
    async (request) => {
      const stats = await UserService.getStatsOnly(request.user.sub);
      return { data: stats };
    },
  );

  app.get(
    '/users/me/public-profile',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const me = await UserService.getMe(request.user.sub);
      const data = await UserService.getPublicProfile(me.username);
      return reply.send({ data });
    },
  );

  app.get<{ Params: { username: string } }>(
    '/users/:username',
    async (request, reply) => {
      const params = publicUsernameParamsSchema.parse(request.params);
      const data = await UserService.getPublicProfile(params.username);
      return reply.send({ data });
    },
  );

  }
