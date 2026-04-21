import type { FastifyInstance } from 'fastify';
import { PlatformRole } from '@bughuntr/db';
import { AdminService } from './admin.service.js';
import {
  abuseReportActionBodySchema,
  announcementBodySchema,
  auditExportQuerySchema,
  auditLogQuerySchema,
  contentFlagBodySchema,
  contentFlagParamsSchema,
  featureFlagBodySchema,
  featureFlagParamsSchema,
  idParamsSchema,
  moderateReportBodySchema,
  orgListQuerySchema,
  payoutListQuerySchema,
  programListQuerySchema,
  reportListQuerySchema,
} from './admin.schemas.js';

const ADMIN_RATE_LIMIT = {
  max: 100,
  timeWindow: 60_000,
};

function adminPreHandlers(app: FastifyInstance) {
  return [app.requireRole(PlatformRole.SUPER_ADMIN, PlatformRole.SUPPORT)];
}

function superAdminPreHandlers(app: FastifyInstance) {
  return [app.requireRole(PlatformRole.SUPER_ADMIN)];
}

export async function adminRoutes(app: FastifyInstance) {
  app.get(
    '/admin/stats',
    { preHandler: adminPreHandlers(app), config: { rateLimit: ADMIN_RATE_LIMIT } },
    async (_request, reply) => {
      const data = await AdminService.getPlatformStats();
      await AdminService.auditAction(
        (_request as { user: { sub: string } }).user.sub,
        'ADMIN_STATS_VIEWED',
      );
      return reply.send({ data });
    },
  );

  app.get(
    '/admin/organizations',
    { preHandler: adminPreHandlers(app), config: { rateLimit: ADMIN_RATE_LIMIT } },
    async (request, reply) => {
      const query = orgListQuerySchema.parse(request.query);
      const data = await AdminService.listOrganizations(query);
      await AdminService.auditAction(request.user.sub, 'ADMIN_ORGANIZATIONS_LISTED');
      return reply.send({ data });
    },
  );

  app.get(
    '/admin/programs',
    { preHandler: adminPreHandlers(app), config: { rateLimit: ADMIN_RATE_LIMIT } },
    async (request, reply) => {
      const query = programListQuerySchema.parse(request.query);
      const data = await AdminService.listPrograms(query);
      await AdminService.auditAction(request.user.sub, 'ADMIN_PROGRAMS_LISTED');
      return reply.send({ data });
    },
  );

  app.get(
    '/admin/reports',
    { preHandler: adminPreHandlers(app), config: { rateLimit: ADMIN_RATE_LIMIT } },
    async (request, reply) => {
      const query = reportListQuerySchema.parse(request.query);
      const data = await AdminService.listReports(query);
      await AdminService.auditAction(request.user.sub, 'ADMIN_REPORTS_LISTED');
      return reply.send({ data });
    },
  );

  app.get(
    '/admin/payouts',
    { preHandler: adminPreHandlers(app), config: { rateLimit: ADMIN_RATE_LIMIT } },
    async (request, reply) => {
      const query = payoutListQuerySchema.parse(request.query);
      const data = await AdminService.listPayouts(query);
      await AdminService.auditAction(request.user.sub, 'ADMIN_PAYOUTS_LISTED');
      return reply.send({ data });
    },
  );

  app.post(
    '/admin/organizations/:id/suspend',
    { preHandler: superAdminPreHandlers(app), config: { rateLimit: ADMIN_RATE_LIMIT } },
    async (request, reply) => {
      const { id } = idParamsSchema.parse(request.params);
      const data = await AdminService.suspendOrganization(id, request.user.sub);
      return reply.send({ data });
    },
  );

  app.post(
    '/admin/programs/:id/force-close',
    { preHandler: adminPreHandlers(app), config: { rateLimit: ADMIN_RATE_LIMIT } },
    async (request, reply) => {
      const { id } = idParamsSchema.parse(request.params);
      const data = await AdminService.forceCloseProgram(id, request.user.sub);
      return reply.send({ data });
    },
  );

  app.get(
    '/admin/audit-logs',
    { preHandler: adminPreHandlers(app), config: { rateLimit: ADMIN_RATE_LIMIT } },
    async (request, reply) => {
      const query = auditLogQuerySchema.parse(request.query);
      const data = await AdminService.listAuditLogs(query);
      await AdminService.auditAction(request.user.sub, 'ADMIN_AUDIT_LOGS_VIEWED');
      return reply.send({ data });
    },
  );

  app.get(
    '/admin/audit-logs/export',
    { preHandler: adminPreHandlers(app), config: { rateLimit: ADMIN_RATE_LIMIT } },
    async (request, reply) => {
      const query = auditExportQuerySchema.parse(request.query);
      const data = await AdminService.exportAuditLogs(query);
      await AdminService.auditAction(request.user.sub, 'ADMIN_AUDIT_LOGS_EXPORTED');
      return reply.send({ data });
    },
  );

  app.get(
    '/admin/system-health',
    { preHandler: adminPreHandlers(app), config: { rateLimit: ADMIN_RATE_LIMIT } },
    async (_request, reply) => {
      const data = await AdminService.getSystemHealth();
      await AdminService.auditAction(
        (_request as { user: { sub: string } }).user.sub,
        'ADMIN_SYSTEM_HEALTH_VIEWED',
      );
      return reply.send({ data });
    },
  );

  app.get(
    '/admin/feature-flags',
    { preHandler: superAdminPreHandlers(app), config: { rateLimit: ADMIN_RATE_LIMIT } },
    async (_request, reply) => {
      const data = await AdminService.getFeatureFlags();
      await AdminService.auditAction(
        (_request as { user: { sub: string } }).user.sub,
        'ADMIN_FEATURE_FLAGS_VIEWED',
      );
      return reply.send({ data });
    },
  );

  app.put(
    '/admin/feature-flags/:key',
    { preHandler: superAdminPreHandlers(app), config: { rateLimit: ADMIN_RATE_LIMIT } },
    async (request, reply) => {
      const { key } = featureFlagParamsSchema.parse(request.params);
      const body = featureFlagBodySchema.parse(request.body);
      const data = await AdminService.setFeatureFlag(key, body, request.user.sub);
      return reply.send({ data });
    },
  );

  app.post(
    '/admin/announcements',
    { preHandler: superAdminPreHandlers(app), config: { rateLimit: ADMIN_RATE_LIMIT } },
    async (request, reply) => {
      const body = announcementBodySchema.parse(request.body);
      const data = await AdminService.createAnnouncement(body, request.user.sub);
      return reply.send({ data });
    },
  );

  app.get(
    '/admin/abuse-reports',
    { preHandler: adminPreHandlers(app), config: { rateLimit: ADMIN_RATE_LIMIT } },
    async (_request, reply) => {
      const data = await AdminService.listAbuseReports();
      await AdminService.auditAction(
        (_request as { user: { sub: string } }).user.sub,
        'ADMIN_ABUSE_REPORTS_VIEWED',
      );
      return reply.send({ data });
    },
  );

  app.put(
    '/admin/abuse-reports/:id',
    { preHandler: adminPreHandlers(app), config: { rateLimit: ADMIN_RATE_LIMIT } },
    async (request, reply) => {
      const { id } = idParamsSchema.parse(request.params);
      const body = abuseReportActionBodySchema.parse(request.body);
      const data = await AdminService.updateAbuseReport(
        id,
        body,
        request.user.sub,
        request.user.platformRole,
      );
      return reply.send({ data });
    },
  );

  app.post(
    '/reports/:id/moderate',
    { preHandler: adminPreHandlers(app), config: { rateLimit: ADMIN_RATE_LIMIT } },
    async (request, reply) => {
      const { id } = idParamsSchema.parse(request.params);
      const body = moderateReportBodySchema.parse(request.body);
      const action = body.action;
      const data = await AdminService.moderateReport(id, action, request.user.sub);
      return reply.send({ data });
    },
  );

  app.put(
    '/admin/content/:type/:id/flag',
    { preHandler: adminPreHandlers(app), config: { rateLimit: ADMIN_RATE_LIMIT } },
    async (request, reply) => {
      const { type, id } = contentFlagParamsSchema.parse(request.params);
      const body = contentFlagBodySchema.parse(request.body);
      const data = await AdminService.flagContent(type, id, request.user.sub, body);
      return reply.send({ data });
    },
  );

  // Verification management
  app.get(
    '/admin/verifications',
    { preHandler: superAdminPreHandlers(app) },
    async (request, reply) => {
      const status = (request.query as { status?: string }).status;
      const data = await AdminService.listVerifications(status);
      return reply.send({ data });
    },
  );

  app.get(
    '/admin/verifications/count',
    { preHandler: superAdminPreHandlers(app) },
    async (_request, reply) => {
      const data = await AdminService.getVerificationCounts();
      return reply.send({ data });
    },
  );

  app.put(
    '/admin/organizations/:id/verify/approve',
    { preHandler: superAdminPreHandlers(app) },
    async (request, reply) => {
      const { id } = idParamsSchema.parse(request.params);
      const actorId = (request as { user: { sub: string } }).user.sub;
      const data = await AdminService.approveOrganizationVerification(id, actorId);
      return reply.send({ data });
    },
  );

  app.put(
    '/admin/organizations/:id/verify/reject',
    { preHandler: superAdminPreHandlers(app) },
    async (request, reply) => {
      const { id } = idParamsSchema.parse(request.params);
      const body = request.body as { reason: string };
      const actorId = (request as { user: { sub: string } }).user.sub;
      const data = await AdminService.rejectOrganizationVerification(id, body.reason, actorId);
      return reply.send({ data });
    },
  );

  app.put(
    '/admin/verifications/:id/notes',
    { preHandler: superAdminPreHandlers(app) },
    async (request, reply) => {
      const { id } = idParamsSchema.parse(request.params);
      const body = request.body as { adminNotes: string };
      const data = await AdminService.updateVerificationNotes(id, body.adminNotes);
      return reply.send({ data });
    },
  );

  app.get(
    '/admin/queues',
    { preHandler: adminPreHandlers(app), config: { rateLimit: ADMIN_RATE_LIMIT } },
    async (_request, reply) => {
      const data = await AdminService.getQueueStats();
      return reply.send({ data });
    },
  );
}
