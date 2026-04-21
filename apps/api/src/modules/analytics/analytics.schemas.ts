import { z } from 'zod';

export const orgSlugParamsSchema = z.object({
  slug: z.string().min(1).max(80),
});

export const periodQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
});
export type PeriodQuery = z.infer<typeof periodQuerySchema>;

export const analyticsExportQuerySchema = z.object({
  format: z.enum(['csv', 'pdf']).default('csv'),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});
export type AnalyticsExportQuery = z.infer<typeof analyticsExportQuerySchema>;

export const exportJobParamsSchema = z.object({
  jobId: z.string().min(1),
});
