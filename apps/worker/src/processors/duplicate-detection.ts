import type { Job } from 'bullmq';
import { PrismaClient } from '@bughuntr/db';

export interface DuplicateDetectionJobData {
  reportId: string;
}

export async function processDuplicateDetectionJob(job: Job<DuplicateDetectionJobData>): Promise<void> {
  const { reportId } = job.data;
  
  job.log(`Starting duplicate detection for report ${reportId}`);
  
  const prisma = new PrismaClient();
  
  try {
    // 1. Fetch report title + reproSteps
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        title: true,
        reproSteps: true,
        programId: true,
        status: true,
        createdAt: true,
      },
    });

    if (!report) {
      job.log(`Report ${reportId} not found`);
      return;
    }

    job.log(`Found report: ${report.title}`);

    // 2. Query recent (90d) SUBMITTED/TRIAGING/ACCEPTED reports in same program
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const similarReports = await prisma.$queryRaw`
      SELECT 
        id, 
        title, 
        repro_steps,
        similarity(title, ${report.title}) as title_similarity,
        similarity(repro_steps, ${report.reproSteps}) as repro_similarity
      FROM reports 
      WHERE program_id = ${report.programId}
        AND status IN ('SUBMITTED', 'TRIAGING', 'ACCEPTED')
        AND created_at >= ${ninetyDaysAgo}
        AND id != ${reportId}
        AND (similarity(title, ${report.title}) > 0.5 OR similarity(repro_steps, ${report.reproSteps}) > 0.5)
      ORDER BY GREATEST(similarity(title, ${report.title}), similarity(repro_steps, ${report.reproSteps})) DESC
      LIMIT 10
    ` as Array<{
      id: string;
      title: string;
      repro_steps: string;
      title_similarity: number;
      repro_similarity: number;
    }>;

    job.log(`Found ${similarReports.length} potentially similar reports`);

    // 3. Compare using pg_trgm similarity() SQL function
    let maxSimilarity = 0;
    let bestMatch: typeof similarReports[0] | null = null;

    for (const candidate of similarReports) {
      const titleSim = candidate.title_similarity;
      const reproSim = candidate.repro_similarity;
      const overallSim = Math.max(titleSim, reproSim);

      if (overallSim > maxSimilarity) {
        maxSimilarity = overallSim;
        bestMatch = candidate;
      }
    }

    // 4. If max similarity > 0.82: notify PM with suggestions, set report.duplicateOfId
    if (maxSimilarity > 0.82 && bestMatch) {
      job.log(`High similarity detected: ${maxSimilarity.toFixed(3)} with report ${bestMatch.id}`);

      // Get program manager to notify
      const program = await prisma.program.findUnique({
        where: { id: report.programId },
        select: { orgId: true },
      });

      if (!program) {
        job.log(`Program ${report.programId} not found`);
        return;
      }

      const orgMembers = await prisma.organizationMember.findMany({
        where: {
          orgId: program.orgId,
          role: 'PROGRAM_MANAGER',
          user: {
            bannedAt: null,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      if (orgMembers.length) {
        // Import here to avoid circular dependency
        const { notificationQueue } = await import('../queues.js');
        
        for (const member of orgMembers) {
          await notificationQueue.add('duplicate-detected', {
            userId: member.userId,
            type: 'duplicate-detected',
            channels: ['email', 'in-app'],
            data: {
              reportId,
              duplicateCandidateId: bestMatch.id,
              similarity: maxSimilarity,
              reportTitle: report.title,
              candidateTitle: bestMatch.title,
            },
          });
        }
        
        job.log(`Notified ${orgMembers.length} program managers about potential duplicate`);
      }
    } else {
      job.log(`No significant similarity found. Max similarity: ${maxSimilarity.toFixed(3)}`);
    }

  } catch (error) {
    job.log(`Error in duplicate detection: ${error}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
