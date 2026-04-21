import type { Job } from 'bullmq';
import { PrismaClient } from '@bughuntr/db';

export interface NotificationJobData {
  userId: string;
  type: string;
  channels: ('EMAIL' | 'IN_APP' | 'SMS' | 'WEBHOOK')[];
  subject?: string;
  body: string;
  data?: Record<string, any>;
}

export async function processNotificationJob(
  job: Job<NotificationJobData>,
): Promise<void> {
  const { userId, type, channels, subject, body, data } = job.data;

  job.log(`Processing notification for user=${userId} type=${type} channels=${channels.join(',')}`);

  const prisma = new PrismaClient();

  try {
    // Check user's notification preferences
    const preferences = await prisma.notificationPreference.findMany({
      where: {
        userId,
        type,
        channel: {
          in: channels,
        },
        enabled: true,
      },
    });

    if (preferences.length === 0) {
      job.log(`No enabled preferences found for user=${userId} type=${type}`);
      return;
    }

    // Create notification record in DB
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        body,
        subject,
        data: data || {},
        channel: 'IN_APP', // Default channel for DB record
        sentAt: new Date(),
      },
    });

    job.log(`Created notification record ${notification.id}`);

    // Fan out to enabled channels
    const { emailQueue } = await import('../queues.js');

    for (const preference of preferences) {
      switch (preference.channel) {
        case 'EMAIL':
          // Get user email
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
          });

          if (user?.email) {
            await emailQueue.add('notification-email', {
              to: user.email,
              subject: subject || `BugHuntr Notification: ${type}`,
              templateId: 'notification',
              variables: {
                userName: userId, // Would need to fetch actual username
                notificationType: type,
                body,
                data,
              },
            });
            job.log(`Queued email notification to ${user.email}`);
          }
          break;

        case 'IN_APP':
          // In-app notification is already created in DB
          job.log(`In-app notification created: ${notification.id}`);
          break;

        case 'SMS':
          // TODO: Implement SMS queue when SMS provider is integrated
          job.log(`SMS notification not yet implemented for user=${userId}`);
          break;

        case 'WEBHOOK':
          // TODO: Implement webhook notifications when webhook system is ready
          job.log(`Webhook notification not yet implemented for user=${userId}`);
          break;

        default:
          job.log(`Unknown notification channel: ${preference.channel}`);
      }
    }

    console.info(`[notification] user=${userId} type=${type} channels=${preferences.map(p => p.channel).join(',')} processed`);

  } catch (error) {
    job.log(`Error processing notification: ${error}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
