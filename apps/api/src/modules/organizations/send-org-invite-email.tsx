import { render } from '@react-email/render';
import { Resend } from 'resend';
import * as React from 'react';
import { env } from '../../config.js';
import OrgInviteEmail from './emails/OrgInviteEmail.js';

const roleLabels: Record<string, string> = {
  ORG_ADMIN: 'Organization admin',
  PROGRAM_MANAGER: 'Program manager',
  REVIEWER: 'Reviewer',
  FINANCE: 'Finance',
  VIEWER: 'Viewer',
};

export async function sendOrgInviteEmail(params: {
  to: string;
  orgName: string;
  role: string;
  acceptUrl: string;
}): Promise<void> {
  if (process.env['NODE_ENV'] === 'test') return;

  const resend = new Resend(env.RESEND_API_KEY);
  const html = await render(
    <OrgInviteEmail
      orgName={params.orgName}
      roleLabel={roleLabels[params.role] ?? params.role}
      acceptUrl={params.acceptUrl}
    />,
  );

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: params.to,
    subject: `You're invited to ${params.orgName} on BugHuntr`,
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}
