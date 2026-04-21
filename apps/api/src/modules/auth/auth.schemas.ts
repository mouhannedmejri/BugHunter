import { z } from 'zod';

// ─── Request Schemas ─────────────────────────────────────

export const registerBodySchema = z.object({
  email: z.string().email().max(255),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain digit')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
  username: z
    .string()
    .min(3)
    .max(39)
    .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?$/),
  displayName: z.string().min(1).max(100).optional(),
  accountType: z.enum(['RESEARCHER', 'COMPANY']).default('RESEARCHER'),
  /** @deprecated Ignored — org name is set in onboarding after email verification. */
  companyName: z.string().max(200).optional(),
});
export type RegisterBody = z.infer<typeof registerBodySchema>;

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpCode: z.string().length(6).optional(),
});
export type LoginBody = z.infer<typeof loginBodySchema>;

export const verifyEmailBodySchema = z.object({
  token: z.string().min(1),
});
export type VerifyEmailBody = z.infer<typeof verifyEmailBodySchema>;

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1).optional(),
});
export type RefreshBody = z.infer<typeof refreshBodySchema>;

export const forgotPasswordBodySchema = z.object({
  email: z.string().email(),
});
export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>;

export const resetPasswordBodySchema = z.object({
  token: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain digit')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
});
export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;

export const totpVerifyBodySchema = z.object({
  code: z.string().length(6),
});
export type TotpVerifyBody = z.infer<typeof totpVerifyBodySchema>;

export const revokeSessionParamsSchema = z.object({
  id: z.string().min(1),
});
export type RevokeSessionParams = z.infer<typeof revokeSessionParamsSchema>;

export const loginHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type LoginHistoryQuery = z.infer<typeof loginHistoryQuerySchema>;
