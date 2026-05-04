export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";
export type ReportStatus =
  | "DRAFT" | "SUBMITTED" | "RECEIVED" | "NEEDS_INFO" | "TRIAGING"
  | "ACCEPTED" | "DUPLICATE" | "INFORMATIVE" | "NOT_APPLICABLE"
  | "OUT_OF_SCOPE" | "RESOLVED" | "REWARDED" | "CLOSED" | "ESCALATED";
export type ProgramType = "PUBLIC" | "PRIVATE" | "CAMPAIGN" | "CHALLENGE" | "EMERGENCY";
export type ProgramStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED" | "ARCHIVED";
export type AssetType = "DOMAIN" | "SUBDOMAIN" | "IP_RANGE" | "MOBILE_APP" | "API" | "REPOSITORY" | "CLOUD" | "THIRD_PARTY" | "PHYSICAL";
export type VulnerabilityCategory =
  | "XSS" | "SQL_INJECTION" | "CSRF" | "IDOR" | "RCE"
  | "SSRF" | "AUTH_BYPASS" | "PRIVILEGE_ESCALATION" | "INFO_DISCLOSURE"
  | "OPEN_REDIRECT" | "RATE_LIMITING" | "FILE_UPLOAD" | "SUBDOMAIN_TAKEOVER"
  | "BUSINESS_LOGIC" | "CRYPTOGRAPHIC" | "OTHER";
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

  export interface Payout {
    id: string;
    amount: number;
    status: PayoutStatus;
    createdAt: string;
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
export interface Org {
  id: string;
  name: string;
  slug: string;
  plan: "FREE" | "PRO" | "ENTERPRISE";
  programs: number;
  members: number;
  createdAt: string;
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
export interface User {
  id: string;
  username: string;
  email: string;
  platformRole: PlatformRole;
  kycStatus: KycStatus;
  banned: boolean;
  country: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
  scanStatus: "pending" | "clean" | "infected";
}

export interface Comment {
  id: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: "researcher" | "reviewer" | "org_admin";
  body: string;
  createdAt: string;
  isInternal: boolean;
}

export interface StatusHistoryEntry {
  status: ReportStatus;
  changedAt: string;
  changedBy: string;
  note?: string;
}

export interface DetailedReport {
  id: string;
  title: string;
  programTitle: string;
  programSlug: string;
  severity: Severity;
  status: ReportStatus;
  category: VulnerabilityCategory;
  affectedAsset: string;
  affectedAssetType: AssetType;
  reproductionSteps: string;
  impact: string;
  remediation?: string;
  environment: { os: string; browser: string };
  createdAt: string;
  updatedAt: string;
  reward?: number;
  submitter: { username: string; displayName: string; avatarUrl?: string };
  assignedReviewer?: { username: string; displayName: string };
  attachments: Attachment[];
  comments: Comment[];
  statusHistory: StatusHistoryEntry[];
  isOwnReport: boolean;
}
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
  lastLoginAt: string;
}

export interface AdminUserDetails extends User {
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  website: string | null;
  twitterHandle: string | null;
  githubHandle: string | null;
  orgMemberships: Array<{
    orgId: string;
    orgName: string;
    role: OrgRole;
  }>;
  reportsSubmitted: number;
  reportsAccepted: number;
  rewardsEarnedCents: number;
  reputationPoints: number;
  rank: number | null;
  reputationHistory: Array<{ date: string; points: number }>;
  rewardHistory: Array<{ date: string; amountCents: number }>;
  
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

export interface UserStats {
  submitted: number;
  accepted: number;
  rewardsEarnedCents: number;
  reputationPoints: number;
  rank: number | null;
}

export interface UserAnalytics {
  submissions: number;
  accepted: number;
  avgReward: number; 
  rank: number;
  trend: Array<{ day: string; points: number }>;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  website: string | null;
  twitterHandle: string | null;
  githubHandle: string | null;
  country: string | null;
  timezone: string | null;
  platformRole: PlatformRole;
  totpEnabled: boolean;
  emailVerifiedAt: string | null;
  kycStatus: string | null;
  kycVerifiedAt: string | null;
  bannedAt: string | null;
  bannedReason: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface PublicProfile {
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    website: string | null;
    twitterHandle: string | null;
    githubHandle: string | null;
    country: string | null;
    createdAt: string;
  };
  stats: {
    reputation: number;
    rank: number;
    accepted: number;
    programs: number;
  };
  badges: Array<{
    id: string;
    name: string;
    icon: string;
    description: string;
    earnedAt: string;
  }>;
  recentAcceptedReports: Array<{
    id: string;
    title: string;
    severityEstimate: Severity;
    severityValidated: Severity | null;
    status: ReportStatus;
    acceptedAt: string;
    createdAt: string;
    program: {
      slug: string;
      title: string;
    };
  }>;
}