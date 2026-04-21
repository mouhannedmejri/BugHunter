import type { Job } from 'bullmq';
import { PrismaClient } from '@bughuntr/db';
import { createReadStream } from 'fs';
import { join } from 'path';
import { unlink } from 'fs/promises';

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

    // Upload to S3
    const s3Key = `exports/${exportId}/${filename}`;
    await uploadToS3(tempPath, s3Key);
    
    // Clean up temp file
    await unlink(tempPath);

    // Generate presigned URL (this would typically be done via API)
    const downloadUrl = `https://${process.env.S3_BUCKET}/${s3Key}`; // Simplified

    // Update export record
    await prisma.export.update({
      where: { id: exportId },
      data: {
        status: 'COMPLETED',
        fileUrl: downloadUrl,
        completedAt: new Date(),
      },
    });

    // Notify user
    const { notificationQueue } = await import('../queues.js');
    await notificationQueue.add('export-completed', {
      userId: requesterId,
      type: 'export-completed',
      channels: ['email', 'in-app'],
      data: {
        exportId,
        downloadUrl,
        filename,
        recordCount: data.length,
      },
    });

    job.log(`Export completed: ${exportId} with ${data.length} records`);

  } catch (error) {
    job.log(`Error in export: ${error}`);
    
    // Update export status to failed
    await prisma.export.update({
      where: { id: exportId },
      data: {
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function getReportsData(prisma: PrismaClient, filters: Record<string, any>) {
  const where: any = {};
  
  if (filters.programId) where.programId = filters.programId;
  if (filters.status) where.status = filters.status;
  if (filters.severity) where.severityEstimate = filters.severity;
  if (filters.dateFrom) where.createdAt = { gte: new Date(filters.dateFrom) };
  if (filters.dateTo) where.createdAt = { ...where.createdAt, lte: new Date(filters.dateTo) };

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
      program: {
        select: {
          title: true,
        },
      },
    },
  });
}

async function getUsersData(prisma: PrismaClient, filters: Record<string, any>) {
  const where: any = {};
  
  if (filters.platformRole) where.platformRole = filters.platformRole;
  if (filters.country) where.country = filters.country;
  if (filters.dateFrom) where.createdAt = { gte: new Date(filters.dateFrom) };
  if (filters.dateTo) where.createdAt = { ...where.createdAt, lte: new Date(filters.dateTo) };

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
  
  if (filters.orgId) where.orgId = filters.orgId;
  if (filters.status) where.status = filters.status;
  if (filters.type) where.type = filters.type;

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
      organization: {
        select: {
          name: true,
        },
      },
    },
  });
}

async function getRewardsData(prisma: PrismaClient, filters: Record<string, any>) {
  const where: any = {};
  
  if (filters.programId) where.programId = filters.programId;
  if (filters.status) where.decision = filters.status;
  if (filters.dateFrom) where.createdAt = { gte: new Date(filters.dateFrom) };
  if (filters.dateTo) where.createdAt = { ...where.createdAt, lte: new Date(filters.dateTo) };

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
  const { createObjectCsvWriter } = await import('csv-writer');
  
  if (data.length === 0) {
    await writeFile(filePath, '');
    return;
  }

  const headers = Object.keys(data[0]).map(key => ({ id: key, title: key }));
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: headers,
  });

  await csvWriter.writeRecords(data);
}

async function generatePdf(data: any[], filePath: string): Promise<void> {
  // Simplified PDF generation - in production would use proper PDF library
  const { PDFDocument, rgb } = await import('pdf-lib');
  
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const { height } = page.getSize();
  
  let yPosition = height - 50;
  
  page.drawText('Export Data', {
    x: 50,
    y: yPosition,
    size: 20,
    color: rgb(0, 0, 0),
  });
  
  yPosition -= 40;
  
  for (const item of data.slice(0, 50)) { // Limit to 50 items for demo
    const text = JSON.stringify(item, null, 2).substring(0, 200) + '...';
    page.drawText(text, {
      x: 50,
      y: yPosition,
      size: 10,
      color: rgb(0, 0, 0),
    });
    
    yPosition -= 100;
    if (yPosition < 50) break;
  }
  
  const pdfBytes = await pdfDoc.save();
  await writeFile(filePath, pdfBytes);
}

async function uploadToS3(filePath: string, s3Key: string): Promise<void> {
  const s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_KEY!,
      secretAccessKey: process.env.S3_SECRET!,
    },
  });

  const fileStream = createReadStream(filePath);
  
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: s3Key,
    Body: fileStream,
  }));
}

async function writeFile(filePath: string, content: string | Buffer): Promise<void> {
  const fs = await import('fs/promises');
  await fs.writeFile(filePath, content);
}
