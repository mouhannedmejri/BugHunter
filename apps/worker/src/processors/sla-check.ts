import type { Job } from 'bullmq';
import { PrismaClient } from '@bughuntr/db';

export interface SlaCheckJobData {
  // This is a repeatable job, no specific data needed
}

export async function processSlaCheckJob(job: Job<SlaCheckJobData>): Promise<void> {
  job.log('Starting SLA breach check');
  
  const prisma = new PrismaClient();
  
  try {
    const now = new Date();
    
    // Find breached SLAs
    const breachedSlaRecords = await prisma.slaRecord.findMany({
      where: {
        completedAt: null,
        breached: false,
        dueAt: {
          lt: now,
        },
      },
      include: {
        report: {
          select: {
            id: true,
            title: true,
            status: true,
            programId: true,
          },
        },
        program: {
          select: {
            orgId: true,
          },
        },
      },
    });

    job.log(`Found ${breachedSlaRecords.length} breached SLA records`);

    if (breachedSlaRecords.length === 0) {
      return;
    }

    // Update breached status
    await prisma.slaRecord.updateMany({
      where: {
        id: {
          in: breachedSlaRecords.map(record => record.id),
        },
      },
      data: {
        breached: true,
      },
    });

    // Group by program for notifications
    const programIds = [...new Set(breachedSlaRecords.map(record => record.programId))];
    
    for (const programId of programIds) {
      const programBreachedRecords = breachedSlaRecords.filter(record => record.programId === programId);
      const orgId = programBreachedRecords[0]?.program.orgId;
      
      if (!orgId) continue;

      // Get program managers to notify
      const orgMembers = await prisma.organizationMember.findMany({
        where: {
          orgId,
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
          await notificationQueue.add('sla-breach', {
            userId: member.userId,
            type: 'sla-breach',
            channels: ['email', 'in-app'],
            data: {
              programId,
              breachedRecords: programBreachedRecords.map(record => ({
                reportId: record.report.id,
                reportTitle: record.report.title,
                metricKey: record.metricKey,
                dueAt: record.dueAt,
              })),
            },
          });
        }
        
        job.log(`Notified ${orgMembers.length} program managers about SLA breaches for program ${programId}`);
      }
    }

    job.log(`Processed ${breachedSlaRecords.length} SLA breaches`);

  } catch (error) {
    job.log(`Error in SLA check: ${error}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
