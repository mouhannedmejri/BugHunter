import { z } from 'zod';

export const reportsMeQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});


export const reportsIdParamsSchema = z.object({
  id: z.string().min(1),
});