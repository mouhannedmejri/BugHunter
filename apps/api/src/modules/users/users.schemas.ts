import { z } from 'zod';
import { OrgRole, PlatformRole, PaymentMethod } from '@bughuntr/db';

export const updateMeBodySchema = z.object({
  displayName: z.string().min(1).max(100).nullable().optional(),
  bio: z.string().max(5000).nullable().optional(),
  website: z.union([z.string().url().max(2048), z.literal('')]).nullable().optional(),
  twitterHandle: z.string().max(100).nullable().optional(),
  githubHandle: z.string().max(100).nullable().optional(),
  country: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/)
    .nullable()
    .optional(),
  timezone: z.string().min(1).max(64).nullable().optional(),
});
export type UpdateMeBody = z.infer<typeof updateMeBodySchema>;

export const payoutProfileBodySchema = z.object({
  legalName: z.string().min(1).max(200).nullable().optional(),
  taxId: z.string().max(128).nullable().optional(),
  country: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/)
    .nullable()
    .optional(),
  preferredMethod: z.nativeEnum(PaymentMethod).optional(),
  stripeAccountId: z.string().max(128).nullable().optional(),
  paypalEmail: z.string().email().max(255).nullable().optional(),
  wiseAccountId: z.string().max(128).nullable().optional(),
  walletAddress: z.string().max(256).nullable().optional(),
  kycDocumentRef: z.string().max(256).nullable().optional(),
});
export type PayoutProfileBody = z.infer<typeof payoutProfileBodySchema>;

export const reputationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ReputationQuery = z.infer<typeof reputationQuerySchema>;

export const adminUserListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  platformRole: z.nativeEnum(PlatformRole).optional(),
  banned: z.enum(['true', 'false', 'any']).default('any'),
  kycStatus: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).optional(),
  country: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/)
    .optional(),
});
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;

export const adminBanBodySchema = z.object({
  reason: z.string().min(1).max(2000),
});
export type AdminBanBody = z.infer<typeof adminBanBodySchema>;

export const adminPlatformRoleBodySchema = z.object({
  platformRole: z.nativeEnum(PlatformRole),
});
export type AdminPlatformRoleBody = z.infer<typeof adminPlatformRoleBodySchema>;

export const adminUserIdParamsSchema = z.object({
  id: z.string().min(1),
});
export type AdminUserIdParams = z.infer<typeof adminUserIdParamsSchema>;

export const adminInviteToOrgParamsSchema = z.object({
  userId: z.string().min(1),
});
export type AdminInviteToOrgParams = z.infer<typeof adminInviteToOrgParamsSchema>;

export const adminInviteToOrgBodySchema = z.object({
  orgId: z.string().min(1),
  role: z.nativeEnum(OrgRole),
});
export type AdminInviteToOrgBody = z.infer<typeof adminInviteToOrgBodySchema>;

export const publicUsernameParamsSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(39)
    .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?$/),
});
export type PublicUsernameParams = z.infer<typeof publicUsernameParamsSchema>;
