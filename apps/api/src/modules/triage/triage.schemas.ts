import { z } from 'zod';

// ─── Triage Queue ────────────────────────────────────────

export const triageQueueQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  programId: z.string().optional(),
  status: z.string().optional(),
  severity: z.string().optional(),
  assigneeId: z.string().optional(),
  assetId: z.string().optional(),
  hasBreachedSla: z.enum(['true', 'false']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'severity', 'slaUrgency', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type TriageQueueQuery = z.infer<typeof triageQueueQuerySchema>;

// ─── Status Transition ──────────────────────────────────

export const updateStatusBodySchema = z.object({
  status: z.enum([
    'RECEIVED', 'NEEDS_INFO', 'TRIAGING', 'ACCEPTED',
    'DUPLICATE', 'INFORMATIVE', 'NOT_APPLICABLE', 'OUT_OF_SCOPE',
    'RESOLVED', 'REWARDED', 'CLOSED', 'ESCALATED',
  ]),
  reason: z.string().max(2000).optional(),
});
export type UpdateStatusBody = z.infer<typeof updateStatusBodySchema>;

// ─── Assign ─────────────────────────────────────────────

export const assignBodySchema = z.object({
  assigneeId: z.string().min(1),
});
export type AssignBody = z.infer<typeof assignBodySchema>;

// ─── Severity ───────────────────────────────────────────

export const updateSeverityBodySchema = z.object({
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL']),
  cvssScore: z.number().min(0).max(10).optional(),
});
export type UpdateSeverityBody = z.infer<typeof updateSeverityBodySchema>;

// ─── Duplicate ──────────────────────────────────────────

export const markDuplicateBodySchema = z.object({
  duplicateOfId: z.string().min(1),
});
export type MarkDuplicateBody = z.infer<typeof markDuplicateBodySchema>;

// ─── Merge ──────────────────────────────────────────────

export const mergeBodySchema = z.object({
  targetReportId: z.string().min(1),
});
export type MergeBody = z.infer<typeof mergeBodySchema>;

// ─── Escalate ───────────────────────────────────────────

export const escalateBodySchema = z.object({
  reason: z.string().min(1).max(2000),
});
export type EscalateBody = z.infer<typeof escalateBodySchema>;

// ─── Report Link ────────────────────────────────────────

export const linkReportBodySchema = z.object({
  linkedId: z.string().min(1),
  linkType: z.enum(['DUPLICATE', 'RELATED', 'CHAINED']),
});
export type LinkReportBody = z.infer<typeof linkReportBodySchema>;

// ─── Params ─────────────────────────────────────────────

export const orgSlugParamsSchema = z.object({
  slug: z.string().min(1),
});

export const orgReportParamsSchema = z.object({
  slug: z.string().min(1),
  id: z.string().min(1),
});
export type OrgSlugParams = z.infer<typeof orgSlugParamsSchema>;

export const reportIdParamsSchema = z.object({
  id: z.string().min(1),
});
export type ReportIdParams = z.infer<typeof reportIdParamsSchema>;

// ─── Bulk Actions ───────────────────────────────────────

export const bulkAssignBodySchema = z.object({
  reportIds: z.array(z.string().min(1)).min(1).max(50),
  assigneeId: z.string().min(1),
});
export type BulkAssignBody = z.infer<typeof bulkAssignBodySchema>;

export const bulkCloseBodySchema = z.object({
  reportIds: z.array(z.string().min(1)).min(1).max(50),
  reason: z.string().min(1).max(2000),
});
export type BulkCloseBody = z.infer<typeof bulkCloseBodySchema>;
