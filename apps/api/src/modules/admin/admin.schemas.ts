import { z } from 'zod';
import { ProgramStatus, ProgramType, PayoutStatus, PlatformRole, ReportStatus } from '@bughuntr/db';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const orgListQuerySchema = paginationQuerySchema.extend({
  search: z.string().max(200).optional(),
  suspended: z.enum(['true', 'false', 'any']).default('any'),
});
export type OrgListQuery = z.infer<typeof orgListQuerySchema>;

export const programListQuerySchema = paginationQuerySchema.extend({
  type: z.nativeEnum(ProgramType).optional(),
  status: z.nativeEnum(ProgramStatus).optional(),
  org: z.string().optional(),
  q: z.string().max(200).optional(),
});
export type ProgramListQuery = z.infer<typeof programListQuerySchema>;

export const reportListQuerySchema = paginationQuerySchema.extend({
  q: z.string().max(200).optional(),
  status: z.nativeEnum(ReportStatus).optional(),
  org: z.string().optional(),
});
export type ReportListQuery = z.infer<typeof reportListQuerySchema>;

export const payoutListQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(PayoutStatus).optional(),
  method: z.enum(['BANK_TRANSFER', 'PAYPAL', 'CRYPTO', 'STRIPE']).optional(),
  org: z.string().optional(),
});
export type PayoutListQuery = z.infer<typeof payoutListQuerySchema>;

export const auditLogQuerySchema = paginationQuerySchema.extend({
  actorId: z.string().optional(),
  action: z.string().max(120).optional(),
  entityType: z.string().max(120).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;

export const idParamsSchema = z.object({
  id: z.string().min(1),
});

export const featureFlagParamsSchema = z.object({
  key: z.enum([
    'CRYPTO_PAYOUTS',
    'SMS_NOTIFICATIONS',
    'LEADERBOARD_PUBLIC',
    'CHALLENGE_MODE',
  ]),
});

export const featureFlagBodySchema = z.object({
  enabled: z.boolean(),
  value: z.string().optional(),
});
export type FeatureFlagBody = z.infer<typeof featureFlagBodySchema>;

export const announcementBodySchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(20_000),
  audience: z.enum(['ALL', 'RESEARCHERS', 'ORGS']),
});
export type AnnouncementBody = z.infer<typeof announcementBodySchema>;

export const abuseReportActionBodySchema = z.object({
  action: z.enum(['DISMISS', 'WARN', 'BAN']),
});
export type AbuseReportActionBody = z.infer<typeof abuseReportActionBodySchema>;

export const moderateReportBodySchema = z.object({
  action: z.enum(['REDACT', 'DELETE', 'ESCALATE_TO_SA']),
});
export type ModerateReportBody = z.infer<typeof moderateReportBodySchema>;

export const contentFlagParamsSchema = z.object({
  type: z.enum(['report', 'comment', 'user']),
  id: z.string().min(1),
});

export const contentFlagBodySchema = z.object({
  reason: z.string().min(1).max(5000).optional(),
});
export type ContentFlagBody = z.infer<typeof contentFlagBodySchema>;

export const auditExportQuerySchema = z.object({
  format: z.enum(['csv']).default('csv'),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});
export type AuditExportQuery = z.infer<typeof auditExportQuerySchema>;

export const requirePlatformRoleSchema = z.tuple([
  z.nativeEnum(PlatformRole),
  z.nativeEnum(PlatformRole),
]);
