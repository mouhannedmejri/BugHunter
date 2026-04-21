import { z } from 'zod';
import { PaymentMethod } from '@bughuntr/db';

export const reportIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const rewardIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const orgSlugParamsSchema = z.object({
  slug: z.string().min(1).max(80),
});

export const programSlugParamsSchema = z.object({
  programSlug: z.string().min(1).max(80),
});

export const rewardDecisionBodySchema = z.object({
  decision: z.enum(['APPROVED', 'PARTIAL', 'NO_REWARD']),
  amountUsd: z.number().int().nonnegative(),
  bonusUsd: z.number().int().nonnegative().optional(),
  reason: z.string().max(10_000).optional(),
  overridePolicy: z.boolean().optional(),
});
export type RewardDecisionBody = z.infer<typeof rewardDecisionBodySchema>;

export const rejectRewardBodySchema = z.object({
  reason: z.string().min(1).max(10_000),
});
export type RejectRewardBody = z.infer<typeof rejectRewardBodySchema>;

export const triggerPayoutBodySchema = z.object({
  method: z.nativeEnum(PaymentMethod).optional(),
});
export type TriggerPayoutBody = z.infer<typeof triggerPayoutBodySchema>;

export const retryPayoutBodySchema = z.object({
  reason: z.string().max(10_000).optional(),
  manualTxHash: z.string().max(255).optional(),
});
export type RetryPayoutBody = z.infer<typeof retryPayoutBodySchema>;
