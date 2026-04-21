import type { Job } from 'bullmq';
import { renderTemplate, getTemplateForNotificationType, type EmailTemplateKey } from '../emails/index.js';
import { Resend } from 'resend';
import { env } from '../config.js';

export interface EmailJobData {
  to: string;
  subject?: string;
  templateId?: string;
  notificationType?: string;
  variables?: Record<string, any>;
  // Legacy auth jobs from API: { to, token }
  token?: string;
}

export async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { to } = job.data;
  let { subject, templateId, notificationType, variables } = job.data;

  // Handle auth verification jobs enqueued by the API as job.name === 'verification' with { to, token }
  if (job.name === 'verification' && job.data.token) {
    const verifyUrl = `${env.FRONTEND_URL.replace(/\/+$/, '')}/verify-email?token=${encodeURIComponent(
      job.data.token,
    )}`;
    subject = subject ?? 'Verify your BugHuntr email';
    templateId = templateId ?? 'verify-email';
    variables = { verifyUrl };
  }

  // Determine template key
  let templateKey: EmailTemplateKey;
  if (templateId) {
    templateKey = templateId as EmailTemplateKey;
  } else if (notificationType) {
    templateKey = getTemplateForNotificationType(notificationType as any);
  } else {
    throw new Error('Either templateId/notificationType or a supported job.name must be provided');
  }

  job.log(`Sending email to ${to} | subject: "${subject ?? ''}" | template: ${templateKey}`);

  try {
    // Render the email template
    const html = renderTemplate(templateKey, variables ?? {});

    // Initialize Resend client
    const resend = new Resend(env.RESEND_API_KEY);

    // Send email via Resend
    await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject: subject ?? 'BugHuntr notification',
      html,
    });

    job.log(`Email sent successfully to ${to}`);
    console.info(`[email] Sent to=${to} subject="${subject}" template=${templateKey} vars=${JSON.stringify(variables)}`);
  } catch (error) {
    job.log(`Failed to render email template: ${error}`);
    throw error;
  }
}
