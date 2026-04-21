import { z } from 'zod';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createOrgOnboardingBodySchema = z.object({
  orgName: z.string().min(1).max(200),
  orgSlug: z
    .string()
    .min(2)
    .max(80)
    .regex(slugRegex)
    .optional(),
});
export type CreateOrgOnboardingBody = z.infer<typeof createOrgOnboardingBodySchema>;
