import { render } from '@react-email/render';
import OrgPendingVerification from './org-pending-verification.js';
import OrgVerificationSubmitted from './org-verification-submitted.js';
import OrgVerificationApproved from './org-verification-approved.js';
import OrgVerificationRejected from './org-verification-rejected.js';
import OrgInvitation from './org-invitation.js';
import VerifyEmail from './verify-email.js';

export const EMAIL_TEMPLATES = {
  'verify-email': VerifyEmail,
  'org-pending-verification': OrgPendingVerification,
  'org-verification-submitted': OrgVerificationSubmitted,
  'org-verification-approved': OrgVerificationApproved,
  'org-verification-rejected': OrgVerificationRejected,
  'org-invitation': OrgInvitation,
} as const;

export const NOTIFICATION_TYPE_TO_TEMPLATE = {
  ORG_INVITATION_RECEIVED: 'org-invitation',
  ORG_VERIFICATION_APPROVED: 'org-verification-approved',
  ORG_VERIFICATION_REJECTED: 'org-verification-rejected',
  ORG_CREATED_PENDING_REVIEW: 'org-pending-verification',
  ORG_VERIFICATION_SUBMITTED: 'org-verification-submitted',
} as const;

export type EmailTemplateKey = keyof typeof EMAIL_TEMPLATES;
export type NotificationType = keyof typeof NOTIFICATION_TYPE_TO_TEMPLATE;

export function renderTemplate(templateKey: EmailTemplateKey, variables: Record<string, any>): string {
  const Template = EMAIL_TEMPLATES[templateKey];
  if (!Template) {
    throw new Error(`Email template not found: ${templateKey}`);
  }
  
  // Templates have different prop shapes; runtime variables are validated per job type.
  return render((Template as any)(variables));
}

export function getTemplateForNotificationType(notificationType: NotificationType): EmailTemplateKey {
  const templateKey = NOTIFICATION_TYPE_TO_TEMPLATE[notificationType];
  if (!templateKey) {
    throw new Error(`No template mapped for notification type: ${notificationType}`);
  }
  
  return templateKey;
}
