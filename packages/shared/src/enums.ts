/**
 * Enums matching the Prisma schema, usable without Prisma dependency.
 * Keep in sync with packages/db/prisma/schema.prisma enums.
 */

export const PlatformRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SUPPORT: 'SUPPORT',
  AUDITOR: 'AUDITOR',
  USER: 'USER',
} as const;
export type PlatformRole = (typeof PlatformRole)[keyof typeof PlatformRole];

export const OrgRole = {
  ORG_ADMIN: 'ORG_ADMIN',
  PROGRAM_MANAGER: 'PROGRAM_MANAGER',
  REVIEWER: 'REVIEWER',
  FINANCE: 'FINANCE',
  VIEWER: 'VIEWER',
} as const;
export type OrgRole = (typeof OrgRole)[keyof typeof OrgRole];

export const ProgramType = {
  PUBLIC: 'PUBLIC',
  PRIVATE: 'PRIVATE',
  CAMPAIGN: 'CAMPAIGN',
  CHALLENGE: 'CHALLENGE',
  EMERGENCY: 'EMERGENCY',
} as const;
export type ProgramType = (typeof ProgramType)[keyof typeof ProgramType];

export const ProgramStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  CLOSED: 'CLOSED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type ProgramStatus = (typeof ProgramStatus)[keyof typeof ProgramStatus];

export const AssetType = {
  DOMAIN: 'DOMAIN',
  SUBDOMAIN: 'SUBDOMAIN',
  IP_RANGE: 'IP_RANGE',
  MOBILE_APP: 'MOBILE_APP',
  API: 'API',
  REPOSITORY: 'REPOSITORY',
  CLOUD: 'CLOUD',
  THIRD_PARTY: 'THIRD_PARTY',
  PHYSICAL: 'PHYSICAL',
} as const;
export type AssetType = (typeof AssetType)[keyof typeof AssetType];

export const Severity = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INFORMATIONAL: 'INFORMATIONAL',
} as const;
export type Severity = (typeof Severity)[keyof typeof Severity];

export const ReportStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  RECEIVED: 'RECEIVED',
  NEEDS_INFO: 'NEEDS_INFO',
  TRIAGING: 'TRIAGING',
  ACCEPTED: 'ACCEPTED',
  DUPLICATE: 'DUPLICATE',
  INFORMATIVE: 'INFORMATIVE',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  OUT_OF_SCOPE: 'OUT_OF_SCOPE',
  RESOLVED: 'RESOLVED',
  REWARDED: 'REWARDED',
  CLOSED: 'CLOSED',
  ESCALATED: 'ESCALATED',
} as const;
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

export const PayoutStatus = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;
export type PayoutStatus = (typeof PayoutStatus)[keyof typeof PayoutStatus];

export const NotifChannel = {
  EMAIL: 'EMAIL',
  IN_APP: 'IN_APP',
  WEBHOOK: 'WEBHOOK',
  SMS: 'SMS',
} as const;
export type NotifChannel = (typeof NotifChannel)[keyof typeof NotifChannel];

export const PaymentMethod = {
  BANK_TRANSFER: 'BANK_TRANSFER',
  PAYPAL: 'PAYPAL',
  CRYPTO: 'CRYPTO',
  STRIPE: 'STRIPE',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const VulnCategory = {
  XSS: 'XSS',
  SQLI: 'SQLI',
  RCE: 'RCE',
  SSRF: 'SSRF',
  IDOR: 'IDOR',
  CSRF: 'CSRF',
  AUTH_BYPASS: 'AUTH_BYPASS',
  PRIV_ESC: 'PRIV_ESC',
  INFO_DISC: 'INFO_DISC',
  DOS: 'DOS',
  BUSINESS_LOGIC: 'BUSINESS_LOGIC',
  CRYPTO: 'CRYPTO',
  SUPPLY_CHAIN: 'SUPPLY_CHAIN',
  OTHER: 'OTHER',
} as const;
export type VulnCategory = (typeof VulnCategory)[keyof typeof VulnCategory];

export const KycStatus = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
} as const;
export type KycStatus = (typeof KycStatus)[keyof typeof KycStatus];

export const ScanStatus = {
  PENDING: 'PENDING',
  CLEAN: 'CLEAN',
  INFECTED: 'INFECTED',
} as const;
export type ScanStatus = (typeof ScanStatus)[keyof typeof ScanStatus];

export const RewardDecision = {
  APPROVED: 'APPROVED',
  PARTIAL: 'PARTIAL',
  NO_REWARD: 'NO_REWARD',
} as const;
export type RewardDecision = (typeof RewardDecision)[keyof typeof RewardDecision];

export const ReportLinkType = {
  DUPLICATE: 'DUPLICATE',
  RELATED: 'RELATED',
  CHAINED: 'CHAINED',
} as const;
export type ReportLinkType = (typeof ReportLinkType)[keyof typeof ReportLinkType];

export const OrgPlan = {
  FREE: 'FREE',
  STARTER: 'STARTER',
  PRO: 'PRO',
  ENTERPRISE: 'ENTERPRISE',
} as const;
export type OrgPlan = (typeof OrgPlan)[keyof typeof OrgPlan];

export const SlaMetricKey = {
  FIRST_RESPONSE: 'FIRST_RESPONSE',
  TRIAGE_DECISION: 'TRIAGE_DECISION',
  FIX: 'FIX',
} as const;
export type SlaMetricKey = (typeof SlaMetricKey)[keyof typeof SlaMetricKey];
