import { z } from 'zod';
import { AssetType, ProgramStatus, ProgramType, PayoutStatus, ReportStatus, Severity } from '@bughuntr/db';

/** Query strings often send `q=` (empty); treat as absent so Zod does not fail `.min(1)`. */
const optionalNonEmptyString = z.preprocess(
  (val) => (val === '' || val === undefined || val === null ? undefined : val),
  z.string().min(1).optional(),
);

const cursorSchema = z.object({
  cursor: z.string().min(1).optional(),
  take: z.coerce.number().int().min(1).max(50).default(20),
});

export const searchReportsQuerySchema = cursorSchema.extend({
  q: optionalNonEmptyString,
  status: z.nativeEnum(ReportStatus).optional(),
  severity: z.nativeEnum(Severity).optional(),
  program: z.string().min(1).optional(),
  asset: z.string().min(1).optional(),
  researcher: z.string().min(1).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  isDuplicate: z.enum(['true', 'false']).optional(),
  hasSlaBreached: z.enum(['true', 'false']).optional(),
  payoutStatus: z.nativeEnum(PayoutStatus).optional(),
});
export type SearchReportsQuery = z.infer<typeof searchReportsQuerySchema>;

export const searchProgramsQuerySchema = cursorSchema.extend({
  q: optionalNonEmptyString,
  type: z.nativeEnum(ProgramType).optional(),
  status: z.nativeEnum(ProgramStatus).optional(),
});
export type SearchProgramsQuery = z.infer<typeof searchProgramsQuerySchema>;

export const searchResearchersQuerySchema = cursorSchema.extend({
  q: optionalNonEmptyString,
  country: z.string().min(2).max(2).optional(),
});
export type SearchResearchersQuery = z.infer<typeof searchResearchersQuerySchema>;

export const searchAssetsQuerySchema = cursorSchema.extend({
  q: optionalNonEmptyString,
  type: z.nativeEnum(AssetType).optional(),
  program: z.string().min(1).optional(),
  inScope: z.enum(['true', 'false']).optional(),
});
export type SearchAssetsQuery = z.infer<typeof searchAssetsQuerySchema>;
