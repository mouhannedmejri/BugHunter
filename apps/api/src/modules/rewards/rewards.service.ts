import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Redis } from 'ioredis';
import {
  prisma,
  OrgRole,
  PayoutStatus,
  PaymentMethod,
  ReportStatus,
  Severity,
  type Prisma,
  type Reward,
} from '@bughuntr/db';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@bughuntr/shared';
import { env } from '../../config.js';
import { putPublicObject } from '../../lib/s3.js';
import { NotificationService } from '../notifications/notifications.service.js';
import { rewardPolicySchema, type RewardPolicy } from '../programs/programs.schemas.js';
import { AnalyticsService } from '../analytics/analytics.service.js';
import type {
  RejectRewardBody,
  RetryPayoutBody,
  RewardDecisionBody,
  TriggerPayoutBody,
} from './rewards.schemas.js';

const REDIS_LEADERBOARD_TTL_SECONDS = 60 * 60;
const redis = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });

const ACCEPTED_OR_RESOLVED: ReportStatus[] = [
  ReportStatus.ACCEPTED,
  ReportStatus.RESOLVED,
];

const ACCEPTED_LIKE: ReportStatus[] = [
  ReportStatus.ACCEPTED,
  ReportStatus.RESOLVED,
  ReportStatus.REWARDED,
  ReportStatus.CLOSED,
];

const US_COUNTRY_CODES = new Set(['US']);

function centsToUsd(cents: number): string {
  return (cents / 100).toFixed(2);
}

function severityBonus(severity: Severity | null): number {
  if (severity === Severity.CRITICAL) return 100;
  if (severity === Severity.HIGH) return 50;
  if (severity === Severity.MEDIUM) return 20;
  return 0;
}

function parseRewardPolicy(input: Prisma.JsonValue): RewardPolicy {
  const parsed = rewardPolicySchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError('Program rewardPolicy is invalid');
  }
  return parsed.data;
}

function isOutsidePolicyRange(
  policy: RewardPolicy,
  severity: Severity,
  amountUsd: number,
): boolean {
  const tier = policy[severity];
  return amountUsd < tier.min || amountUsd > tier.max;
}

function assertOrgRole(memberRole: OrgRole, allowedRoles: OrgRole[]): void {
  if (!allowedRoles.includes(memberRole)) {
    throw new ForbiddenError('Insufficient organization role');
  }
}

async function maybeConnectRedis() {
  if (redis.status === 'wait') {
    await redis.connect();
  }
}

export class RewardsService {
  private static async getReportForRewarding(reportId: string) {
    const report = await prisma.report.findFirst({
      where: { id: reportId },
      include: {
        program: true,
        reward: { include: { payout: true } },
      },
    });
    if (!report) throw new NotFoundError('Report');
    return report;
  }

  private static async assertReportOrgAccess(
    report: {
      program: {
        orgId: string;
      };
    },
    actorId: string,
    allowedRoles: OrgRole[],
  ) {
    const member = await prisma.organizationMember.findUnique({
      where: { orgId_userId: { orgId: report.program.orgId, userId: actorId } },
    });
    if (!member) {
      throw new ForbiddenError('You are not a member of this organization');
    }
    assertOrgRole(member.role, allowedRoles);
    return member;
  }

  private static async assertFinanceForReward(rewardId: string, actorId: string) {
    const reward = await prisma.reward.findUnique({
      where: { id: rewardId },
      include: {
        report: { include: { program: true } },
        payout: true,
      },
    });
    if (!reward) throw new NotFoundError('Reward');

    await RewardsService.assertReportOrgAccess(
      { program: { orgId: reward.report.program.orgId } },
      actorId,
      [OrgRole.FINANCE],
    );
    return reward;
  }

  static async createOrUpdateRewardDecision(
    reportId: string,
    actorId: string,
    body: RewardDecisionBody,
  ) {
    const report = await RewardsService.getReportForRewarding(reportId);
    await RewardsService.assertReportOrgAccess(report, actorId, [
      OrgRole.PROGRAM_MANAGER,
      OrgRole.FINANCE,
    ]);

    if (!ACCEPTED_OR_RESOLVED.includes(report.status)) {
      throw new BadRequestError(
        'Reward decisions are only allowed for ACCEPTED or RESOLVED reports',
      );
    }
    if (!report.severityValidated) {
      throw new ValidationError('Validated severity is required before reward decision');
    }

    const warnings: string[] = [];
    const rewardPolicy = parseRewardPolicy(report.program.rewardPolicy);
    const outsideRange = isOutsidePolicyRange(
      rewardPolicy,
      report.severityValidated,
      body.amountUsd,
    );
    if (outsideRange) {
      warnings.push(
        body.overridePolicy
          ? 'Reward amount is outside policy range (override acknowledged).'
          : 'Reward amount is outside policy range.',
      );
    }

    const reward = await prisma.$transaction(async (tx) => {
      const next = await tx.reward.upsert({
        where: { reportId: report.id },
        create: {
          reportId: report.id,
          programId: report.programId,
          recipientId: report.submitterId,
          amountUsd: body.amountUsd,
          bonusUsd: body.bonusUsd ?? 0,
          decision: body.decision,
          reason: body.reason,
        },
        update: {
          amountUsd: body.amountUsd,
          bonusUsd: body.bonusUsd ?? 0,
          decision: body.decision,
          reason: body.reason,
        },
      });

      if (body.decision === 'NO_REWARD') {
        await tx.payout.deleteMany({ where: { rewardId: next.id } });
        await tx.report.update({
          where: { id: report.id },
          data: {
            status: ReportStatus.CLOSED,
            closedAt: new Date(),
          },
        });
      } else {
        const profile = await tx.payoutProfile.findUnique({
          where: { userId: report.submitterId },
        });
        if (!profile) {
          throw new ValidationError('Recipient must configure payout profile first');
        }
        await tx.payout.upsert({
          where: { rewardId: next.id },
          create: {
            rewardId: next.id,
            payoutProfileId: profile.id,
            amountUsd: (body.amountUsd ?? 0) + (body.bonusUsd ?? 0),
            method: profile.preferredMethod,
            status: PayoutStatus.PENDING_APPROVAL,
          },
          update: {
            payoutProfileId: profile.id,
            amountUsd: (body.amountUsd ?? 0) + (body.bonusUsd ?? 0),
            method: profile.preferredMethod,
            status: PayoutStatus.PENDING_APPROVAL,
            providerRef: null,
            invoiceUrl: null,
            failureReason: null,
            processedAt: null,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId,
          orgId: report.program.orgId,
          action: 'REWARD_DECISION_SET',
          entityType: 'Reward',
          entityId: next.id,
          after: {
            decision: body.decision,
            amountUsd: body.amountUsd,
            bonusUsd: body.bonusUsd ?? 0,
            overridePolicy: body.overridePolicy ?? false,
          },
        },
      });

      return next;
    });

    await NotificationService.createNotification(report.submitterId, 'REWARD_DECISION', {
      subject: 'Reward decision updated',
      body: `Your report "${report.title}" reward decision is ${body.decision}.`,
      meta: { reportId: report.id, rewardId: reward.id, decision: body.decision },
    });
    await AnalyticsService.invalidateOverviewCache(report.program.orgId);

    return { reward, warnings };
  }

  static async getReportReward(reportId: string, actorId: string) {
    const report = await RewardsService.getReportForRewarding(reportId);
    if (!report.reward) throw new NotFoundError('Reward');

    if (report.submitterId !== actorId) {
      await RewardsService.assertReportOrgAccess(report, actorId, [
        OrgRole.PROGRAM_MANAGER,
        OrgRole.FINANCE,
        OrgRole.ORG_ADMIN,
      ]);
    }
    return report.reward;
  }

  static async approveReward(rewardId: string, actorId: string) {
    const reward = await RewardsService.assertFinanceForReward(rewardId, actorId);
    const payout = await prisma.payout.findUnique({ where: { rewardId: reward.id } });
    if (!payout) throw new NotFoundError('Payout');
    if (payout.status !== PayoutStatus.PENDING_APPROVAL) {
      throw new BadRequestError('Only pending payouts can be approved');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextPayout = await tx.payout.update({
        where: { id: payout.id },
        data: { status: PayoutStatus.APPROVED },
      });
      await tx.reward.update({
        where: { id: reward.id },
        data: { approvedBy: actorId, approvedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          orgId: reward.report.program.orgId,
          action: 'PAYOUT_APPROVED',
          entityType: 'Payout',
          entityId: payout.id,
          before: { status: payout.status },
          after: { status: nextPayout.status },
        },
      });
      return nextPayout;
    });

    await NotificationService.createNotification(reward.recipientId, 'REWARD_APPROVED', {
      subject: 'Reward approved',
      body: 'Your reward has been approved and is queued for payout.',
      meta: { rewardId: reward.id, payoutId: updated.id },
    });
    await AnalyticsService.invalidateOverviewCache(reward.report.program.orgId);

    return updated;
  }

  static async rejectReward(rewardId: string, actorId: string, body: RejectRewardBody) {
    const reward = await RewardsService.assertFinanceForReward(rewardId, actorId);
    const payout = await prisma.payout.findUnique({ where: { rewardId: reward.id } });
    if (!payout) throw new NotFoundError('Payout');

    const updated = await prisma.$transaction(async (tx) => {
      const nextPayout = await tx.payout.update({
        where: { id: payout.id },
        data: {
          status: PayoutStatus.CANCELLED,
          failureReason: body.reason,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          orgId: reward.report.program.orgId,
          action: 'PAYOUT_REJECTED',
          entityType: 'Payout',
          entityId: payout.id,
          after: { reason: body.reason },
        },
      });
      return nextPayout;
    });

    await NotificationService.createNotification(reward.recipientId, 'REWARD_REJECTED', {
      subject: 'Reward rejected',
      body: `Finance rejected the reward payout: ${body.reason}`,
      meta: { rewardId: reward.id, payoutId: updated.id },
    });
    await AnalyticsService.invalidateOverviewCache(reward.report.program.orgId);

    return updated;
  }

  static async triggerPayout(
    rewardId: string,
    actorId: string,
    body: TriggerPayoutBody,
  ) {
    const reward = await RewardsService.assertFinanceForReward(rewardId, actorId);
    const payout = await prisma.payout.findUnique({ where: { rewardId: reward.id } });
    if (!payout) throw new NotFoundError('Payout');
    if (payout.status !== PayoutStatus.APPROVED) {
      throw new BadRequestError('Only approved payouts can be processed');
    }

    const profile = await prisma.payoutProfile.findUnique({
      where: { id: payout.payoutProfileId },
      include: { user: true },
    });
    if (!profile) throw new NotFoundError('Payout profile');

    const method = body.method ?? payout.method;
    if (!method) throw new ValidationError('Payout method is required');

    if (reward.report.program.policy && method) {
      const policy = reward.report.program.policy as Record<string, unknown>;
      const kycRequired = Boolean((policy['kycRequired'] as boolean | undefined) ?? false);
      if (kycRequired && profile.user.kycStatus !== 'VERIFIED') {
        throw new ForbiddenError('KYC must be VERIFIED before payout');
      }
    }

    let providerRef: string | null = null;
    let status: PayoutStatus = PayoutStatus.PROCESSING;
    let failureReason: string | null = null;

    try {
      await prisma.payout.update({
        where: { id: payout.id },
        data: { status: PayoutStatus.PROCESSING, method },
      });

      if (method === PaymentMethod.STRIPE) {
        if (!profile.stripeAccountId) {
          throw new ValidationError('Missing stripeAccountId in payout profile');
        }
        providerRef = await RewardsService.createStripeTransfer(
          profile.stripeAccountId,
          payout.amountUsd,
        );
        status = PayoutStatus.COMPLETED;
      } else if (method === PaymentMethod.BANK_TRANSFER) {
        if (!profile.wiseAccountId) {
          throw new ValidationError('Missing wiseAccountId in payout profile');
        }
        providerRef = await RewardsService.createWiseTransfer(
          profile.wiseAccountId,
          payout.amountUsd,
        );
        status = PayoutStatus.COMPLETED;
      } else if (method === PaymentMethod.CRYPTO) {
        // Crypto is manual completion by SA (providerRef = chain tx hash)
        providerRef = null;
        status = PayoutStatus.PROCESSING;
      } else if (method === PaymentMethod.PAYPAL) {
        providerRef = `paypal_manual_${Date.now()}`;
        status = PayoutStatus.COMPLETED;
      }
    } catch (error) {
      status = PayoutStatus.FAILED;
      failureReason =
        error instanceof Error ? error.message : 'Unexpected payout provider error';
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedPayout = await tx.payout.update({
        where: { id: payout.id },
        data: {
          method,
          status,
          providerRef,
          failureReason,
          processedAt: status === PayoutStatus.COMPLETED ? new Date() : null,
        },
      });

      if (status === PayoutStatus.COMPLETED) {
        const invoiceUrl = await RewardsService.generateAndStoreInvoice({
          payoutId: updatedPayout.id,
          rewardId: reward.id,
          recipientName: profile.legalName ?? profile.user.username,
          recipientEmail: profile.user.email,
          amountUsdCents: updatedPayout.amountUsd,
          providerRef: providerRef ?? 'manual',
        });

        await tx.payout.update({
          where: { id: updatedPayout.id },
          data: { invoiceUrl },
        });
        await tx.report.update({
          where: { id: reward.reportId },
          data: { status: ReportStatus.REWARDED },
        });
        await RewardsService.createReputationOnRewardCompletion(
          tx,
          reward.recipientId,
          reward.reportId,
          reward.programId,
          reward.report.severityValidated,
        );
        await RewardsService.flagTaxFormIfNeeded(tx, profile.id, profile.country ?? null);
      }

      if (status === PayoutStatus.FAILED) {
        await NotificationService.createNotification(actorId, 'PAYOUT_FAILED', {
          subject: 'Payout failed',
          body: `Payout for reward ${reward.id} failed: ${failureReason}`,
          meta: { rewardId: reward.id, payoutId: payout.id, failureReason },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId,
          orgId: reward.report.program.orgId,
          action: 'PAYOUT_TRIGGERED',
          entityType: 'Payout',
          entityId: payout.id,
          after: { status, providerRef, method },
        },
      });

      return tx.payout.findUniqueOrThrow({ where: { id: updatedPayout.id } });
    });
    await AnalyticsService.invalidateOverviewCache(reward.report.program.orgId);

    return result;
  }

  static async listOrganizationRewards(orgSlug: string, actorId: string) {
    const member = await prisma.organizationMember.findFirst({
      where: {
        userId: actorId,
        org: { slug: orgSlug, deletedAt: null },
        role: { in: [OrgRole.FINANCE, OrgRole.ORG_ADMIN] },
      },
      include: { org: true },
    });
    if (!member) throw new ForbiddenError('Finance or Org Admin role required');

    return prisma.reward.findMany({
      where: { program: { orgId: member.orgId } },
      orderBy: { createdAt: 'desc' },
      include: {
        report: { select: { id: true, title: true, severityValidated: true, status: true } },
        payout: true,
        recipient: { select: { id: true, username: true, displayName: true, country: true } },
      },
    });
  }

  static async getOrganizationRewardStats(orgSlug: string, actorId: string) {
    const member = await prisma.organizationMember.findFirst({
      where: {
        userId: actorId,
        org: { slug: orgSlug, deletedAt: null },
        role: { in: [OrgRole.FINANCE, OrgRole.ORG_ADMIN] },
      },
      include: { org: true },
    });
    if (!member) throw new ForbiddenError('Finance or Org Admin role required');

    const rewards = await prisma.reward.findMany({
      where: { program: { orgId: member.orgId } },
      include: { report: { select: { severityValidated: true } } },
    });

    const totalsBySeverity = rewards.reduce<Record<string, number>>((acc, reward) => {
      const sev = reward.report.severityValidated ?? 'UNSPECIFIED';
      const total = reward.amountUsd + reward.bonusUsd;
      acc[sev] = (acc[sev] ?? 0) + total;
      return acc;
    }, {});

    const monthlyBreakdown = rewards.reduce<Record<string, number>>((acc, reward) => {
      const key = reward.createdAt.toISOString().slice(0, 7);
      const total = reward.amountUsd + reward.bonusUsd;
      acc[key] = (acc[key] ?? 0) + total;
      return acc;
    }, {});

    return { totalsBySeverity, monthlyBreakdown };
  }

  static async getMyRewards(userId: string) {
    return prisma.reward.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        report: { select: { id: true, title: true, severityValidated: true, status: true } },
        payout: true,
      },
    });
  }

  static async getMyPayouts(userId: string) {
    return prisma.payout.findMany({
      where: { profile: { userId } },
      orderBy: { createdAt: 'desc' },
      include: {
        reward: {
          select: {
            id: true,
            report: { select: { id: true, title: true, severityValidated: true } },
          },
        },
      },
    });
  }

  static async retryFailedPayout(
    payoutId: string,
    actorId: string,
    actorRole: string,
    body: RetryPayoutBody,
  ) {
    if (actorRole !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Super admin role required');
    }

    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
      include: {
        reward: {
          include: {
            report: { include: { program: true } },
          },
        },
      },
    });
    if (!payout) throw new NotFoundError('Payout');
    if (payout.status !== PayoutStatus.FAILED && payout.status !== PayoutStatus.PROCESSING) {
      throw new BadRequestError('Only failed/processing payouts can be retried');
    }

    if (payout.method === PaymentMethod.CRYPTO && body.manualTxHash) {
      const updated = await prisma.$transaction(async (tx) => {
        const next = await tx.payout.update({
          where: { id: payout.id },
          data: {
            status: PayoutStatus.COMPLETED,
            providerRef: body.manualTxHash,
            failureReason: null,
            processedAt: new Date(),
          },
        });
        await tx.report.update({
          where: { id: payout.reward.reportId },
          data: { status: ReportStatus.REWARDED },
        });
        await RewardsService.createReputationOnRewardCompletion(
          tx,
          payout.reward.recipientId,
          payout.reward.reportId,
          payout.reward.programId,
          payout.reward.report.severityValidated,
        );
        await tx.auditLog.create({
          data: {
            actorId,
            orgId: payout.reward.report.program.orgId,
            action: 'PAYOUT_COMPLETED_MANUALLY',
            entityType: 'Payout',
            entityId: payout.id,
            after: { manualTxHash: body.manualTxHash, reason: body.reason ?? null },
          },
        });
        return next;
      });
      return updated;
    }

    await prisma.payout.update({
      where: { id: payout.id },
      data: {
        status: PayoutStatus.APPROVED,
        failureReason: body.reason ?? null,
      },
    });

    return RewardsService.triggerPayout(payout.rewardId, actorId, { method: payout.method });
  }

  static async getLeaderboard(programSlug?: string) {
    const cacheKey = programSlug
      ? `leaderboard:program:${programSlug}`
      : 'leaderboard:all-time';

    await maybeConnectRedis();
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as unknown[];

    const rows = programSlug
      ? await prisma.$queryRaw<
          Array<{ userId: string; username: string; displayName: string | null; points: number }>
        >`
          SELECT u.id as "userId", u.username, u."displayName", COALESCE(SUM(re.points), 0)::int as points
          FROM "ReputationEvent" re
          JOIN "User" u ON u.id = re."userId"
          JOIN "Report" r ON r.id = re."reportId"
          JOIN "Program" p ON p.id = r."programId"
          WHERE p.slug = ${programSlug} AND u."deletedAt" IS NULL AND u."bannedAt" IS NULL
          GROUP BY u.id, u.username, u."displayName"
          ORDER BY points DESC
          LIMIT 100
        `
      : await prisma.$queryRaw<
          Array<{ userId: string; username: string; displayName: string | null; points: number }>
        >`
          SELECT u.id as "userId", u.username, u."displayName", COALESCE(SUM(re.points), 0)::int as points
          FROM "ReputationEvent" re
          JOIN "User" u ON u.id = re."userId"
          WHERE u."deletedAt" IS NULL AND u."bannedAt" IS NULL
          GROUP BY u.id, u.username, u."displayName"
          ORDER BY points DESC
          LIMIT 100
        `;

    await redis.set(cacheKey, JSON.stringify(rows), 'EX', REDIS_LEADERBOARD_TTL_SECONDS);
    return rows;
  }

  private static async createStripeTransfer(
    stripeAccountId: string,
    amountUsdCents: number,
  ): Promise<string> {
    const res = await fetch('https://api.stripe.com/v1/transfers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: String(amountUsdCents),
        currency: 'usd',
        destination: stripeAccountId,
      }),
    });
    if (!res.ok) {
      throw new Error(`Stripe transfer failed (${res.status})`);
    }
    const json = (await res.json()) as { id?: string };
    if (!json.id) throw new Error('Stripe providerRef missing');
    return json.id;
  }

  private static async createWiseTransfer(
    wiseAccountId: string,
    amountUsdCents: number,
  ): Promise<string> {
    const res = await fetch('https://api.transferwise.com/v1/transfers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WISE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetAccount: wiseAccountId,
        sourceCurrency: 'USD',
        targetCurrency: 'USD',
        sourceAmount: Number((amountUsdCents / 100).toFixed(2)),
      }),
    });
    if (!res.ok) {
      throw new Error(`Wise transfer failed (${res.status})`);
    }
    const json = (await res.json()) as { id?: string | number };
    if (!json.id) throw new Error('Wise providerRef missing');
    return String(json.id);
  }

  private static async generateAndStoreInvoice(params: {
    payoutId: string;
    rewardId: string;
    recipientName: string;
    recipientEmail: string;
    amountUsdCents: number;
    providerRef: string;
  }) {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const draw = (text: string, y: number, strong = false) => {
      page.drawText(text, {
        x: 56,
        y,
        size: 12,
        font: strong ? bold : font,
        color: rgb(0.1, 0.1, 0.1),
      });
    };

    draw('BugHuntr Reward Invoice', 740, true);
    draw(`Invoice for payout ${params.payoutId}`, 712);
    draw(`Reward ID: ${params.rewardId}`, 686);
    draw(`Recipient: ${params.recipientName} <${params.recipientEmail}>`, 660);
    draw(`Amount (USD): $${centsToUsd(params.amountUsdCents)}`, 634);
    draw(`Provider reference: ${params.providerRef}`, 608);
    draw(`Generated at: ${new Date().toISOString()}`, 582);

    const bytes = await pdf.save();
    const key = `invoices/${params.payoutId}.pdf`;
    return putPublicObject(key, Buffer.from(bytes), 'application/pdf');
  }

  private static async createReputationOnRewardCompletion(
    tx: Prisma.TransactionClient,
    userId: string,
    reportId: string,
    programId: string,
    severity: Severity | null,
  ) {
    const existing = await tx.reputationEvent.count({
      where: { userId, reportId },
    });
    if (existing > 0) return;

    const events: Array<{ points: number; reason: string }> = [];
    events.push({ points: 10, reason: 'ACCEPTED_BASE' });

    const extra = severityBonus(severity);
    if (extra > 0 && severity) {
      events.push({ points: extra, reason: `ACCEPTED_${severity}` });
    }

    const acceptedCount = await tx.report.count({
      where: {
        submitterId: userId,
        programId,
        status: { in: ACCEPTED_LIKE },
      },
    });
    if (acceptedCount === 1) {
      events.push({ points: 25, reason: 'FIRST_BLOOD' });
    }

    for (const event of events) {
      await tx.reputationEvent.create({
        data: {
          userId,
          reportId,
          points: event.points,
          reason: event.reason,
        },
      });
    }
  }

  private static async flagTaxFormIfNeeded(
    tx: Prisma.TransactionClient,
    payoutProfileId: string,
    country: string | null,
  ) {
    if (!country || !US_COUNTRY_CODES.has(country)) return;
    const payout = await tx.payout.aggregate({
      where: {
        payoutProfileId,
        status: PayoutStatus.COMPLETED,
      },
      _sum: { amountUsd: true },
    });
    const totalAnnual = payout._sum.amountUsd ?? 0;
    if (totalAnnual <= 60_000) return;

    // Schema does not include dedicated 1099 flag field on PayoutProfile,
    // so persist this compliance marker in audit logs for now.
    await tx.auditLog.create({
      data: {
        action: 'PAYOUT_PROFILE_1099_FLAGGED',
        entityType: 'PayoutProfile',
        entityId: payoutProfileId,
        after: { thresholdUsdCents: totalAnnual, flagged1099: true },
      },
    });
  }
}
