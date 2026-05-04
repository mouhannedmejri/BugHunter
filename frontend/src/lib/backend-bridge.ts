import { api, apiPaths } from "@/lib/api";
import {
  mockPrograms,
  setMockLeaderboard,
  setMockPrograms,
  setMockReports,
  setMockReputationTrend,
  type Program,
  type Report,
  type Severity,
} from "@/lib/mock-data";
import {
  setMockAdminAuditLogs,
  setMockAdminOrgs,
  setMockAdminPrograms,
  setMockAdminUsers,
  setMockErrorLogs,
  setMockFeatureFlags,
  setMockQueues,
  setMockSystemMetrics,
} from "@/lib/admin-mock-data";
import {
  setMockAnalyticsData,
  setMockAuditLog,
  setMockOrgMembers,
  setMockOrgInvites,
  setMockOrgPrograms,
  setMockOrgs,
  setMockRewards,
  setMockTriageReports,
  setMockWebhooks,
} from "@/lib/org-mock-data";
import { mockDetailedReport, setMockDetailedReport } from "@/lib/report-mock-data";

type Dict = Record<string, unknown>;

const rewardTiersDefault: Program["rewardTiers"] = {
  CRITICAL: { min: 0, max: 0 },
  HIGH: { min: 0, max: 0 },
  MEDIUM: { min: 0, max: 0 },
  LOW: { min: 0, max: 0 },
  INFORMATIONAL: { min: 0, max: 0 },
};

const mapRewardTiers = (input: unknown): Program["rewardTiers"] => {
  const source = input && typeof input === "object" ? (input as Dict) : {};
  const readTier = (severity: keyof Program["rewardTiers"]) => {
    const tier = source[severity];
    const record = tier && typeof tier === "object" ? (tier as Dict) : {};
    return {
      min: Number(record.min ?? 0),
      max: Number(record.max ?? 0),
    };
  };

  return {
    CRITICAL: readTier("CRITICAL"),
    HIGH: readTier("HIGH"),
    MEDIUM: readTier("MEDIUM"),
    LOW: readTier("LOW"),
    INFORMATIONAL: readTier("INFORMATIONAL"),
  };
};

const safeGet = async <T>(path: string): Promise<T | null> => {
  try {
    return await api.get<T>(path);
  } catch {
    return null;
  }
};

const parseOrgSlug = (pathname: string): string | null => {
  const match = pathname.match(/^\/org\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

const parseProgramSlug = (pathname: string): string | null => {
  const match = pathname.match(/^\/programs\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

const parseReportId = (pathname: string): string | null => {
  const match = pathname.match(/^\/reports\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

/** Maps a program row from `/programs` or program detail into researcher `Program` UI shape. */
export const mapProgram = (p: Dict): Program => {
  const rewardTiers = mapRewardTiers(p.rewardPolicy);
  const maxFromTiers = Math.max(...Object.values(rewardTiers).map((tier) => tier.max), 0);
  const minFromTiers = Math.min(...Object.values(rewardTiers).map((tier) => tier.min).filter((v) => v > 0), 0);
  const maxReward = Number(p.maxRewardUsd ?? maxFromTiers);
  const totalPaid = Number(p.totalPaidUsd ?? 0);
  const org = (p.org as Dict | undefined) ?? {};

  return {
    id: String(p.id ?? ""),
    slug: String(p.slug ?? ""),
    title: String(p.title ?? "Untitled Program"),
    description: String(p.description ?? ""),
    type: (String(p.type ?? "PUBLIC") as Program["type"]),
    status: (String(p.status ?? "DRAFT") as Program["status"]),
    orgName: String(org.name ?? "Unknown Org"),
    orgLogo: typeof org.logoUrl === "string" ? org.logoUrl : undefined,
    rewardRange: { min: minFromTiers, max: maxReward },
    openReports: Number(p.openReports ?? 0),
    totalPaid,
    createdAt: String(p.createdAt ?? new Date().toISOString()),
    requiresInvite: Boolean(p.requiresInvite),
    assets: Array.isArray(p.assets)
      ? (p.assets as Dict[]).map((a) => ({
          id: String(a.id ?? ""),
          type: String(a.type ?? "DOMAIN") as Program["assets"][number]["type"],
          identifier: String(a.identifier ?? ""),
          description: typeof a.description === "string" ? a.description : undefined,
          notes: typeof a.notes === "string" ? a.notes : undefined,
          inScope: Boolean(a.inScope),
        }))
      : [],
    rewardTiers,
    eligibility: typeof p.eligibilityRules === "string" ? p.eligibilityRules : undefined,
    safeHarbor:
      typeof (p.policy as Dict | undefined)?.safeHarbor === "string"
        ? String((p.policy as Dict).safeHarbor)
        : undefined,
    disclosurePolicy:
      typeof (p.policy as Dict | undefined)?.disclosurePolicy === "string"
        ? String((p.policy as Dict).disclosurePolicy)
        : undefined,
  };
};

const mapReport = (r: Dict): Report => {
  const program = (r.program as Dict | undefined) ?? {};
  const reward = (r.reward as Dict | undefined) ?? {};

  return {
    id: String(r.id ?? ""),
    title: String(r.title ?? "Untitled report"),
    programTitle: String(program.title ?? "Unknown Program"),
    programSlug: String(program.slug ?? ""),
    severity: String(r.severityValidated ?? r.severityEstimate ?? "LOW") as Severity,
    status: String(r.status ?? "SUBMITTED") as Report["status"],
    createdAt: String(r.createdAt ?? new Date().toISOString()),
    reward: typeof reward.amountUsd === "number" ? reward.amountUsd : undefined,
  };
};

const ensureProgramMerged = (incoming: Program) => {
  const idx = mockPrograms.findIndex((p) => p.slug === incoming.slug);
  if (idx === -1) {
    setMockPrograms([incoming, ...mockPrograms]);
    return;
  }
  const merged = [...mockPrograms];
  merged[idx] = { ...merged[idx], ...incoming };
  setMockPrograms(merged);
};

const hydratePublic = async (pathname: string) => {
  const programs = await safeGet<unknown[]>(apiPaths.programs.root);
  if (Array.isArray(programs)) {
    setMockPrograms(programs.map((p) => mapProgram((p as Dict) ?? {})).filter((p) => p.id));
  }

  const leaderboard = await safeGet<unknown[]>(apiPaths.leaderboard.global);
  if (Array.isArray(leaderboard)) {
    setMockLeaderboard(
      leaderboard.map((entry, idx) => {
        const e = (entry as Dict) ?? {};
        return {
          rank: Number(e.rank ?? idx + 1),
          username: String(
            e.username ?? ((e.user as Dict | undefined)?.username ?? `user-${idx + 1}`),
          ),
          displayName: typeof e.displayName === "string" ? e.displayName : undefined,
          avatarUrl: typeof e.avatarUrl === "string" ? e.avatarUrl : undefined,
          reputation: Number(e.reputation ?? 0),
          accepted: Number(e.accepted ?? e.acceptedReports ?? 0),
          totalEarned: Number(e.totalEarned ?? e.totalRewardUsd ?? 0),
          isCurrentUser: Boolean(e.isCurrentUser),
        };
      }),
    );
  }

  const programSlug = parseProgramSlug(pathname);
  if (programSlug) {
    const detail = await safeGet<Dict>(apiPaths.programs.bySlug(programSlug));
    const payload = detail && typeof detail === "object" ? detail : null;
    if (payload?.program && typeof payload.program === "object") {
      const merged = mapProgram({
        ...(payload.program as Dict),
        assets: Array.isArray(payload.assets) ? payload.assets : [],
      });
      ensureProgramMerged(merged);
    }

    const programBoard = await safeGet<unknown[]>(apiPaths.leaderboard.byProgramSlug(programSlug));
    if (Array.isArray(programBoard)) {
      setMockLeaderboard(
        programBoard.map((entry, idx) => {
          const e = (entry as Dict) ?? {};
          return {
            rank: Number(e.rank ?? idx + 1),
            username: String(
              e.username ?? ((e.user as Dict | undefined)?.username ?? `user-${idx + 1}`),
            ),
            displayName: typeof e.displayName === "string" ? e.displayName : undefined,
            avatarUrl: typeof e.avatarUrl === "string" ? e.avatarUrl : undefined,
            reputation: Number(e.reputation ?? 0),
            accepted: Number(e.accepted ?? e.acceptedReports ?? 0),
            totalEarned: Number(e.totalEarned ?? e.totalRewardUsd ?? 0),
            isCurrentUser: Boolean(e.isCurrentUser),
          };
        }),
      );
    }
  }
};

const hydrateAuthedGlobal = async () => {
  const meStats = await safeGet<Dict>(apiPaths.users.meStats);
  if (meStats) {
    const trend = Array.isArray(meStats.reputationTrend)
      ? (meStats.reputationTrend as Dict[]).map((t) => ({
          day: String(t.day ?? t.date ?? ""),
          points: Number(t.points ?? t.value ?? 0),
        }))
      : [];
    if (trend.length > 0) setMockReputationTrend(trend);
  }

  const myRewards = await safeGet<unknown[]>(apiPaths.users.meRewards);
  if (Array.isArray(myRewards)) {
    const mapped = myRewards.map((item) => {
      const r = (item as Dict) ?? {};
      const report = (r.report as Dict | undefined) ?? {};
      const recipient = (r.recipient as Dict | undefined) ?? {};
      return {
        id: String(r.id ?? ""),
        reportId: String(r.reportId ?? report.id ?? ""),
        reportTitle: String(report.title ?? "Reward"),
        researcher: String(recipient.username ?? "unknown"),
        severity: String(report.severityValidated ?? report.severityEstimate ?? "LOW") as Severity,
        recommendedAmount: Number(r.amountUsd ?? 0),
        approvedAmount: typeof r.amountUsd === "number" ? Number(r.amountUsd) : undefined,
        status: String((r.payout as Dict | undefined)?.status ?? "PENDING_APPROVAL") as
          | "PENDING_APPROVAL"
          | "APPROVED"
          | "PROCESSING"
          | "COMPLETED"
          | "FAILED"
          | "CANCELLED",
        createdAt: String(r.createdAt ?? new Date().toISOString()),
      };
    });
    setMockRewards(mapped);
  }

  const searchableReports = await safeGet<unknown[]>(`${apiPaths.search.reports}?take=20`);
  if (Array.isArray(searchableReports)) {
    setMockReports(searchableReports.map((r) => mapReport((r as Dict) ?? {})).filter((r) => r.id));
  }
};

const hydrateReportDetail = async (reportId: string) => {
  const [commentsResponse, rewardResponse, reportLookup] = await Promise.all([
    safeGet<Dict>(apiPaths.reports.comments(reportId)),
    safeGet<Dict>(apiPaths.reports.reward(reportId)),
    safeGet<unknown[]>(`${apiPaths.search.reports}?q=${encodeURIComponent(reportId)}`),
  ]);

  const reportCandidate = Array.isArray(reportLookup)
    ? reportLookup.find((row) => String((row as Dict)?.id ?? "") === reportId)
    : null;

  const report = reportCandidate ? mapReport((reportCandidate as Dict) ?? {}) : null;
  const comments = Array.isArray((commentsResponse as Dict | null)?.items)
    ? (((commentsResponse as Dict).items as Dict[]) ?? [])
    : Array.isArray(commentsResponse)
      ? ((commentsResponse as unknown as Dict[]) ?? [])
      : [];
  const reward = rewardResponse as Dict | null;

  setMockDetailedReport({
    ...mockDetailedReport,
    id: report?.id ?? mockDetailedReport.id,
    title: report?.title ?? mockDetailedReport.title,
    programTitle: report?.programTitle ?? mockDetailedReport.programTitle,
    programSlug: report?.programSlug ?? mockDetailedReport.programSlug,
    severity: report?.severity ?? mockDetailedReport.severity,
    status: report?.status ?? mockDetailedReport.status,
    reward:
      typeof reward?.amountUsd === "number"
        ? Number(reward.amountUsd)
        : mockDetailedReport.reward,
    updatedAt: new Date().toISOString(),
    comments:
      comments.length > 0
        ? comments.map((c, idx) => {
            const author = (c.author as Dict | undefined) ?? {};
            return {
              id: String(c.id ?? `c-${idx}`),
              authorName: String(author.displayName ?? author.username ?? "User"),
              authorRole: "reviewer" as const,
              body: String(c.body ?? ""),
              createdAt: String(c.createdAt ?? new Date().toISOString()),
              isInternal: Boolean(c.isInternal),
            };
          })
        : mockDetailedReport.comments,
  });
};

const hydrateOrg = async (orgSlug: string) => {
  const [org, members, invites, programs, triage, triageStats, rewards, webhooks] = await Promise.all([
    safeGet<Dict>(apiPaths.organizations.bySlug(orgSlug)),
    safeGet<unknown[]>(apiPaths.organizations.members(orgSlug)),
    safeGet<unknown[]>(apiPaths.organizations.invites(orgSlug)),
    safeGet<unknown[]>(apiPaths.organizations.programs(orgSlug)),
    safeGet<Dict>(apiPaths.organizations.triage(orgSlug)),
    safeGet<Dict>(apiPaths.organizations.triageStats(orgSlug)),
    safeGet<unknown[]>(apiPaths.organizations.rewards(orgSlug)),
    safeGet<unknown[]>(apiPaths.organizations.webhooks(orgSlug)),
  ]);

  if (org) {
    setMockOrgs([{ slug: String(org.slug ?? orgSlug), name: String(org.name ?? orgSlug) }]);
  }

  if (Array.isArray(members)) {
    setMockOrgMembers(
      members.map((m) => {
        const member = (m as Dict) ?? {};
        const user = (member.user as Dict | undefined) ?? {};
        return {
          id: String(member.id ?? user.id ?? ""),
          name: String(user.displayName ?? user.username ?? "Member"),
          // The backend currently returns limited user fields for members; email is intentionally omitted.
          // Keep a blank string until we add email to the backend select.
          email: String(user.email ?? ""),
          role: String(member.role ?? "VIEWER") as
            | "ORG_ADMIN"
            | "PROGRAM_MANAGER"
            | "REVIEWER"
            | "FINANCE"
            | "VIEWER",
          joinedAt: String(member.joinedAt ?? new Date().toISOString()),
          status: (member.usedAt ? "active" : "active") as "active" | "pending",
        };
      }),
    );
  }

  if (Array.isArray(invites)) {
    setMockOrgInvites(
      invites.map((i, idx) => {
        const inv = (i as Dict) ?? {};
        return {
          id: String(inv.id ?? `invite-${idx}`),
          email: String(inv.email ?? ""),
          role: String(inv.role ?? "VIEWER") as
            | "ORG_ADMIN"
            | "PROGRAM_MANAGER"
            | "REVIEWER"
            | "FINANCE"
            | "VIEWER",
          createdAt: String(inv.createdAt ?? new Date().toISOString()),
          expiresAt: String(inv.expiresAt ?? new Date().toISOString()),
        };
      }),
    );
  } else {
    setMockOrgInvites([]);
  }

  if (Array.isArray(programs)) {
    const orgProgramsMapped = programs.map((p) => {
        const program = (p as Dict) ?? {};
        return {
          id: String(program.id ?? ""),
          slug: String(program.slug ?? ""),
          title: String(program.title ?? "Untitled Program"),
          type: String(program.type ?? "PUBLIC") as
            | "PUBLIC"
            | "PRIVATE"
            | "CAMPAIGN"
            | "CHALLENGE"
            | "EMERGENCY",
          status: String(program.status ?? "DRAFT") as
            | "DRAFT"
            | "ACTIVE"
            | "PAUSED"
            | "CLOSED"
            | "ARCHIVED",
          openReports: Number((program._count as Dict | undefined)?.reports ?? 0),
          totalPaid: Number(program.totalPaidUsd ?? 0),
          createdAt: String(program.createdAt ?? new Date().toISOString()),
        };
      });
    setMockOrgPrograms(orgProgramsMapped);

    const publicShape = orgProgramsMapped.map((program) => ({
      id: program.id,
      slug: program.slug,
      title: program.title,
      description: "",
      type: program.type,
      status: program.status,
      orgName: org?.name ? String(org.name) : orgSlug,
      rewardRange: { min: 0, max: 0 },
      openReports: program.openReports,
      totalPaid: program.totalPaid,
      createdAt: program.createdAt,
      requiresInvite: false,
      assets: [],
      rewardTiers: rewardTiersDefault,
    }));

    const mergedPrograms = [...mockPrograms];
    for (const incoming of publicShape) {
      const idx = mergedPrograms.findIndex((p) => p.slug === incoming.slug);
      if (idx === -1) {
        mergedPrograms.push(incoming);
      } else {
        mergedPrograms[idx] = { ...mergedPrograms[idx], ...incoming };
      }
    }
    setMockPrograms(mergedPrograms);
  }

  const triageItems = Array.isArray((triage as Dict | null)?.items)
    ? (((triage as Dict).items as unknown[]) ?? [])
    : Array.isArray(triage)
      ? (triage as unknown[])
      : [];
  if (triageItems.length > 0) {
    setMockTriageReports(
      triageItems.map((r, idx) => {
        const report = (r as Dict) ?? {};
        const submitter = (report.submitter as Dict | undefined) ?? {};
        const assignee = (report.assignee as Dict | undefined) ?? {};
        const program = (report.program as Dict | undefined) ?? {};
        return {
          id: String(report.id ?? ""),
          shortId: String(report.shortId ?? `BH-${1000 + idx}`),
          title: String(report.title ?? "Untitled report"),
          programTitle: String(program.title ?? "Program"),
          programSlug: String(program.slug ?? ""),
          severity: String(report.severityValidated ?? report.severityEstimate ?? "LOW") as Severity,
          status: String(report.status ?? "SUBMITTED") as Report["status"],
          assignee: assignee.id
            ? { name: String(assignee.displayName ?? assignee.username ?? "Assignee") }
            : undefined,
          submitter: {
            name: String(submitter.displayName ?? submitter.username ?? "Researcher"),
            username: String(submitter.username ?? "unknown"),
          },
          slaFirstResponse: String(report.firstResponseDueAt ?? report.createdAt ?? new Date().toISOString()),
          slaTriage: String(report.triageDueAt ?? report.createdAt ?? new Date().toISOString()),
          slaResolution: String(report.fixDueAt ?? report.createdAt ?? new Date().toISOString()),
          slaStatus: String(report.slaStatus ?? "OK") as "OK" | "AT_RISK" | "BREACHED",
          createdAt: String(report.createdAt ?? new Date().toISOString()),
          asset: typeof report.assetIdentifier === "string" ? report.assetIdentifier : undefined,
          vulnCategory: typeof report.vulnCategory === "string" ? report.vulnCategory : undefined,
          cvssScore: typeof report.cvssScore === "number" ? report.cvssScore : undefined,
          reward: typeof (report.reward as Dict | undefined)?.amountUsd === "number"
            ? Number((report.reward as Dict).amountUsd)
            : undefined,
        };
      }),
    );
  }

  if (triageStats) {
    setMockAuditLog([
      {
        id: "triage-stats",
        action: "triage.stats",
        actor: "System",
        target: `Open ${String((triageStats as Dict).openReports ?? 0)} reports`,
        timestamp: new Date().toISOString(),
      },
    ]);
  }

  if (Array.isArray(rewards)) {
    setMockRewards(
      rewards.map((item) => {
        const rw = (item as Dict) ?? {};
        const report = (rw.report as Dict | undefined) ?? {};
        const recipient = (rw.recipient as Dict | undefined) ?? {};
        return {
          id: String(rw.id ?? ""),
          reportId: String(rw.reportId ?? report.id ?? ""),
          reportTitle: String(report.title ?? "Reward"),
          researcher: String(recipient.username ?? "unknown"),
          severity: String(report.severityValidated ?? report.severityEstimate ?? "LOW") as Severity,
          recommendedAmount: Number(rw.amountUsd ?? 0),
          approvedAmount: typeof rw.amountUsd === "number" ? Number(rw.amountUsd) : undefined,
          status: String((rw.payout as Dict | undefined)?.status ?? "PENDING_APPROVAL") as
            | "PENDING_APPROVAL"
            | "APPROVED"
            | "PROCESSING"
            | "COMPLETED"
            | "FAILED"
            | "CANCELLED",
          createdAt: String(rw.createdAt ?? new Date().toISOString()),
        };
      }),
    );
  }

  if (Array.isArray(webhooks)) {
    setMockWebhooks(
      webhooks.map((w) => {
        const webhook = (w as Dict) ?? {};
        return {
          id: String(webhook.id ?? ""),
          url: String(webhook.url ?? ""),
          events: Array.isArray(webhook.events) ? (webhook.events as string[]) : [],
          active: Boolean(webhook.isActive ?? webhook.active),
          createdAt: String(webhook.createdAt ?? new Date().toISOString()),
        };
      }),
    );
  }

  const [overview, trends, assets, researchers, categories, sla] = await Promise.all([
    safeGet<Dict>(apiPaths.organizations.analytics(orgSlug, "overview")),
    safeGet<Dict>(apiPaths.organizations.analytics(orgSlug, "trends")),
    safeGet<Dict>(apiPaths.organizations.analytics(orgSlug, "assets")),
    safeGet<Dict>(apiPaths.organizations.analytics(orgSlug, "researchers")),
    safeGet<Dict>(apiPaths.organizations.analytics(orgSlug, "categories")),
    safeGet<Dict>(apiPaths.organizations.analytics(orgSlug, "sla")),
  ]);

  setMockAnalyticsData({
    dailyReports: Array.isArray((trends as Dict | null)?.dailyReports)
      ? (((trends as Dict).dailyReports as Dict[]) ?? []).map((d) => ({
          date: String(d.date ?? ""),
          submitted: Number(d.submitted ?? 0),
          accepted: Number(d.accepted ?? 0),
          resolved: Number(d.resolved ?? 0),
        }))
      : [],
    categoryDistribution: Array.isArray((categories as Dict | null)?.items)
      ? (((categories as Dict).items as Dict[]) ?? []).map((c) => ({
          name: String(c.name ?? c.category ?? "Other"),
          value: Number(c.value ?? c.count ?? 0),
        }))
      : [],
    topAssets: Array.isArray((assets as Dict | null)?.items)
      ? (((assets as Dict).items as Dict[]) ?? []).map((a) => ({
          asset: String(a.asset ?? a.identifier ?? ""),
          reports: Number(a.reports ?? a.count ?? 0),
        }))
      : [],
    topResearchers: Array.isArray((researchers as Dict | null)?.items)
      ? (((researchers as Dict).items as Dict[]) ?? []).map((r) => ({
          username: String(r.username ?? ""),
          accepted: Number(r.accepted ?? 0),
          total: Number(r.total ?? 0),
          rate: Number(r.rate ?? 0),
        }))
      : [],
    slaRecords: Array.isArray((sla as Dict | null)?.items)
      ? (((sla as Dict).items as Dict[]) ?? []).map((s) => ({
          metric: String(s.metric ?? "SLA"),
          target: String(s.target ?? ""),
          breachRate: Number(s.breachRate ?? 0),
          total: Number(s.total ?? 0),
          breached: Number(s.breached ?? 0),
        }))
      : [],
  });

  if (overview) {
    setMockAuditLog([
      {
        id: "analytics-overview",
        action: "analytics.overview",
        actor: "System",
        target: `Reports ${String((overview as Dict).reports ?? 0)}`,
        timestamp: new Date().toISOString(),
      },
      ...[],
    ]);
  }
};

const hydrateAdmin = async () => {
  const [users, orgs, programs, auditLogs, systemHealth, featureFlags] = await Promise.all([
    safeGet<Dict>(apiPaths.admin.users),
    safeGet<Dict>(apiPaths.admin.organizations),
    safeGet<Dict>(apiPaths.admin.programs),
    safeGet<Dict>(apiPaths.admin.auditLogs),
    safeGet<Dict>(apiPaths.admin.systemHealth),
    safeGet<Dict>(apiPaths.admin.featureFlags),
  ]);

  const userItems = Array.isArray((users as Dict | null)?.items)
    ? ((users as Dict).items as Dict[])
    : Array.isArray(users)
      ? (users as unknown as Dict[])
      : [];
  if (userItems.length > 0) {
    setMockAdminUsers(
      userItems.map((u) => ({
        id: String(u.id ?? ""),
        username: String(u.username ?? "user"),
        email: String(u.email ?? ""),
        platformRole: String(u.platformRole ?? "RESEARCHER") as
          | "SUPER_ADMIN"
          | "SUPPORT"
          | "FINANCE_ADMIN"
          | "RESEARCHER"
          | "ORG_MEMBER",
        kycStatus: String(u.kycStatus ?? "NOT_STARTED") as
          | "NOT_STARTED"
          | "PENDING"
          | "VERIFIED"
          | "REJECTED",
        banned: Boolean(u.bannedAt),
        country: String(u.country ?? ""),
        joinedAt: String(u.createdAt ?? new Date().toISOString()),
        lastLogin: String(u.lastLoginAt ?? u.updatedAt ?? new Date().toISOString()),
      })),
    );
  }

  const orgItems = Array.isArray((orgs as Dict | null)?.items)
    ? ((orgs as Dict).items as Dict[])
    : [];
  if (orgItems.length > 0) {
    setMockAdminOrgs(
      orgItems.map((o) => ({
        id: String(o.id ?? ""),
        name: String(o.name ?? "Org"),
        slug: String(o.slug ?? ""),
        plan: String(o.plan ?? "FREE") as "FREE" | "PRO" | "ENTERPRISE",
        programs: Number((o._count as Dict | undefined)?.programs ?? 0),
        members: Number((o._count as Dict | undefined)?.members ?? 0),
        createdAt: String(o.createdAt ?? new Date().toISOString()),
        suspended: Boolean((o.settings as Dict | undefined)?.suspended),
      })),
    );
  }

  const programItems = Array.isArray((programs as Dict | null)?.items)
    ? ((programs as Dict).items as Dict[])
    : [];
  if (programItems.length > 0) {
    setMockAdminPrograms(
      programItems.map((p) => {
        const org = (p.org as Dict | undefined) ?? {};
        return {
          id: String(p.id ?? ""),
          title: String(p.title ?? "Program"),
          orgName: String(org.name ?? "Org"),
          type: String(p.type ?? "PUBLIC") as
            | "PUBLIC"
            | "PRIVATE"
            | "CAMPAIGN"
            | "CHALLENGE"
            | "EMERGENCY",
          status: String(p.status ?? "DRAFT") as
            | "DRAFT"
            | "ACTIVE"
            | "PAUSED"
            | "CLOSED"
            | "ARCHIVED",
          openReports: Number((p._count as Dict | undefined)?.reports ?? 0),
          createdAt: String(p.createdAt ?? new Date().toISOString()),
        };
      }),
    );
  }

  const auditItems = Array.isArray((auditLogs as Dict | null)?.items)
    ? ((auditLogs as Dict).items as Dict[])
    : [];
  if (auditItems.length > 0) {
    setMockAdminAuditLogs(
      auditItems.map((a) => ({
        id: String(a.id ?? ""),
        timestamp: String(a.createdAt ?? new Date().toISOString()),
        actor: String(((a.actor as Dict | undefined)?.username ?? a.actorId ?? "system")),
        action: String(a.action ?? "AUDIT"),
        entityType: String(a.entityType ?? "Entity"),
        entityId: String(a.entityId ?? ""),
        ip: String(a.ip ?? "-"),
        before: (a.before as Record<string, unknown> | undefined) ?? undefined,
        after: (a.after as Record<string, unknown> | undefined) ?? undefined,
      })),
    );
  }

  if (systemHealth) {
    const sh = systemHealth as Dict;
    const db = (sh.dbConnections as Dict | undefined) ?? {};
    const redis = (sh.redisMemory as Dict | undefined) ?? {};
    const queueDepths = Array.isArray(sh.queueDepths) ? (sh.queueDepths as Dict[]) : [];
    const logs = Array.isArray(db.slowQueryLog) ? (db.slowQueryLog as Dict[]) : [];

    setMockSystemMetrics([
      { label: "DB Connections", value: `${String(db.active ?? 0)}`, status: "ok" },
      { label: "Query Count", value: `${String(db.queryCount ?? 0)}`, status: "ok" },
      { label: "Redis Memory", value: `${String(redis.usedMemory ?? 0)}`, status: "ok" },
      { label: "Redis Clients", value: `${String(redis.connectedClients ?? 0)}`, status: "ok" },
      {
        label: "Error Rate (5m)",
        value: `${String(sh.errorRate ?? 0)}`,
        status: Number(sh.errorRate ?? 0) > 0 ? "warning" : "ok",
      },
    ]);

    setMockQueues(
      queueDepths.map((q) => {
        const counts = (q.counts as Dict | undefined) ?? {};
        return {
          name: String(q.queue ?? "queue"),
          waiting: Number(counts.waiting ?? 0),
          active: Number(counts.active ?? 0),
          completed: Number(counts.completed ?? 0),
          failed: Number(counts.failed ?? 0),
          paused: false,
        };
      }),
    );

    setMockErrorLogs(
      logs.map((l) => ({
        time: String(l.at ?? new Date().toISOString()),
        level: "WARN",
        message: `Slow query ${String(l.model ?? "")}.${String(l.action ?? "")} ${String(
          l.durationMs ?? "",
        )}ms`,
      })),
    );
  }

  if (featureFlags && typeof featureFlags === "object") {
    const flags = Object.entries(featureFlags).map(([key, value]) => {
      if (typeof value === "string") {
        return {
          key,
          description: key,
          enabled: value === "true",
          value,
        };
      }
      if (typeof value === "object" && value !== null) {
        const parsed = value as Dict;
        return {
          key,
          description: key,
          enabled: Boolean(parsed.enabled),
          value: parsed.value == null ? "" : String(parsed.value),
        };
      }
      return { key, description: key, enabled: Boolean(value), value: String(value ?? "") };
    });
    setMockFeatureFlags(flags);
  }
};

export async function hydrateBackendDataForPath(pathname: string): Promise<void> {
  await hydratePublic(pathname);

  const hasToken = Boolean(api.getToken());
  if (!hasToken) return;

  await hydrateAuthedGlobal();

  const reportId = parseReportId(pathname);
  if (reportId) {
    await hydrateReportDetail(reportId);
  }

  const orgSlug = parseOrgSlug(pathname);
  if (orgSlug) {
    await hydrateOrg(orgSlug);
  }

  if (pathname.startsWith("/admin")) {
    await hydrateAdmin();
  }
}
