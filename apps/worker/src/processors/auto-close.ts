import type { Job } from 'bullmq';
import { PrismaClient } from '@bughuntr/db';

export interface AutoCloseJobData {
  // This is a repeatable job, no specific data needed
}

export async function processAutoCloseJob(job: Job<AutoCloseJobData>): Promise<void> {
  job.log('Starting auto-close check for NEEDS_INFO reports');
  
  const prisma = new PrismaClient();
  
  try {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    // Find NEEDS_INFO reports where last researcher comment > 14d ago
    // For now, we'll use a simpler approach by finding all NEEDS_INFO reports
    // and then filtering based on comment dates
    const needsInfoReports = await prisma.report.findMany({
      where: {
        status: 'NEEDS_INFO',
      },
      include: {
        comments: {
          where: {
            isInternal: false, // Only researcher comments
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          select: {
            createdAt: true,
            authorId: true,
          },
        },
        submitter: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        program: {
          select: {
            id: true,
            title: true,
            orgId: true,
          },
        },
      },
    });

    // Filter reports where last researcher comment was > 14 days ago
    const reportsToAutoClose = needsInfoReports.filter((report: any) => {
      const lastComment = report.comments[0]; // Most recent comment
      if (!lastComment) return true; // No comments, auto-close
      
      return lastComment.createdAt < fourteenDaysAgo;
    });

    job.log(`Found ${reportsToAutoClose.length} reports to auto-close`);

    if (reportsToAutoClose.length === 0) {
      return;
    }

    // Update reports to CLOSED status
    await prisma.report.updateMany({
      where: {
        id: {
          in: reportsToAutoClose.map((report: any) => report.id),
        },
      },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
      },
    });

    // Group by program for notifications
    const programIds = [...new Set(reportsToAutoClose.map((report: any) => report.program.id))];
    
    for (const programId of programIds) {
      const programReports = reportsToAutoClose.filter((report: any) => report.program.id === programId);
      const orgId = programReports[0]?.program.orgId;
      
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
          await notificationQueue.add('auto-close', {
            userId: member.userId,
            type: 'auto-close',
            channels: ['email', 'in-app'],
            data: {
              programId,
              closedReports: programReports.map(report => ({
                reportId: report.id,
                reportTitle: report.title,
                submitterUsername: report.submitter.username,
                lastCommentDate: report.comments[0]?.createdAt,
              })),
            },
          });
        }
        
        job.log(`Notified ${orgMembers.length} program managers about auto-closed reports for program ${programId}`);
      }

      // Notify researchers whose reports were auto-closed
      for (const report of programReports) {
        const { notificationQueue } = await import('../queues.js');
        
        await notificationQueue.add('report-auto-closed', {
          userId: report.submitter.id,
          type: 'report-auto-closed',
          channels: ['email', 'in-app'],
          data: {
            reportId: report.id,
            reportTitle: report.title,
            reason: 'Auto-closed: no researcher response for 14 days',
            programTitle: report.program.title,
          },
        });
      }
    }

    job.log(`Auto-closed ${reportsToAutoClose.length} reports`);

  } catch (error) {
    job.log(`Error in auto-close check: ${error}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
