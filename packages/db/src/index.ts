export { PrismaClient, Prisma } from '@prisma/client';
export type {
  User,
  Session,
  OAuthAccount,
  LoginHistory,
  Organization,
  OrganizationMember,
  OrgInvite,
  Program,
  ProgramInvite,
  ProgramTag,
  Asset,
  AssetScopeHistory,
  Report,
  ReportStatusHistory,
  ReportLink,
  Attachment,
  Comment,
  SlaRecord,
  Reward,
  Payout,
  PayoutProfile,
  ReputationEvent,
  Notification,
  NotificationPreference,
  AuditLog,
  ApiKey,
  Webhook,
  WebhookDelivery,
  OrgSsoConfig,
  ReplyTemplate,
} from '@prisma/client';

export {
  PlatformRole,
  OrgRole,
  OrgStatus,
  ProgramType,
  ProgramStatus,
  AssetType,
  Severity,
  ReportStatus,
  PayoutStatus,
  NotifChannel,
  PaymentMethod,
  VulnCategory,
} from '@prisma/client';

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma;
}
