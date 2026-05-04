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

  if (env.NODE_ENV !== 'production') {
    console.log('\n======================================================');
    console.log(`[DEV] OUTBOUND EMAIL (ORG INVITE)`);
    console.log(`To:      ${params.to}`);
    console.log(`Subject: You're invited to ${params.orgName} on BugHuntr`);
    console.log(`Role:    ${roleLabels[params.role] ?? params.role}`);
    console.log(`Link:    ${params.acceptUrl}`);
    console.log('======================================================\n');
  }

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: params.to,
    subject: `You're invited to ${params.orgName} on BugHuntr`,
    html,
  });

  if (error) {
    console.error(`Resend error: ${error.message}`);
    if (env.NODE_ENV !== 'production') {
      console.warn('Skipping email error in development. Invite was created but email was not sent.');
      return;
    }
    throw new Error(`Resend error: ${error.message}`);
  }
}
