import { z } from 'zod';
import { VulnCategory, Severity } from '@bughuntr/shared';

export const reportIdParamSchema = z.object({
  id: z.string().min(1, 'Report ID is required'),
});
export type ReportIdParam = z.infer<typeof reportIdParamSchema>;

export const submissionCopilotBodySchema = z.object({
  title: z.string().default(''),
  vulnCategory: z.nativeEnum(VulnCategory).optional(),
  targetAsset: z.string().default(''),
  reproSteps: z.string().default(''),
  impactExplanation: z.string().default(''),
});
export type SubmissionCopilotBody = z.infer<typeof submissionCopilotBodySchema>;

export const aiAssessmentResponseSchema = z.object({
  id: z.string(),
  reportId: z.string(),
  predictedSeverity: z.nativeEnum(Severity),
  cvssVector: z.string(),
  cvssScore: z.number(),
  cweId: z.string().nullable().optional(),
  cweName: z.string().nullable().optional(),
  reasoning: z.string(),
  scopeStatus: z.string(),
  scopeRationale: z.string().nullable().optional(),
  remediationNotes: z.string().nullable().optional(),
  duplicateCandidateId: z.string().nullable().optional(),
  duplicateSimilarity: z.number().nullable().optional(),
  duplicateRationale: z.string().nullable().optional(),
  status: z.string(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});
