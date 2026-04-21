import type { Job } from 'bullmq';
import { PrismaClient } from '@bughuntr/db';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';

export interface ExportJobData {
  exportId: string;
  type: 'reports' | 'users' | 'programs' | 'rewards';
  filters: Record<string, any>;
  format: 'csv' | 'pdf';
  requesterId: string;
}

export async function processExportJob(job: Job<ExportJobData>): Promise<void> {
  const { exportId, type, filters, format, requesterId } = job.data;
  
  job.log(`Starting export ${exportId}: ${type} in ${format} format`);
  
  const prisma = new PrismaClient();
  
  try {
    // TODO: Update export status to processing when Export model is added to schema
    job.log(`Processing export ${exportId}`);

    let data: any[] = [];
    let filename = '';

    // Run query based on export type
    switch (type) {
      case 'reports':
        data = await getReportsData(prisma, filters);
        filename = `reports-${Date.now()}.${format}`;
        break;
      case 'users':
        data = await getUsersData(prisma, filters);
        filename = `users-${Date.now()}.${format}`;
        break;
      case 'programs':
        data = await getProgramsData(prisma, filters);
        filename = `programs-${Date.now()}.${format}`;
        break;
      case 'rewards':
        data = await getRewardsData(prisma, filters);
        filename = `rewards-${Date.now()}.${format}`;
        break;
      default:
        throw new Error(`Unsupported export type: ${type}`);
    }

    job.log(`Retrieved ${data.length} records for export`);

    // Generate file
    const tempPath = join('/tmp', filename);
    
    if (format === 'csv') {
      await generateCsv(data, tempPath);
    } else if (format === 'pdf') {
      await generatePdf(data, tempPath);
    }

    // TODO: Upload to S3 when S3 integration is ready
    job.log(`File generated at ${tempPath}`);
    
    // Clean up temp file
    await unlink(tempPath);

    // TODO: Update export record when Export model is added to schema
    // TODO: Generate presigned URL for download

    // Notify user
    const { notificationQueue } = await import('../queues.js');
    await notificationQueue.add('export-completed', {
      userId: requesterId,
      type: 'export-completed',
      channels: ['in-app'],
      data: {
        exportId,
        filename,
        recordCount: data.length,
        message: 'Export completed successfully',
      },
    });

    job.log(`Export completed: ${exportId} with ${data.length} records`);

  } catch (error) {
    job.log(`Error in export: ${error}`);
    
    // TODO: Update export status to failed when Export model is added to schema
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function getReportsData(prisma: PrismaClient, filters: Record<string, any>) {
  const where: any = {};
  
  if (filters['programId']) where.programId = filters['programId'];
  if (filters['status']) where.status = filters['status'];
  if (filters['severity']) where.severityEstimate = filters['severity'];
  if (filters['dateFrom']) where.createdAt = { gte: new Date(filters['dateFrom']) };
  if (filters['dateTo']) where.createdAt = { ...where.createdAt, lte: new Date(filters['dateTo']) };

  return prisma.report.findMany({
    where,
    select: {
      id: true,
      title: true,
      status: true,
      severityEstimate: true,
      vulnCategory: true,
      createdAt: true,
      submittedAt: true,
      submitter: {
        select: {
          username: true,
          email: true,
        },
      },
    },
  });
}

async function getUsersData(prisma: PrismaClient, filters: Record<string, any>) {
  const where: any = {};
  
  if (filters['platformRole']) where.platformRole = filters['platformRole'];
  if (filters['country']) where.country = filters['country'];
  if (filters['dateFrom']) where.createdAt = { gte: new Date(filters['dateFrom']) };
  if (filters['dateTo']) where.createdAt = { ...where.createdAt, lte: new Date(filters['dateTo']) };

  return prisma.user.findMany({
    where,
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      platformRole: true,
      country: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });
}

async function getProgramsData(prisma: PrismaClient, filters: Record<string, any>) {
  const where: any = {};
  
  if (filters['orgId']) where.orgId = filters['orgId'];
  if (filters['status']) where.status = filters['status'];
  if (filters['type']) where.type = filters['type'];

  return prisma.program.findMany({
    where,
    select: {
      id: true,
      title: true,
      status: true,
      type: true,
      maxRewardUsd: true,
      totalPaidUsd: true,
      createdAt: true,
    },
  });
}

async function getRewardsData(prisma: PrismaClient, filters: Record<string, any>) {
  const where: any = {};
  
  if (filters['programId']) where.programId = filters['programId'];
  if (filters['status']) where.decision = filters['status'];
  if (filters['dateFrom']) where.createdAt = { gte: new Date(filters['dateFrom']) };
  if (filters['dateTo']) where.createdAt = { ...where.createdAt, lte: new Date(filters['dateTo']) };

  return prisma.reward.findMany({
    where,
    select: {
      id: true,
      amountUsd: true,
      bonusUsd: true,
      decision: true,
      createdAt: true,
      approvedAt: true,
      recipient: {
        select: {
          username: true,
          email: true,
        },
      },
      report: {
        select: {
          title: true,
          severityEstimate: true,
        },
      },
    },
  });
}

async function generateCsv(data: any[], filePath: string): Promise<void> {
  if (data.length === 0) {
    await writeFile(filePath, '');
    return;
  }

  // Simple CSV generation
  const headers = Object.keys(data[0]);
  const csvLines = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    csvLines.push(values.join(','));
  }
  
  await writeFile(filePath, csvLines.join('\n'));
}

async function generatePdf(data: any[], filePath: string): Promise<void> {
  // Simple text-based PDF generation placeholder
  // In production, use a proper PDF library
  let content = `Export Data - ${new Date().toISOString()}\n\n`;
  
  for (const item of data.slice(0, 100)) { // Limit to 100 items
    content += JSON.stringify(item, null, 2) + '\n\n';
  }
  
  await writeFile(filePath, content);
}
