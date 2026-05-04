import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';

// API client
// Centralized fetch wrapper that talks to the Fastify backend.
// All auth endpoints return { data: ... } or { error: { code, message, details? } }

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || 'http://localhost:3000/api';

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '');

export const apiPaths = {
  auth: {
    register: '/auth/register',
    verifyEmail: '/auth/verify-email',
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    totpSetup: '/auth/totp/setup',
    totpVerify: '/auth/totp/verify',
    totpDisable: '/auth/totp/disable',
    sessions: '/auth/sessions',
    sessionById: (id: string) => `/auth/sessions/${id}`,
    loginHistory: '/auth/login-history',
    google: '/auth/google',
    googleCallback: '/auth/google/callback',
    github: '/auth/github',
    githubCallback: '/auth/github/callback',
    sso: (orgSlug: string) => `/auth/sso/${orgSlug}`,
    ssoCallback: (orgSlug: string) => `/auth/sso/${orgSlug}/callback`,
    registrationStats: '/auth/registration-stats',
  },

  users: {
    me: '/users/me',
    mePublicProfile: '/users/me/public-profile',
    meAvatar: '/users/me/avatar',
    mePayoutProfile: '/users/me/payout-profile',
    meReputation: '/users/me/reputation',
    meStats: '/users/me/stats',
    meRewards: '/users/me/rewards',
    mePayouts: '/users/me/payouts',
    meApiKeys: '/users/me/api-keys',
    meAnalytics: '/users/me/analytics',
    meApiKeyById: (id: string) => `/users/me/api-keys/${id}`,
    byUsername: (username: string) => `/users/${username}`,
  },

  organizations: {
    root: '/organizations',
    bySlug: (slug: string) => `/organizations/${slug}`,
    verify: (slug: string) => `/organizations/${slug}/verify`,
    members: (slug: string) => `/organizations/${slug}/members`,
    inviteMember: (slug: string) => `/organizations/${slug}/members/invite`,
    invites: (slug: string) => `/organizations/${slug}/invites`,
    inviteById: (slug: string, inviteId: string) => `/organizations/${slug}/invites/${inviteId}`,
    memberByUserId: (slug: string, userId: string) => `/organizations/${slug}/members/${userId}`,
    memberRole: (slug: string, userId: string) => `/organizations/${slug}/members/${userId}/role`,
    auditLogs: (slug: string) => `/organizations/${slug}/audit-logs`,
    programs: (slug: string) => `/organizations/${slug}/programs`,
    triage: (slug: string) => `/organizations/${slug}/triage`,
    triageStats: (slug: string) => `/organizations/${slug}/triage/stats`,
    analytics: (slug: string, wildcard = '') =>
      `/organizations/${slug}/analytics${wildcard ? `/${trimSlashes(wildcard)}` : ''}`,
    rewards: (slug: string) => `/organizations/${slug}/rewards`,
    rewardsStats: (slug: string) => `/organizations/${slug}/rewards/stats`,
    templates: (slug: string) => `/organizations/${slug}/templates`,
    templateById: (slug: string, id: string) => `/organizations/${slug}/templates/${id}`,
    apiKeys: (slug: string) => `/organizations/${slug}/api-keys`,
    apiKeyById: (slug: string, id: string) => `/organizations/${slug}/api-keys/${id}`,
    webhooks: (slug: string) => `/organizations/${slug}/webhooks`,
    webhookById: (slug: string, id: string) => `/organizations/${slug}/webhooks/${id}`,
    webhookTest: (slug: string, id: string) => `/organizations/${slug}/webhooks/${id}/test`,
    webhookDeliveries: (slug: string, id: string) =>
      `/organizations/${slug}/webhooks/${id}/deliveries`,
    integrations: (slug: string) => `/organizations/${slug}/integrations`,
    integrationByType: (slug: string, type: string) =>
      `/organizations/${slug}/integrations/${type}`,
    ssoConfig: (slug: string) => `/organizations/${slug}/sso-config`,
    sla: (slug: string) => `/organizations/${slug}/sla`,
    orgReport: (orgSlug: string, reportId: string) =>
      `/organizations/${orgSlug}/reports/${reportId}`,
    orgReportTimeline: (orgSlug: string, reportId: string) =>
      `/organizations/${orgSlug}/reports/${reportId}/timeline`,
    orgReportStatus: (orgSlug: string, reportId: string) =>
      `/organizations/${orgSlug}/reports/${reportId}/status`,
    orgReportAssign: (orgSlug: string, reportId: string) =>
      `/organizations/${orgSlug}/reports/${reportId}/assign`,
    orgReportSeverity: (orgSlug: string, reportId: string) =>
      `/organizations/${orgSlug}/reports/${reportId}/severity`,
    orgReportDuplicate: (orgSlug: string, reportId: string) =>
      `/organizations/${orgSlug}/reports/${reportId}/duplicate`,
    orgReportEscalate: (orgSlug: string, reportId: string) =>
      `/organizations/${orgSlug}/reports/${reportId}/escalate`,
    orgReportsBulkAssign: (orgSlug: string) => `/organizations/${orgSlug}/reports/bulk-assign`,
    orgReportsBulkClose: (orgSlug: string) => `/organizations/${orgSlug}/reports/bulk-close`,
  },

  programs: {
    root: '/programs',
    createForOrganization: (slug: string) => `/organizations/${slug}/programs`,
    bySlug: (slug: string) => `/programs/${slug}`,
    status: (slug: string) => `/programs/${slug}/status`,
    stats: (slug: string) => `/programs/${slug}/stats`,
    invite: (slug: string) => `/programs/${slug}/invite`,
    invites: (slug: string) => `/programs/${slug}/invites`,
    inviteById: (slug: string, id: string) => `/programs/${slug}/invites/${id}`,
    join: (slug: string) => `/programs/${slug}/join`,
    assets: (slug: string) => `/programs/${slug}/assets`,
    scopeGroups: (slug: string) => `/programs/${slug}/scope-groups`,
    scopeGroupById: (slug: string, scopeGroupId: string) =>
      `/programs/${slug}/scope-groups/${scopeGroupId}`,
    assetById: (slug: string, id: string) => `/programs/${slug}/assets/${id}`,
    toggleAssetScope: (slug: string, id: string) => `/programs/${slug}/assets/${id}/toggle-scope`,
    importAssets: (slug: string) => `/programs/${slug}/assets/import`,
    assetHistory: (slug: string, id: string) => `/programs/${slug}/assets/${id}/history`,
    reports: (slug: string) => `/programs/${slug}/reports`,
    leaderboard: (slug: string) => `/programs/${slug}/leaderboard`,
  },

  reports: {
    create: '/reports',
    me: '/reports/me',
    byId: (id: string) => `/reports/${id}`,
    submit: (id: string) => `/reports/${id}/submit`,
    attachments: (id: string) => `/reports/${id}/attachments`,
    attachmentById: (id: string, attachId: string) => `/reports/${id}/attachments/${attachId}`,
    comments: (id: string) => `/reports/${id}/comments`,
    commentById: (id: string, commentId: string) => `/reports/${id}/comments/${commentId}`,
    markCommentRead: (id: string, commentId: string) => `/reports/${id}/comments/${commentId}/read`,
    commentsFromTemplate: (id: string) => `/reports/${id}/comments/from-template`,
    timeline: (id: string) => `/reports/${id}/timeline`,
    status: (id: string) => `/reports/${id}/status`,
    assign: (id: string) => `/reports/${id}/assign`,
    severity: (id: string) => `/reports/${id}/severity`,
    duplicate: (id: string) => `/reports/${id}/duplicate`,
    merge: (id: string) => `/reports/${id}/merge`,
    link: (id: string) => `/reports/${id}/link`,
    escalate: (id: string) => `/reports/${id}/escalate`,
    moderate: (id: string) => `/reports/${id}/moderate`,
    reward: (id: string) => `/reports/${id}/reward`,
    pushTicket: (id: string) => `/reports/${id}/integrations/push-ticket`,
  },

  rewards: {
    approve: (id: string) => `/rewards/${id}/approve`,
    reject: (id: string) => `/rewards/${id}/reject`,
    payout: (id: string) => `/rewards/${id}/payout`,
  },

  search: {
    reports: '/search/reports',
    programs: '/search/programs',
    researchers: '/search/researchers',
    assets: '/search/assets',
  },

  leaderboard: {
    global: '/leaderboard',
    byProgramSlug: (programSlug: string) => `/leaderboard/${programSlug}`,
  },

  notifications: {
    root: '/notifications',
    read: (id: string) => `/notifications/${id}/read`,
    readAll: '/notifications/read-all',
    stream: '/notifications/stream',
    preferences: '/notifications/preferences',
  },

  invites: {
    accept: (token: string) => `/invites/accept/${token}`,
  },

  onboarding: {
    createOrg: '/onboarding/create-org',
    skip: '/onboarding/skip',
  },

  admin: {
    stats: '/admin/stats',
    users: '/admin/users',
    userById: (id: string) => `/admin/users/${id}`,
    banUser: (id: string) => `/admin/users/${id}/ban`,
    unbanUser: (id: string) => `/admin/users/${id}/unban`,
    platformRole: (id: string) => `/admin/users/${id}/platform-role`,
    impersonate: (id: string) => `/admin/users/${id}/impersonate`,
    inviteToOrg: (userId: string) => `/admin/users/${userId}/invite-to-org`,
    organizations: '/admin/organizations',
    suspendOrganization: (id: string) => `/admin/organizations/${id}/suspend`,
    verifications: '/admin/verifications',
    verificationsCount: '/admin/verifications/count',
    approveVerification: (orgId: string) => `/admin/organizations/${orgId}/verify/approve`,
    rejectVerification: (orgId: string) => `/admin/organizations/${orgId}/verify/reject`,
    updateVerificationNotes: (id: string) => `/admin/verifications/${id}/notes`,
    programs: '/admin/programs',
    forceCloseProgram: (id: string) => `/admin/programs/${id}/force-close`,
    reports: '/admin/reports',
    payouts: '/admin/payouts',
    retryPayout: (id: string) => `/admin/payouts/${id}/retry`,
    auditLogs: '/admin/audit-logs',
    exportAuditLogs: '/admin/audit-logs/export',
    systemHealth: '/admin/system-health',
    featureFlags: '/admin/feature-flags',
    featureFlagByKey: (key: string) => `/admin/feature-flags/${key}`,
    announcements: '/admin/announcements',
    abuseReports: '/admin/abuse-reports',
    abuseReportById: (id: string) => `/admin/abuse-reports/${id}`,
    queues: '/admin/queues',
  },
} as const;

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  data: T;
}

class ApiClient {
  private accessToken: string | null = null;
  private client = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
  });

  constructor() {
    this.client.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (res) => res,
      (err: AxiosError<{ error?: ApiError | string; message?: string }>) => {
        const status = err.response?.status;
        const rawError = err.response?.data?.error;
        const apiError =
          rawError && typeof rawError === 'object'
            ? rawError
            : ({
                code:
                  typeof rawError === 'string' && rawError.length > 0
                    ? rawError
                    : `HTTP_${status ?? 500}`,
                message: err.response?.data?.message ?? err.message,
              } as ApiError);

        if (status === 401) {
          window.location.assign('/login');
        }
        if (status >= 400) {
          toast.error(apiError.message || 'Request failed');
        }
        return Promise.reject(apiError);
      },
    );
  }

  setToken(token: string | null) {
    this.accessToken = token;
  }

  getToken() {
    return this.accessToken;
  }

  buildUrl(path: string) {
    const normalizedBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await this.client.request<{ data: T }>({
      method,
      url: path,
      data: body,
    });
    return res.data.data;
  }

  // Auth

  async register(body: {
    email: string;
    password: string;
    username: string;
    displayName?: string;
    accountType?: 'RESEARCHER' | 'COMPANY';
  }) {
    return this.request<{
      id: string;
      email: string;
      username: string;
      displayName: string;
      platformRole: string;
      createdAt: string;
    }>('POST', apiPaths.auth.register, body);
  }

  async verifyEmail(token: string) {
    return this.request<{ message: string }>('POST', apiPaths.auth.verifyEmail, {
      token,
    });
  }

  async login(body: { email: string; password: string; totpCode?: string }) {
    return this.request<{
      accessToken: string;
      user: {
        id: string;
        email: string;
        username: string;
        displayName: string;
        platformRole: string;
        totpEnabled: boolean;
        onboardingStep: string;
        orgMemberships?: { org: { slug: string } }[];
      };
    }>('POST', apiPaths.auth.login, body);
  }

  async refresh() {
    return this.request<{ accessToken: string }>('POST', apiPaths.auth.refresh);
  }

  async logout() {
    return this.request<{ message: string }>('POST', apiPaths.auth.logout);
  }

  async forgotPassword(email: string) {
    return this.request<{ message: string }>('POST', apiPaths.auth.forgotPassword, {
      email,
    });
  }

  async resetPassword(token: string, newPassword: string) {
    return this.request<{ message: string }>('POST', apiPaths.auth.resetPassword, {
      token,
      newPassword,
    });
  }

  // TOTP

  async totpSetup() {
    return this.request<{
      secret: string;
      qrCodeDataUrl: string;
      otpauth: string;
    }>('POST', apiPaths.auth.totpSetup);
  }

  async totpVerify(code: string) {
    return this.request<{ message: string }>('POST', apiPaths.auth.totpVerify, {
      code,
    });
  }

  async totpDisable(code: string) {
    return this.request<{ message: string }>('POST', apiPaths.auth.totpDisable, {
      code,
    });
  }

  // Sessions

  async listSessions() {
    return this.request<
      Array<{
        id: string;
        deviceInfo: Record<string, unknown>;
        createdAt: string;
        expiresAt: string;
      }>
    >('GET', apiPaths.auth.sessions);
  }

  async revokeSession(id: string) {
    return this.request<{ message: string }>('DELETE', apiPaths.auth.sessionById(id));
  }

  async loginHistory(limit = 20) {
    return this.request<
      Array<{
        id: string;
        ip: string;
        userAgent: string | null;
        country: string | null;
        success: boolean;
        createdAt: string;
      }>
    >('GET', `${apiPaths.auth.loginHistory}?limit=${limit}`);
  }

  // Onboarding

  async createOrgOnboarding(body: { orgName: string; orgSlug?: string }) {
    return this.request<{
      org: {
        id: string;
        slug: string;
        name: string;
        verificationStatus: string;
      };
    }>('POST', apiPaths.onboarding.createOrg, body);
  }

  async skipOnboarding() {
    return this.request<{ onboardingStep: string }>('POST', apiPaths.onboarding.skip);
  }

  async submitVerification(
    slug: string,
    body: {
      legalName: string;
      registrationNumber?: string;
      country: string;
      address: string;
      website?: string;
      primaryUseCase: string;
      estimatedPrograms: number;
      contactName: string;
      contactEmail: string;
      contactPhone?: string;
      documents?: string[];
    },
  ) {
    return this.request<{ verificationStatus: string }>(
      'POST',
      apiPaths.organizations.verify(slug),
      body,
    );
  }

  async getVerificationStatus(slug: string) {
    return this.request<{ verificationStatus: string }>('GET', apiPaths.organizations.verify(slug));
  }

  // Admin verifications
  async listVerifications(status?: string) {
    const url = status
      ? `${apiPaths.admin.verifications}?status=${status}`
      : apiPaths.admin.verifications;
    return this.request<
      Array<{
        id: string;
        name: string;
        slug: string;
        status: string;
        submittedAt: string | null;
        approvedAt: string | null;
        rejectedAt: string | null;
        rejectedReason: string | null;
        submittedBy: { id: string; username: string; email: string } | null;
        verification: {
          legalName: string;
          registrationNumber: string | null;
          country: string;
          address: string;
          website: string;
          primaryUseCase: string;
          estimatedPrograms: number;
          contactName: string;
          contactEmail: string;
          contactPhone: string | null;
          documents: string[];
          adminNotes: string | null;
        } | null;
      }>
    >('GET', url);
  }

  async getVerificationCounts() {
    return this.request<{ pending: number; submitted: number; approved: number; rejected: number }>(
      'GET',
      apiPaths.admin.verificationsCount,
    );
  }

  async approveVerification(orgId: string) {
    return this.request<{ message: string; status: string }>(
      'PUT',
      apiPaths.admin.approveVerification(orgId),
    );
  }

  async rejectVerification(orgId: string, reason: string) {
    return this.request<{ message: string; status: string }>(
      'PUT',
      apiPaths.admin.rejectVerification(orgId),
      { reason },
    );
  }

  async updateVerificationNotes(verificationId: string, adminNotes: string) {
    return this.request<{ id: string; adminNotes: string }>(
      'PUT',
      apiPaths.admin.updateVerificationNotes(verificationId),
      { adminNotes },
    );
  }

  async inviteUserToOrg(userId: string, orgId: string, role: string) {
    return this.request<{ message: string; inviteId: string }>(
      'POST',
      apiPaths.admin.inviteToOrg(userId),
      { orgId, role },
    );
  }

  // Generic (for future endpoints)
  get<T>(path: string) {
    return this.request<T>('GET', path);
  }
  post<T>(path: string, body?: unknown) {
    return this.request<T>('POST', path, body);
  }
  put<T>(path: string, body?: unknown) {
    return this.request<T>('PUT', path, body);
  }
  patch<T>(path: string, body?: unknown) {
    return this.request<T>('PATCH', path, body);
  }
  delete<T>(path: string) {
    return this.request<T>('DELETE', path);
  }

  // Registration stats
  getRegistrationStats() {
    return this.get<{
      totalUsers: number;
      recentRegistrations: Array<{
        date: string;
        users: number;
      }>;
    }>('/auth/registration-stats');
  }
}

export const api = new ApiClient();
