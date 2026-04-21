import type { Severity, ReportStatus, ProgramType, ProgramStatus } from "./mock-data";

export type PlatformRole = "SUPER_ADMIN" | "SUPPORT" | "FINANCE_ADMIN" | "RESEARCHER" | "ORG_MEMBER";
export type KycStatus = "NOT_STARTED" | "PENDING" | "VERIFIED" | "REJECTED";

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  platformRole: PlatformRole;
  kycStatus: KycStatus;
  banned: boolean;
  country: string;
  joinedAt: string;
  lastLogin: string;
}

export interface AdminOrg {
  id: string;
  name: string;
  slug: string;
  plan: "FREE" | "PRO" | "ENTERPRISE";
  programs: number;
  members: number;
  createdAt: string;
  suspended: boolean;
}

export interface AdminProgram {
  id: string;
  title: string;
  orgName: string;
  type: ProgramType;
  status: ProgramStatus;
  openReports: number;
  createdAt: string;
}

export interface AdminAuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  ip: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export interface QueueInfo {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  paused: boolean;
}

export interface FeatureFlag {
  key: string;
  description: string;
  enabled: boolean;
  value?: string;
}

export interface SystemMetric {
  label: string;
  value: string;
  status: "ok" | "warning" | "critical";
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: "ALL" | "RESEARCHERS" | "ORGS";
  createdAt: string;
  status: "SENT" | "SCHEDULED" | "DRAFT";
}

// ── MOCK DATA ────────────────────────────────────────────

export const mockAdminUsers: AdminUser[] = [
  { id: "u1", username: "zeroc00l", email: "zero@cool.io", platformRole: "RESEARCHER", kycStatus: "VERIFIED", banned: false, country: "US", joinedAt: "2025-03-15T00:00:00Z", lastLogin: "2026-04-07T14:30:00Z" },
  { id: "u2", username: "phantomhax", email: "phantom@hax.dev", platformRole: "RESEARCHER", kycStatus: "VERIFIED", banned: false, country: "DE", joinedAt: "2025-05-20T00:00:00Z", lastLogin: "2026-04-07T10:15:00Z" },
  { id: "u3", username: "bugslayer99", email: "slayer@bugs.net", platformRole: "RESEARCHER", kycStatus: "PENDING", banned: false, country: "IN", joinedAt: "2025-08-10T00:00:00Z", lastLogin: "2026-04-06T18:00:00Z" },
  { id: "u4", username: "sarah_admin", email: "sarah@acme.com", platformRole: "ORG_MEMBER", kycStatus: "NOT_STARTED", banned: false, country: "US", joinedAt: "2025-01-15T00:00:00Z", lastLogin: "2026-04-07T09:00:00Z" },
  { id: "u5", username: "sqlninja", email: "ninja@sql.io", platformRole: "RESEARCHER", kycStatus: "VERIFIED", banned: false, country: "JP", joinedAt: "2025-11-01T00:00:00Z", lastLogin: "2026-04-05T22:00:00Z" },
  { id: "u6", username: "badactor", email: "bad@actor.xyz", platformRole: "RESEARCHER", kycStatus: "REJECTED", banned: true, country: "RU", joinedAt: "2026-01-20T00:00:00Z", lastLogin: "2026-02-15T08:00:00Z" },
  { id: "u7", username: "rce_queen", email: "queen@rce.io", platformRole: "RESEARCHER", kycStatus: "VERIFIED", banned: false, country: "BR", joinedAt: "2025-09-05T00:00:00Z", lastLogin: "2026-04-07T16:45:00Z" },
  { id: "u8", username: "platform_sa", email: "sa@bughuntr.io", platformRole: "SUPER_ADMIN", kycStatus: "VERIFIED", banned: false, country: "US", joinedAt: "2024-01-01T00:00:00Z", lastLogin: "2026-04-08T08:00:00Z" },
  { id: "u9", username: "support_agent", email: "support@bughuntr.io", platformRole: "SUPPORT", kycStatus: "VERIFIED", banned: false, country: "US", joinedAt: "2025-06-01T00:00:00Z", lastLogin: "2026-04-08T07:30:00Z" },
  { id: "u10", username: "cyberknife", email: "knife@cyber.co", platformRole: "RESEARCHER", kycStatus: "NOT_STARTED", banned: false, country: "UK", joinedAt: "2026-03-01T00:00:00Z", lastLogin: "2026-04-06T12:00:00Z" },
];

export const mockAdminOrgs: AdminOrg[] = [
  { id: "o1", name: "Acme Corporation", slug: "acme-corp", plan: "ENTERPRISE", programs: 3, members: 6, createdAt: "2025-01-10T00:00:00Z", suspended: false },
  { id: "o2", name: "CloudBase Inc.", slug: "cloudbase", plan: "PRO", programs: 2, members: 4, createdAt: "2025-04-15T00:00:00Z", suspended: false },
  { id: "o3", name: "SecureApp Ltd.", slug: "secureapp", plan: "FREE", programs: 1, members: 2, createdAt: "2025-09-20T00:00:00Z", suspended: false },
  { id: "o4", name: "DataVault Corp.", slug: "datavault", plan: "PRO", programs: 2, members: 5, createdAt: "2025-07-01T00:00:00Z", suspended: false },
  { id: "o5", name: "ShadowTech", slug: "shadowtech", plan: "FREE", programs: 0, members: 1, createdAt: "2026-03-10T00:00:00Z", suspended: true },
];

export const mockAdminPrograms: AdminProgram[] = [
  { id: "ap1", title: "Acme Corp Bug Bounty", orgName: "Acme Corporation", type: "PUBLIC", status: "ACTIVE", openReports: 12, createdAt: "2025-06-01" },
  { id: "ap2", title: "Acme Security Challenge", orgName: "Acme Corporation", type: "CHALLENGE", status: "ACTIVE", openReports: 5, createdAt: "2026-02-15" },
  { id: "ap3", title: "CloudBase VDP", orgName: "CloudBase Inc.", type: "PUBLIC", status: "ACTIVE", openReports: 8, createdAt: "2025-05-20" },
  { id: "ap4", title: "DataVault Private", orgName: "DataVault Corp.", type: "PRIVATE", status: "PAUSED", openReports: 0, createdAt: "2025-10-01" },
  { id: "ap5", title: "SecureApp Bounty", orgName: "SecureApp Ltd.", type: "PUBLIC", status: "DRAFT", openReports: 0, createdAt: "2026-01-15" },
];

export const mockAdminAuditLogs: AdminAuditLog[] = [
  { id: "al1", timestamp: "2026-04-08T08:30:00Z", actor: "platform_sa", action: "user.ban", entityType: "User", entityId: "u6", ip: "203.0.113.10", before: { banned: false }, after: { banned: true } },
  { id: "al2", timestamp: "2026-04-08T07:15:00Z", actor: "support_agent", action: "user.role_change", entityType: "User", entityId: "u4", ip: "198.51.100.5", before: { role: "RESEARCHER" }, after: { role: "ORG_MEMBER" } },
  { id: "al3", timestamp: "2026-04-07T16:00:00Z", actor: "platform_sa", action: "org.plan_change", entityType: "Organization", entityId: "o2", ip: "203.0.113.10", before: { plan: "FREE" }, after: { plan: "PRO" } },
  { id: "al4", timestamp: "2026-04-07T14:30:00Z", actor: "system", action: "payout.completed", entityType: "Payout", entityId: "rw1", ip: "—" },
  { id: "al5", timestamp: "2026-04-07T10:00:00Z", actor: "platform_sa", action: "program.force_close", entityType: "Program", entityId: "ap4", ip: "203.0.113.10", before: { status: "ACTIVE" }, after: { status: "PAUSED" } },
  { id: "al6", timestamp: "2026-04-06T15:45:00Z", actor: "support_agent", action: "user.unban", entityType: "User", entityId: "u10", ip: "198.51.100.5", before: { banned: true }, after: { banned: false } },
  { id: "al7", timestamp: "2026-04-06T12:20:00Z", actor: "system", action: "flag.toggled", entityType: "FeatureFlag", entityId: "new_dashboard", ip: "—" },
  { id: "al8", timestamp: "2026-04-06T09:00:00Z", actor: "platform_sa", action: "org.suspended", entityType: "Organization", entityId: "o5", ip: "203.0.113.10", before: { suspended: false }, after: { suspended: true } },
  { id: "al9", timestamp: "2026-04-05T18:00:00Z", actor: "system", action: "announcement.sent", entityType: "Announcement", entityId: "ann1", ip: "—" },
  { id: "al10", timestamp: "2026-04-05T11:30:00Z", actor: "support_agent", action: "report.escalated", entityType: "Report", entityId: "tr2", ip: "198.51.100.5" },
];

export const mockQueues: QueueInfo[] = [
  { name: "email-notifications", waiting: 12, active: 3, completed: 4582, failed: 7, paused: false },
  { name: "payout-processing", waiting: 5, active: 1, completed: 892, failed: 2, paused: false },
  { name: "report-scanning", waiting: 0, active: 0, completed: 1247, failed: 0, paused: false },
  { name: "webhook-delivery", waiting: 8, active: 2, completed: 3201, failed: 15, paused: false },
  { name: "pdf-generation", waiting: 1, active: 0, completed: 567, failed: 3, paused: true },
];

export const mockFeatureFlags: FeatureFlag[] = [
  { key: "new_dashboard", description: "Enable new researcher dashboard layout", enabled: true },
  { key: "ai_triage", description: "AI-assisted vulnerability triage suggestions", enabled: false },
  { key: "bulk_payouts", description: "Allow bulk payout processing", enabled: true },
  { key: "sso_login", description: "SSO/SAML login for enterprise orgs", enabled: false, value: "" },
  { key: "rate_limit_v2", description: "New rate limiting algorithm", enabled: true, value: "100/min" },
  { key: "dark_mode", description: "Dark mode toggle in user settings", enabled: true },
  { key: "advanced_analytics", description: "Advanced analytics for org dashboards", enabled: false },
  { key: "auto_assign", description: "Auto-assign reports to reviewers", enabled: false },
];

export const mockSystemMetrics: SystemMetric[] = [
  { label: "DB Connections", value: "42/100", status: "ok" },
  { label: "Query Count (1h)", value: "12,847", status: "ok" },
  { label: "Slow Queries (>1s)", value: "3", status: "warning" },
  { label: "Redis Memory", value: "256MB/1GB", status: "ok" },
  { label: "Redis Hit Rate", value: "98.2%", status: "ok" },
  { label: "API Latency (p99)", value: "420ms", status: "ok" },
  { label: "Error Rate (1h)", value: "0.12%", status: "ok" },
  { label: "Uptime", value: "99.98%", status: "ok" },
];

export const mockAnnouncements: Announcement[] = [
  { id: "ann1", title: "Platform Maintenance Window", body: "Scheduled maintenance on April 12, 2026 from 02:00-04:00 UTC.", audience: "ALL", createdAt: "2026-04-05T18:00:00Z", status: "SENT" },
  { id: "ann2", title: "New Payout Options Available", body: "We now support PayPal and crypto payouts for researchers.", audience: "RESEARCHERS", createdAt: "2026-04-03T10:00:00Z", status: "SENT" },
  { id: "ann3", title: "Updated Disclosure Policy", body: "Please review the updated coordinated disclosure policy.", audience: "ORGS", createdAt: "2026-04-01T14:00:00Z", status: "DRAFT" },
];

export const mockRegistrationTrend = [
  { date: "Mar 10", users: 12 }, { date: "Mar 13", users: 8 }, { date: "Mar 16", users: 15 },
  { date: "Mar 19", users: 10 }, { date: "Mar 22", users: 18 }, { date: "Mar 25", users: 14 },
  { date: "Mar 28", users: 22 }, { date: "Mar 31", users: 16 }, { date: "Apr 3", users: 20 },
  { date: "Apr 6", users: 25 },
];

export const mockReportVolumeTrend = [
  { date: "Mar 10", reports: 5 }, { date: "Mar 13", reports: 8 }, { date: "Mar 16", reports: 6 },
  { date: "Mar 19", reports: 12 }, { date: "Mar 22", reports: 9 }, { date: "Mar 25", reports: 15 },
  { date: "Mar 28", reports: 11 }, { date: "Mar 31", reports: 14 }, { date: "Apr 3", reports: 18 },
  { date: "Apr 6", reports: 10 },
];

export const mockErrorLogs = [
  { time: "2026-04-08 08:12:33", level: "ERROR", message: "Payout webhook timeout: gateway did not respond within 30s" },
  { time: "2026-04-08 07:45:11", level: "ERROR", message: "Failed to send email notification: SMTP connection refused" },
  { time: "2026-04-07 22:18:05", level: "ERROR", message: "Rate limit exceeded for IP 198.51.100.42 on /api/reports" },
  { time: "2026-04-07 19:30:22", level: "WARN", message: "Slow query detected: SELECT * FROM reports WHERE... took 2.3s" },
  { time: "2026-04-07 16:05:44", level: "ERROR", message: "S3 upload failed: bucket quota exceeded for org o3" },
];

export const setMockAdminUsers = (next: AdminUser[]) => {
  mockAdminUsers.splice(0, mockAdminUsers.length, ...next);
};

export const setMockAdminOrgs = (next: AdminOrg[]) => {
  mockAdminOrgs.splice(0, mockAdminOrgs.length, ...next);
};

export const setMockAdminPrograms = (next: AdminProgram[]) => {
  mockAdminPrograms.splice(0, mockAdminPrograms.length, ...next);
};

export const setMockAdminAuditLogs = (next: AdminAuditLog[]) => {
  mockAdminAuditLogs.splice(0, mockAdminAuditLogs.length, ...next);
};

export const setMockQueues = (next: QueueInfo[]) => {
  mockQueues.splice(0, mockQueues.length, ...next);
};

export const setMockFeatureFlags = (next: FeatureFlag[]) => {
  mockFeatureFlags.splice(0, mockFeatureFlags.length, ...next);
};

export const setMockSystemMetrics = (next: SystemMetric[]) => {
  mockSystemMetrics.splice(0, mockSystemMetrics.length, ...next);
};

export const setMockAnnouncements = (next: Announcement[]) => {
  mockAnnouncements.splice(0, mockAnnouncements.length, ...next);
};

export const setMockRegistrationTrend = (next: Array<{ date: string; users: number }>) => {
  mockRegistrationTrend.splice(0, mockRegistrationTrend.length, ...next);
};

export const setMockReportVolumeTrend = (next: Array<{ date: string; reports: number }>) => {
  mockReportVolumeTrend.splice(0, mockReportVolumeTrend.length, ...next);
};

export const setMockErrorLogs = (next: Array<{ time: string; level: string; message: string }>) => {
  mockErrorLogs.splice(0, mockErrorLogs.length, ...next);
};
