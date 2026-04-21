import type { Severity, ReportStatus, AssetType } from "./mock-data";

export type VulnerabilityCategory =
  | "XSS" | "SQL_INJECTION" | "CSRF" | "IDOR" | "RCE"
  | "SSRF" | "AUTH_BYPASS" | "PRIVILEGE_ESCALATION" | "INFO_DISCLOSURE"
  | "OPEN_REDIRECT" | "RATE_LIMITING" | "FILE_UPLOAD" | "SUBDOMAIN_TAKEOVER"
  | "BUSINESS_LOGIC" | "CRYPTOGRAPHIC" | "OTHER";

export const vulnerabilityCategories: { value: VulnerabilityCategory; label: string; icon: string }[] = [
  { value: "XSS", label: "Cross-Site Scripting (XSS)", icon: "🔴" },
  { value: "SQL_INJECTION", label: "SQL Injection", icon: "💉" },
  { value: "CSRF", label: "Cross-Site Request Forgery", icon: "🔄" },
  { value: "IDOR", label: "Insecure Direct Object Reference", icon: "🔑" },
  { value: "RCE", label: "Remote Code Execution", icon: "💻" },
  { value: "SSRF", label: "Server-Side Request Forgery", icon: "🌐" },
  { value: "AUTH_BYPASS", label: "Authentication Bypass", icon: "🚪" },
  { value: "PRIVILEGE_ESCALATION", label: "Privilege Escalation", icon: "⬆️" },
  { value: "INFO_DISCLOSURE", label: "Information Disclosure", icon: "📄" },
  { value: "OPEN_REDIRECT", label: "Open Redirect", icon: "↗️" },
  { value: "RATE_LIMITING", label: "Rate Limiting Bypass", icon: "⏱️" },
  { value: "FILE_UPLOAD", label: "File Upload Vulnerability", icon: "📎" },
  { value: "SUBDOMAIN_TAKEOVER", label: "Subdomain Takeover", icon: "🏴" },
  { value: "BUSINESS_LOGIC", label: "Business Logic Flaw", icon: "🧩" },
  { value: "CRYPTOGRAPHIC", label: "Cryptographic Issue", icon: "🔐" },
  { value: "OTHER", label: "Other", icon: "❓" },
];

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

export const mockDetailedReport: DetailedReport = {
  id: "r1",
  title: "Stored XSS in profile bio field",
  programTitle: "Acme Corp Bug Bounty",
  programSlug: "acme-corp",
  severity: "HIGH",
  status: "ACCEPTED",
  category: "XSS",
  affectedAsset: "*.acme.com",
  affectedAssetType: "DOMAIN",
  reproductionSteps: `## Steps to Reproduce

1. Navigate to **Settings > Profile**
2. In the "Bio" field, enter the following payload:
   \`<script>alert(document.cookie)</script>\`
3. Click **Save Profile**
4. Visit the public profile page at \`/users/{username}\`
5. The script executes in the context of any visitor's session

### Proof of Concept
The XSS fires on every page load of the affected profile. This can be weaponized to steal session tokens.`,
  impact: `## Impact

- **Session hijacking**: Attacker can steal session cookies of any user viewing the profile
- **Account takeover**: Combined with the session token, full account takeover is possible
- **Worm potential**: A self-replicating XSS worm could spread across all user profiles
- Affects all authenticated users who visit the compromised profile`,
  remediation: `## Suggested Fix

1. Sanitize all user input using a library like DOMPurify before rendering
2. Implement Content Security Policy (CSP) headers
3. Use \`httpOnly\` flag on session cookies to prevent JS access`,
  environment: { os: "macOS 14.2", browser: "Chrome 122.0.6261.94" },
  createdAt: "2026-04-02T10:00:00Z",
  updatedAt: "2026-04-04T16:30:00Z",
  reward: 250000,
  submitter: { username: "h4ckerm4n", displayName: "Hacker Man" },
  assignedReviewer: { username: "securitylead", displayName: "Sarah Chen" },
  attachments: [
    { id: "att1", name: "xss-poc-screenshot.png", size: 245000, type: "image/png", url: "#", uploadedAt: "2026-04-02T10:05:00Z", scanStatus: "clean" },
    { id: "att2", name: "burp-request.har", size: 18200, type: "application/json", url: "#", uploadedAt: "2026-04-02T10:06:00Z", scanStatus: "clean" },
    { id: "att3", name: "video-demo.mp4", size: 5400000, type: "video/mp4", url: "#", uploadedAt: "2026-04-02T10:07:00Z", scanStatus: "pending" },
  ],
  comments: [
    { id: "c1", authorName: "h4ckerm4n", authorRole: "researcher", body: "I've attached a video demonstrating the full exploitation chain. Let me know if you need any additional details.", createdAt: "2026-04-02T10:10:00Z", isInternal: false },
    { id: "c2", authorName: "Sarah Chen", authorRole: "reviewer", body: "Thanks for the detailed report. We've reproduced the issue and are working on a fix. Marking as **accepted**.", createdAt: "2026-04-03T09:00:00Z", isInternal: false },
    { id: "c3", authorName: "Sarah Chen", authorRole: "reviewer", body: "Internal note: This affects the same rendering pipeline as RPT-2024-089. We should fix both together.", createdAt: "2026-04-03T09:05:00Z", isInternal: true },
    { id: "c4", authorName: "h4ckerm4n", authorRole: "researcher", body: "Great, happy to help test the fix once it's deployed.", createdAt: "2026-04-03T14:00:00Z", isInternal: false },
  ],
  statusHistory: [
    { status: "DRAFT", changedAt: "2026-04-02T09:50:00Z", changedBy: "h4ckerm4n" },
    { status: "SUBMITTED", changedAt: "2026-04-02T10:00:00Z", changedBy: "h4ckerm4n" },
    { status: "RECEIVED", changedAt: "2026-04-02T10:01:00Z", changedBy: "System", note: "Auto-acknowledged" },
    { status: "TRIAGING", changedAt: "2026-04-02T14:00:00Z", changedBy: "Sarah Chen" },
    { status: "ACCEPTED", changedAt: "2026-04-03T09:00:00Z", changedBy: "Sarah Chen", note: "Confirmed and reproduced" },
  ],
  isOwnReport: true,
};

export const setMockDetailedReport = (next: DetailedReport) => {
  Object.assign(mockDetailedReport, {
    ...next,
    attachments: mockDetailedReport.attachments,
    comments: mockDetailedReport.comments,
    statusHistory: mockDetailedReport.statusHistory,
  });
  mockDetailedReport.attachments.splice(
    0,
    mockDetailedReport.attachments.length,
    ...next.attachments,
  );
  mockDetailedReport.comments.splice(
    0,
    mockDetailedReport.comments.length,
    ...next.comments,
  );
  mockDetailedReport.statusHistory.splice(
    0,
    mockDetailedReport.statusHistory.length,
    ...next.statusHistory,
  );
};

// Report submission form store type
export interface ReportDraft {
  programSlug: string;
  title: string;
  category: VulnerabilityCategory | "";
  severity: Severity | "";
  affectedAssetId: string;
  reproductionSteps: string;
  impact: string;
  remediation: string;
  environmentOs: string;
  environmentBrowser: string;
  attachments: { id: string; name: string; size: number; type: string; progress: number; scanStatus: "pending" | "clean" }[];
}

export const emptyDraft: ReportDraft = {
  programSlug: "",
  title: "",
  category: "",
  severity: "",
  affectedAssetId: "",
  reproductionSteps: "",
  impact: "",
  remediation: "",
  environmentOs: "",
  environmentBrowser: "",
  attachments: [],
};
