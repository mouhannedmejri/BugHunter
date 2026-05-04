// Mock data and types for the researcher-facing pages

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";
export type ReportStatus =
  | "DRAFT" | "SUBMITTED" | "RECEIVED" | "NEEDS_INFO" | "TRIAGING"
  | "ACCEPTED" | "DUPLICATE" | "INFORMATIVE" | "NOT_APPLICABLE"
  | "OUT_OF_SCOPE" | "RESOLVED" | "REWARDED" | "CLOSED" | "ESCALATED";
export type ProgramType = "PUBLIC" | "PRIVATE" | "CAMPAIGN" | "CHALLENGE" | "EMERGENCY";
export type ProgramStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED" | "ARCHIVED";
export type AssetType = "DOMAIN" | "SUBDOMAIN" | "IP_RANGE" | "MOBILE_APP" | "API" | "REPOSITORY" | "CLOUD" | "THIRD_PARTY" | "PHYSICAL";

export interface Program {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: ProgramType;
  status: ProgramStatus;
  orgName: string;
  orgLogo?: string;
  rewardRange: { min: number; max: number };
  openReports: number;
  totalPaid: number;
  createdAt: string;
  requiresInvite: boolean;
  assets: Asset[];
  rewardTiers: Record<Severity, { min: number; max: number }>;
  eligibility?: string;
  safeHarbor?: string;
  disclosurePolicy?: string;
}

export interface Asset {
  id: string;
  type: AssetType;
  identifier: string;
  description?: string;
  notes?: string;
  inScope: boolean;
}

export interface Report {
  id: string;
  title: string;
  programTitle: string;
  programSlug: string;
  severity: Severity;
  status: ReportStatus;
  createdAt: string;
  reward?: number;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  reputation: number;
  accepted: number;
  totalEarned: number;
  isCurrentUser?: boolean;
}

// ── MOCK DATA ────────────────────────────────────────────

export const mockReports: Report[] = [
  { id: "r1", title: "Stored XSS in profile bio field", programTitle: "Acme Corp", programSlug: "acme-corp", severity: "HIGH", status: "ACCEPTED", createdAt: "2026-04-02T10:00:00Z", reward: 250000 },
  { id: "r2", title: "IDOR on user settings endpoint", programTitle: "CloudBase", programSlug: "cloudbase", severity: "CRITICAL", status: "TRIAGING", createdAt: "2026-04-01T15:30:00Z" },
  { id: "r3", title: "CSRF on password change", programTitle: "ShieldNet", programSlug: "shieldnet", severity: "MEDIUM", status: "RESOLVED", createdAt: "2026-03-28T08:15:00Z", reward: 80000 },
  { id: "r4", title: "Information disclosure via verbose errors", programTitle: "Acme Corp", programSlug: "acme-corp", severity: "LOW", status: "DUPLICATE", createdAt: "2026-03-25T12:00:00Z" },
  { id: "r5", title: "SQL injection in search parameter", programTitle: "DataVault", programSlug: "datavault", severity: "CRITICAL", status: "REWARDED", createdAt: "2026-03-20T09:00:00Z", reward: 500000 },
  { id: "r6", title: "Open redirect on callback URL", programTitle: "CloudBase", programSlug: "cloudbase", severity: "LOW", status: "SUBMITTED", createdAt: "2026-03-18T14:20:00Z" },
  { id: "r7", title: "Rate limiting bypass on login", programTitle: "ShieldNet", programSlug: "shieldnet", severity: "MEDIUM", status: "NEEDS_INFO", createdAt: "2026-03-15T11:00:00Z" },
  { id: "r8", title: "Privilege escalation via API", programTitle: "DataVault", programSlug: "datavault", severity: "CRITICAL", status: "ACCEPTED", createdAt: "2026-03-12T16:45:00Z", reward: 400000 },
  { id: "r9", title: "Insecure direct object reference", programTitle: "Acme Corp", programSlug: "acme-corp", severity: "HIGH", status: "CLOSED", createdAt: "2026-03-10T10:30:00Z", reward: 150000 },
  { id: "r10", title: "Subdomain takeover on staging", programTitle: "CloudBase", programSlug: "cloudbase", severity: "HIGH", status: "RESOLVED", createdAt: "2026-03-05T09:15:00Z", reward: 200000 },
];

export const mockPrograms: Program[] = [
  {
    id: "c7q2k8mnd12w4x5yz0abcde", slug: "acme-corp", title: "Acme Corp Bug Bounty", description: "Acme Corp's public bug bounty program covers all web applications and APIs. We are committed to working with the security community to find vulnerabilities.\n\n## Rules of Engagement\n- Do not access other users' data\n- Do not perform destructive testing\n- Report vulnerabilities promptly\n\n## Rewards\nWe pay competitive bounties based on impact and severity.", type: "PUBLIC", status: "ACTIVE", orgName: "Acme Corporation", rewardRange: { min: 10000, max: 1000000 }, openReports: 12, totalPaid: 2500000, createdAt: "2025-06-01T00:00:00Z", requiresInvite: false,
    rewardTiers: { CRITICAL: { min: 500000, max: 1000000 }, HIGH: { min: 200000, max: 500000 }, MEDIUM: { min: 50000, max: 200000 }, LOW: { min: 10000, max: 50000 }, INFORMATIONAL: { min: 0, max: 0 } },
    eligibility: "Open to all researchers worldwide. Must have a verified account.",
    safeHarbor: "We will not pursue legal action against researchers who follow our rules.",
    disclosurePolicy: "Coordinated disclosure after fix is deployed. 90-day disclosure window.",
    assets: [
      { id: "c7q2k8mnd12w4x5yz0a1", type: "DOMAIN", identifier: "*.acme.com", description: "All Acme web properties", inScope: true },
      { id: "c7q2k8mnd12w4x5yz0a2", type: "API", identifier: "api.acme.com/v1/*", description: "Public REST API", inScope: true },
      { id: "c7q2k8mnd12w4x5yz0a3", type: "MOBILE_APP", identifier: "com.acme.app (iOS/Android)", description: "Mobile application", inScope: true },
      { id: "c7q2k8mnd12w4x5yz0a4", type: "DOMAIN", identifier: "blog.acme.com", description: "Marketing blog (WordPress)", notes: "Third-party hosted", inScope: false },
    ],
  },
  {
    id: "c7q2k8mnd12w4x5yz0b", slug: "cloudbase", title: "CloudBase Security Challenge", description: "Short-term challenge focused on our new cloud infrastructure. Extra bonuses for critical findings in the first 48 hours.", type: "CHALLENGE", status: "ACTIVE", orgName: "CloudBase Inc.", rewardRange: { min: 20000, max: 2000000 }, openReports: 5, totalPaid: 800000, createdAt: "2026-02-15T00:00:00Z", requiresInvite: false,
    rewardTiers: { CRITICAL: { min: 1000000, max: 2000000 }, HIGH: { min: 300000, max: 1000000 }, MEDIUM: { min: 100000, max: 300000 }, LOW: { min: 20000, max: 100000 }, INFORMATIONAL: { min: 0, max: 0 } },
    assets: [
      { id: "c7q2k8mnd12w4x5yz0b1", type: "CLOUD", identifier: "*.cloudbase.io", description: "Cloud platform", inScope: true },
      { id: "c7q2k8mnd12w4x5yz0b2", type: "API", identifier: "api.cloudbase.io", description: "REST & GraphQL APIs", inScope: true },
    ],
  },
  {
    id: "c7q2k8mnd12w4x5yz0c", slug: "shieldnet", title: "ShieldNet Private Program", description: "Invite-only program for our network security products. Selected researchers get early access to new features.", type: "PRIVATE", status: "ACTIVE", orgName: "ShieldNet Security", rewardRange: { min: 15000, max: 750000 }, openReports: 3, totalPaid: 1200000, createdAt: "2025-11-01T00:00:00Z", requiresInvite: true,
    rewardTiers: { CRITICAL: { min: 400000, max: 750000 }, HIGH: { min: 150000, max: 400000 }, MEDIUM: { min: 50000, max: 150000 }, LOW: { min: 15000, max: 50000 }, INFORMATIONAL: { min: 0, max: 0 } },
    assets: [
      { id: "c7q2k8mnd12w4x5yz0c1", type: "DOMAIN", identifier: "app.shieldnet.com", description: "Main application", inScope: true },
      { id: "c7q2k8mnd12w4x5yz0c2", type: "IP_RANGE", identifier: "10.0.0.0/24", description: "Internal testing range", inScope: true },
    ],
  },
  {
    id: "c7q2k8mnd12w4x5yz0d", slug: "datavault", title: "DataVault Campaign", description: "Focused campaign on our data encryption and storage services. We're looking for crypto-related vulnerabilities.", type: "CAMPAIGN", status: "ACTIVE", orgName: "DataVault Systems", rewardRange: { min: 25000, max: 1500000 }, openReports: 8, totalPaid: 3000000, createdAt: "2026-01-10T00:00:00Z", requiresInvite: false,
    rewardTiers: { CRITICAL: { min: 750000, max: 1500000 }, HIGH: { min: 250000, max: 750000 }, MEDIUM: { min: 75000, max: 250000 }, LOW: { min: 25000, max: 75000 }, INFORMATIONAL: { min: 0, max: 0 } },
    assets: [
      { id: "c7q2k8mnd12w4x5yz0d1", type: "DOMAIN", identifier: "vault.datavault.io", description: "Vault web app", inScope: true },
      { id: "c7q2k8mnd12w4x5yz0d2", type: "API", identifier: "api.datavault.io/v2/*", description: "Encryption API", inScope: true },
      { id: "c7q2k8mnd12w4x5yz0d3", type: "REPOSITORY", identifier: "github.com/datavault/sdk", description: "Open-source SDK", inScope: true },
    ],
  },
  {
    id: "c7q2k8mnd12w4x5yz0e", slug: "fintech-secure", title: "FinTech Secure Bounty", description: "Our financial technology platform handles millions of transactions. Help us keep our customers safe.", type: "PUBLIC", status: "PAUSED", orgName: "FinTech Global", rewardRange: { min: 50000, max: 2500000 }, openReports: 0, totalPaid: 5000000, createdAt: "2025-03-01T00:00:00Z", requiresInvite: false,
    rewardTiers: { CRITICAL: { min: 1500000, max: 2500000 }, HIGH: { min: 500000, max: 1500000 }, MEDIUM: { min: 150000, max: 500000 }, LOW: { min: 50000, max: 150000 }, INFORMATIONAL: { min: 0, max: 0 } },
    assets: [],
  },
];

export const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, username: "zeroc00l", displayName: "Zero Cool", reputation: 15420, accepted: 87, totalEarned: 12500000 },
  { rank: 2, username: "phantomhax", displayName: "Phantom", reputation: 12800, accepted: 64, totalEarned: 9800000 },
  { rank: 3, username: "bugslayer99", displayName: "Bug Slayer", reputation: 11200, accepted: 58, totalEarned: 8700000 },
  { rank: 4, username: "cyberknife", displayName: "Cyber Knife", reputation: 9850, accepted: 45, totalEarned: 7200000 },
  { rank: 5, username: "h4ckerm4n", displayName: "Hacker Man", reputation: 8900, accepted: 42, totalEarned: 6500000, isCurrentUser: true },
  { rank: 6, username: "xsshunter", displayName: "XSS Hunter", reputation: 7650, accepted: 38, totalEarned: 5100000 },
  { rank: 7, username: "sqlninja", displayName: "SQL Ninja", reputation: 6800, accepted: 33, totalEarned: 4200000 },
  { rank: 8, username: "pentest_pro", displayName: "PenTest Pro", reputation: 5950, accepted: 29, totalEarned: 3800000 },
  { rank: 9, username: "rce_queen", displayName: "RCE Queen", reputation: 5200, accepted: 25, totalEarned: 3200000 },
  { rank: 10, username: "deepscan", displayName: "Deep Scan", reputation: 4800, accepted: 22, totalEarned: 2900000 },
];

export const mockReputationTrend = [
  { day: "Mar 6", points: 4200 },
  { day: "Mar 8", points: 4350 },
  { day: "Mar 10", points: 4500 },
  { day: "Mar 12", points: 4900 },
  { day: "Mar 15", points: 5100 },
  { day: "Mar 18", points: 5100 },
  { day: "Mar 20", points: 5600 },
  { day: "Mar 22", points: 5800 },
  { day: "Mar 25", points: 6100 },
  { day: "Mar 28", points: 6500 },
  { day: "Apr 1", points: 7200 },
  { day: "Apr 3", points: 8200 },
  { day: "Apr 5", points: 8900 },
];

export const setMockReports = (next: Report[]) => {
  mockReports.splice(0, mockReports.length, ...next);
};

export const setMockPrograms = (next: Program[]) => {
  mockPrograms.splice(0, mockPrograms.length, ...next);
};

export const setMockLeaderboard = (next: LeaderboardEntry[]) => {
  mockLeaderboard.splice(0, mockLeaderboard.length, ...next);
};

export const setMockReputationTrend = (next: Array<{ day: string; points: number }>) => {
  mockReputationTrend.splice(0, mockReputationTrend.length, ...next);
};

export const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
};

export const formatCompactCurrency = (cents: number): string => {
  const dollars = cents / 100;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(dollars >= 10000 ? 0 : 1)}k`;
  return `$${dollars}`;
};
