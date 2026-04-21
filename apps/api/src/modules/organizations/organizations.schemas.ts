import { z } from 'zod';
import { OrgRole } from '@bughuntr/db';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createOrganizationBodySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(2).max(80).regex(slugRegex).optional(),
  website: z.string().url().max(2048).nullable().optional(),
  description: z.string().max(10_000).nullable().optional(),
  billingEmail: z.string().email().max(255).nullable().optional(),
});
export type CreateOrganizationBody = z.infer<typeof createOrganizationBodySchema>;

export const updateOrganizationBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  website: z.string().url().max(2048).nullable().optional(),
  description: z.string().max(10_000).nullable().optional(),
  billingEmail: z.string().email().max(255).nullable().optional(),
  logoUrl: z.string().url().max(2048).nullable().optional(),
});
export type UpdateOrganizationBody = z.infer<typeof updateOrganizationBodySchema>;

export const inviteMemberBodySchema = z.object({
  email: z.string().email().max(255),
  role: z.nativeEnum(OrgRole),
});
export type InviteMemberBody = z.infer<typeof inviteMemberBodySchema>;

export const changeMemberRoleBodySchema = z.object({
  role: z.nativeEnum(OrgRole),
});
export type ChangeMemberRoleBody = z.infer<typeof changeMemberRoleBodySchema>;

export const orgSlugParamsSchema = z.object({
  slug: z.string().min(1).max(80),
});

export const orgMemberParamsSchema = z.object({
  slug: z.string().min(1).max(80),
  userId: z.string().min(1),
});

export const inviteTokenParamsSchema = z.object({
  token: z.string().min(10),
});

export const orgInviteParamsSchema = z.object({
  slug: z.string().min(1).max(80),
  inviteId: z.string().min(1),
});

export const submitVerificationBodySchema = z.object({
  legalName: z.string().min(1).max(200),
  registrationNumber: z.string().max(100).optional(),
  country: z.string().min(2).max(100),
  address: z.string().min(1).max(500),
  website: z.string().url().max(2048).optional().or(z.literal('')),
  primaryUseCase: z.string().min(20).max(5000),
  estimatedPrograms: z.number().int().min(1).max(100),
  contactName: z.string().min(1).max(200),
  contactEmail: z.string().email().max(255),
  contactPhone: z.string().max(50).optional(),
  documents: z.array(z.string()).max(5).optional(),
});
export type SubmitVerificationBody = z.infer<typeof submitVerificationBodySchema>;
