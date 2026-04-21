import type { Job } from 'bullmq';
import { PrismaClient } from '@bughuntr/db';
import { createWriteStream, createReadStream } from 'fs';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { lookup } from 'dns';
import { env } from '../config.js';

export interface VirusScanJobData {
  attachmentId: string;
  s3Key: string;
}

export async function processVirusScanJob(
  job: Job<VirusScanJobData>,
): Promise<void> {
  const { attachmentId, s3Key } = job.data;

  job.log(`Scanning attachment=${attachmentId} s3Key=${s3Key}`);

  const prisma = new PrismaClient();

  try {
    // Get attachment details
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      select: {
        id: true,
        fileName: true,
        s3Key: true,
        uploaderId: true,
      },
    });

    if (!attachment) {
      job.log(`Attachment ${attachmentId} not found`);
      return;
    }

    // Download file from S3 to tmpfs
    const tempPath = join('/tmp', attachment.fileName);
    
    // TODO: Implement S3 download when S3 client is available
    // For now, we'll simulate the download
    job.log(`Would download ${attachment.s3Key} to ${tempPath}`);

    // Connect to ClamAV via TCP socket
    const result = await scanWithClamAV(tempPath, job);
    
    // Update attachment scan status
    await prisma.attachment.update({
      where: { id: attachmentId },
      data: {
        scanStatus: result.isInfected ? 'INFECTED' : 'CLEAN',
        scannedAt: new Date(),
      },
    });

    if (result.isInfected) {
      job.log(`Virus detected in ${attachment.fileName}: ${result.viruses.join(', ')}`);
      
      // Delete from S3 if infected
      // TODO: Implement S3 deletion when S3 client is available
      job.log(`Would delete infected file ${attachment.s3Key} from S3`);

      // Notify uploader
      const { notificationQueue } = await import('../queues.js');
      await notificationQueue.add('virus-detected', {
        userId: attachment.uploaderId,
        type: 'virus-detected',
        channels: ['email', 'in-app'],
        data: {
          attachmentId,
          fileName: attachment.fileName,
          viruses: result.viruses,
        },
      });
    } else {
      job.log(`File ${attachment.fileName} is clean`);
    }

    // Clean up temp file
    try {
      await unlink(tempPath);
    } catch (error) {
      job.log(`Failed to clean up temp file: ${error}`);
    }

    console.info(`[virus-scan] attachment=${attachmentId} status=${result.isInfected ? 'INFECTED' : 'CLEAN'}`);

  } catch (error) {
    job.log(`Error scanning attachment ${attachmentId}: ${error}`);
    
    // Update scan status to failed
    await prisma.attachment.update({
      where: { id: attachmentId },
      data: {
        scanStatus: 'FAILED',
        scannedAt: new Date(),
      },
    });
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function scanWithClamAV(filePath: string, jobLogger: { log: (message: string) => void }): Promise<{ isInfected: boolean; viruses: string[] }> {
  return new Promise((resolve, reject) => {
    const net = require('net');
    
    const socket = net.createConnection(env.CLAMAV_PORT, env.CLAMAV_HOST, () => {
      jobLogger.log(`Connected to ClamAV at ${env.CLAMAV_HOST}:${env.CLAMAV_PORT}`);
      
      // Send SCAN command
      socket.write(`zINSTREAM\0`);
      
      // Stream file content
      const fileStream = createReadStream(filePath);
      fileStream.pipe(socket, { end: false });
      
      fileStream.on('end', () => {
        socket.end(); // Close the stream
      });
    });

    socket.on('data', (data: Buffer) => {
      const response = data.toString();
      jobLogger.log(`ClamAV response: ${response}`);
      
      if (response.startsWith('1:')) {
        // Clean file
        resolve({ isInfected: false, viruses: [] });
      } else if (response.startsWith('0:')) {
        // Infected file
        const viruses = response.substring(2).split(/:|\s/).filter(Boolean);
        resolve({ isInfected: true, viruses });
      } else {
        reject(new Error(`Unexpected ClamAV response: ${response}`));
      }
    });

    socket.on('error', (error: any) => {
      reject(new Error(`ClamAV connection error: ${error.message}`));
    });

    socket.setTimeout(30000, () => {
      socket.destroy();
      reject(new Error('ClamAV scan timeout'));
    });
  });
}
