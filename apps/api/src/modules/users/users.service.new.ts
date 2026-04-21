import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import sharp from 'sharp';
import {
  prisma,
  PlatformRole,
  ReportStatus,
  type Prisma,
  type User,
} from '@bughuntr/db';
import { BadRequestError, ForbiddenError, NotFoundError } from '@bughuntr/shared';
import { putPublicObject } from '../../lib/s3.js';
import { signImpersonationToken } from '../../lib/tokens.js';
import { notifyUserBanned } from './users.email.js';
import type {
  AdminBanBody,
  AdminPlatformRoleBody,
  AdminUserListQuery,
  PayoutProfileBody,
  ReputationQuery,
  UpdateMeBody,
} from './users.schemas.js';

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Reports counted as "accepted" for stats and public activity. */
const ACCEPTED_LIKE: ReportStatus[] = [
  ReportStatus.ACCEPTED,
  ReportStatus.REWARDED,
  ReportStatus.RESOLVED,
  ReportStatus.CLOSED,
];

const meSelect = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  website: true,
  twitterHandle: true,
  githubHandle: true,
  country: true,
  timezone: true,
  platformRole: true,
  totpEnabled: true,
  emailVerifiedAt: true,
  kycStatus: true,
  onboardingStep: true,
  orgMemberships: {
    select: {
      org: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
  },
};

export class UserService {
  static async getMe(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: meSelect,
    });
    if (!user) throw new NotFoundError('User', userId);

    return user;
  }

  static async updateMe(userId: string, body: UpdateMeBody) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundError('User', userId);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(body.displayName && { displayName: body.displayName }),
        ...(body.bio !== undefined && { bio: body.bio }),
        ...(body.website !== undefined && { website: body.website }),
        ...(body.twitterHandle !== undefined && { twitterHandle: body.twitterHandle }),
        ...(body.githubHandle !== undefined && { githubHandle: body.githubHandle }),
        ...(body.country !== undefined && { country: body.country }),
        ...(body.timezone !== undefined && { timezone: body.timezone }),
      },
    });
    return updated;
  }

  static async updateAvatar(userId: string, buffer: Buffer, mimetype: string) {
    if (!AVATAR_MIMES.has(mimetype)) {
      throw new BadRequestError('Invalid image type');
    }
    if (buffer.length > AVATAR_MAX_BYTES) {
      throw new BadRequestError('Image too large');
    }

    const resized = await sharp(buffer)
      .resize(128, 128, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const key = `avatars/${randomUUID()}.jpg`;
    const url = await putPublicObject(key, resized, 'image/jpeg');

    return await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: url },
    });
  }

  static async softDeleteMe(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundError('User', userId);

    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        username: randomUUID(), // Free up username for reuse
      },
    });

    return { message: 'Account deleted' };
  }

  static async getPayoutProfile(userId: string) {
    const profile = await prisma.payoutProfile.findUnique({
      where: { userId },
      include: {
        profile: {
          select: {
            displayName: true,
            email: true,
            country: true,
          },
        },
      },
    });
    if (!profile) throw new NotFoundError('Payout profile', userId);

    return profile;
  }

  static async upsertPayoutProfile(userId: string, body: PayoutProfileBody) {
    return await prisma.payoutProfile.upsert({
      where: { userId },
      create: {
        userId,
        ...body,
      },
      update: {
        ...body,
      },
    });
  }

  static async listReputation(userId: string, query: ReputationQuery) {
    const where: Prisma.ReportWhereInput = {
      submitterId: userId,
      status: { in: ACCEPTED_LIKE },
    };

    if (query.dateFrom) {
      where.createdAt = { gte: query.dateFrom };
    }
    if (query.dateTo) {
      where.createdAt = { ...where.createdAt, lte: query.dateTo };
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: (query.page - 1) * query.limit,
        select: {
          id: true,
          title: true,
          status: true,
          severity: true,
          createdAt: true,
          program: {
            select: {
              title: true,
            },
          },
        },
      }),
      prisma.report.count({ where }),
    ]);

    return {
      items: reports,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1,
    };
  }

  static async getStatsOnly(userId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [submissions, accepted, total, avgReward] = await Promise.all([
      prisma.report.count({
        where: {
          submitterId: userId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.report.count({
        where: {
          submitterId: userId,
          status: { in: ACCEPTED_LIKE },
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.report.count({
        where: {
          submitterId: userId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.report.aggregate({
        where: {
          submitterId: userId,
          status: { in: ACCEPTED_LIKE },
          createdAt: { gte: thirtyDaysAgo },
        },
        _avg: {
          reward: true,
        },
      }),
    ]);

    return {
      submissions,
      accepted,
      total,
      avgReward: avgReward._avg.reward || 0,
    };
  }

  static async getPublicProfile(username: string) {
    const user = await prisma.user.findFirst({
      where: { username, deletedAt: null },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        website: true,
        twitterHandle: true,
        githubHandle: true,
        country: true,
        createdAt: true,
        orgMemberships: {
          select: {
            org: {
              select: {
                id: true,
                slug: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundError('User', username);

    return user;
  }

  static async adminListUsers(query: AdminUserListQuery) {
    const where: Prisma.UserWhereInput = { deletedAt: null };
    if (query.search) {
      where.OR = [
        { username: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.role) {
      where.platformRole = query.role;
    }
    if (query.banned === 'true') where.bannedAt = { not: null };
    if (query.banned === 'false') where.bannedAt = null;

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          platformRole: true,
          bannedAt: true,
          createdAt: true,
          country: true,
          kycStatus: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1,
    };
  }

  static async adminGetUser(id: string) {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        platformRole: true,
        bannedAt: true,
        createdAt: true,
        country: true,
        kycStatus: true,
        orgMemberships: {
          select: {
            org: {
              select: {
                id: true,
                slug: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundError('User', id);

    return user;
  }

  static async adminBan(
    actorId: string,
    actorRole: string,
    targetId: string,
    body: AdminBanBody,
  ) {
    UserService.assertSuperAdmin(actorRole);

    const target = await prisma.user.findFirst({
      where: { id: targetId, deletedAt: null },
    });
    if (!target) throw new NotFoundError('User', targetId);

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: {
        bannedAt: body.ban ? new Date() : null,
        bannedReason: body.ban ? body.reason : null,
      },
    });

    if (body.ban) {
      await notifyUserBanned(target.email, body.reason);
    }

    await prisma.auditLog.create({
      data: {
        actorId,
        action: 'USER_BANNED',
        entityType: 'User',
        entityId: targetId,
        after: { banned: body.ban, reason: body.reason },
      },
    });

    return updated;
  }

  static async adminUnban(actorId: string, targetId: string) {
    const target = await prisma.user.findFirst({
      where: { id: targetId, deletedAt: null },
    });
    if (!target) throw new NotFoundError('User', targetId);

    return await prisma.user.update({
      where: { id: targetId },
      data: {
        bannedAt: null,
        bannedReason: null,
      },
    });
  }

  static async adminSetPlatformRole(
    actorId: string,
    targetId: string,
    body: AdminPlatformRoleBody,
  ) {
    UserService.assertSuperAdmin(actorId);

    const target = await prisma.user.findFirst({
      where: { id: targetId, deletedAt: null },
    });
    if (!target) throw new NotFoundError('User', targetId);

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: { platformRole: body.platformRole },
    });

    await prisma.auditLog.create({
      data: {
        actorId,
        action: 'USER_PLATFORM_ROLE_CHANGED',
        entityType: 'User',
        entityId: targetId,
        before: { platformRole: target.platformRole },
        after: { platformRole: body.platformRole },
      },
    });

    return updated;
  }

  static async adminImpersonate(
    app: FastifyInstance,
    actorId: string,
    targetId: string,
  ) {
    UserService.assertSuperAdmin(actorId);

    const target = await prisma.user.findFirst({
      where: { id: targetId, deletedAt: null, bannedAt: null },
    });
    if (!target) throw new NotFoundError('User', targetId);

    const accessToken = signImpersonationToken(app, {
      sub: target.id,
      email: target.email,
      platformRole: target.platformRole,
      impersonatedBy: actorId,
      typ: 'impersonation',
    });

    return {
      accessToken,
      expiresInSeconds: 300,
      user: {
        id: target.id,
        email: target.email,
        username: target.username,
        platformRole: target.platformRole,
      },
    };
  }

  static async getAnalytics(userId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [submissions, accepted, totalReports, rank, avgReward, trend] = await Promise.all([
      prisma.report.count({
        where: {
          submitterId: userId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.report.count({
        where: {
          submitterId: userId,
          status: { in: ACCEPTED_LIKE },
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.report.count({
        where: {
          submitterId: userId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.$queryRaw<{ rank: BigInt }[]>`
        SELECT 
          RANK() OVER (ORDER BY COUNT(*) DESC)
        FROM "Report" 
        WHERE "submitterId" = ${userId}
        AND "createdAt" >= ${thirtyDaysAgo.toISOString()}
        LIMIT 1
      `,
      prisma.report.aggregate({
        where: {
          submitterId: userId,
          status: { in: ACCEPTED_LIKE },
          createdAt: { gte: thirtyDaysAgo },
        },
        _avg: {
          reward: true,
        },
      }),
      prisma.$queryRaw<{ date: string; count: number }[]>`
        SELECT 
          DATE_TRUNC('day', "createdAt")::text as date,
          COUNT(*)::integer as count
        FROM "Report" 
        WHERE "submitterId" = ${userId}
        AND "createdAt" >= ${thirtyDaysAgo.toISOString()}
        GROUP BY DATE_TRUNC('day', "createdAt")
        ORDER BY date DESC
        LIMIT 30
      `,
    ]);

    return {
      submissions: submissions,
      accepted: accepted,
      totalReports,
      rank: rank.length > 0 ? Number(rank[0].rank) : null,
      avgReward: avgReward._avg.reward || 0,
      trend: trend.map(t => ({ date: t.date, count: t.count })),
    };
  }
}
