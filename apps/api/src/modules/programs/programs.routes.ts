import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { OrgRole } from '@bughuntr/db';
import { ProgramService } from './programs.service.js';
import {
  createProgramBodySchema,
  orgSlugParamsSchema,
  programInviteBodySchema,
  programInviteIdParamsSchema,
  programSlugParamsSchema,
  programStatusBodySchema,
  updateProgramBodySchema,
} from './programs.schemas.js';

const PM_OR_OA: OrgRole[] = [OrgRole.PROGRAM_MANAGER, OrgRole.ORG_ADMIN];

async function optionalJwtVerify(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    // anonymous viewer
  }
}

export async function programsRoutes(app: FastifyInstance) {
  app.post(
    '/organizations/:slug/programs',
    { preHandler: [app.orgRoleGuard(PM_OR_OA)] },
    async (request, reply) => {
      const { slug } = orgSlugParamsSchema.parse(request.params);
      const body = createProgramBodySchema.parse(request.body);
      const program = await ProgramService.createProgram(
        slug,
        request.user.sub,
        body,
      );
      return reply.status(201).send({ data: program });
    },
  );

  app.get(
    '/organizations/:slug/programs',
    { preHandler: [app.orgRoleGuard([])] },
    async (request, reply) => {
      const { slug } = orgSlugParamsSchema.parse(request.params);
      const programs = await ProgramService.listOrgPrograms(
        slug,
        request.user.sub,
      );
      return reply.send({ data: programs });
    },
  );

  app.get('/programs', async (_request, reply) => {
    const programs = await ProgramService.listPublicPrograms();
    return reply.send({ data: programs });
  });

  app.get(
    '/programs/:programSlug',
    { preHandler: [optionalJwtVerify] },
    async (request, reply) => {
      const { programSlug } = programSlugParamsSchema.parse(request.params);
      const viewerId =
        request.user?.sub !== undefined ? request.user.sub : null;
      const data = await ProgramService.getProgramDetail(programSlug, viewerId);
      return reply.send({ data });
    },
  );

  app.put(
    '/programs/:programSlug',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { programSlug } = programSlugParamsSchema.parse(request.params);
      const body = updateProgramBodySchema.parse(request.body);
      const program = await ProgramService.updateProgram(
        programSlug,
        request.user.sub,
        body,
      );
      return reply.send({ data: program });
    },
  );

  app.put(
    '/programs/:programSlug/status',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { programSlug } = programSlugParamsSchema.parse(request.params);
      const body = programStatusBodySchema.parse(request.body);
      const program = await ProgramService.transitionStatus(
        programSlug,
        request.user.sub,
        body,
      );
      return reply.send({ data: program });
    },
  );

  app.get(
    '/programs/:programSlug/stats',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { programSlug } = programSlugParamsSchema.parse(request.params);
      const stats = await ProgramService.getProgramStats(
        programSlug,
        request.user.sub,
      );
      return reply.send({ data: stats });
    },
  );

  app.post(
    '/programs/:programSlug/invite',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { programSlug } = programSlugParamsSchema.parse(request.params);
      const body = programInviteBodySchema.parse(request.body);
      const result = await ProgramService.inviteResearcher(
        programSlug,
        request.user.sub,
        body,
      );
      return reply.status(201).send({ data: result });
    },
  );

  app.get(
    '/programs/:programSlug/invites',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { programSlug } = programSlugParamsSchema.parse(request.params);
      const invites = await ProgramService.listProgramInvites(
        programSlug,
        request.user.sub,
      );
      return reply.send({ data: invites });
    },
  );

  app.delete(
    '/programs/:programSlug/invites/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { programSlug, id } = programInviteIdParamsSchema.parse(
        request.params,
      );
      const result = await ProgramService.revokeProgramInvite(
        programSlug,
        id,
        request.user.sub,
      );
      return reply.send({ data: result });
    },
  );

  app.post(
    '/programs/:programSlug/join',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { programSlug } = programSlugParamsSchema.parse(request.params);
      const result = await ProgramService.joinPublicProgram(
        programSlug,
        request.user.sub,
      );
      return reply.status(201).send({ data: result });
    },
  );
}
