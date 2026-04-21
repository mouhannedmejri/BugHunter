import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { stringify } from 'csv-stringify/sync';
import * as React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { Redis } from 'ioredis';
import { OrgRole, type Prisma, prisma } from '@bughuntr/db';
import { ForbiddenError } from '@bughuntr/shared';
import { env } from '../../config.js';
import type { AnalyticsExportQuery, PeriodQuery } from './analytics.schemas.js';

const redis = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
const OVERVIEW_TTL_SECONDS = 300;
const EXPORT_TTL_SECONDS = 3600;
const PAGE_SIZE = 1000;
const LOCAL_EXPORTS_DIR = path.resolve(process.cwd(), 'exports');

type ExportState = {
  status: 'PROCESSING' | 'COMPLETED';
  url: string | null;
  total?: number;
  localPath?: string;
  contentType?: string;
  fileName?: string;
};

function toUtcRange(dateFrom?: Date, dateTo?: Date) {
  const from = dateFrom ? new Date(Date.UTC(dateFrom.getUTCFullYear(), dateFrom.getUTCMonth(), dateFrom.getUTCDate(), 0, 0, 0, 0)) : undefined;
  const to = dateTo ? new Date(Date.UTC(dateTo.getUTCFullYear(), dateTo.getUTCMonth(), dateTo.getUTCDate(), 23, 59, 59, 999)) : undefined;
  return { from, to };
}

async function ensureRedis() {
  if (redis.status === 'wait') await redis.connect();
}

async function ensureLocalExportsDir() {
  await mkdir(LOCAL_EXPORTS_DIR, { recursive: true });
}

async function writeLocalExport(
  jobId: string,
  extension: 'csv' | 'pdf',
  body: Buffer,
  contentType: string,
): Promise<Pick<ExportState, 'url' | 'localPath' | 'contentType' | 'fileName'>> {
  await ensureLocalExportsDir();
  const fileName = `reports-export-${jobId}.${extension}`;
  const localPath = path.join(LOCAL_EXPORTS_DIR, fileName);
  await writeFile(localPath, body);
  return {
    url: `/api/v1/exports/${jobId}/download`,
    localPath,
    contentType,
    fileName,
  };
}

function periodDays(period: PeriodQuery['period']) {
  if (period === '7d') return 7;
  if (period === '30d') return 30;
  if (period === '90d') return 90;
  return 365;
}

function buildReportExportDocument(
  rows: Array<{
    id: string;
    title: string;
    status: string;
    severity: string | null;
    createdAt: Date;
  }>,
) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      React.createElement(Text, { style: styles.title }, 'Analytics Export'),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.cellHeader }, 'ID'),
        React.createElement(Text, { style: styles.cellHeader }, 'Title'),
        React.createElement(Text, { style: styles.cellHeader }, 'Status'),
        React.createElement(Text, { style: styles.cellHeader }, 'Severity'),
        React.createElement(Text, { style: styles.cellHeader }, 'Created'),
      ),
      ...rows.map((row) =>
        React.createElement(
          View,
          { style: styles.row, key: row.id },
          React.createElement(Text, { style: styles.cell }, row.id.slice(0, 8)),
          React.createElement(Text, { style: styles.cell }, row.title.slice(0, 30)),
          React.createElement(Text, { style: styles.cell }, row.status),
          React.createElement(Text, { style: styles.cell }, row.severity ?? '-'),
          React.createElement(Text, { style: styles.cell }, row.createdAt.toISOString().slice(0, 10)),
        ),
      ),
    ),
  );
}

const styles = StyleSheet.create({
  page: { padding: 24 },
  title: { fontSize: 16, marginBottom: 12 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ddd', paddingVertical: 4 },
  cellHeader: { width: '20%', fontSize: 9, fontWeight: 700 },
  cell: { width: '20%', fontSize: 8 },
});

export class AnalyticsService {
  static async invalidateOverviewCache(orgId: string) {
    await ensureRedis();
    await redis.del(`analytics:overview:${orgId}`);
  }

  private static async assertOrgMember(slug: string, userId: string) {
    const member = await prisma.organizationMember.findFirst({
      where: {
        userId,
        org: { slug, deletedAt: null },
        role: { in: [OrgRole.ORG_ADMIN, OrgRole.PROGRAM_MANAGER, OrgRole.REVIEWER, OrgRole.FINANCE, OrgRole.VIEWER] },
      },
      include: { org: true },
    });
    if (!member) throw new ForbiddenError('Organization membership required');
    return member;
  }

  static async getOverview(slug: string, userId: string) {
    const member = await AnalyticsService.assertOrgMember(slug, userId);
    await ensureRedis();
    const cacheKey = `analytics:overview:${member.orgId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as unknown;

    const [statusGroup, severityGroup, rewardAgg, openHighSeverity, slaBreachCount, firstResponseRaw, triageRaw] = await Promise.all([
      prisma.report.groupBy({ by: ['status'], where: { program: { orgId: member.orgId } }, _count: { id: true } }),
      prisma.report.groupBy({ by: ['severityValidated'], where: { program: { orgId: member.orgId } }, _count: { id: true } }),
      prisma.reward.aggregate({ where: { program: { orgId: member.orgId }, decision: { in: ['APPROVED', 'PARTIAL'] } }, _sum: { amountUsd: true, bonusUsd: true } }),
      prisma.report.count({ where: { program: { orgId: member.orgId }, status: { notIn: ['CLOSED', 'REWARDED', 'RESOLVED'] }, OR: [{ severityValidated: 'HIGH' }, { severityValidated: 'CRITICAL' }] } }),
      prisma.slaRecord.count({ where: { program: { orgId: member.orgId }, breached: true } }),
      prisma.$queryRaw<Array<{ avgHours: number | null }>>`SELECT AVG(EXTRACT(EPOCH FROM ("receivedAt" - "submittedAt")) / 3600.0) as "avgHours" FROM "Report" r JOIN "Program" p ON p.id = r."programId" WHERE p."orgId" = ${member.orgId} AND r."receivedAt" IS NOT NULL AND r."submittedAt" IS NOT NULL`,
      prisma.$queryRaw<Array<{ medianHours: number | null }>>`SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM ("acceptedAt" - "submittedAt")) / 3600.0) as "medianHours" FROM "Report" r JOIN "Program" p ON p.id = r."programId" WHERE p."orgId" = ${member.orgId} AND r."acceptedAt" IS NOT NULL AND r."submittedAt" IS NOT NULL`,
    ]);

    const byStatus = Object.fromEntries(statusGroup.map((x) => [x.status, x._count.id]));
    const bySeverity = Object.fromEntries(severityGroup.map((x) => [x.severityValidated ?? 'UNSPECIFIED', x._count.id]));
    const totalReports = statusGroup.reduce((s, row) => s + row._count.id, 0);
    const acceptedReports = Number(byStatus['ACCEPTED'] ?? 0) + Number(byStatus['REWARDED'] ?? 0) + Number(byStatus['RESOLVED'] ?? 0);
    const rejectedReports = Number(byStatus['NOT_APPLICABLE'] ?? 0) + Number(byStatus['OUT_OF_SCOPE'] ?? 0) + Number(byStatus['INFORMATIVE'] ?? 0);
    const duplicateReports = Number(byStatus['DUPLICATE'] ?? 0);

    const result = {
      totalReports,
      acceptedReports,
      rejectedReports,
      duplicateReports,
      acceptRate: totalReports > 0 ? acceptedReports / totalReports : 0,
      avgFirstResponseHours: firstResponseRaw[0]?.avgHours ?? 0,
      medianTriageHours: triageRaw[0]?.medianHours ?? 0,
      totalPaidUsd: ((rewardAgg._sum.amountUsd ?? 0) + (rewardAgg._sum.bonusUsd ?? 0)) / 100,
      openHighSeverity,
      slaBreachCount,
      byStatus,
      bySeverity,
    };
    await redis.set(cacheKey, JSON.stringify(result), 'EX', OVERVIEW_TTL_SECONDS);
    return result;
  }

  static async getTrends(slug: string, userId: string, query: PeriodQuery) {
    const member = await AnalyticsService.assertOrgMember(slug, userId);
    const days = periodDays(query.period);
    return prisma.$queryRaw<Array<{ day: Date; count: number }>>`
      SELECT DATE_TRUNC('day', r."createdAt") as day, COUNT(*)::int as count
      FROM "Report" r
      JOIN "Program" p ON p.id = r."programId"
      WHERE p."orgId" = ${member.orgId}
      AND r."createdAt" >= NOW() - (${days} * INTERVAL '1 day')
      GROUP BY 1
      ORDER BY 1 ASC
    `;
  }

  static async getAssets(slug: string, userId: string) {
    const member = await AnalyticsService.assertOrgMember(slug, userId);
    return prisma.$queryRaw<Array<{ assetId: string; identifier: string; count: number }>>`
      SELECT a.id as "assetId", a.identifier, COUNT(r.id)::int as count
      FROM "Asset" a
      JOIN "Report" r ON r."assetId" = a.id
      JOIN "Program" p ON p.id = a."programId"
      WHERE p."orgId" = ${member.orgId}
      GROUP BY a.id, a.identifier
      ORDER BY count DESC
      LIMIT 20
    `;
  }

  static async getResearchers(slug: string, userId: string) {
    const member = await AnalyticsService.assertOrgMember(slug, userId);
    return prisma.$queryRaw<Array<{ userId: string; username: string; count: number }>>`
      SELECT u.id as "userId", u.username, COUNT(r.id)::int as count
      FROM "User" u
      JOIN "Report" r ON r."submitterId" = u.id
      JOIN "Program" p ON p.id = r."programId"
      WHERE p."orgId" = ${member.orgId}
      GROUP BY u.id, u.username
      ORDER BY count DESC
      LIMIT 50
    `;
  }

  static async getCategories(slug: string, userId: string) {
    const member = await AnalyticsService.assertOrgMember(slug, userId);
    return prisma.report.groupBy({
      by: ['vulnCategory'],
      where: { program: { orgId: member.orgId } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });
  }

  static async getSla(slug: string, userId: string) {
    const member = await AnalyticsService.assertOrgMember(slug, userId);
    const [total, compliant] = await Promise.all([
      prisma.slaRecord.count({ where: { program: { orgId: member.orgId } } }),
      prisma.slaRecord.count({ where: { program: { orgId: member.orgId }, breached: false, completedAt: { not: null } } }),
    ]);
    return { total, compliant, complianceRate: total > 0 ? compliant / total : 0 };
  }

  static async getMyAnalytics(userId: string) {
    const [submissions, accepted, rewardAgg, rank, trend] = await Promise.all([
      prisma.report.count({ where: { submitterId: userId } }),
      prisma.report.count({ where: { submitterId: userId, status: { in: ['ACCEPTED', 'REWARDED', 'RESOLVED', 'CLOSED'] } } }),
      prisma.reward.aggregate({ where: { recipientId: userId, decision: { in: ['APPROVED', 'PARTIAL'] } }, _avg: { amountUsd: true }, _count: { id: true } }),
      prisma.$queryRaw<Array<{ rank: number }>>`
        WITH totals AS (
          SELECT u.id, COALESCE(SUM(re.points), 0)::int AS pts
          FROM "User" u
          LEFT JOIN "ReputationEvent" re ON re."userId" = u.id
          WHERE u."deletedAt" IS NULL AND u."bannedAt" IS NULL
          GROUP BY u.id
        ),
        ranked AS (SELECT id, RANK() OVER (ORDER BY pts DESC) AS rk FROM totals)
        SELECT rk::int AS rank FROM ranked WHERE id = ${userId}
      `,
      prisma.$queryRaw<Array<{ day: Date; count: number }>>`
        SELECT DATE_TRUNC('day', "createdAt") as day, COUNT(*)::int as count
        FROM "Report"
        WHERE "submitterId" = ${userId} AND "createdAt" >= NOW() - INTERVAL '30 day'
        GROUP BY 1
        ORDER BY 1 ASC
      `,
    ]);
    return {
      submissions,
      accepted,
      avgReward: rewardAgg._avg.amountUsd ?? 0,
      rank: rank[0]?.rank ?? 0,
      trend,
    };
  }

  static async createExportJob(slug: string, userId: string, query: AnalyticsExportQuery) {
    const member = await AnalyticsService.assertOrgMember(slug, userId);
    const { from, to } = toUtcRange(query.dateFrom, query.dateTo);
    const createdAtFilter: Prisma.DateTimeFilter | undefined =
      from || to ? { gte: from, lte: to } : undefined;
    const total = await prisma.report.count({
      where: {
        program: { orgId: member.orgId },
        ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
      },
    });

    const jobId = randomUUID();
    await ensureRedis();
    await redis.set(`exports:${jobId}`, JSON.stringify({ status: 'PROCESSING', url: null }), 'EX', EXPORT_TTL_SECONDS);

    const rows = await prisma.report.findMany({
      where: {
        program: { orgId: member.orgId },
        ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
      },
      take: total > PAGE_SIZE ? PAGE_SIZE : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        severityValidated: true,
        createdAt: true,
      },
    });

    if (query.format === 'csv') {
      const csv = stringify(rows.map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        severity: r.severityValidated ?? '',
        createdAt: r.createdAt.toISOString(),
      })), { header: true });
      const file = await writeLocalExport(jobId, 'csv', Buffer.from(csv), 'text/csv');
      await redis.set(
        `exports:${jobId}`,
        JSON.stringify({ status: 'COMPLETED', total, ...file } satisfies ExportState),
        'EX',
        EXPORT_TTL_SECONDS,
      );
    } else {
      const doc = buildReportExportDocument(
        rows.map((x) => ({
          id: x.id,
          title: x.title,
          status: x.status,
          severity: x.severityValidated,
          createdAt: x.createdAt,
        })),
      );
      const stream = await pdf(doc).toBuffer();
      const chunks: Buffer[] = [];
      for await (const chunk of stream as AsyncIterable<Uint8Array>) {
        chunks.push(Buffer.from(chunk));
      }
      const blob = Buffer.concat(chunks);
      const file = await writeLocalExport(jobId, 'pdf', blob, 'application/pdf');
      await redis.set(
        `exports:${jobId}`,
        JSON.stringify({ status: 'COMPLETED', total, ...file } satisfies ExportState),
        'EX',
        EXPORT_TTL_SECONDS,
      );
    }

    return { jobId, status: 'COMPLETED' as const };
  }

  static async getExportJob(jobId: string) {
    await ensureRedis();
    const raw = await redis.get(`exports:${jobId}`);
    if (!raw) return { jobId, status: 'NOT_FOUND' };
    return { jobId, ...(JSON.parse(raw) as object) };
  }

  static async getExportFile(jobId: string) {
    await ensureRedis();
    const raw = await redis.get(`exports:${jobId}`);
    if (!raw) return null;

    const payload = JSON.parse(raw) as ExportState;
    if (payload.status !== 'COMPLETED' || !payload.localPath || !payload.contentType) {
      return null;
    }

    const body = await readFile(payload.localPath);
    return {
      body,
      contentType: payload.contentType,
      fileName: payload.fileName ?? `reports-export-${jobId}`,
    };
  }
}
