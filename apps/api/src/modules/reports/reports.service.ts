import { prisma } from '@bughuntr/db';

export class ReportsService {
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
