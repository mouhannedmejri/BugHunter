import { prisma } from '@bughuntr/db';
import { NotFoundError, ForbiddenError } from '@bughuntr/shared';
import type { CreateReportInput } from '@bughuntr/shared';
import { ProgramService } from '../programs/programs.service.js';
import { AiService } from '../ai/ai.service.js';

export class ReportsService {
  static async createReport(submitterId: string, data: CreateReportInput) {
    const isEligible = await ProgramService.isEligible(submitterId, data.programId);
    if (!isEligible) {
      throw new ForbiddenError('You are not eligible to submit reports to this program');
    }

    const report = await prisma.report.create({
      data: {
        programId: data.programId,
        assetId: data.assetId || null,
        submitterId,
        title: data.title,
        vulnCategory: data.vulnCategory as any,
        severityEstimate: data.severityEstimate as any,
        reproSteps: data.reproSteps,
        impactExplanation: data.impactExplanation,
        environmentInfo: (data.environmentInfo || {}) as any,
        suggestedFix: data.suggestedFix,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      include: {
        program: { select: { slug: true, title: true } }
      }
    });

    // Trigger asynchronous AI embedding and automated triage pipeline
    Promise.allSettled([
      AiService.saveReportEmbedding(report.id),
      AiService.performAiTriage(report.id),
    ]).catch(() => {
      // Background AI operations never block report creation
    });

    return report;
  }

  static async getReportsThisWeek() {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    const reports = await prisma.report.findMany({
      where: { createdAt: { gte: startOfWeek, lte: endOfWeek } },
    });
    return reports;
  }

  static async getReportsThisMonth() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    const reports = await prisma.report.findMany({
      where: { createdAt: { gte: startOfMonth, lte: endOfMonth } },
    });
    return reports;
  }

  static async getReportsThisYear() {
    const startOfYear = new Date();
    startOfYear.setDate(1);
    startOfYear.setMonth(0);
    const endOfYear = new Date(startOfYear);
    endOfYear.setFullYear(endOfYear.getFullYear() + 1);
    const reports = await prisma.report.findMany({
      where: { createdAt: { gte: startOfYear, lte: endOfYear } },
    });
    return reports;
  }

  static async getReportById(id: string, userId: string) {
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        program: { select: { slug: true, title: true } },
        asset: { select: { type: true, identifier: true } },
        submitter: {
          select: { id: true, username: true, displayName: true, avatarUrl: true }
        },
        assignee: {
          select: { id: true, username: true, displayName: true, avatarUrl: true }
        },
        attachments: true,
        comments: {
          include: {
            author: {
              select: { id: true, username: true, displayName: true }
            }
          },
          orderBy: { createdAt: "asc" }
        },
        statusHistory: { orderBy: { createdAt: "asc" } },
        reward: { select: { amountUsd: true, bonusUsd: true, decision: true } }
      }
    });
    if (!report) {
      throw new NotFoundError("Report not found");
    }

    // Resolve usernames for statusHistory changedBy IDs
    const changedByIds = Array.from(
      new Set(
        report.statusHistory
          .map((sh) => sh.changedBy)
          .filter((id): id is string => !!id && id !== "System")
      )
    );
    const userMap: Record<string, { username: string; displayName: string | null }> = {};
    if (changedByIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: changedByIds } },
        select: { id: true, username: true, displayName: true }
      });
      for (const u of users) {
        userMap[u.id] = { username: u.username, displayName: u.displayName };
      }
    }

    const severity = report.severityValidated || report.severityEstimate;
    const category = report.vulnCategory;
    const affectedAsset = report.asset?.identifier ?? "";
    const affectedAssetType = report.asset?.type ?? "";

    const envInfo = (report.environmentInfo as any) || {};
    const environment = {
      os: envInfo.os ?? "",
      browser: envInfo.browser ?? ""
    };

    const reward =
      report.reward && report.reward.decision === "APPROVED"
        ? (report.reward.amountUsd || 0) + (report.reward.bonusUsd || 0)
        : undefined;

    const isOwnReport = report.submitterId === userId;

    const comments = report.comments.map((c) => ({
      id: c.id,
      authorName: c.author.displayName || c.author.username,
      authorRole: c.author.id === report.submitterId ? "researcher" : "reviewer",
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      isInternal: c.isInternal
    }));

    const statusHistory = report.statusHistory.map((sh) => {
      let changedByName = sh.changedBy;
      const user = userMap[sh.changedBy];
      if (user) {
        changedByName = user.displayName || user.username;
      }
      return {
        status: sh.toStatus,
        changedAt: sh.createdAt.toISOString(),
        changedBy: changedByName,
        note: sh.reason || undefined
      };
    });

    const attachments = report.attachments.map((a) => ({
      id: a.id,
      name: a.fileName,
      size: a.sizeBytes,
      type: a.mimeType,
      url: "#",
      uploadedAt: a.createdAt.toISOString(),
      scanStatus:
        a.scanStatus === "CLEAN"
          ? "clean"
          : a.scanStatus === "INFECTED"
          ? "infected"
          : "pending"
    }));

    return {
      id: report.id,
      title: report.title,
      programTitle: report.program.title,
      programSlug: report.program.slug,
      severity,
      status: report.status,
      category,
      affectedAsset,
      affectedAssetType,
      reproductionSteps: report.reproSteps,
      impact: report.impactExplanation,
      remediation: report.suggestedFix || undefined,
      environment,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
      reward,
      submitter: {
        username: report.submitter.username,
        displayName: report.submitter.displayName || report.submitter.username,
        avatarUrl: report.submitter.avatarUrl
      },
      assignedReviewer: report.assignee
        ? {
            username: report.assignee.username,
            displayName: report.assignee.displayName || report.assignee.username
          }
        : undefined,
      attachments,
      comments,
      statusHistory,
      isOwnReport
    };
  }

  static async getMyReports(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    
    const [items, total] = await Promise.all([
      prisma.report.findMany({
        where: { submitterId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          program: { select: { slug: true, title: true } },
          reward: { select: { amountUsd: true, bonusUsd: true, decision: true } }
        }
      }),
      prisma.report.count({ where: { submitterId: userId } })
    ]);

    const mappedItems = items.map(r => ({
      id: r.id,
      title: r.title,
      severity: r.severityValidated || r.severityEstimate,
      status: r.status,
      createdAt: r.createdAt,
      programTitle: r.program.title,
      programSlug: r.program.slug,
      reward: r.reward?.decision === 'APPROVED' ? r.reward.amountUsd + r.reward.bonusUsd : undefined
    }));

    return {
      items: mappedItems,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1
    };
  }
}
