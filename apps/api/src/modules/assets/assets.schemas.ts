import { z } from 'zod';
import { AssetType } from '@bughuntr/db';

export const programSlugParamSchema = z.object({
  slug: z.string().min(1).max(80),
});

export const assetIdParamSchema = z.object({
  slug: z.string().min(1).max(80),
  id: z.string().min(1),
});

export const createAssetBodySchema = z.object({
  type: z.nativeEnum(AssetType),
  identifier: z.string().min(1).max(500),
  scopeGroupId: z.string().min(1),
  description: z.string().max(1000).nullable().optional(),
  inScope: z.boolean().optional(),
  wildcardSupport: z.boolean().optional(),
  tags: z.array(z.string().min(1).max(64)).max(50).optional(),
  notes: z.string().max(2000).nullable().optional(),
  ownershipMeta: z.record(z.string(), z.unknown()).nullable().optional(),
});
export type CreateAssetBody = z.infer<typeof createAssetBodySchema>;

export const updateAssetBodySchema = createAssetBodySchema.partial();
export type UpdateAssetBody = z.infer<typeof updateAssetBodySchema>;

export const listAssetsQuerySchema = z.object({
  q: z.string().max(200).optional(),
  type: z.nativeEnum(AssetType).optional(),
  inScope: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  tag: z.string().max(64).optional(),
  scopeGroupId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().max(500).optional(),
});

export const importJsonBodySchema = z.object({
  assets: z.array(z.record(z.string(), z.unknown())).min(1).max(500),
});

export const importRowSchema = z.object({
  type: z.nativeEnum(AssetType),
  identifier: z.string().min(1).max(500),
  description: z.string().max(1000).nullable().optional(),
  inScope: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  notes: z.string().max(2000).nullable().optional(),
});
export type ImportRow = z.infer<typeof importRowSchema>;
