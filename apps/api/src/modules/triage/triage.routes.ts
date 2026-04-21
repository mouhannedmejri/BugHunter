import type { FastifyInstance } from 'fastify';
import { TriageService } from './triage.service.js';
import {
  triageQueueQuerySchema,
  updateStatusBodySchema,
  assignBodySchema,
  updateSeverityBodySchema,
  markDuplicateBodySchema,
  mergeBodySchema,
  escalateBodySchema,
  linkReportBodySchema,
  bulkAssignBodySchema,
  bulkCloseBodySchema,
  orgReportParamsSchema,
  type TriageQueueQuery,
  type UpdateStatusBody,
  type AssignBody,
  type UpdateSeverityBody,
  type MarkDuplicateBody,
  type MergeBody,
  type EscalateBody,
  type LinkReportBody,
  type BulkAssignBody,
  type BulkCloseBody,
} from './triage.schemas.js';

export async function triageRoutes(app: FastifyInstance) {
  // ─── GET /organizations/:slug/triage ─────────────────
  app.get<{ Params: { slug: string }; Querystring: TriageQueueQuery }>(
    '/organizations/:slug/triage',
    { preHandler: [app.orgRoleGuard(['PROGRAM_MANAGER', 'REVIEWER', 'ORG_ADMIN'])] },
    async (request, reply) => {
      const query = triageQueueQuerySchema.parse(request.query);
      const result = await TriageService.getTriageQueue(request.orgAccess!.org.id, query);
      return reply.send({ data: result });
    },
  );

  // ─── GET /organizations/:slug/triage/stats ───────────
  app.get<{ Params: { slug: string } }>(
    '/organizations/:slug/triage/stats',
    { preHandler: [app.orgRoleGuard(['PROGRAM_MANAGER', 'REVIEWER', 'ORG_ADMIN'])] },
    async (request, reply) => {
      const result = await TriageService.getTriageStats(request.orgAccess!.org.id);
      return reply.send({ data: result });
    },
  );

  // ─── PUT /reports/:id/status ─────────────────────────
  app.put<{ Params: { id: string; slug: string }; Body: UpdateStatusBody }>(
    '/organizations/:slug/reports/:id/status',
    { preHandler: [app.orgRoleGuard(['PROGRAM_MANAGER', 'REVIEWER', 'ORG_ADMIN'])] },
    async (request, reply) => {
      const { status, reason } = updateStatusBodySchema.parse(request.body);
      const result = await TriageService.updateStatus(
        request.params.id,
        status as any,
        request.user.sub,
        request.orgAccess!.member.role,
        request.orgAccess!.org.id,
        reason,
        request.ip,
        request.headers['user-agent'],
      );
      return reply.send({ data: result });
    },
  );

  // ─── PUT /reports/:id/assign ─────────────────────────
  app.put<{ Params: { id: string; slug: string }; Body: AssignBody }>(
    '/organizations/:slug/reports/:id/assign',
    { preHandler: [app.orgRoleGuard(['PROGRAM_MANAGER', 'ORG_ADMIN'])] },
    async (request, reply) => {
      const { assigneeId } = assignBodySchema.parse(request.body);
      const result = await TriageService.assignReport(
        request.params.id,
        assigneeId,
        request.user.sub,
        request.orgAccess!.org.id,
      );
      return reply.send({ data: result });
    },
  );

  // ─── PUT /reports/:id/severity ───────────────────────
  app.put<{ Params: { id: string; slug: string }; Body: UpdateSeverityBody }>(
    '/organizations/:slug/reports/:id/severity',
    { preHandler: [app.orgRoleGuard(['PROGRAM_MANAGER', 'REVIEWER', 'ORG_ADMIN'])] },
    async (request, reply) => {
      const { severity, cvssScore } = updateSeverityBodySchema.parse(request.body);
      const result = await TriageService.updateSeverity(
        request.params.id,
        severity as any,
        cvssScore,
        request.user.sub,
        request.orgAccess!.org.id,
      );
      return reply.send({ data: result });
    },
  );

  // ─── PUT /reports/:id/duplicate ──────────────────────
  app.put<{ Params: { id: string; slug: string }; Body: MarkDuplicateBody }>(
    '/organizations/:slug/reports/:id/duplicate',
    { preHandler: [app.orgRoleGuard(['PROGRAM_MANAGER', 'REVIEWER', 'ORG_ADMIN'])] },
    async (request, reply) => {
      const { duplicateOfId } = markDuplicateBodySchema.parse(request.body);
      const result = await TriageService.markDuplicate(
        request.params.id,
        duplicateOfId,
        request.user.sub,
        request.orgAccess!.org.id,
      );
      return reply.send({ data: result });
    },
  );

  // ─── PUT /reports/:id/merge ──────────────────────────
  app.put<{ Params: { id: string; slug: string }; Body: MergeBody }>(
    '/organizations/:slug/reports/:id/merge',
    { preHandler: [app.orgRoleGuard(['PROGRAM_MANAGER', 'ORG_ADMIN'])] },
    async (request, reply) => {
      const { targetReportId } = mergeBodySchema.parse(request.body);
      const result = await TriageService.mergeReport(
        request.params.id,
        targetReportId,
        request.user.sub,
        request.orgAccess!.org.id,
      );
      return reply.send({ data: result });
    },
  );

  app.get<{ Params: { id: string; slug: string } }>(
    '/organizations/:slug/reports/:id',
    { preHandler: [app.orgRoleGuard([])] },
    async (request, reply) => {
      const { id } = orgReportParamsSchema.parse(request.params);
      const data = await TriageService.getOrgReportDetail(
        id,
        request.orgAccess!.org.id,
      );
      return reply.send({ data });
    },
  );

  // ─── GET /reports/:id/timeline ───────────────────────
  app.get<{ Params: { id: string; slug: string } }>(
    '/organizations/:slug/reports/:id/timeline',
    { preHandler: [app.orgRoleGuard([])] }, // any org member can view
    async (request, reply) => {
      const isOrgMember = !!request.orgAccess;
      const result = await TriageService.getTimeline(
        request.params.id,
        request.orgAccess!.org.id,
        isOrgMember,
      );
      return reply.send({ data: result });
    },
  );

  // ─── POST /reports/:id/escalate ──────────────────────
  app.post<{ Params: { id: string; slug: string }; Body: EscalateBody }>(
    '/organizations/:slug/reports/:id/escalate',
    { preHandler: [app.orgRoleGuard(['PROGRAM_MANAGER', 'REVIEWER', 'ORG_ADMIN'])] },
    async (request, reply) => {
      const { reason } = escalateBodySchema.parse(request.body);
      const result = await TriageService.escalateReport(
        request.params.id,
        reason,
        request.user.sub,
        request.orgAccess!.org.id,
      );
      return reply.send({ data: result });
    },
  );

  // ─── GET /organizations/:slug/sla ────────────────────
  app.get<{ Params: { slug: string } }>(
    '/organizations/:slug/sla',
    { preHandler: [app.orgRoleGuard(['PROGRAM_MANAGER', 'REVIEWER', 'ORG_ADMIN'])] },
    async (request, reply) => {
      const result = await TriageService.getSlaDashboard(request.orgAccess!.org.id);
      return reply.send({ data: result });
    },
  );

  // ─── PUT /reports/:id/link ───────────────────────────
  app.put<{ Params: { id: string; slug: string }; Body: LinkReportBody }>(
    '/organizations/:slug/reports/:id/link',
    { preHandler: [app.orgRoleGuard(['PROGRAM_MANAGER', 'REVIEWER', 'ORG_ADMIN'])] },
    async (request, reply) => {
      const { linkedId, linkType } = linkReportBodySchema.parse(request.body);
      const result = await TriageService.linkReports(
        request.params.id,
        linkedId,
        linkType,
        request.user.sub,
        request.orgAccess!.org.id,
      );
      return reply.send({ data: result });
    },
  );

  // ─── POST /organizations/:slug/reports/bulk-assign ───
  app.post<{ Params: { slug: string }; Body: BulkAssignBody }>(
    '/organizations/:slug/reports/bulk-assign',
    { preHandler: [app.orgRoleGuard(['PROGRAM_MANAGER', 'ORG_ADMIN'])] },
    async (request, reply) => {
      const { reportIds, assigneeId } = bulkAssignBodySchema.parse(request.body);
      const result = await TriageService.bulkAssign(
        reportIds,
        assigneeId,
        request.user.sub,
        request.orgAccess!.org.id,
      );
      return reply.send({ data: result });
    },
  );

  // ─── POST /organizations/:slug/reports/bulk-close ────
  app.post<{ Params: { slug: string }; Body: BulkCloseBody }>(
    '/organizations/:slug/reports/bulk-close',
    { preHandler: [app.orgRoleGuard(['PROGRAM_MANAGER', 'ORG_ADMIN'])] },
    async (request, reply) => {
      const { reportIds, reason } = bulkCloseBodySchema.parse(request.body);
      const result = await TriageService.bulkClose(
        reportIds,
        reason,
        request.user.sub,
        request.orgAccess!.org.id,
      );
      return reply.send({ data: result });
    },
  );
}
