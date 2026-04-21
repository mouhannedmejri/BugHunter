import type { Severity, ReportStatus, ProgramType, ProgramStatus, AssetType, Report } from "./mock-data";

export type OrgRole = "ORG_ADMIN" | "PROGRAM_MANAGER" | "REVIEWER" | "FINANCE" | "VIEWER";
export type PayoutStatus = "PENDING_APPROVAL" | "APPROVED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
export type DisclosurePolicy = "NEVER" | "COORDINATED" | "PUBLIC";
export type IntegrationType = "JIRA" | "LINEAR" | "GITHUB" | "SLACK";
export type SlaStatus = "OK" | "AT_RISK" | "BREACHED";

export interface OrgMember {
  id: string;
  name: string;
  email: string;
  role: OrgRole;
  avatarUrl?: string;
  joinedAt: string;
  status: "active" | "pending";
}

export interface OrgInvite {
  id: string;
  email: string;
  role: OrgRole;
  createdAt: string;
  expiresAt: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  actor: string;
  target: string;
  timestamp: string;
  details?: string;
}

export interface OrgProgram {
  id: string;
  slug: string;
  title: string;
  type: ProgramType;
  status: ProgramStatus;
  openReports: number;
  totalPaid: number;
  createdAt: string;
}

export interface TriageReport {
  id: string;
  shortId: string;
  title: string;
  programTitle: string;
  programSlug: string;
  severity: Severity;
  status: ReportStatus;
  assignee?: { name: string; avatar?: string };
  submitter: { name: string; username: string; avatar?: string };
  slaFirstResponse: string;
  slaTriage: string;
  slaResolution: string;
  slaStatus: SlaStatus;
  createdAt: string;
  asset?: string;
  vulnCategory?: string;
  cvssScore?: number;
  reward?: number;
}

export interface Reward {
  id: string;
  reportId: string;
  reportTitle: string;
  researcher: string;
  severity: Severity;
  recommendedAmount: number;
  approvedAmount?: number;
  status: PayoutStatus;
  createdAt: string;
}

export interface Integration {
  type: IntegrationType;
  name: string;
  description: string;
  connected: boolean;
  icon: string;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
}

// ── MOCK DATA ────────────────────────────────────────────

export const mockOrgs: Array<{ slug: string; name: string; logo?: string }> = [
  { slug: "acme-corp", name: "Acme Corporation" },
  { slug: "cloudbase", name: "CloudBase Inc." },
];

export const mockOrgMembers: OrgMember[] = [
  { id: "m1", name: "Sarah Chen", email: "sarah@acme.com", role: "ORG_ADMIN", joinedAt: "2025-01-15T00:00:00Z", status: "active" },
  { id: "m2", name: "James Wilson", email: "james@acme.com", role: "PROGRAM_MANAGER", joinedAt: "2025-03-01T00:00:00Z", status: "active" },
  { id: "m3", name: "Priya Patel", email: "priya@acme.com", role: "REVIEWER", joinedAt: "2025-06-10T00:00:00Z", status: "active" },
  { id: "m4", name: "Mike Johnson", email: "mike@acme.com", role: "FINANCE", joinedAt: "2025-08-22T00:00:00Z", status: "active" },
  { id: "m5", name: "Emily Davis", email: "emily@acme.com", role: "VIEWER", joinedAt: "2026-01-05T00:00:00Z", status: "active" },
  { id: "m6", name: "Tom Brown", email: "tom@acme.com", role: "REVIEWER", joinedAt: "2026-04-01T00:00:00Z", status: "pending" },
];

export const mockOrgInvites: OrgInvite[] = [
  { id: "i1", email: "tom@acme.com", role: "REVIEWER", createdAt: "2026-04-01T00:00:00Z", expiresAt: "2026-04-08T00:00:00Z" },
];

export const mockAuditLog: AuditLogItem[] = [
  { id: "al1", action: "report.submitted", actor: "zeroc00l", target: "Stored XSS in profile bio", timestamp: "2026-04-07T08:30:00Z" },
  { id: "al2", action: "report.triaged", actor: "Priya Patel", target: "IDOR on user settings", timestamp: "2026-04-07T07:15:00Z" },
  { id: "al3", action: "reward.approved", actor: "Sarah Chen", target: "SQL injection — $5,000", timestamp: "2026-04-06T16:00:00Z" },
  { id: "al4", action: "member.invited", actor: "Sarah Chen", target: "tom@acme.com", timestamp: "2026-04-06T14:30:00Z" },
  { id: "al5", action: "program.updated", actor: "James Wilson", target: "Acme Corp Bug Bounty", timestamp: "2026-04-06T10:00:00Z" },
  { id: "al6", action: "report.accepted", actor: "Priya Patel", target: "CSRF on password change", timestamp: "2026-04-05T15:45:00Z" },
  { id: "al7", action: "report.submitted", actor: "phantomhax", target: "Rate limiting bypass", timestamp: "2026-04-05T12:20:00Z" },
  { id: "al8", action: "report.duplicate", actor: "James Wilson", target: "Open redirect on callback", timestamp: "2026-04-05T09:00:00Z" },
  { id: "al9", action: "reward.completed", actor: "System", target: "Payout $2,500 to bugslayer99", timestamp: "2026-04-04T18:00:00Z" },
  { id: "al10", action: "program.created", actor: "Sarah Chen", target: "New Security Challenge", timestamp: "2026-04-04T11:30:00Z" },
];

export const mockOrgPrograms: OrgProgram[] = [
  { id: "p1", slug: "acme-bounty", title: "Acme Corp Bug Bounty", type: "PUBLIC", status: "ACTIVE", openReports: 12, totalPaid: 2500000, createdAt: "2025-06-01" },
  { id: "p2", slug: "acme-challenge", title: "Acme Security Challenge", type: "CHALLENGE", status: "ACTIVE", openReports: 5, totalPaid: 800000, createdAt: "2026-02-15" },
  { id: "p3", slug: "acme-private", title: "Acme Private Program", type: "PRIVATE", status: "DRAFT", openReports: 0, totalPaid: 0, createdAt: "2026-04-01" },
];

export const mockTriageReports: TriageReport[] = [
  { id: "tr1", shortId: "BH-1042", title: "Stored XSS in profile bio field allows account takeover", programTitle: "Acme Corp Bug Bounty", programSlug: "acme-bounty", severity: "HIGH", status: "SUBMITTED", submitter: { name: "Zero Cool", username: "zeroc00l" }, slaFirstResponse: "2026-04-08T10:00:00Z", slaTriage: "2026-04-09T10:00:00Z", slaResolution: "2026-04-17T10:00:00Z", slaStatus: "OK", createdAt: "2026-04-07T08:30:00Z", asset: "*.acme.com", vulnCategory: "XSS" },
  { id: "tr2", shortId: "BH-1041", title: "IDOR on user settings endpoint exposes PII", programTitle: "Acme Corp Bug Bounty", programSlug: "acme-bounty", severity: "CRITICAL", status: "TRIAGING", assignee: { name: "Priya Patel" }, submitter: { name: "Phantom", username: "phantomhax" }, slaFirstResponse: "2026-04-06T15:30:00Z", slaTriage: "2026-04-08T15:30:00Z", slaResolution: "2026-04-15T15:30:00Z", slaStatus: "AT_RISK", createdAt: "2026-04-05T15:30:00Z", asset: "api.acme.com/v1/*", vulnCategory: "IDOR" },
  { id: "tr3", shortId: "BH-1040", title: "CSRF on password change allows credential theft", programTitle: "Acme Security Challenge", programSlug: "acme-challenge", severity: "MEDIUM", status: "NEEDS_INFO", assignee: { name: "James Wilson" }, submitter: { name: "Bug Slayer", username: "bugslayer99" }, slaFirstResponse: "2026-04-04T08:15:00Z", slaTriage: "2026-04-06T08:15:00Z", slaResolution: "2026-04-14T08:15:00Z", slaStatus: "BREACHED", createdAt: "2026-04-03T08:15:00Z", asset: "*.acme.com", vulnCategory: "CSRF" },
  { id: "tr4", shortId: "BH-1039", title: "Information disclosure via verbose error messages", programTitle: "Acme Corp Bug Bounty", programSlug: "acme-bounty", severity: "LOW", status: "RECEIVED", submitter: { name: "Cyber Knife", username: "cyberknife" }, slaFirstResponse: "2026-04-09T12:00:00Z", slaTriage: "2026-04-11T12:00:00Z", slaResolution: "2026-04-21T12:00:00Z", slaStatus: "OK", createdAt: "2026-04-06T12:00:00Z", asset: "api.acme.com/v1/*", vulnCategory: "INFO_LEAK" },
  { id: "tr5", shortId: "BH-1038", title: "SQL injection in search parameter leads to data exfiltration", programTitle: "Acme Corp Bug Bounty", programSlug: "acme-bounty", severity: "CRITICAL", status: "ACCEPTED", assignee: { name: "Priya Patel" }, submitter: { name: "SQL Ninja", username: "sqlninja" }, slaFirstResponse: "2026-04-02T09:00:00Z", slaTriage: "2026-04-04T09:00:00Z", slaResolution: "2026-04-12T09:00:00Z", slaStatus: "AT_RISK", createdAt: "2026-04-01T09:00:00Z", asset: "api.acme.com/v1/*", vulnCategory: "SQL_INJECTION", reward: 500000 },
  { id: "tr6", shortId: "BH-1037", title: "Rate limiting bypass on login endpoint", programTitle: "Acme Security Challenge", programSlug: "acme-challenge", severity: "MEDIUM", status: "SUBMITTED", submitter: { name: "Hacker Man", username: "h4ckerm4n" }, slaFirstResponse: "2026-04-08T14:20:00Z", slaTriage: "2026-04-10T14:20:00Z", slaResolution: "2026-04-20T14:20:00Z", slaStatus: "OK", createdAt: "2026-04-06T14:20:00Z", vulnCategory: "RATE_LIMIT" },
  { id: "tr7", shortId: "BH-1036", title: "Privilege escalation via API role manipulation", programTitle: "Acme Corp Bug Bounty", programSlug: "acme-bounty", severity: "CRITICAL", status: "RESOLVED", assignee: { name: "Priya Patel" }, submitter: { name: "RCE Queen", username: "rce_queen" }, slaFirstResponse: "2026-03-30T16:45:00Z", slaTriage: "2026-04-01T16:45:00Z", slaResolution: "2026-04-10T16:45:00Z", slaStatus: "OK", createdAt: "2026-03-29T16:45:00Z", asset: "api.acme.com/v1/*", vulnCategory: "PRIV_ESCALATION", reward: 400000 },
];

export const mockRewards: Reward[] = [
  { id: "rw1", reportId: "tr5", reportTitle: "SQL injection in search parameter", researcher: "sqlninja", severity: "CRITICAL", recommendedAmount: 500000, approvedAmount: 500000, status: "COMPLETED", createdAt: "2026-04-02T00:00:00Z" },
  { id: "rw2", reportId: "tr7", reportTitle: "Privilege escalation via API", researcher: "rce_queen", severity: "CRITICAL", recommendedAmount: 400000, approvedAmount: 400000, status: "PROCESSING", createdAt: "2026-04-05T00:00:00Z" },
  { id: "rw3", reportId: "tr1", reportTitle: "Stored XSS in profile bio field", researcher: "zeroc00l", severity: "HIGH", recommendedAmount: 250000, status: "PENDING_APPROVAL", createdAt: "2026-04-07T00:00:00Z" },
  { id: "rw4", reportId: "tr3", reportTitle: "CSRF on password change", researcher: "bugslayer99", severity: "MEDIUM", recommendedAmount: 80000, approvedAmount: 80000, status: "APPROVED", createdAt: "2026-04-04T00:00:00Z" },
];

export const mockIntegrations: Integration[] = [
  { type: "JIRA", name: "Jira", description: "Sync reports with Jira issues", connected: false, icon: "🔵" },
  { type: "LINEAR", name: "Linear", description: "Push reports to Linear projects", connected: false, icon: "🟣" },
  { type: "GITHUB", name: "GitHub Issues", description: "Create GitHub issues from reports", connected: true, icon: "⚫" },
  { type: "SLACK", name: "Slack", description: "Get notifications in Slack channels", connected: false, icon: "💬" },
];

export const mockWebhooks: Webhook[] = [
  { id: "wh1", url: "https://hooks.acme.com/bughuntr", events: ["report.submitted", "report.resolved"], active: true, createdAt: "2025-08-01T00:00:00Z" },
];

export const mockAnalyticsData = {
  dailyReports: [
    { date: "Apr 1", submitted: 3, accepted: 1, resolved: 0 },
    { date: "Apr 2", submitted: 5, accepted: 2, resolved: 1 },
    { date: "Apr 3", submitted: 2, accepted: 1, resolved: 2 },
    { date: "Apr 4", submitted: 4, accepted: 3, resolved: 1 },
    { date: "Apr 5", submitted: 6, accepted: 2, resolved: 3 },
    { date: "Apr 6", submitted: 3, accepted: 1, resolved: 2 },
    { date: "Apr 7", submitted: 4, accepted: 2, resolved: 1 },
  ],
  categoryDistribution: [
    { name: "XSS", value: 28 },
    { name: "SQL Injection", value: 15 },
    { name: "IDOR", value: 22 },
    { name: "CSRF", value: 12 },
    { name: "Info Leak", value: 18 },
    { name: "Other", value: 5 },
  ],
  topAssets: [
    { asset: "api.acme.com/v1/*", reports: 24 },
    { asset: "*.acme.com", reports: 18 },
    { asset: "com.acme.app", reports: 7 },
    { asset: "vault.datavault.io", reports: 5 },
  ],
  topResearchers: [
    { username: "zeroc00l", accepted: 12, total: 15, rate: 80 },
    { username: "phantomhax", accepted: 8, total: 11, rate: 73 },
    { username: "bugslayer99", accepted: 7, total: 10, rate: 70 },
    { username: "sqlninja", accepted: 6, total: 7, rate: 86 },
    { username: "rce_queen", accepted: 5, total: 8, rate: 63 },
  ],
  slaRecords: [
    { metric: "First Response", target: "24h", breachRate: 8, total: 50, breached: 4 },
    { metric: "Triage", target: "48h", breachRate: 12, total: 50, breached: 6 },
    { metric: "Resolution", target: "10d", breachRate: 6, total: 35, breached: 2 },
  ],
};

export const setMockOrgs = (next: Array<{ slug: string; name: string; logo?: string }>) => {
  mockOrgs.splice(0, mockOrgs.length, ...next);
};

export const setMockOrgMembers = (next: OrgMember[]) => {
  mockOrgMembers.splice(0, mockOrgMembers.length, ...next);
};

export const setMockOrgInvites = (next: OrgInvite[]) => {
  mockOrgInvites.splice(0, mockOrgInvites.length, ...next);
};

export const setMockAuditLog = (next: AuditLogItem[]) => {
  mockAuditLog.splice(0, mockAuditLog.length, ...next);
};

export const setMockOrgPrograms = (next: OrgProgram[]) => {
  mockOrgPrograms.splice(0, mockOrgPrograms.length, ...next);
};

export const setMockTriageReports = (next: TriageReport[]) => {
  mockTriageReports.splice(0, mockTriageReports.length, ...next);
};

export const setMockRewards = (next: Reward[]) => {
  mockRewards.splice(0, mockRewards.length, ...next);
};

export const setMockIntegrations = (next: Integration[]) => {
  mockIntegrations.splice(0, mockIntegrations.length, ...next);
};

export const setMockWebhooks = (next: Webhook[]) => {
  mockWebhooks.splice(0, mockWebhooks.length, ...next);
};

export const setMockAnalyticsData = (next: typeof mockAnalyticsData) => {
  mockAnalyticsData.dailyReports.splice(0, mockAnalyticsData.dailyReports.length, ...next.dailyReports);
  mockAnalyticsData.categoryDistribution.splice(
    0,
    mockAnalyticsData.categoryDistribution.length,
    ...next.categoryDistribution,
  );
  mockAnalyticsData.topAssets.splice(0, mockAnalyticsData.topAssets.length, ...next.topAssets);
  mockAnalyticsData.topResearchers.splice(
    0,
    mockAnalyticsData.topResearchers.length,
    ...next.topResearchers,
  );
  mockAnalyticsData.slaRecords.splice(0, mockAnalyticsData.slaRecords.length, ...next.slaRecords);
};
