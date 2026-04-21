import type { FastifyInstance } from 'fastify';
import { CommentService, TemplateService } from './comments.service.js';
import {
  postCommentBodySchema,
  editCommentBodySchema,
  commentsQuerySchema,
  fromTemplateBodySchema,
  createTemplateBodySchema,
  updateTemplateBodySchema,
  type PostCommentBody,
  type EditCommentBody,
  type CommentsQuery,
  type FromTemplateBody,
  type CreateTemplateBody,
  type UpdateTemplateBody,
} from './comments.schemas.js';
import { prisma } from '@bughuntr/db';

export async function commentsRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string }; Body: PostCommentBody }>(
    '/reports/:id/comments',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const body = postCommentBodySchema.parse(request.body);
      const reportId = request.params.id;

      // Check if caller is org member for this report
      const report = await prisma.report.findFirst({
        where: { id: reportId },
        include: { program: { select: { orgId: true } } },
      });
      if (!report) return reply.status(404).send({ error: 'Report not found' });

      const isOrgMember = !!(await prisma.organizationMember.findFirst({
        where: { orgId: report.program.orgId, userId: request.user.sub },
      }));

      const comment = await CommentService.postComment(
        reportId,
        request.user.sub,
        body,
        isOrgMember,
      );
      return reply.status(201).send({ data: comment });
    },
  );

  // ─── PUT /reports/:id/comments/:commentId ────────────
  app.put<{ Params: { id: string; commentId: string }; Body: EditCommentBody }>(
    '/reports/:id/comments/:commentId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const body = editCommentBodySchema.parse(request.body);
      const result = await CommentService.editComment(
        request.params.id,
        request.params.commentId,
        request.user.sub,
        body,
      );
      return reply.send({ data: result });
    },
  );

  // ─── DELETE /reports/:id/comments/:commentId ─────────
  app.delete<{ Params: { id: string; commentId: string } }>(
    '/reports/:id/comments/:commentId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const report = await prisma.report.findFirst({
        where: { id: request.params.id },
        include: { program: { select: { orgId: true } } },
      });
      if (!report) return reply.status(404).send({ error: 'Report not found' });

      const orgMembership = await prisma.organizationMember.findFirst({
        where: { orgId: report.program.orgId, userId: request.user.sub },
      });
      const isOrgPM = orgMembership?.role === 'PROGRAM_MANAGER' || orgMembership?.role === 'ORG_ADMIN';

      const result = await CommentService.deleteComment(
        request.params.id,
        request.params.commentId,
        request.user.sub,
        isOrgPM,
      );
      return reply.send({ data: result });
    },
  );

  // ─── GET /reports/:id/comments ───────────────────────
  app.get<{ Params: { id: string }; Querystring: CommentsQuery }>(
    '/reports/:id/comments',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const query = commentsQuerySchema.parse(request.query);

      const report = await prisma.report.findFirst({
        where: { id: request.params.id },
        include: { program: { select: { orgId: true } } },
      });
      if (!report) return reply.status(404).send({ error: 'Report not found' });

      const isOrgMember = !!(await prisma.organizationMember.findFirst({
        where: { orgId: report.program.orgId, userId: request.user.sub },
      }));

      const result = await CommentService.listComments(request.params.id, query, isOrgMember);
      return reply.send({ data: result });
    },
  );

  // ─── POST /reports/:id/comments/:id/read ─────────────
  app.post<{ Params: { id: string; commentId: string } }>(
    '/reports/:id/comments/:commentId/read',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const result = await CommentService.markCommentRead(
        request.params.commentId,
        request.user.sub,
      );
      return reply.send({ data: result });
    },
  );

  // ─── POST /reports/:id/comments/from-template ────────
  app.post<{ Params: { id: string }; Body: FromTemplateBody }>(
    '/reports/:id/comments/from-template',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { templateId, variables, isInternal } = fromTemplateBodySchema.parse(request.body);

      const report = await prisma.report.findFirst({
        where: { id: request.params.id },
        include: { program: { select: { orgId: true } } },
      });
      if (!report) return reply.status(404).send({ error: 'Report not found' });

      const result = await TemplateService.postFromTemplate(
        request.params.id,
        templateId,
        variables ?? {},
        request.user.sub,
        isInternal,
        report.program.orgId,
      );
      return reply.status(201).send({ data: result });
    },
  );
}

// ─── Template Routes ─────────────────────────────────────

export async function templateRoutes(app: FastifyInstance) {
  // ─── GET /organizations/:slug/templates ──────────────
  app.get<{ Params: { slug: string } }>(
    '/organizations/:slug/templates',
    { preHandler: [app.orgRoleGuard([])] },
    async (request, reply) => {
      const result = await TemplateService.listTemplates(request.orgAccess!.org.id);
      return reply.send({ data: result });
    },
  );

  // ─── POST /organizations/:slug/templates ─────────────
  app.post<{ Params: { slug: string }; Body: CreateTemplateBody }>(
    '/organizations/:slug/templates',
    { preHandler: [app.orgRoleGuard(['PROGRAM_MANAGER', 'ORG_ADMIN'])] },
    async (request, reply) => {
      const body = createTemplateBodySchema.parse(request.body);
      const result = await TemplateService.createTemplate(
        request.orgAccess!.org.id,
        body.name,
        body.body,
        request.user.sub,
      );
      return reply.status(201).send({ data: result });
    },
  );

  // ─── PUT /organizations/:slug/templates/:id ──────────
  app.put<{ Params: { slug: string; id: string }; Body: UpdateTemplateBody }>(
    '/organizations/:slug/templates/:id',
    { preHandler: [app.orgRoleGuard(['PROGRAM_MANAGER', 'ORG_ADMIN'])] },
    async (request, reply) => {
      const body = updateTemplateBodySchema.parse(request.body);
      const result = await TemplateService.updateTemplate(
        request.params.id,
        request.orgAccess!.org.id,
        body,
      );
      return reply.send({ data: result });
    },
  );

  // ─── DELETE /organizations/:slug/templates/:id ───────
  app.delete<{ Params: { slug: string; id: string } }>(
    '/organizations/:slug/templates/:id',
    { preHandler: [app.orgRoleGuard(['PROGRAM_MANAGER', 'ORG_ADMIN'])] },
    async (request, reply) => {
      const result = await TemplateService.deleteTemplate(
        request.params.id,
        request.orgAccess!.org.id,
      );
      return reply.send({ data: result });
    },
  );
}
