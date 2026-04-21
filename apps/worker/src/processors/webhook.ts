import type { Job } from 'bullmq';
import { createHmac } from 'node:crypto';
import { Prisma, prisma } from '@bughuntr/db';

export interface WebhookJobData {
  webhookId: string;
  url: string;
  secret: string;
  event: string;
  payload: Record<string, unknown>;
}

export async function processWebhookJob(
  job: Job<WebhookJobData>,
): Promise<void> {
  const { webhookId, url, event, payload, secret } = job.data;

  job.log(`Delivering webhook=${webhookId} event=${event} to ${url}`);
  const signature = createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  let statusCode: number | null = null;
  let responseText = '';
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature-256': signature,
        'X-Webhook-Event': event,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    statusCode = response.status;
    responseText = (await response.text()).slice(0, 5000);

    await prisma.webhookDelivery.create({
      data: {
        webhookId,
        event,
        payload: payload as Prisma.InputJsonValue,
        statusCode,
        response: responseText,
        attempt: job.attemptsMade + 1,
        deliveredAt: response.ok ? new Date() : null,
      },
    });
    await prisma.webhook.update({
      where: { id: webhookId },
      data: { lastStatus: response.status },
    });

    if (!response.ok) {
      throw new Error(`Webhook response ${response.status}`);
    }
  } catch (error) {
    await prisma.webhookDelivery.create({
      data: {
        webhookId,
        event,
        payload: payload as Prisma.InputJsonValue,
        statusCode: statusCode ?? undefined,
        response:
          error instanceof Error ? error.message.slice(0, 5000) : 'Webhook request failed',
        attempt: job.attemptsMade + 1,
      },
    });

    if (job.attemptsMade + 1 >= 5) {
      const webhook = await prisma.webhook.findUnique({ where: { id: webhookId } });
      if (webhook) {
        const admins = await prisma.organizationMember.findMany({
          where: { orgId: webhook.orgId, role: 'ORG_ADMIN' },
          select: { userId: true },
        });
        await Promise.all(
          admins.map((admin) =>
            prisma.notification.create({
              data: {
                userId: admin.userId,
                type: 'WEBHOOK_DELIVERY_FAILED',
                channel: 'IN_APP',
                subject: 'Webhook delivery failed permanently',
                body: `Webhook ${webhookId} failed after 5 attempts`,
                data: { webhookId, event },
              },
            }),
          ),
        );
      }
    }
    throw error;
  }
}
