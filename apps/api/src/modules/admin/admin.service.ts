import { Queue } from 'bullmq';
import { stringify } from 'csv-stringify/sync';
import { randomBytes } from 'node:crypto';
import { Redis } from 'ioredis';
import { PlatformRole, ProgramStatus, ReportStatus, Prisma, prisma } from '@bughuntr/db';
import { ConflictError, ForbiddenError, NotFoundError } from '@bughuntr/shared';
import { env } from '../../config.js';
import { buildRedisConnection } from '../../lib/redis-connection.js';
import { putPublicObject } from '../../lib/s3.js';
import { NotificationService } from '../notifications/notifications.service.js';
import type {
  AbuseReportActionBody,
  AnnouncementBody,
  AuditExportQuery,
  AuditLogQuery,
  ContentFlagBody,
  FeatureFlagBody,
  OrgListQuery,
  PayoutListQuery,
  ProgramListQuery,
  ReportListQuery,
} from './admin.schemas.js';

const FEATURE_FLAG_HASH = 'feature_flags';
const ERROR_RING_KEY = 'admin:error-ring';
const QUEUE_NAMES = [
  'email',
  'notification',
  'webhook',
  'virus-scan',
  'duplicate-detection',
  'asset-verification',
] as const;

const queueDepthReaders = QUEUE_NAMES.map(
  (name) => new Queue(name, { connection: buildRedisConnection() }),
);
const redis = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
const dbMetrics = {
  totalQueries: 0,
  slowQueries: [] as Array<{ at: string; durationMs: number; model?: string; action?: string }>,
};
let metricsInitialized = false;

function getUtcRange(dateFrom?: Date, dateTo?: Date) {
  const gte = dateFrom
    ? new Date(
        Date.UTC(
          dateFrom.getUTCFullYear(),
          dateFrom.getUTCMonth(),
          dateFrom.getUTCDate(),
          0,
          0,
          0,
          0,
        ),
      )
    : undefined;
  const lte = dateTo
    ? new Date(
        Date.UTC(
          dateTo.getUTCFullYear(),
          dateTo.getUTCMonth(),
          dateTo.getUTCDate(),
          23,
          59,
          59,
          999,
        ),
      )
    : undefined;
  return { gte, lte };
}

async function ensureRedis() {
  if (redis.status === 'wait') await redis.connect();
}

function initDbMetrics() {
  if (metricsInitialized) return;
  metricsInitialized = true;
  prisma.$use(async (params, next) => {
    const started = Date.now();
    const result = await next(params);
    const durationMs = Date.now() - started;
    dbMetrics.totalQueries += 1;
    if (durationMs >= 500) {
      dbMetrics.slowQueries.push({
        at: new Date().toISOString(),
        durationMs,
        model: params.model,
        action: params.action,
      });
      if (dbMetrics.slowQueries.length > 200) dbMetrics.slowQueries.shift();
    }
    return result;
  });
}

export class AdminService {


  static async getUserDetails(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        platformRole: true,
        country: true,
        bannedAt: true,
        bannedReason: true,
        createdAt: true,
        lastLoginAt: true,
        avatarUrl: true,
        twitterHandle: true,
        githubHandle: true,
        bio: true,
        website: true,
        rewardHistory: true,
        

        orgMemberships: {
          select: {
            org: { select: { id: true, slug: true, name: true } },
          },
        },
        reports: { select: { id: true } },    
        rewards: { select: { id: true } },
        sessions: { select: { id: true } },
        reputationLogs: { select: { id: true } },

      },
    });
    if (!user) throw new NotFoundError('User');
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      platformRole: user.platformRole,
      country: user.country,
      bannedAt: user.bannedAt,
      bannedReason: user.bannedReason,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      orgs: user.orgMemberships.map((m) => m.org),
      reports: user.reports,
      rewards: user.rewards,
      sessions: user.sessions,
      reputationLogs: user.reputationLogs,
      
    };
  }
  static async getUsersStats() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
    const [totalUsers, rawStats] = await prisma.$transaction([
      prisma.user.count({
        where: {
          deletedAt: null,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
  
      prisma.user.findMany({
        where: {
          deletedAt: null,
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { createdAt: true },
      }),
    ]);
  
    const usersStats = rawStats.reduce<Record<string, number>>((acc, { createdAt }) => {
      const day = createdAt.toISOString().split('T')[0];
      if (!day) return acc;
  
      acc[day] = (acc[day] ?? 0) + 1;
      return acc;
    }, {});
  
    return { totalUsers, usersStats };
  }
  static async getReportsStats(){
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalReports,rawStats] = await prisma.$transaction([
      prisma.report.count({
        where:{
            createdAt :{ gte : thirtyDaysAgo}
        },
      }),prisma.report.findMany({
        where:{
          createdAt:{gte:thirtyDaysAgo},

        },select:{createdAt:true}
      })
    ])

    const raportStats = rawStats.reduce<Record<string, number>>((acc, { createdAt }) => {
      const day = createdAt.toISOString().split('T')[0];
      if (!day) return acc;
  
      acc[day] = (acc[day] ?? 0) + 1;
      return acc;
    }, {});
  
    return { totalReports,raportStats };
  
  }
  static async auditAction(
    actorId: string,
    action: string,
    entityType = 'Admin',
    entityId = 'platform',
    after?: Record<string, unknown>,
  ) {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        after: after as Prisma.InputJsonValue | undefined,
      },
    });
  }

  static async recordErrorLog(message: string) {
    await ensureRedis();
    const now = new Date().toISOString();
    await redis.rpush(ERROR_RING_KEY, JSON.stringify({ at: now, level: 'ERROR', message }));
    await redis.ltrim(ERROR_RING_KEY, -1000, -1);
    await redis.expire(ERROR_RING_KEY, 60 * 60);
  }

  static assertStaff(role: string): asserts role is 'SUPER_ADMIN' | 'SUPPORT' {
    if (role !== PlatformRole.SUPER_ADMIN && role !== PlatformRole.SUPPORT) {
      throw new ForbiddenError('SUPER_ADMIN or SUPPORT role required');
    }
  }

  static assertSuperAdmin(role: string): void {
    if (role !== PlatformRole.SUPER_ADMIN) {
      throw new ForbiddenError('SUPER_ADMIN role required');
    }
  }

  static async getPlatformStats() {
    const [users, orgs, programs, reports, payouts] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.organization.count({ where: { deletedAt: null } }),
      prisma.program.count({ where: { deletedAt: null } }),
      prisma.report.count(),
      prisma.payout.count(),
    ]);
    return {
      totalUsers: users,
      totalOrgs: orgs,
      totalPrograms: programs,
      totalReports: reports,
      totalPayouts: payouts,
    };
  }

  static async listOrganizations(query: OrgListQuery) {
    const where: Prisma.OrganizationWhereInput = { deletedAt: null };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.suspended === 'true') where.settings = { path: ['suspended'], equals: true };
    if (query.suspended === 'false')
      where.NOT = [{ settings: { path: ['suspended'], equals: true } }];

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.organization.count({ where }),
    ]);
    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1,
    };
  }

  static async listPrograms(query: ProgramListQuery) {
    const where: Prisma.ProgramWhereInput = {
      deletedAt: null,
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.org ? { org: { slug: query.org } } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { slug: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      prisma.program.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: { org: { select: { id: true, slug: true, name: true } } },
      }),
      prisma.program.count({ where }),
    ]);
    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1,
    };
  }

  static async listReports(query: ReportListQuery) {
    const where: Prisma.ReportWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.org ? { program: { org: { slug: query.org } } } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { impactExplanation: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          program: {
            select: {
              id: true,
              slug: true,
              title: true,
              org: { select: { id: true, slug: true, name: true } },
            },
          },
          submitter: { select: { id: true, username: true, email: true } },
          reward: { include: { payout: true } },
        },
      }),
      prisma.report.count({ where }),
    ]);
    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1,
    };
  }

  static async listPayouts(query: PayoutListQuery) {
    const where: Prisma.PayoutWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.method ? { method: query.method } : {}),
      ...(query.org ? { reward: { program: { org: { slug: query.org } } } } : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      prisma.payout.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reward: {
            include: { program: { include: { org: true } }, report: true, recipient: true },
          },
          profile: true,
        },
      }),
      prisma.payout.count({ where }),
    ]);
    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1,
    };
  }

  static async suspendOrganization(orgId: string, actorId: string) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundError('Organization');
    await prisma.$transaction([
      prisma.organization.update({
        where: { id: orgId },
        data: {
          settings: {
            ...(org.settings as Prisma.JsonObject),
            suspended: true,
            suspendedAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
        },
      }),
      prisma.program.updateMany({
        where: { orgId, status: { in: [ProgramStatus.ACTIVE, ProgramStatus.DRAFT] } },
        data: { status: ProgramStatus.PAUSED },
      }),
      prisma.auditLog.create({
        data: {
          actorId,
          orgId,
          action: 'ORG_SUSPENDED',
          entityType: 'Organization',
          entityId: orgId,
          after: { suspended: true },
        },
      }),
    ]);
    return { message: 'Organization suspended and programs paused' };
  }

  static async forceCloseProgram(programId: string, actorId: string) {
    const program = await prisma.program.findUnique({ where: { id: programId } });
    if (!program) throw new NotFoundError('Program');
    await prisma.$transaction([
      prisma.program.update({ where: { id: programId }, data: { status: ProgramStatus.CLOSED } }),
      prisma.auditLog.create({
        data: {
          actorId,
          orgId: program.orgId,
          action: 'PROGRAM_FORCE_CLOSED',
          entityType: 'Program',
          entityId: programId,
          before: { status: program.status },
          after: { status: ProgramStatus.CLOSED },
        },
      }),
    ]);
    return { message: 'Program force-closed' };
  }

  static async listAuditLogs(query: AuditLogQuery) {
    const { gte, lte } = getUtcRange(query.dateFrom, query.dateTo);
    const where: Prisma.AuditLogWhereInput = {
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.action ? { action: { contains: query.action, mode: 'insensitive' } } : {}),
      ...(query.entityType
        ? { entityType: { contains: query.entityType, mode: 'insensitive' } }
        : {}),
      ...(gte || lte ? { createdAt: { gte, lte } } : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { id: true, username: true, email: true } },
          org: { select: { id: true, slug: true, name: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);
    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1,
    };
  }

  static async exportAuditLogs(query: AuditExportQuery) {
    const { gte, lte } = getUtcRange(query.dateFrom, query.dateTo);
    const rows = await prisma.auditLog.findMany({
      where: gte || lte ? { createdAt: { gte, lte } } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 10000,
      include: {
        actor: { select: { id: true, username: true } },
        org: { select: { id: true, slug: true } },
      },
    });
    const csv = stringify(
      rows.map((row) => ({
        id: row.id,
        actorId: row.actorId ?? '',
        actor: row.actor?.username ?? '',
        orgId: row.orgId ?? '',
        org: row.org?.slug ?? '',
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        createdAt: row.createdAt.toISOString(),
      })),
      { header: true },
    );
    const key = `exports/audit-logs-${Date.now()}.csv`;
    const url = await putPublicObject(key, Buffer.from(csv), 'text/csv');
    return { url };
  }

  static async getSystemHealth() {
    initDbMetrics();
    await ensureRedis();
    const [dbConnections, redisInfo, queueDepths, errorLogs] = await Promise.all([
      prisma.$queryRaw<
        Array<{ count: number }>
      >`SELECT COUNT(*)::int as count FROM pg_stat_activity`,
      redis.info('memory', 'clients'),
      Promise.all(
        queueDepthReaders.map(async (q) => ({
          queue: q.name,
          counts: await q.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
        })),
      ),
      redis.lrange(ERROR_RING_KEY, 0, -1),
    ]);
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const errorRate = errorLogs
      .map((raw) => JSON.parse(raw) as { at: string; level: string })
      .filter((x) => x.level === 'ERROR' && new Date(x.at).getTime() >= fiveMinAgo).length;

    const redisStats = Object.fromEntries(
      redisInfo
        .split('\n')
        .filter((line) => line.includes(':'))
        .map((line) => {
          const [k, v] = line.trim().split(':');
          return [k, v];
        }),
    );

    return {
      dbConnections: {
        active: dbConnections[0]?.count ?? 0,
        queryCount: dbMetrics.totalQueries,
        slowQueryLog: dbMetrics.slowQueries.slice(-20),
      },
      redisMemory: {
        usedMemory: redisStats['used_memory'] ?? '0',
        connectedClients: Number(redisStats['connected_clients'] ?? 0),
      },
      queueDepths,
      errorRate,
    };
  }

  static async getFeatureFlags() {
    await ensureRedis();
    const flags = await redis.hgetall(FEATURE_FLAG_HASH);
    const defaults = {
      CRYPTO_PAYOUTS: 'false',
      SMS_NOTIFICATIONS: 'false',
      LEADERBOARD_PUBLIC: 'true',
      CHALLENGE_MODE: 'false',
    };
    return { ...defaults, ...flags };
  }

  static async setFeatureFlag(key: string, body: FeatureFlagBody, actorId: string) {
    await ensureRedis();
    await redis.hset(
      FEATURE_FLAG_HASH,
      key,
      JSON.stringify({ enabled: body.enabled, value: body.value ?? null }),
    );
    await prisma.auditLog.create({
      data: {
        actorId,
        action: 'FEATURE_FLAG_UPDATED',
        entityType: 'FeatureFlag',
        entityId: key,
        after: { enabled: body.enabled, value: body.value ?? null },
      },
    });
    return { key, enabled: body.enabled, value: body.value ?? null };
  }

  static async checkFeatureFlag(key: string): Promise<boolean> {
    await ensureRedis();
    const raw = await redis.hget(FEATURE_FLAG_HASH, key);
    if (!raw) return false;
    try {
      return Boolean((JSON.parse(raw) as { enabled?: boolean }).enabled);
    } catch {
      return false;
    }
  }

  static async createAnnouncement(body: AnnouncementBody, actorId: string) {
    let recipients: string[] = [];
    if (body.audience === 'ALL') {
      const users = await prisma.user.findMany({
        where: { deletedAt: null },
        select: { id: true },
      });
      recipients = users.map((u) => u.id);
    } else if (body.audience === 'RESEARCHERS') {
      const users = await prisma.user.findMany({
        where: {
          deletedAt: null,
          orgMemberships: { none: {} },
        },
        select: { id: true },
      });
      recipients = users.map((u) => u.id);
    } else {
      const members = await prisma.organizationMember.findMany({
        select: { userId: true },
      });
      recipients = [...new Set(members.map((m) => m.userId))];
    }

    await Promise.all(
      recipients.map((userId) =>
        NotificationService.createNotification(userId, 'ADMIN_ANNOUNCEMENT', {
          subject: body.title,
          body: body.body,
          channel: 'EMAIL',
          meta: { audience: body.audience },
        }),
      ),
    );
    await prisma.auditLog.create({
      data: {
        actorId,
        action: 'ADMIN_ANNOUNCEMENT_CREATED',
        entityType: 'Announcement',
        entityId: `announcement-${Date.now()}`,
        after: { title: body.title, audience: body.audience, recipients: recipients.length },
      },
    });
    return { sent: recipients.length };
  }

  static async listAbuseReports() {
    return prisma.auditLog.findMany({
      where: { action: { in: ['CONTENT_FLAGGED', 'REPORT_MODERATED'] } },
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { actor: { select: { id: true, username: true } } },
    });
  }

  static async updateAbuseReport(
    id: string,
    body: AbuseReportActionBody,
    actorId: string,
    actorRole: string,
  ) {
    const abuse = await prisma.auditLog.findUnique({ where: { id } });
    if (!abuse) throw new NotFoundError('AbuseReport');
    if (body.action === 'BAN') {
      if (actorRole !== PlatformRole.SUPER_ADMIN) {
        throw new ForbiddenError('Only SUPER_ADMIN can ban');
      }
      if (abuse.entityType === 'User') {
        await prisma.user.update({
          where: { id: abuse.entityId },
          data: { bannedAt: new Date(), bannedReason: 'Abuse report ban' },
        });
      }
    }
    await prisma.auditLog.create({
      data: {
        actorId,
        action: 'ABUSE_REPORT_UPDATED',
        entityType: 'AuditLog',
        entityId: id,
        after: { action: body.action },
      },
    });
    return { message: `Abuse report ${body.action.toLowerCase()}` };
  }

  static async moderateReport(
    reportId: string,
    action: 'REDACT' | 'DELETE' | 'ESCALATE_TO_SA',
    actorId: string,
  ) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundError('Report');

    if (action === 'REDACT') {
      await prisma.report.update({
        where: { id: reportId },
        data: {
          title: '[REDACTED]',
          reproSteps: '[REDACTED BY ADMIN]',
          impactExplanation: '[REDACTED BY ADMIN]',
          environmentInfo: Prisma.JsonNull,
          suggestedFix: null,
        },
      });
    } else if (action === 'DELETE') {
      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: ReportStatus.CLOSED,
          closedAt: new Date(),
          title: '[REMOVED]',
        },
      });
    } else {
      await prisma.report.update({
        where: { id: reportId },
        data: { status: 'ESCALATED' },
      });
    }
    await prisma.auditLog.create({
      data: {
        actorId,
        action: 'REPORT_MODERATED',
        entityType: 'Report',
        entityId: reportId,
        after: { moderationAction: action },
      },
    });
    return { message: `Report ${action.toLowerCase()} applied` };
  }

  static async flagContent(
    type: 'report' | 'comment' | 'user',
    id: string,
    actorId: string,
    body: ContentFlagBody,
  ) {
    await prisma.auditLog.create({
      data: {
        actorId,
        action: 'CONTENT_FLAGGED',
        entityType: type,
        entityId: id,
        after: { reason: body.reason ?? undefined } as Prisma.InputJsonValue,
      },
    });
    return { message: 'Flag submitted for review' };
  }

  static async listVerifications(status?: string) {
    const where: Prisma.OrganizationWhereInput = {};
    if (status && status !== 'all') {
      where.verificationStatus = status as any;
    }

    const orgs = await prisma.organization.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        verificationStatus: true,
        verificationSubmittedAt: true,
        verificationApprovedAt: true,
        verificationRejectedAt: true,
        verificationRejectedReason: true,
        members: {
          where: { role: 'ORG_ADMIN' },
          include: { user: { select: { id: true, username: true, email: true } } },
          take: 1,
        },
        orgVerification: true,
      },
      orderBy: { verificationSubmittedAt: 'desc' },
    });

    return orgs.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.verificationStatus,
      submittedAt: org.verificationSubmittedAt,
      approvedAt: org.verificationApprovedAt,
      rejectedAt: org.verificationRejectedAt,
      rejectedReason: org.verificationRejectedReason,
      submittedBy: org.members[0]?.user,
      verification: org.orgVerification,
    }));
  }

  static async getVerificationCounts() {
    const [pending, submitted, approved, rejected] = await Promise.all([
      prisma.organization.count({ where: { verificationStatus: 'PENDING', deletedAt: null } }),
      prisma.organization.count({ where: { verificationStatus: 'SUBMITTED', deletedAt: null } }),
      prisma.organization.count({ where: { verificationStatus: 'APPROVED', deletedAt: null } }),
      prisma.organization.count({ where: { verificationStatus: 'REJECTED', deletedAt: null } }),
    ]);
    return { pending, submitted, approved, rejected };
  }

  static async approveOrganizationVerification(orgId: string, actorId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { members: true },
    });
    if (!org) throw new NotFoundError('Organization');
    const memberUserIds = [...new Set(org.members.map((m) => m.userId))];

    await prisma.$transaction([
      prisma.organization.update({
        where: { id: orgId },
        data: {
          verificationStatus: 'APPROVED',
          verificationApprovedAt: new Date(),
          verifiedBy: actorId,
        },
      }),
      prisma.orgVerification.update({
        where: { orgId },
        data: { updatedAt: new Date() },
      }),
      prisma.user.updateMany({
        where: {
          id: { in: memberUserIds },
          onboardingStep: 'PENDING_ORG_APPROVAL',
        },
        data: { onboardingStep: 'COMPLETE' },
      }),
      prisma.auditLog.create({
        data: {
          actorId,
          orgId,
          action: 'ORG_VERIFICATION_APPROVED',
          entityType: 'Organization',
          entityId: orgId,
        },
      }),
    ]);

    for (const member of org.members) {
      await NotificationService.createNotification(member.userId, 'ORG_VERIFICATION_APPROVED', {
        body: `Your organization "${org.name}" has been approved! You can now set up your first program.`,
        channel: 'IN_APP',
        meta: { orgSlug: org.slug, orgName: org.name },
      });
    }

    return { message: 'Organization verified', status: 'APPROVED' };
  }

  static async rejectOrganizationVerification(orgId: string, reason: string, actorId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { members: { where: { role: 'ORG_ADMIN' } } },
    });
    if (!org) throw new NotFoundError('Organization');

    await prisma.$transaction([
      prisma.organization.update({
        where: { id: orgId },
        data: {
          verificationStatus: 'REJECTED',
          verificationRejectedAt: new Date(),
          verificationRejectedReason: reason,
          verifiedBy: actorId,
        },
      }),
      prisma.orgVerification.update({
        where: { orgId },
        data: { adminNotes: reason, updatedAt: new Date() },
      }),
      prisma.auditLog.create({
        data: {
          actorId,
          orgId,
          action: 'ORG_VERIFICATION_REJECTED',
          entityType: 'Organization',
          entityId: orgId,
          after: { reason },
        },
      }),
    ]);

    for (const member of org.members) {
      await NotificationService.createNotification(member.userId, 'ORG_VERIFICATION_REJECTED', {
        body: `Your organization "${org.name}" verification was rejected. Reason: ${reason}`,
        channel: 'IN_APP',
        meta: { orgSlug: org.slug, rejectionReason: reason },
      });
    }

    return { message: 'Organization rejected', status: 'REJECTED' };
  }

  static async updateVerificationNotes(verificationId: string, adminNotes: string) {
    const verification = await prisma.orgVerification.findUnique({ where: { id: verificationId } });
    if (!verification) throw new NotFoundError('Verification');

    return prisma.orgVerification.update({
      where: { id: verificationId },
      data: { adminNotes },
    });
  }

  static async inviteUserToOrganization(userId: string, orgId: string, role: any, actorId: string) {
    const [user, org] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.organization.findUnique({
        where: { id: orgId, verificationStatus: 'APPROVED', deletedAt: null },
      }),
    ]);
    if (!user) throw new NotFoundError('User');
    if (!org) throw new NotFoundError('Approved organization');

    const existingMember = await prisma.organizationMember.findUnique({
      where: { orgId_userId: { orgId, userId } },
    });
    if (existingMember) throw new ConflictError('User is already a member');

    const token = randomBytes(32).toString('hex');
    const invite = await prisma.orgInvite.create({
      data: {
        orgId,
        email: user.email,
        userId,
        role,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await NotificationService.createNotification(userId, 'ORG_INVITATION_RECEIVED', {
      body: `You've been invited to join "${org.name}" as ${role.replace('_', ' ')}.`,
      channel: 'IN_APP',
      meta: {
        inviteToken: invite.token,
        inviteId: invite.id,
        orgName: org.name,
        orgSlug: org.slug,
        role,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId,
        orgId,
        action: 'ORG_ADMIN_INVITED_USER',
        entityType: 'OrgInvite',
        entityId: invite.id,
        after: { targetUserId: userId, role },
      },
    });

    return { message: 'Invitation sent', inviteId: invite.id };
  }

  static async getQueueStats() {
    await ensureRedis();
    const queueDepths = await Promise.all(
      queueDepthReaders.map(async (q) => ({
        name: q.name,
        counts: await q.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      })),
    );
    
    return queueDepths;
  }
}
