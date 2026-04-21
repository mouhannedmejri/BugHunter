import {
  prisma,
  type Report,
  type ReportStatus,
  type Severity,
  type Prisma,
} from '@bughuntr/db';
import { BadRequestError, ForbiddenError, NotFoundError } from '@bughuntr/shared';
import type { TriageQueueQuery } from './triage.schemas.js';

// ─── Status Transition Map ───────────────────────────────

const STATUS_TRANSITIONS: Record<string, ReportStatus[]> = {
  SUBMITTED: ['RECEIVED'],
  RECEIVED: ['NEEDS_INFO', 'TRIAGING', 'DUPLICATE', 'NOT_APPLICABLE', 'OUT_OF_SCOPE', 'INFORMATIVE'],
  NEEDS_INFO: ['TRIAGING', 'CLOSED'],
  TRIAGING: ['ACCEPTED', 'DUPLICATE', 'NOT_APPLICABLE', 'OUT_OF_SCOPE'],
  ACCEPTED: ['RESOLVED', 'ESCALATED'],
  RESOLVED: ['REWARDED', 'CLOSED'],
  ESCALATED: ['ACCEPTED', 'CLOSED'],
};

// PM/OA can close from any status
const CLOSE_ROLES = ['PROGRAM_MANAGER', 'ORG_ADMIN'];

function assertValidTransition(
  from: ReportStatus,
  to: ReportStatus,
  orgRole: string,
  reason?: string,
) {
  // Any → CLOSED is allowed for PM/OA with reason
  if (to === 'CLOSED') {
    if (!CLOSE_ROLES.includes(orgRole)) {
      throw new ForbiddenError('Only Program Managers and Org Admins can close reports');
    }
    if (!reason) {
      throw new BadRequestError('A reason is required when closing a report');
    }
    return;
  }

  const allowed = STATUS_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new BadRequestError(
      `Invalid transition: ${from} → ${to}. Allowed: ${allowed?.join(', ') ?? 'none'}`,
    );
  }
}

// ─── Timestamp field for each status ─────────────────────

const STATUS_TIMESTAMP_MAP: Partial<Record<ReportStatus, keyof Report>> = {
  SUBMITTED: 'submittedAt',
  RECEIVED: 'receivedAt',
  ACCEPTED: 'acceptedAt',
  RESOLVED: 'resolvedAt',
  CLOSED: 'closedAt',
};

// ─── Service ─────────────────────────────────────────────

export class TriageService {
  /**
   * Triage queue: paginated, filtered list of non-DRAFT reports for an org.
   */
  static async getTriageQueue(
    orgId: string,
    query: TriageQueueQuery,
  ) {
    const where: Prisma.ReportWhereInput = {
      program: { orgId },
      status: { not: 'DRAFT' },
    };

    if (query.status) {
      where.status = query.status as ReportStatus;
    }
    if (query.severity) {
      where.severityEstimate = query.severity as Severity;
    }
    if (query.assigneeId) {
      where.assigneeId = query.assigneeId;
    }
    if (query.programId) {
      where.programId = query.programId;
    }
    if (query.assetId) {
      where.assetId = query.assetId;
    }
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }
    if (query.hasBreachedSla === 'true') {
      where.slaRecords = {
        some: { breached: true },
      };
    }

    // Sort
    let orderBy: Prisma.ReportOrderByWithRelationInput = { createdAt: query.sortOrder };
    if (query.sortBy === 'severity') {
      orderBy = { severityEstimate: query.sortOrder };
    } else if (query.sortBy === 'status') {
      orderBy = { status: query.sortOrder };
    }

    const [reports, total] = await prisma.$transaction([
      prisma.report.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          submitter: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          assignee: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          asset: { select: { id: true, type: true, identifier: true } },
          program: { select: { id: true, slug: true, title: true } },
          slaRecords: { where: { completedAt: null }, select: { metricKey: true, dueAt: true, breached: true } },
        },
      }),
      prisma.report.count({ where }),
    ]);

    return {
      reports,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  }

  static async getOrgReportDetail(reportId: string, orgId: string) {
    const report = await prisma.report.findFirst({
      where: { id: reportId, program: { orgId } },
      include: {
        program: { select: { id: true, slug: true, title: true } },
        asset: { select: { id: true, type: true, identifier: true } },
        submitter: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        assignee: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        slaRecords: { select: { metricKey: true, dueAt: true, breached: true, completedAt: true } },
        reward: { include: { payout: true } },
      },
    });
    if (!report) throw new NotFoundError('Report');
    return report;
  }

  /**
   * Queue stats grouped by status and severity.
   */
  static async getTriageStats(orgId: string) {
    const [byStatus, bySeverity, slaBreached, totalOpen] = await prisma.$transaction([
      prisma.report.groupBy({
        by: ['status'],
        where: { program: { orgId }, status: { not: 'DRAFT' } },
        orderBy: { status: 'asc' },
        _count: true,
      }),
      prisma.report.groupBy({
        by: ['severityEstimate'],
        where: {
          program: { orgId },
          status: { notIn: ['DRAFT', 'CLOSED', 'RESOLVED', 'REWARDED'] },
        },
        orderBy: { severityEstimate: 'asc' },
        _count: true,
      }),
      prisma.slaRecord.count({
        where: {
          program: { orgId },
          breached: true,
          completedAt: null,
        },
      }),
      prisma.report.count({
        where: {
          program: { orgId },
          status: { notIn: ['DRAFT', 'CLOSED', 'RESOLVED', 'REWARDED'] },
        },
      }),
    ]);

    return {
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
      bySeverity: bySeverity.map((s) => ({ severity: s.severityEstimate, count: s._count })),
      slaBreached,
      totalOpen,
    };
  }

  /**
   * Transition a report's status with full audit trail.
   */
  static async updateStatus(
    reportId: string,
    toStatus: ReportStatus,
    actorId: string,
    orgRole: string,
    orgId: string,
    reason?: string,
    ip?: string,
    userAgent?: string,
  ) {
    const report = await prisma.report.findFirst({
      where: { id: reportId, program: { orgId } },
      include: { program: true },
    });
    if (!report) throw new NotFoundError('Report not found');

    assertValidTransition(report.status, toStatus, orgRole, reason);

    const timestampField = STATUS_TIMESTAMP_MAP[toStatus];
    const updateData: Prisma.ReportUpdateInput = {
      status: toStatus,
      ...(timestampField ? { [timestampField]: new Date() } : {}),
    };

    // Mark duplicate flags
    if (toStatus === 'DUPLICATE') {
      updateData.isDuplicate = true;
    }

    const [updated] = await prisma.$transaction([
      prisma.report.update({ where: { id: reportId }, data: updateData }),
      // Status history
      prisma.reportStatusHistory.create({
        data: {
          reportId,
          fromStatus: report.status,
          toStatus,
          changedBy: actorId,
          reason,
        },
      }),
      // Audit log
      prisma.auditLog.create({
        data: {
          actorId,
          orgId,
          action: 'REPORT_STATUS_CHANGED',
          entityType: 'Report',
          entityId: reportId,
          before: { status: report.status },
          after: { status: toStatus },
          ip,
          userAgent,
        },
      }),
      // Complete relevant SLA
      ...(toStatus === 'RECEIVED'
        ? [prisma.slaRecord.updateMany({
            where: { reportId, metricKey: 'FIRST_RESPONSE', completedAt: null },
            data: { completedAt: new Date() },
          })]
        : []),
      ...(['ACCEPTED', 'DUPLICATE', 'NOT_APPLICABLE', 'OUT_OF_SCOPE', 'INFORMATIVE'].includes(toStatus)
        ? [prisma.slaRecord.updateMany({
            where: { reportId, metricKey: 'TRIAGE_DECISION', completedAt: null },
            data: { completedAt: new Date() },
          })]
        : []),
      ...(['RESOLVED'].includes(toStatus)
        ? [prisma.slaRecord.updateMany({
            where: { reportId, metricKey: 'FIX', completedAt: null },
            data: { completedAt: new Date() },
          })]
        : []),
      // Notification to submitter (if not internal status)
      prisma.notification.create({
        data: {
          userId: report.submitterId,
          type: 'REPORT_STATUS_CHANGE',
          channel: 'IN_APP',
          subject: `Report status updated`,
          body: `Your report "${report.title}" status changed to ${toStatus}${reason ? `: ${reason}` : ''}`,
          data: { reportId, fromStatus: report.status, toStatus },
        },
      }),
    ]);

    return updated;
  }

  /**
   * Assign a report to a team member.
   */
  static async assignReport(
    reportId: string,
    assigneeId: string,
    actorId: string,
    orgId: string,
  ) {
    const report = await prisma.report.findFirst({
      where: { id: reportId, program: { orgId } },
    });
    if (!report) throw new NotFoundError('Report not found');

    // Verify assignee is an org member
    const member = await prisma.organizationMember.findFirst({
      where: { orgId, userId: assigneeId },
    });
    if (!member) throw new BadRequestError('Assignee is not a member of this organization');

    const [updated] = await prisma.$transaction([
      prisma.report.update({
        where: { id: reportId },
        data: { assigneeId },
      }),
      prisma.auditLog.create({
        data: {
          actorId,
          orgId,
          action: 'REPORT_ASSIGNED',
          entityType: 'Report',
          entityId: reportId,
          before: { assigneeId: report.assigneeId },
          after: { assigneeId },
        },
      }),
    ]);

    return updated;
  }

  /**
   * Update validated severity.
   */
  static async updateSeverity(
    reportId: string,
    severity: Severity,
    cvssScore: number | undefined,
    actorId: string,
    orgId: string,
  ) {
    const report = await prisma.report.findFirst({
      where: { id: reportId, program: { orgId } },
    });
    if (!report) throw new NotFoundError('Report not found');

    const [updated] = await prisma.$transaction([
      prisma.report.update({
        where: { id: reportId },
        data: { severityValidated: severity, cvssScore },
      }),
      prisma.auditLog.create({
        data: {
          actorId,
          orgId,
          action: 'REPORT_SEVERITY_CHANGED',
          entityType: 'Report',
          entityId: reportId,
          before: { severity: report.severityValidated, cvssScore: report.cvssScore },
          after: { severity, cvssScore },
        },
      }),
    ]);

    return updated;
  }

  /**
   * Mark a report as duplicate of another.
   */
  static async markDuplicate(
    reportId: string,
    duplicateOfId: string,
    actorId: string,
    orgId: string,
  ) {
    const [report, original] = await Promise.all([
      prisma.report.findFirst({ where: { id: reportId, program: { orgId } } }),
      prisma.report.findFirst({ where: { id: duplicateOfId, program: { orgId } } }),
    ]);
    if (!report) throw new NotFoundError('Report not found');
    if (!original) throw new NotFoundError('Original report not found');
    if (reportId === duplicateOfId) throw new BadRequestError('A report cannot be a duplicate of itself');

    const [updated] = await prisma.$transaction([
      prisma.report.update({
        where: { id: reportId },
        data: {
          status: 'DUPLICATE',
          isDuplicate: true,
          duplicateOfId,
        },
      }),
      prisma.reportStatusHistory.create({
        data: {
          reportId,
          fromStatus: report.status,
          toStatus: 'DUPLICATE',
          changedBy: actorId,
          reason: `Duplicate of #${duplicateOfId}`,
        },
      }),
      prisma.reportLink.upsert({
        where: { reportId_linkedId: { reportId, linkedId: duplicateOfId } },
        create: { reportId, linkedId: duplicateOfId, linkType: 'DUPLICATE' },
        update: {},
      }),
      prisma.auditLog.create({
        data: {
          actorId, orgId,
          action: 'REPORT_MARKED_DUPLICATE',
          entityType: 'Report',
          entityId: reportId,
          after: { duplicateOfId },
        },
      }),
    ]);

    return updated;
  }

  /**
   * Merge a report into another: move attachments + comments, close source.
   */
  static async mergeReport(
    sourceId: string,
    targetId: string,
    actorId: string,
    orgId: string,
  ) {
    const [source, target] = await Promise.all([
      prisma.report.findFirst({ where: { id: sourceId, program: { orgId } } }),
      prisma.report.findFirst({ where: { id: targetId, program: { orgId } } }),
    ]);
    if (!source) throw new NotFoundError('Source report not found');
    if (!target) throw new NotFoundError('Target report not found');
    if (sourceId === targetId) throw new BadRequestError('Cannot merge a report into itself');

    await prisma.$transaction([
      // Move attachments
      prisma.attachment.updateMany({
        where: { reportId: sourceId },
        data: { reportId: targetId },
      }),
      // Move non-internal comments
      prisma.comment.updateMany({
        where: { reportId: sourceId },
        data: { reportId: targetId },
      }),
      // Close source report
      prisma.report.update({
        where: { id: sourceId },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          isDuplicate: true,
          duplicateOfId: targetId,
        },
      }),
      prisma.reportStatusHistory.create({
        data: {
          reportId: sourceId,
          fromStatus: source.status,
          toStatus: 'CLOSED',
          changedBy: actorId,
          reason: `Merged into report #${targetId}`,
        },
      }),
      // Link
      prisma.reportLink.upsert({
        where: { reportId_linkedId: { reportId: sourceId, linkedId: targetId } },
        create: { reportId: sourceId, linkedId: targetId, linkType: 'DUPLICATE' },
        update: {},
      }),
      prisma.auditLog.create({
        data: {
          actorId, orgId,
          action: 'REPORT_MERGED',
          entityType: 'Report',
          entityId: sourceId,
          after: { mergedInto: targetId },
        },
      }),
    ]);

    return { message: `Report ${sourceId} merged into ${targetId}` };
  }

  /**
   * Full event timeline: status changes + comments (respecting internal visibility).
   */
  static async getTimeline(reportId: string, orgId: string, isOrgMember: boolean) {
    const report = await prisma.report.findFirst({
      where: { id: reportId, program: { orgId } },
    });
    if (!report) throw new NotFoundError('Report not found');

    const [statusChanges, comments] = await Promise.all([
      prisma.reportStatusHistory.findMany({
        where: { reportId },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.comment.findMany({
        where: {
          reportId,
          deletedAt: null,
          // Hide internal notes from non-org-members (researchers)
          ...(isOrgMember ? {} : { isInternal: false }),
        },
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      }),
    ]);

    // Merge into single timeline sorted by createdAt
    const timeline = [
      ...statusChanges.map((s) => ({
        type: 'status_change' as const,
        id: s.id,
        fromStatus: s.fromStatus,
        toStatus: s.toStatus,
        changedBy: s.changedBy,
        reason: s.reason,
        createdAt: s.createdAt,
      })),
      ...comments.map((c) => ({
        type: 'comment' as const,
        id: c.id,
        body: c.body,
        isInternal: c.isInternal,
        author: c.author,
        createdAt: c.createdAt,
      })),
    ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return timeline;
  }

  /**
   * Escalate a report.
   */
  static async escalateReport(
    reportId: string,
    reason: string,
    actorId: string,
    orgId: string,
  ) {
    const report = await prisma.report.findFirst({
      where: { id: reportId, program: { orgId } },
    });
    if (!report) throw new NotFoundError('Report not found');

    if (report.status !== 'ACCEPTED') {
      throw new BadRequestError('Only ACCEPTED reports can be escalated');
    }

    // Find org admins to notify
    const orgAdmins = await prisma.organizationMember.findMany({
      where: { orgId, role: 'ORG_ADMIN' },
      select: { userId: true },
    });

    await prisma.$transaction([
      prisma.report.update({
        where: { id: reportId },
        data: { status: 'ESCALATED' },
      }),
      prisma.reportStatusHistory.create({
        data: {
          reportId,
          fromStatus: report.status,
          toStatus: 'ESCALATED',
          changedBy: actorId,
          reason,
        },
      }),
      prisma.auditLog.create({
        data: {
          actorId, orgId,
          action: 'REPORT_ESCALATED',
          entityType: 'Report',
          entityId: reportId,
          after: { reason },
        },
      }),
      // Notify all org admins
      ...orgAdmins.map((admin) =>
        prisma.notification.create({
          data: {
            userId: admin.userId,
            type: 'REPORT_ESCALATED',
            channel: 'IN_APP',
            subject: 'Report escalated',
            body: `Report "${report.title}" has been escalated: ${reason}`,
            data: { reportId, reason },
          },
        }),
      ),
    ]);

    return { message: 'Report escalated' };
  }

  /**
   * SLA dashboard: at-risk and breached SLA records.
   */
  static async getSlaDashboard(orgId: string) {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const [breached, atRisk] = await Promise.all([
      prisma.slaRecord.findMany({
        where: {
          program: { orgId },
          breached: true,
          completedAt: null,
        },
        include: {
          report: {
            select: {
              id: true, title: true, status: true, severityEstimate: true,
              submitter: { select: { id: true, username: true } },
            },
          },
        },
        orderBy: { dueAt: 'asc' },
      }),
      prisma.slaRecord.findMany({
        where: {
          program: { orgId },
          breached: false,
          completedAt: null,
          dueAt: { lte: twoHoursFromNow, gt: now },
        },
        include: {
          report: {
            select: {
              id: true, title: true, status: true, severityEstimate: true,
              submitter: { select: { id: true, username: true } },
            },
          },
        },
        orderBy: { dueAt: 'asc' },
      }),
    ]);

    return { breached, atRisk };
  }

  /**
   * Link two reports.
   */
  static async linkReports(
    reportId: string,
    linkedId: string,
    linkType: string,
    actorId: string,
    orgId: string,
  ) {
    const [report, linked] = await Promise.all([
      prisma.report.findFirst({ where: { id: reportId, program: { orgId } } }),
      prisma.report.findFirst({ where: { id: linkedId, program: { orgId } } }),
    ]);
    if (!report) throw new NotFoundError('Report not found');
    if (!linked) throw new NotFoundError('Linked report not found');
    if (reportId === linkedId) throw new BadRequestError('Cannot link a report to itself');

    const link = await prisma.reportLink.upsert({
      where: { reportId_linkedId: { reportId, linkedId } },
      create: { reportId, linkedId, linkType },
      update: { linkType },
    });

    return link;
  }

  /**
   * Bulk assign reports.
   */
  static async bulkAssign(
    reportIds: string[],
    assigneeId: string,
    actorId: string,
    orgId: string,
  ) {
    // Verify assignee is org member
    const member = await prisma.organizationMember.findFirst({
      where: { orgId, userId: assigneeId },
    });
    if (!member) throw new BadRequestError('Assignee is not a member of this organization');

    // Verify all reports belong to org
    const count = await prisma.report.count({
      where: { id: { in: reportIds }, program: { orgId } },
    });
    if (count !== reportIds.length) throw new BadRequestError('Some reports were not found');

    await prisma.$transaction([
      prisma.report.updateMany({
        where: { id: { in: reportIds } },
        data: { assigneeId },
      }),
      prisma.auditLog.create({
        data: {
          actorId, orgId,
          action: 'REPORTS_BULK_ASSIGNED',
          entityType: 'Report',
          entityId: reportIds.join(','),
          after: { assigneeId, count: reportIds.length },
        },
      }),
    ]);

    return { message: `${reportIds.length} reports assigned` };
  }

  /**
   * Bulk close reports.
   */
  static async bulkClose(
    reportIds: string[],
    reason: string,
    actorId: string,
    orgId: string,
  ) {
    const count = await prisma.report.count({
      where: { id: { in: reportIds }, program: { orgId } },
    });
    if (count !== reportIds.length) throw new BadRequestError('Some reports were not found');

    const reports = await prisma.report.findMany({
      where: { id: { in: reportIds } },
      select: { id: true, status: true, submitterId: true, title: true },
    });

    await prisma.$transaction([
      prisma.report.updateMany({
        where: { id: { in: reportIds } },
        data: { status: 'CLOSED', closedAt: new Date() },
      }),
      ...reports.map((r) =>
        prisma.reportStatusHistory.create({
          data: {
            reportId: r.id,
            fromStatus: r.status,
            toStatus: 'CLOSED',
            changedBy: actorId,
            reason,
          },
        }),
      ),
      ...reports.map((r) =>
        prisma.notification.create({
          data: {
            userId: r.submitterId,
            type: 'REPORT_STATUS_CHANGE',
            channel: 'IN_APP',
            subject: 'Report closed',
            body: `Your report "${r.title}" has been closed: ${reason}`,
            data: { reportId: r.id, toStatus: 'CLOSED' },
          },
        }),
      ),
      prisma.auditLog.create({
        data: {
          actorId, orgId,
          action: 'REPORTS_BULK_CLOSED',
          entityType: 'Report',
          entityId: reportIds.join(','),
          after: { reason, count: reportIds.length },
        },
      }),
    ]);

    return { message: `${reportIds.length} reports closed` };
  }
}
