import { z } from 'zod';
import {
  ProgramType,
  ProgramStatus,
  AssetType,
  Severity,
} from '@bughuntr/db';

const severityTierSchema = z.object({
  min: z.number().int().nonnegative(),
  max: z.number().int().nonnegative(),
});

export const rewardPolicySchema = z.object({
  CRITICAL: severityTierSchema,
  HIGH: severityTierSchema,
  MEDIUM: severityTierSchema,
  LOW: severityTierSchema,
  INFORMATIONAL: severityTierSchema,
});
export type RewardPolicy = z.infer<typeof rewardPolicySchema>;

export const slaConfigSchema = z.object({
  firstResponseHours: z.number().int().positive().default(24),
  triageDecisionDays: z.number().int().positive().default(5),
  fixDays: z.object({
    CRITICAL: z.number().int().positive(),
    HIGH: z.number().int().positive(),
    MEDIUM: z.number().int().positive(),
    LOW: z.number().int().positive(),
    INFORMATIONAL: z.number().int().positive(),
  }),
});
export type SlaConfig = z.infer<typeof slaConfigSchema>;

const policyJsonSchema = z.record(z.string(), z.unknown()).default({});

export const createProgramBodySchema = z.object({
  title: z.string().min(1).max(200),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().min(1).max(100_000),
  type: z.nativeEnum(ProgramType),
  policy: policyJsonSchema,
  rewardPolicy: rewardPolicySchema,
  eligibilityRules: z.string().max(50_000).nullable().optional(),
  legalTerms: z.string().max(50_000).nullable().optional(),
  maxRewardUsd: z.number().int().nonnegative().nullable().optional(),
  allowPublicDisclosure: z.boolean().optional(),
  requiresInvite: z.boolean().optional(),
  slaConfig: slaConfigSchema.optional(),
  tags: z.array(z.string().min(1).max(64)).max(50).optional(),
  launchAt: z.coerce.date().nullable().optional(),
  endAt: z.coerce.date().nullable().optional(),
});
export type CreateProgramBody = z.infer<typeof createProgramBodySchema>;

export const updateProgramBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(100_000).optional(),
  policy: policyJsonSchema.optional(),
  rewardPolicy: rewardPolicySchema.optional(),
  eligibilityRules: z.string().max(50_000).nullable().optional(),
  legalTerms: z.string().max(50_000).nullable().optional(),
  maxRewardUsd: z.number().int().nonnegative().nullable().optional(),
  allowPublicDisclosure: z.boolean().optional(),
  requiresInvite: z.boolean().optional(),
  slaConfig: slaConfigSchema.optional(),
  tags: z.array(z.string().min(1).max(64)).max(50).optional(),
  launchAt: z.coerce.date().nullable().optional(),
  endAt: z.coerce.date().nullable().optional(),
});
export type UpdateProgramBody = z.infer<typeof updateProgramBodySchema>;

export const programStatusBodySchema = z.object({
  status: z.nativeEnum(ProgramStatus),
});
export type ProgramStatusBody = z.infer<typeof programStatusBodySchema>;

export const programInviteBodySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('email'), email: z.string().email().max(255) }),
  z.object({ kind: z.literal('userId'), userId: z.string().min(1) }),
]);
export type ProgramInviteBody = z.infer<typeof programInviteBodySchema>;

export const orgSlugParamsSchema = z.object({
  slug: z.string().min(1).max(80),
});

export const programSlugParamsSchema = z.object({
  programSlug: z.string().min(1).max(80),
});

export const programInviteIdParamsSchema = z.object({
  programSlug: z.string().min(1).max(80),
  id: z.string().min(1),
});
