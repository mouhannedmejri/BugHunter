import type { Job } from 'bullmq';
import { PrismaClient } from '@bughuntr/db';
import crypto from 'crypto';
import { cosineSimilarity } from '@bughuntr/shared';

export interface DuplicateDetectionJobData {
  reportId: string;
}

/**
 * Deterministic semantic embedding generation fallback for background worker.
 */
function createEmbedding(text: string, dimensions = 1536): number[] {
  const normalized = text.toLowerCase().trim();
  const vector = new Array<number>(dimensions).fill(0);
  const tokens = normalized.split(/[\s,.;:!?()_/\-"'<>]+/);

  for (const token of tokens) {
    if (!token) continue;
    const hash = crypto.createHash('sha256').update(token).digest();
    const index = hash.readUInt16BE(0) % dimensions;
    const weight = Math.min(token.length / 5, 2.0);
    vector[index] = (vector[index] ?? 0) + weight;
  }

  for (let i = 0; i < normalized.length - 2; i++) {
    const trigram = normalized.slice(i, i + 3);
    const hash = crypto.createHash('md5').update(trigram).digest();
    const index = hash.readUInt16BE(0) % dimensions;
    vector[index] = (vector[index] ?? 0) + 0.5;
  }

  let norm = 0;
  for (const val of vector) norm += val * val;
  const mag = Math.sqrt(norm);
  if (mag === 0) return vector;
  return vector.map((v) => v / mag);
}

export async function processDuplicateDetectionJob(job: Job<DuplicateDetectionJobData>): Promise<void> {
  const { reportId } = job.data;
  job.log(`Starting Hybrid Semantic & Lexical Duplicate Detection for report ${reportId}`);

  const prisma = new PrismaClient();

  try {
    // 1. Fetch report details
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        title: true,
        reproSteps: true,
        impactExplanation: true,
        vulnCategory: true,
        programId: true,
        status: true,
        createdAt: true,
      },
    });

    if (!report) {
      job.log(`Report ${reportId} not found`);
      return;
    }

    job.log(`Analyzing report: "${report.title}" (Category: ${report.vulnCategory})`);

    // 2. Compute and cache embedding for incoming report
    const combinedContent = `${report.title} ${report.reproSteps} ${report.impactExplanation}`;
    const reportVector = createEmbedding(combinedContent, 1536);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // 3. Query candidate reports in the same program
    const candidates = await prisma.report.findMany({
      where: {
        programId: report.programId,
        status: { in: ['SUBMITTED', 'TRIAGING', 'ACCEPTED'] },
        createdAt: { gte: ninetyDaysAgo },
        id: { not: reportId },
      },
      select: {
        id: true,
        title: true,
        reproSteps: true,
        impactExplanation: true,
        vulnCategory: true,
      },
      take: 20,
    });

    job.log(`Retrieved ${candidates.length} active candidate reports in program`);

    let maxSimilarity = 0;
    let bestMatch: (typeof candidates)[0] | null = null;
    let duplicateReason = '';

    for (const candidate of candidates) {
      const candidateContent = `${candidate.title} ${candidate.reproSteps} ${candidate.impactExplanation}`;
      const candidateVector = createEmbedding(candidateContent, 1536);

      // Dense vector cosine similarity
      const denseSim = Math.max(0, cosineSimilarity(reportVector, candidateVector));

      // Category matching bonus
      const categoryMatch = candidate.vulnCategory === report.vulnCategory ? 0.05 : 0;
      const combinedSim = Math.min(1.0, Math.round((denseSim + categoryMatch) * 1000) / 1000);

      if (combinedSim > maxSimilarity) {
        maxSimilarity = combinedSim;
        bestMatch = candidate;
        duplicateReason = `Hybrid semantic similarity score of ${(combinedSim * 100).toFixed(1)}% with report #${candidate.id} ("${candidate.title}").`;
      }
    }

    // 4. Threshold Evaluation: If similarity >= 0.82, flag potential duplicate and notify PM
    if (maxSimilarity >= 0.82 && bestMatch) {
      job.log(`High probability duplicate detected: ${maxSimilarity.toFixed(3)} with report #${bestMatch.id}`);

      // Update report status or duplicate linkage
      await prisma.report.update({
        where: { id: reportId },
        data: {
          isDuplicate: true,
          duplicateOfId: bestMatch.id,
        },
      });

      // Link reports
      await prisma.reportLink.upsert({
        where: {
          reportId_linkedId: {
            reportId,
            linkedId: bestMatch.id,
          },
        },
        create: {
          reportId,
          linkedId: bestMatch.id,
          linkType: 'DUPLICATE',
        },
        update: {},
      });

      // Notify Program Managers
      const program = await prisma.program.findUnique({
        where: { id: report.programId },
        select: { orgId: true },
      });

      if (program) {
        const orgMembers = await prisma.organizationMember.findMany({
          where: {
            orgId: program.orgId,
            role: 'PROGRAM_MANAGER',
            user: { bannedAt: null },
          },
          include: {
            user: { select: { id: true, email: true } },
          },
        });

        if (orgMembers.length > 0) {
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
                reason: duplicateReason,
              },
            });
          }

          job.log(`Notified ${orgMembers.length} program managers about semantic duplicate`);
        }
      }
    } else {
      job.log(`No significant duplicate detected. Max similarity: ${maxSimilarity.toFixed(3)}`);
    }
  } catch (error) {
    job.log(`Error in duplicate detection: ${error}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
