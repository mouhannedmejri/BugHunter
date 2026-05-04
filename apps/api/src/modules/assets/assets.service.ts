import { parse } from 'csv-parse/sync';
import {
  prisma,
  Prisma,
  AssetType,
  OrgRole,
  ProgramStatus,
  type Asset,
} from '@bughuntr/db';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '@bughuntr/shared';
import { ProgramService } from '../programs/programs.service.js';
import { OrganizationService } from '../organizations/organizations.service.js';
import type {
  CreateAssetBody,
  ImportRow,
  UpdateAssetBody,
} from './assets.schemas.js';
import { importRowSchema } from './assets.schemas.js';
import {
  scheduleAssetVerification,
  validateAssetBeforePersist,
} from './assets.validation.js';

const PM_OR_OA: OrgRole[] = [OrgRole.PROGRAM_MANAGER, OrgRole.ORG_ADMIN];

const ASSET_DIFF_KEYS = [
  'type',
  'identifier',
  'description',
  'inScope',
  'wildcardSupport',
  'tags',
  'notes',
  'ownershipMeta',
] as const;

type AssetDiffKey = (typeof ASSET_DIFF_KEYS)[number];

async function assertScopeGroupForProgram(
  programId: string,
  scopeGroupId: string,
): Promise<void> {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "ProgramScopeGroup"
    WHERE "id" = ${scopeGroupId}
      AND "programId" = ${programId}
    LIMIT 1
  `;
  if (rows.length === 0) {
    throw new BadRequestError('Invalid scope group');
  }
}

function snapshotForHistory(a: Asset): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const k of ASSET_DIFF_KEYS) {
    o[k] = a[k as AssetDiffKey] as unknown;
  }
  return o;
}

function computeDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): { before: Record<string, unknown>; after: Record<string, unknown> } {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  for (const k of keys) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
      b[k] = before[k];
      a[k] = after[k];
    }
  }
  return { before: b, after: a };
}

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`, 'utf8').toString(
    'base64url',
  );
}

function decodeCursor(raw: string): { createdAt: Date; id: string } {
  try {
    const s = Buffer.from(raw, 'base64url').toString('utf8');
    const pipe = s.indexOf('|');
    if (pipe < 0) throw new Error('bad');
    return { createdAt: new Date(s.slice(0, pipe)), id: s.slice(pipe + 1) };
  } catch {
    throw new BadRequestError('Invalid cursor');
  }
}

async function getProgramBySlug(slug: string) {
  const program = await prisma.program.findFirst({
    where: { slug, deletedAt: null },
    include: { org: { select: { id: true, slug: true } } },
  });
  if (!program) throw new NotFoundError('Program');
  return program;
}

function assertPmOrOa(role: OrgRole): void {
  if (!PM_OR_OA.includes(role)) {
    throw new ForbiddenError('Program Manager or Organization Admin role required');
  }
}

async function assertPmOaForProgram(actorId: string, programSlug: string) {
  const program = await getProgramBySlug(programSlug);
  const { member } = await OrganizationService.assertOrgMembership(
    actorId,
    program.org.slug,
    PM_OR_OA,
  );
  assertPmOrOa(member.role);
  return program;
}

async function isPmOaForProgram(
  userId: string,
  program: Awaited<ReturnType<typeof getProgramBySlug>>,
): Promise<boolean> {
  const m = await prisma.organizationMember.findUnique({
    where: { orgId_userId: { orgId: program.orgId, userId } },
  });
  return Boolean(m && PM_OR_OA.includes(m.role));
}

export type ListAssetsQuery = {
  q?: string;
  type?: AssetType;
  inScope?: boolean;
  tag?: string;
  scopeGroupId?: string;
  limit: number;
  cursor?: string;
};

export class AssetService {
  static async createAsset(
    programSlug: string,
    actorId: string,
    body: CreateAssetBody,
  ): Promise<Asset> {
    const program = await assertPmOaForProgram(actorId, programSlug);
    await assertScopeGroupForProgram(program.id, body.scopeGroupId);
    const normalized = await validateAssetBeforePersist(body.type, body.identifier);

    const wildcardSupport =
      normalized.wildcardSupport || body.wildcardSupport === true;
    const inScope = body.inScope ?? true;
    const tags = [...new Set(body.tags ?? [])];

    const asset = await prisma.asset.create({
      data: {
        programId: program.id,
        type: body.type,
        identifier: normalized.identifier,
        description: body.description ?? undefined,
        inScope,
        wildcardSupport,
        tags,
        notes: body.notes ?? undefined,
        ownershipMeta:
          body.ownershipMeta === null
            ? Prisma.JsonNull
            : (body.ownershipMeta as Prisma.InputJsonValue | undefined),
      },
    });

    await prisma.$executeRaw`
      UPDATE "Asset"
      SET "scopeGroupId" = ${body.scopeGroupId}
      WHERE "id" = ${asset.id}
    `;

    await prisma.auditLog.create({
      data: {
        actorId,
        orgId: program.orgId,
        action: 'ASSET_CREATED',
        entityType: 'Asset',
        entityId: asset.id,
        after: snapshotForHistory(asset) as Prisma.InputJsonValue,
      },
    });

    await scheduleAssetVerification(asset.id);
    return asset;
  }

  static async listAssets(
    programSlug: string,
    viewerId: string | null,
    query: ListAssetsQuery,
  ) {
    const program = await getProgramBySlug(programSlug);
    const canScope = await ProgramService.canViewProgramScope(program, viewerId);
    if (!canScope) {
      throw new ForbiddenError('You cannot view assets for this program');
    }

    const staff =
      viewerId !== null && (await isPmOaForProgram(viewerId, program));

    if (!staff && program.status !== ProgramStatus.ACTIVE) {
      throw new ForbiddenError('Program is not active');
    }

    const where: Prisma.AssetWhereInput = {
      programId: program.id,
      deletedAt: null,
    };

    if (!staff) {
      where.inScope = true;
    } else if (query.inScope !== undefined) {
      where.inScope = query.inScope;
    }

    if (query.q?.trim()) {
      const q = query.q.trim();
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            { identifier: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.tag?.trim()) {
      where.tags = { has: query.tag.trim() };
    }
    let cursorFilter: Prisma.AssetWhereInput | undefined;
    if (query.cursor) {
      const c = decodeCursor(query.cursor);
      cursorFilter = {
        OR: [
          { createdAt: { lt: c.createdAt } },
          {
            AND: [{ createdAt: c.createdAt }, { id: { lt: c.id } }],
          },
        ],
      };
    }

    const finalWhere =
      cursorFilter !== undefined ? { AND: [where, cursorFilter] } : where;

    const take = query.limit + 1;
    let rows = await prisma.asset.findMany({
      where: finalWhere,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
    });

    if (query.scopeGroupId) {
      const ids = rows.map((r) => r.id);
      if (ids.length > 0) {
        const scopedIds = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT "id"
          FROM "Asset"
          WHERE "id" IN (${Prisma.join(ids)})
            AND "scopeGroupId" = ${query.scopeGroupId}
        `;
        const allowed = new Set(scopedIds.map((r) => r.id));
        rows = rows.filter((row) => allowed.has(row.id));
      } else {
        rows = [];
      }
    }

    const page = rows.slice(0, query.limit);
    const hasMore = rows.length > query.limit;
    const nextCursor =
      hasMore && page.length > 0
        ? encodeCursor(
            page[page.length - 1]!.createdAt,
            page[page.length - 1]!.id,
          )
        : null;

    return { items: page, nextCursor };
  }

  static async getAssetDetail(
    programSlug: string,
    assetId: string,
    viewerId: string | null,
  ): Promise<Asset> {
    const program = await getProgramBySlug(programSlug);
    const canScope = await ProgramService.canViewProgramScope(program, viewerId);
    if (!canScope) {
      throw new ForbiddenError('You cannot view this asset');
    }

    const staff =
      viewerId !== null && (await isPmOaForProgram(viewerId, program));

    if (!staff && program.status !== ProgramStatus.ACTIVE) {
      throw new ForbiddenError('Program is not active');
    }

    const asset = await prisma.asset.findFirst({
      where: { id: assetId, programId: program.id, deletedAt: null },
    });
    if (!asset) throw new NotFoundError('Asset');

    if (!staff && !asset.inScope) {
      throw new ForbiddenError('You cannot view this asset');
    }

    return asset;
  }

  static async updateAsset(
    programSlug: string,
    assetId: string,
    actorId: string,
    body: UpdateAssetBody,
  ): Promise<Asset> {
    const program = await assertPmOaForProgram(actorId, programSlug);
    const existing = await prisma.asset.findFirst({
      where: { id: assetId, programId: program.id, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('Asset');

    const beforeSnap = snapshotForHistory(existing);

    let identifier = existing.identifier;
    let wildcardSupport = existing.wildcardSupport;
    let type = existing.type;

    if (body.type !== undefined) type = body.type;
    if (body.identifier !== undefined || body.type !== undefined) {
      const rawId = body.identifier ?? existing.identifier;
      const normalized = await validateAssetBeforePersist(type, rawId);
      identifier = normalized.identifier;
      wildcardSupport =
        normalized.wildcardSupport ||
        body.wildcardSupport === true ||
        (body.wildcardSupport === undefined && existing.wildcardSupport);
    } else if (body.wildcardSupport !== undefined) {
      wildcardSupport = body.wildcardSupport;
    }

    const data: Prisma.AssetUpdateInput = {};
    if (body.description !== undefined) {
      data.description = body.description ?? null;
    }
    if (body.inScope !== undefined) data.inScope = body.inScope;
    if (body.notes !== undefined) data.notes = body.notes ?? null;
    if (body.tags !== undefined) {
      data.tags = [...new Set(body.tags)];
    }
    if (body.ownershipMeta !== undefined) {
      data.ownershipMeta =
        body.ownershipMeta === null
          ? Prisma.JsonNull
          : (body.ownershipMeta as Prisma.InputJsonValue);
    }
    if (body.scopeGroupId !== undefined) {
      await assertScopeGroupForProgram(program.id, body.scopeGroupId);
    }
    if (body.identifier !== undefined || body.type !== undefined) {
      data.identifier = identifier;
      data.type = type;
      data.wildcardSupport = wildcardSupport;
    } else if (body.wildcardSupport !== undefined) {
      data.wildcardSupport = body.wildcardSupport;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestError('No fields to update');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const a = await tx.asset.update({
        where: { id: assetId },
        data,
      });

      if (body.scopeGroupId !== undefined) {
        await tx.$executeRaw`
          UPDATE "Asset"
          SET "scopeGroupId" = ${body.scopeGroupId}
          WHERE "id" = ${assetId}
        `;
      }

      const afterSnap = snapshotForHistory(a);
      const diff = computeDiff(beforeSnap, afterSnap);
      if (Object.keys(diff.before).length > 0) {
        await tx.assetScopeHistory.create({
          data: {
            assetId,
            changedBy: actorId,
            change: diff as unknown as Prisma.InputJsonValue,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId,
          orgId: program.orgId,
          action: 'ASSET_UPDATED',
          entityType: 'Asset',
          entityId: assetId,
          before: beforeSnap as Prisma.InputJsonValue,
          after: afterSnap as Prisma.InputJsonValue,
        },
      });

      return a;
    });

    await scheduleAssetVerification(assetId);
    return updated;
  }

  static async softDeleteAsset(
    programSlug: string,
    assetId: string,
    actorId: string,
  ): Promise<{ message: string }> {
    const program = await assertPmOaForProgram(actorId, programSlug);
    const existing = await prisma.asset.findFirst({
      where: { id: assetId, programId: program.id, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('Asset');

    const beforeSnap = snapshotForHistory(existing);
    const deletedAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.asset.update({
        where: { id: assetId },
        data: { deletedAt },
      });

      await tx.assetScopeHistory.create({
        data: {
          assetId,
          changedBy: actorId,
          change: {
            before: beforeSnap,
            after: { deletedAt: deletedAt.toISOString() },
          } as unknown as Prisma.InputJsonValue,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          orgId: program.orgId,
          action: 'ASSET_DELETED',
          entityType: 'Asset',
          entityId: assetId,
          before: beforeSnap as Prisma.InputJsonValue,
        },
      });
    });

    return { message: 'Asset removed' };
  }

  static async toggleScope(
    programSlug: string,
    assetId: string,
    actorId: string,
  ): Promise<Asset> {
    const program = await assertPmOaForProgram(actorId, programSlug);
    const existing = await prisma.asset.findFirst({
      where: { id: assetId, programId: program.id, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('Asset');

    const beforeSnap = snapshotForHistory(existing);
    const nextInScope = !existing.inScope;

    return prisma.$transaction(async (tx) => {
      const a = await tx.asset.update({
        where: { id: assetId },
        data: { inScope: nextInScope },
      });

      const afterSnap = snapshotForHistory(a);
      await tx.assetScopeHistory.create({
        data: {
          assetId,
          changedBy: actorId,
          change: computeDiff(beforeSnap, afterSnap) as unknown as Prisma.InputJsonValue,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          orgId: program.orgId,
          action: 'ASSET_SCOPE_TOGGLED',
          entityType: 'Asset',
          entityId: assetId,
          after: { inScope: nextInScope } as Prisma.InputJsonValue,
        },
      });

      return a;
    });
  }

  static async listScopeHistory(
    programSlug: string,
    assetId: string,
    actorId: string,
  ) {
    const program = await assertPmOaForProgram(actorId, programSlug);
    const asset = await prisma.asset.findFirst({
      where: { id: assetId, programId: program.id },
    });
    if (!asset) throw new NotFoundError('Asset');

    return prisma.assetScopeHistory.findMany({
      where: { assetId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async importAssets(
    programSlug: string,
    actorId: string,
    rows: ImportRow[],
  ): Promise<{ imported: number; errors: { index: number; message: string }[] }> {
    if (rows.length > 500) {
      throw new BadRequestError('Maximum 500 assets per import');
    }

    const program = await assertPmOaForProgram(actorId, programSlug);
    const errors: { index: number; message: string }[] = [];
    let imported = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      try {
        const normalized = await validateAssetBeforePersist(
          row.type,
          row.identifier,
        );
        const wildcardSupport = normalized.wildcardSupport;
        const tags = [...new Set(row.tags)];

        const afterSnap = {
          type: row.type,
          identifier: normalized.identifier,
          description: row.description ?? null,
          inScope: row.inScope,
          wildcardSupport,
          tags,
          notes: row.notes ?? null,
        };

        const newId = await prisma.$transaction(async (tx) => {
          const a = await tx.asset.create({
            data: {
              programId: program.id,
              type: row.type,
              identifier: normalized.identifier,
              description: row.description ?? undefined,
              inScope: row.inScope,
              wildcardSupport,
              tags,
              notes: row.notes ?? undefined,
            },
          });

          await tx.assetScopeHistory.create({
            data: {
              assetId: a.id,
              changedBy: actorId,
              change: {
                source: 'import',
                rowIndex: i,
                before: null,
                after: afterSnap,
              } as unknown as Prisma.InputJsonValue,
            },
          });

          await tx.auditLog.create({
            data: {
              actorId,
              orgId: program.orgId,
              action: 'ASSET_IMPORTED',
              entityType: 'Asset',
              entityId: a.id,
              after: { rowIndex: i } as Prisma.InputJsonValue,
            },
          });

          return a.id;
        });

        await scheduleAssetVerification(newId);

        imported++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        errors.push({ index: i, message: msg });
      }
    }

    return { imported, errors };
  }
}

export function parseImportRowsFromCsv(text: string): {
  rows: ImportRow[];
  errors: { index: number; message: string }[];
} {
  let records: Record<string, string>[];
  try {
    records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as Record<string, string>[];
  } catch {
    return { rows: [], errors: [{ index: 0, message: 'Invalid CSV payload' }] };
  }

  const rows: ImportRow[] = [];
  const errors: { index: number; message: string }[] = [];

  records.forEach((rec, index) => {
    const typeStr = rec['type'] ?? rec['Type'];
    const identifier = rec['identifier'] ?? rec['Identifier'];
    const description =
      rec['description'] ?? rec['Description'] ?? undefined;
    const inScopeRaw = (
      rec['inScope'] ??
      rec['in_scope'] ??
      rec['InScope'] ??
      'true'
    ).toLowerCase();
    const inScope = ['true', '1', 'yes', 'y'].includes(inScopeRaw);
    const tagsRaw = rec['tags'] ?? rec['Tags'] ?? '';
    const tags = tagsRaw
      ? tagsRaw
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];
    const notes = rec['notes'] ?? rec['Notes'] ?? undefined;

    if (!typeStr || !identifier) {
      errors.push({
        index,
        message: 'Missing type or identifier',
      });
      return;
    }

    const parsed = importRowSchema.safeParse({
      type: typeStr,
      identifier,
      description: description || null,
      inScope,
      tags,
      notes: notes || null,
    });

    if (!parsed.success) {
      errors.push({
        index,
        message: parsed.error.errors.map((e) => e.message).join(', '),
      });
      return;
    }

    rows.push(parsed.data);
  });

  return { rows, errors };
}

export function parseImportRowsFromJson(
  raw: unknown[],
): { rows: ImportRow[]; errors: { index: number; message: string }[] } {
  const errors: { index: number; message: string }[] = [];
  const rows: ImportRow[] = [];

  raw.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      errors.push({ index, message: 'Expected object' });
      return;
    }
    const o = item as Record<string, unknown>;
    const parsed = importRowSchema.safeParse({
      type: o['type'],
      identifier: o['identifier'],
      description: o['description'] ?? null,
      inScope:
        typeof o['inScope'] === 'boolean'
          ? o['inScope']
          : String(o['inScope'] ?? 'true').toLowerCase() === 'true',
      tags: Array.isArray(o['tags'])
        ? o['tags'].map(String)
        : typeof o['tags'] === 'string'
          ? o['tags']
              .split(',')
              .map((t: string) => t.trim())
              .filter(Boolean)
          : [],
      notes: o['notes'] ?? null,
    });
    if (!parsed.success) {
      errors.push({
        index,
        message: parsed.error.errors.map((e) => e.message).join(', '),
      });
      return;
    }
    rows.push(parsed.data);
  });

  return { rows, errors };
}
