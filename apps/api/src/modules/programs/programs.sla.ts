import { prisma } from '@bughuntr/db';
import { ReportStatus, Severity } from '@bughuntr/db';
import {
  SLA_FIRST_RESPONSE_HOURS,
  SLA_TRIAGE_DECISION_DAYS,
  SLA_FIX_DAYS_BY_SEVERITY,
} from '@bughuntr/shared';
import { slaConfigSchema, type SlaConfig } from './programs.schemas.js';

const ACTIVE_REPORT_STATUSES: ReportStatus[] = [
  ReportStatus.SUBMITTED,
  ReportStatus.RECEIVED,
  ReportStatus.NEEDS_INFO,
  ReportStatus.TRIAGING,
  ReportStatus.ACCEPTED,
];

export function mergeSlaConfig(raw: unknown): SlaConfig {
  const base: SlaConfig = {
    firstResponseHours: SLA_FIRST_RESPONSE_HOURS,
    triageDecisionDays: SLA_TRIAGE_DECISION_DAYS,
    fixDays: { ...SLA_FIX_DAYS_BY_SEVERITY },
  };
  const parsed = slaConfigSchema.partial().safeParse(raw);
  if (!parsed.success) return base;
  return {
    firstResponseHours:
      parsed.data.firstResponseHours ?? base.firstResponseHours,
    triageDecisionDays:
      parsed.data.triageDecisionDays ?? base.triageDecisionDays,
    fixDays: {
      ...base.fixDays,
      ...parsed.data.fixDays,
    },
  };
}

function addHours(d: Date, hours: number): Date {
  return new Date(d.getTime() + hours * 60 * 60 * 1000);
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Create missing SLA rows for in-flight reports when a program becomes ACTIVE.
 */
export async function seedSlaRecordsForProgram(programId: string): Promise<void> {
  const program = await prisma.program.findFirst({
    where: { id: programId, deletedAt: null },
  });
  if (!program) return;

  const cfg = mergeSlaConfig(program.slaConfig);

  const reports = await prisma.report.findMany({
    where: {
      programId,
      status: { in: ACTIVE_REPORT_STATUSES },
    },
    include: { slaRecords: true },
  });

  for (const r of reports) {
    const existing = new Set(r.slaRecords.map((s) => s.metricKey));
    const anchor = r.receivedAt ?? r.submittedAt ?? r.createdAt;
    const rows: { reportId: string; programId: string; metricKey: string; dueAt: Date }[] =
      [];

    if (!existing.has('FIRST_RESPONSE')) {
      rows.push({
        reportId: r.id,
        programId,
        metricKey: 'FIRST_RESPONSE',
        dueAt: addHours(anchor, cfg.firstResponseHours),
      });
    }
    if (!existing.has('TRIAGE_DECISION')) {
      rows.push({
        reportId: r.id,
        programId,
        metricKey: 'TRIAGE_DECISION',
        dueAt: addDays(anchor, cfg.triageDecisionDays),
      });
    }
    if (!existing.has('FIX')) {
      const sev = r.severityValidated ?? r.severityEstimate;
      const days =
        cfg.fixDays[sev as Severity] ??
        SLA_FIX_DAYS_BY_SEVERITY.MEDIUM;
      rows.push({
        reportId: r.id,
        programId,
        metricKey: 'FIX',
        dueAt: addDays(anchor, days),
      });
    }

    if (rows.length > 0) {
      await prisma.slaRecord.createMany({ data: rows });
    }
  }
}
