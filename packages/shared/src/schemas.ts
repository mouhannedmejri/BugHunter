import { z } from 'zod';

// ─── Primitives ──────────────────────────────────────────

export const cuidSchema = z.string().cuid();
export const emailSchema = z.string().email().max(255);
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const usernameSchema = z
  .string()
  .min(3)
  .max(39)
  .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?$/, 'Invalid username format');

export const slugSchema = z
  .string()
  .min(3)
  .max(63)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'Slug must be lowercase alphanumeric with hyphens');

// ─── Pagination ──────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationInput = z.infer<typeof paginationSchema>;

export const paginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    meta: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }),
  });

// ─── Auth ────────────────────────────────────────────────

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  displayName: z.string().min(1).max(100).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
  totpCode: z.string().length(6).optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export const totpVerifySchema = z.object({
  code: z.string().length(6),
});
export type TotpVerifyInput = z.infer<typeof totpVerifySchema>;

// ─── Enums as Zod ────────────────────────────────────────

export const platformRoleSchema = z.enum([
  'SUPER_ADMIN',
  'SUPPORT',
  'AUDITOR',
  'USER',
]);

export const orgRoleSchema = z.enum([
  'ORG_ADMIN',
  'PROGRAM_MANAGER',
  'REVIEWER',
  'FINANCE',
  'VIEWER',
]);

export const programTypeSchema = z.enum([
  'PUBLIC',
  'PRIVATE',
  'CAMPAIGN',
  'CHALLENGE',
  'EMERGENCY',
]);

export const programStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'CLOSED',
  'ARCHIVED',
]);

export const assetTypeSchema = z.enum([
  'DOMAIN',
  'SUBDOMAIN',
  'IP_RANGE',
  'MOBILE_APP',
  'API',
  'REPOSITORY',
  'CLOUD',
  'THIRD_PARTY',
  'PHYSICAL',
]);

export const severitySchema = z.enum([
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
  'INFORMATIONAL',
]);

export const reportStatusSchema = z.enum([
  'DRAFT',
  'SUBMITTED',
  'RECEIVED',
  'NEEDS_INFO',
  'TRIAGING',
  'ACCEPTED',
  'DUPLICATE',
  'INFORMATIVE',
  'NOT_APPLICABLE',
  'OUT_OF_SCOPE',
  'RESOLVED',
  'REWARDED',
  'CLOSED',
  'ESCALATED',
]);

export const payoutStatusSchema = z.enum([
  'PENDING_APPROVAL',
  'APPROVED',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);

export const vulnCategorySchema = z.enum([
  'XSS',
  'SQLI',
  'RCE',
  'SSRF',
  'IDOR',
  'CSRF',
  'AUTH_BYPASS',
  'PRIV_ESC',
  'INFO_DISC',
  'DOS',
  'BUSINESS_LOGIC',
  'CRYPTO',
  'SUPPLY_CHAIN',
  'OTHER',
]);

export const paymentMethodSchema = z.enum([
  'BANK_TRANSFER',
  'PAYPAL',
  'CRYPTO',
  'STRIPE',
]);

// ─── Organizations ───────────────────────────────────────

export const createOrgSchema = z.object({
  name: z.string().min(2).max(100),
  slug: slugSchema,
  website: z.string().url().optional(),
  description: z.string().max(1000).optional(),
  billingEmail: emailSchema.optional(),
});
export type CreateOrgInput = z.infer<typeof createOrgSchema>;

export const updateOrgSchema = createOrgSchema.partial();
export type UpdateOrgInput = z.infer<typeof updateOrgSchema>;

export const inviteOrgMemberSchema = z.object({
  email: emailSchema,
  role: orgRoleSchema,
});
export type InviteOrgMemberInput = z.infer<typeof inviteOrgMemberSchema>;

// ─── Programs ────────────────────────────────────────────

export const createProgramSchema = z.object({
  title: z.string().min(3).max(200),
  slug: slugSchema,
  description: z.string().min(10),
  type: programTypeSchema,
  policy: z.record(z.unknown()),
  rewardPolicy: z.record(z.unknown()),
  eligibilityRules: z.string().optional(),
  legalTerms: z.string().optional(),
  maxRewardUsd: z.number().int().positive().optional(),
  allowPublicDisclosure: z.boolean().default(false),
  requiresInvite: z.boolean().default(false),
});
export type CreateProgramInput = z.infer<typeof createProgramSchema>;

export const updateProgramSchema = createProgramSchema.partial();
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>;

// ─── Assets ──────────────────────────────────────────────

export const createAssetSchema = z.object({
  type: assetTypeSchema,
  identifier: z.string().min(1).max(500),
  description: z.string().max(1000).optional(),
  inScope: z.boolean().default(true),
  wildcardSupport: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  notes: z.string().max(2000).optional(),
});
export type CreateAssetInput = z.infer<typeof createAssetSchema>;

// ─── Reports ─────────────────────────────────────────────

export const createReportSchema = z.object({
  programId: cuidSchema,
  assetId: cuidSchema.optional(),
  title: z.string().min(5).max(300),
  vulnCategory: vulnCategorySchema,
  severityEstimate: severitySchema,
  reproSteps: z.string().min(20),
  impactExplanation: z.string().min(10),
  environmentInfo: z.record(z.unknown()).optional(),
  suggestedFix: z.string().optional(),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

export const updateReportStatusSchema = z.object({
  status: reportStatusSchema,
  reason: z.string().max(1000).optional(),
});
export type UpdateReportStatusInput = z.infer<typeof updateReportStatusSchema>;

// ─── Comments ────────────────────────────────────────────

export const createCommentSchema = z.object({
  body: z.string().min(1).max(10000),
  isInternal: z.boolean().default(false),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

// ─── Rewards ─────────────────────────────────────────────

export const createRewardSchema = z.object({
  amountUsd: z.number().int().positive(),
  bonusUsd: z.number().int().min(0).default(0),
  currency: z.string().length(3).default('USD'),
  decision: z.enum(['APPROVED', 'PARTIAL', 'NO_REWARD']),
  reason: z.string().max(1000).optional(),
});
export type CreateRewardInput = z.infer<typeof createRewardSchema>;

// ─── User Profile ────────────────────────────────────────

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(2000).optional(),
  website: z.string().url().optional().or(z.literal('')),
  twitterHandle: z.string().max(50).optional(),
  githubHandle: z.string().max(50).optional(),
  country: z.string().length(2).optional(),
  timezone: z.string().max(50).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ─── API Keys ────────────────────────────────────────────

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).min(1),
  expiresAt: z.string().datetime().optional(),
});
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

// ─── Webhooks ────────────────────────────────────────────

export const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
});
export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
