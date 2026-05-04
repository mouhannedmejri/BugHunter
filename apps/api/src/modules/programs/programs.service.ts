import { randomBytes } from 'node:crypto';
import slugify from 'slugify';
import {
  prisma,
  OrgRole,
  ProgramStatus,
  ProgramType,
  type Asset,
  type Prisma,
  type Program,
} from '@bughuntr/db';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '@bughuntr/shared';
import { OrganizationService } from '../organizations/organizations.service.js';
import {
  notifyProgramClosedParticipants,
  notifyResearchersProgramLaunched,
} from './programs.notifications.js';
import { mergeSlaConfig, seedSlaRecordsForProgram } from './programs.sla.js';
import type {
  CreateScopeGroupBody,
  CreateProgramBody,
  ProgramInviteBody,
  ProgramStatusBody,
  UpdateScopeGroupBody,
  UpdateProgramBody,
} from './programs.schemas.js';

const PM_OR_OA: OrgRole[] = [OrgRole.PROGRAM_MANAGER, OrgRole.ORG_ADMIN];

function slugFromTitle(title: string): string {
  let s = slugify(title, { lower: true, strict: true, trim: true });
  if (!s) s = 'program';
  return s.slice(0, 60);
}

async function allocateUniqueProgramSlug(preferred: string): Promise<string> {
  let candidate = preferred;
  let n = 2;
  while (
    await prisma.program.findFirst({
      where: { slug: candidate, deletedAt: null },
    })
  ) {
    const suffix = `-${n++}`;
    candidate = `${preferred.slice(0, Math.max(1, 60 - suffix.length))}${suffix}`;
  }
  return candidate;
}

function assertPmOrOa(role: OrgRole): void {
  if (!PM_OR_OA.includes(role)) {
    throw new ForbiddenError('Program Manager or Organization Admin role required');
  }
}

function allowedStatusTransitions(from: ProgramStatus): ProgramStatus[] {
  switch (from) {
    case ProgramStatus.DRAFT:
      return [ProgramStatus.ACTIVE];
    case ProgramStatus.ACTIVE:
      return [ProgramStatus.PAUSED, ProgramStatus.CLOSED];
    case ProgramStatus.PAUSED:
      return [ProgramStatus.ACTIVE, ProgramStatus.CLOSED];
    case ProgramStatus.CLOSED:
      return [ProgramStatus.ARCHIVED];
    default:
      return [];
  }
}

function assertStatusTransition(from: ProgramStatus, to: ProgramStatus): void {
  if (!allowedStatusTransitions(from).includes(to)) {
    throw new BadRequestError(`Invalid status transition: ${from} → ${to}`);
  }
}

function needsInviteGate(program: Program): boolean {
  return program.type === ProgramType.PRIVATE || program.requiresInvite;
}

type ScopeGroupRow = {
  id: string;
  name: string;
  isDefault: boolean;
  triageOptions: unknown;
  rewardPolicy: unknown;
  createdAt: Date;
  updatedAt: Date;
};

const defaultTriageOptions = {
  duplicatePolicy: 'first',
  autoAcceptLow: false,
  requiresManualReview: true,
};

async function listScopeGroups(programId: string): Promise<ScopeGroupRow[]> {
  return prisma.$queryRaw<ScopeGroupRow[]>`
    SELECT
      "id",
      "name",
      "isDefault",
      "triageOptions",
      "rewardPolicy",
      "createdAt",
      "updatedAt"
    FROM "ProgramScopeGroup"
    WHERE "programId" = ${programId}
    ORDER BY "isDefault" DESC, "createdAt" ASC
  `;
}

async function ensureDefaultScopeGroup(
  programId: string,
  rewardPolicy: unknown,
  policy: unknown,
) {
  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "ProgramScopeGroup"
    WHERE "programId" = ${programId}
      AND "isDefault" = true
    LIMIT 1
  `;
  if (existing.length > 0) return existing[0]!.id;

  const created = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "ProgramScopeGroup" (
      "id",
      "programId",
      "name",
      "isDefault",
      "triageOptions",
      "rewardPolicy",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${`sg_${randomBytes(8).toString('hex')}`},
      ${programId},
      'Default In Scope',
      true,
      ${JSON.stringify((policy as Record<string, unknown> | null) ?? defaultTriageOptions)}::jsonb,
      ${JSON.stringify(rewardPolicy ?? {})}::jsonb,
      NOW(),
      NOW()
    )
    RETURNING "id"
  `;
  return created[0]!.id;
}

export class ProgramService {
  static async isOrgStaff(program: Program, userId: string): Promise<boolean> {
    const m = await prisma.organizationMember.findUnique({
      where: { orgId_userId: { orgId: program.orgId, userId } },
    });
    return Boolean(m);
  }

  static async hasUsedProgramInvite(
    programId: string,
    userId: string,
  ): Promise<boolean> {
    const inv = await prisma.programInvite.findFirst({
      where: {
        programId,
        userId,
        usedAt: { not: null },
      },
    });
    return Boolean(inv);
  }

/**
    * Researcher may participate (e.g. submit) when program is ACTIVE, user is in good standing,
    * and invite/join rules are satisfied.
    */
  static async isEligible(userId: string, programId: string): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null, bannedAt: null },
    });
    if (!user) return false;

    const program = await prisma.program.findFirst({
      where: { id: programId, deletedAt: null },
    });
    if (!program || program.status !== ProgramStatus.ACTIVE) return false;

    if (await ProgramService.isOrgStaff(program, userId)) return true;

    if (program.type === ProgramType.PUBLIC && !program.requiresInvite) {
      return true;
    }

    return ProgramService.hasUsedProgramInvite(programId, userId);
  }

  static async canViewProgramScope(
    program: Program,
    viewerUserId: string | null,
  ): Promise<boolean> {
    if (viewerUserId && (await ProgramService.isOrgStaff(program, viewerUserId))) {
      return true;
    }

    if (!needsInviteGate(program)) {
      return (
        program.type === ProgramType.PUBLIC &&
        program.status === ProgramStatus.ACTIVE
      );
    }
    if (!viewerUserId) return false;
    return ProgramService.hasUsedProgramInvite(program.id, viewerUserId);
  }

  static async createProgram(
    orgSlug: string,
    actorUserId: string,
    body: CreateProgramBody,
  ): Promise<Program> {
    const { org, member } = await OrganizationService.assertOrgMembership(
      actorUserId,
      orgSlug,
      PM_OR_OA,
    );
    assertPmOrOa(member.role);

    const baseSlug = body.slug ?? slugFromTitle(body.title);
    const finalSlug = await allocateUniqueProgramSlug(baseSlug);
    const slaMerged = mergeSlaConfig(body.slaConfig ?? {});

    const program = await prisma.$transaction(async (tx) => {
      const p = await tx.program.create({
        data: {
          orgId: org.id,
          slug: finalSlug,
          title: body.title,
          description: body.description,
          type: body.type,
          status: ProgramStatus.DRAFT,
          policy: body.policy as Prisma.InputJsonValue,
          rewardPolicy: body.rewardPolicy as unknown as Prisma.InputJsonValue,
          eligibilityRules: body.eligibilityRules ?? undefined,
          legalTerms: body.legalTerms ?? undefined,
          maxRewardUsd: body.maxRewardUsd ?? undefined,
          allowPublicDisclosure: body.allowPublicDisclosure ?? false,
          requiresInvite: body.requiresInvite ?? false,
          slaConfig: slaMerged as unknown as Prisma.InputJsonValue,
          launchAt: body.launchAt ?? undefined,
          endAt: body.endAt ?? undefined,
        },
      });

      if (body.tags?.length) {
        const tags = [...new Set(body.tags)];
        await tx.programTag.createMany({
          data: tags.map((tag) => ({ programId: p.id, tag })),
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: actorUserId,
          orgId: org.id,
          action: 'PROGRAM_CREATED',
          entityType: 'Program',
          entityId: p.id,
          after: { slug: p.slug, title: p.title, type: p.type },
        },
      });

      return p;
    });

    await ensureDefaultScopeGroup(program.id, body.rewardPolicy, body.policy);

    return program;
  }

  static async listPublicPrograms() {
    return prisma.program.findMany({
      where: {
        type: ProgramType.PUBLIC,
        status: ProgramStatus.ACTIVE,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        type: true,
        status: true,
        maxRewardUsd: true,
        totalPaidUsd: true,
        allowPublicDisclosure: true,
        requiresInvite: true,
        createdAt: true,
        org: { select: { id: true, name: true, slug: true, logoUrl: true } },
        tags: { select: { tag: true } },
      },
    });
  }

  static async getProgramBySlug(programSlug: string) {
    const program = await prisma.program.findFirst({
      where: { slug: programSlug, deletedAt: null },
      include: {
        org: { select: { id: true, name: true, slug: true, logoUrl: true } },
        tags: true,
      },
    });
    if (!program) throw new NotFoundError('Program');
    return program;
  }

  static async getProgramDetail(programSlug: string, viewerUserId: string | null) {
    const program = await ProgramService.getProgramBySlug(programSlug);
    const canViewScope = await ProgramService.canViewProgramScope(
      program,
      viewerUserId,
    );
    const scopeGroups = await listScopeGroups(program.id);

    const tagList = program.tags.map((t) => t.tag);

    if (!canViewScope) {
      return {
        program: {
          id: program.id,
          slug: program.slug,
          title: program.title,
          description: program.description,
          type: program.type,
          status: program.status,
          org: program.org,
          tags: tagList,
          requiresInvite: program.requiresInvite,
          allowPublicDisclosure: program.allowPublicDisclosure,
          maxRewardUsd: program.maxRewardUsd,
          totalPaidUsd: program.totalPaidUsd,
          launchAt: program.launchAt,
          endAt: program.endAt,
          createdAt: program.createdAt,
        },
        scopeGroups,
        assets: [] as Asset[],
        access: { canViewScope: false },
      };
    }

    const assets = await prisma.$queryRaw<Array<Asset & { scopeGroupId: string | null }>>`
      SELECT
        "id",
        "programId",
        "type",
        "identifier",
        "description",
        "inScope",
        "verified",
        "verifiedAt",
        "wildcardSupport",
        "tags",
        "ownershipMeta",
        "notes",
        "createdAt",
        "updatedAt",
        "deletedAt",
        "scopeGroupId"
      FROM "Asset"
      WHERE "programId" = ${program.id}
        AND "deletedAt" IS NULL
      ORDER BY "createdAt" ASC
    `;

    return {
      program: {
        id: program.id,
        orgId: program.orgId,
        slug: program.slug,
        title: program.title,
        description: program.description,
        type: program.type,
        status: program.status,
        policy: program.policy,
        rewardPolicy: program.rewardPolicy,
        eligibilityRules: program.eligibilityRules,
        legalTerms: program.legalTerms,
        maxRewardUsd: program.maxRewardUsd,
        totalPaidUsd: program.totalPaidUsd,
        allowPublicDisclosure: program.allowPublicDisclosure,
        requiresInvite: program.requiresInvite,
        slaConfig: program.slaConfig,
        launchAt: program.launchAt,
        endAt: program.endAt,
        createdAt: program.createdAt,
        updatedAt: program.updatedAt,
        org: program.org,
        tags: tagList,
      },
      scopeGroups,
      assets,
      access: { canViewScope: true },
    };
  }

  static async updateProgram(
    programSlug: string,
    actorUserId: string,
    body: UpdateProgramBody,
  ): Promise<Program> {
    const program = await ProgramService.getProgramBySlug(programSlug);
    const { member } = await OrganizationService.assertOrgMembership(
      actorUserId,
      program.org.slug,
      PM_OR_OA,
    );
    assertPmOrOa(member.role);

    const data: Prisma.ProgramUpdateInput = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.policy !== undefined) data.policy = body.policy as Prisma.InputJsonValue;
    if (body.rewardPolicy !== undefined) {
      data.rewardPolicy = body.rewardPolicy as unknown as Prisma.InputJsonValue;
    }
    if (body.eligibilityRules !== undefined) {
      data.eligibilityRules = body.eligibilityRules;
    }
    if (body.legalTerms !== undefined) data.legalTerms = body.legalTerms;
    if (body.maxRewardUsd !== undefined) data.maxRewardUsd = body.maxRewardUsd;
    if (body.allowPublicDisclosure !== undefined) {
      data.allowPublicDisclosure = body.allowPublicDisclosure;
    }
    if (body.requiresInvite !== undefined) {
      data.requiresInvite = body.requiresInvite;
    }
    if (body.slaConfig !== undefined) {
      data.slaConfig = mergeSlaConfig(body.slaConfig) as unknown as Prisma.InputJsonValue;
    }
    if (body.launchAt !== undefined) data.launchAt = body.launchAt;
    if (body.endAt !== undefined) data.endAt = body.endAt;

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.program.update({
        where: { id: program.id },
        data,
      });

      if (body.tags) {
        const tags = [...new Set(body.tags)];
        await tx.programTag.deleteMany({
          where: { programId: program.id, tag: { notIn: tags } },
        });
        for (const tag of tags) {
          await tx.programTag.upsert({
            where: {
              programId_tag: { programId: program.id, tag },
            },
            create: { programId: program.id, tag },
            update: {},
          });
        }
      }

      await tx.auditLog.create({
        data: {
          actorId: actorUserId,
          orgId: program.orgId,
          action: 'PROGRAM_UPDATED',
          entityType: 'Program',
          entityId: program.id,
          after: JSON.parse(JSON.stringify(body)) as Prisma.InputJsonValue,
        },
      });

      return p;
    });

    return updated;
  }

  static async transitionStatus(
    programSlug: string,
    actorUserId: string,
    body: ProgramStatusBody,
  ): Promise<Program> {
    const program = await ProgramService.getProgramBySlug(programSlug);
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: program.orgId },
    });
    const { member } = await OrganizationService.assertOrgMembership(
      actorUserId,
      org.slug,
      PM_OR_OA,
    );
    assertPmOrOa(member.role);

    const next = body.status;
    assertStatusTransition(program.status, next);

    if (next === ProgramStatus.ACTIVE && program.status === ProgramStatus.DRAFT) {
      const inScope = await prisma.asset.count({
        where: { programId: program.id, inScope: true, deletedAt: null },
      });
      if (inScope < 1) {
        throw new BadRequestError(
          'At least one in-scope asset is required before activating',
        );
      }
    }

    const updated = await prisma.program.update({
      where: { id: program.id },
      data: { status: next },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actorUserId,
        orgId: program.orgId,
        action: 'PROGRAM_STATUS_CHANGED',
        entityType: 'Program',
        entityId: program.id,
        before: { status: program.status },
        after: { status: next },
      },
    });

    if (next === ProgramStatus.ACTIVE) {
      await seedSlaRecordsForProgram(program.id);
      if (program.type === ProgramType.PUBLIC) {
        await notifyResearchersProgramLaunched({
          programId: program.id,
          programSlug: program.slug,
          title: program.title,
        });
      }
    }

    if (next === ProgramStatus.CLOSED) {
      await notifyProgramClosedParticipants({
        programId: program.id,
        programSlug: program.slug,
        title: program.title,
      });
    }

    return updated;
  }

  static async getProgramStats(programSlug: string, actorUserId: string) {
    const program = await ProgramService.getProgramBySlug(programSlug);
    const { member } = await OrganizationService.assertOrgMembership(
      actorUserId,
      program.org.slug,
      PM_OR_OA,
    );
    assertPmOrOa(member.role);

    const [statusCounts, rewardAgg] = await Promise.all([
      prisma.report.groupBy({
        by: ['status'],
        where: { programId: program.id },
        _count: { id: true },
      }),
      prisma.reward.aggregate({
        where: { programId: program.id, decision: 'APPROVED' },
        _sum: { amountUsd: true, bonusUsd: true },
      }),
    ]);

    const submissionsByStatus = Object.fromEntries(
      statusCounts.map((r) => [r.status, r._count.id]),
    ) as Record<string, number>;

    const payoutsCents =
      (rewardAgg._sum.amountUsd ?? 0) + (rewardAgg._sum.bonusUsd ?? 0);

    return {
      programId: program.id,
      submissionsByStatus,
      payoutsApprovedCents: payoutsCents,
      totalPaidUsdStored: program.totalPaidUsd,
    };
  }

  static async listScopeGroups(programSlug: string, actorUserId: string) {
    const program = await ProgramService.getProgramBySlug(programSlug);
    const { member } = await OrganizationService.assertOrgMembership(
      actorUserId,
      program.org.slug,
      PM_OR_OA,
    );
    assertPmOrOa(member.role);
    return listScopeGroups(program.id);
  }

  static async createScopeGroup(
    programSlug: string,
    actorUserId: string,
    body: CreateScopeGroupBody,
  ) {
    const program = await ProgramService.getProgramBySlug(programSlug);
    const { member } = await OrganizationService.assertOrgMembership(
      actorUserId,
      program.org.slug,
      PM_OR_OA,
    );
    assertPmOrOa(member.role);

    const created = await prisma.$queryRaw<ScopeGroupRow[]>`
      INSERT INTO "ProgramScopeGroup" (
        "id",
        "programId",
        "name",
        "isDefault",
        "triageOptions",
        "rewardPolicy",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${`sg_${randomBytes(8).toString('hex')}`},
        ${program.id},
        ${body.name},
        false,
        ${JSON.stringify(body.triageOptions)}::jsonb,
        ${JSON.stringify(body.rewardPolicy)}::jsonb,
        NOW(),
        NOW()
      )
      RETURNING "id", "name", "isDefault", "triageOptions", "rewardPolicy", "createdAt", "updatedAt"
    `;
    return created[0]!;
  }

  static async updateScopeGroup(
    programSlug: string,
    scopeGroupId: string,
    actorUserId: string,
    body: UpdateScopeGroupBody,
  ) {
    const program = await ProgramService.getProgramBySlug(programSlug);
    const { member } = await OrganizationService.assertOrgMembership(
      actorUserId,
      program.org.slug,
      PM_OR_OA,
    );
    assertPmOrOa(member.role);

    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "ProgramScopeGroup"
      WHERE "id" = ${scopeGroupId}
        AND "programId" = ${program.id}
      LIMIT 1
    `;
    if (existing.length === 0) throw new NotFoundError('Scope group');

    const updates: string[] = [];
    if (body.name !== undefined) updates.push(`"name" = '${body.name.replace(/'/g, "''")}'`);
    if (body.triageOptions !== undefined) {
      updates.push(`"triageOptions" = '${JSON.stringify(body.triageOptions).replace(/'/g, "''")}'::jsonb`);
    }
    if (body.rewardPolicy !== undefined) {
      updates.push(`"rewardPolicy" = '${JSON.stringify(body.rewardPolicy).replace(/'/g, "''")}'::jsonb`);
    }
    updates.push(`"updatedAt" = NOW()`);

    const sql = `
      UPDATE "ProgramScopeGroup"
      SET ${updates.join(', ')}
      WHERE "id" = $1 AND "programId" = $2
      RETURNING "id", "name", "isDefault", "triageOptions", "rewardPolicy", "createdAt", "updatedAt"
    `;
    const rows = await prisma.$queryRawUnsafe<ScopeGroupRow[]>(sql, scopeGroupId, program.id);
    return rows[0]!;
  }

  static async deleteScopeGroup(
    programSlug: string,
    scopeGroupId: string,
    actorUserId: string,
  ) {
    const program = await ProgramService.getProgramBySlug(programSlug);
    const { member } = await OrganizationService.assertOrgMembership(
      actorUserId,
      program.org.slug,
      PM_OR_OA,
    );
    assertPmOrOa(member.role);

    const row = await prisma.$queryRaw<Array<{ id: string; isDefault: boolean }>>`
      SELECT "id", "isDefault"
      FROM "ProgramScopeGroup"
      WHERE "id" = ${scopeGroupId}
        AND "programId" = ${program.id}
      LIMIT 1
    `;
    if (row.length === 0) throw new NotFoundError('Scope group');
    if (row[0]!.isDefault) {
      throw new BadRequestError('Default scope group cannot be deleted');
    }

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE "Asset"
        SET "scopeGroupId" = NULL
        WHERE "scopeGroupId" = ${scopeGroupId}
      `;
      await tx.$executeRaw`
        DELETE FROM "ProgramScopeGroup"
        WHERE "id" = ${scopeGroupId}
          AND "programId" = ${program.id}
      `;
    });

    return { message: 'Scope group deleted' };
  }

  static async inviteResearcher(
    programSlug: string,
    actorUserId: string,
    body: ProgramInviteBody,
  ) {
    const program = await ProgramService.getProgramBySlug(programSlug);
    if (program.type !== ProgramType.PRIVATE && !program.requiresInvite) {
      throw new BadRequestError(
        'Invites are only for private programs or programs that require an invite',
      );
    }

    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: program.orgId },
    });
    const { member } = await OrganizationService.assertOrgMembership(
      actorUserId,
      org.slug,
      PM_OR_OA,
    );
    assertPmOrOa(member.role);

    let email: string;
    let userId: string | null = null;

    if (body.kind === 'email') {
      email = body.email.trim().toLowerCase();
    } else {
      const u = await prisma.user.findFirst({
        where: { id: body.userId, deletedAt: null },
      });
      if (!u) throw new NotFoundError('User');
      email = u.email.toLowerCase();
      userId = u.id;
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const invite = await prisma.programInvite.create({
      data: {
        programId: program.id,
        email,
        userId,
        token,
        expiresAt,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actorUserId,
        orgId: program.orgId,
        action: 'PROGRAM_INVITE_SENT',
        entityType: 'ProgramInvite',
        entityId: invite.id,
        after: { email, userId },
      },
    });

    return { inviteId: invite.id, expiresAt: invite.expiresAt };
  }

  static async listProgramInvites(programSlug: string, actorUserId: string) {
    const program = await ProgramService.getProgramBySlug(programSlug);
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: program.orgId },
    });
    const { member } = await OrganizationService.assertOrgMembership(
      actorUserId,
      org.slug,
      PM_OR_OA,
    );
    assertPmOrOa(member.role);

    return prisma.programInvite.findMany({
      where: {
        programId: program.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        userId: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  static async revokeProgramInvite(
    programSlug: string,
    inviteId: string,
    actorUserId: string,
  ) {
    const program = await ProgramService.getProgramBySlug(programSlug);
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: program.orgId },
    });
    const { member } = await OrganizationService.assertOrgMembership(
      actorUserId,
      org.slug,
      PM_OR_OA,
    );
    assertPmOrOa(member.role);

    const invite = await prisma.programInvite.findFirst({
      where: { id: inviteId, programId: program.id },
    });
    if (!invite) throw new NotFoundError('Invite');

    await prisma.$transaction(async (tx) => {
      await tx.programInvite.delete({ where: { id: inviteId } });
      await tx.auditLog.create({
        data: {
          actorId: actorUserId,
          orgId: program.orgId,
          action: 'PROGRAM_INVITE_REVOKED',
          entityType: 'ProgramInvite',
          entityId: inviteId,
        },
      });
    });

    return { message: 'Invite revoked' };
  }

  static async joinPublicProgram(programSlug: string, userId: string) {
    const program = await ProgramService.getProgramBySlug(programSlug);
    if (program.type !== ProgramType.PUBLIC) {
      throw new BadRequestError('Only public programs can be joined this way');
    }
    if (program.status !== ProgramStatus.ACTIVE) {
      throw new BadRequestError('Program is not accepting participants');
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null, bannedAt: null },
    });
    if (!user) throw new NotFoundError('User');

    const existing = await prisma.programInvite.findFirst({
      where: { programId: program.id, userId, usedAt: { not: null } },
    });
    if (existing) {
      throw new ConflictError('Already joined this program');
    }

    const token = randomBytes(24).toString('hex');
    const far = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.programInvite.create({
        data: {
          programId: program.id,
          userId,
          email: user.email.toLowerCase(),
          token,
          expiresAt: far,
          usedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          orgId: program.orgId,
          action: 'PROGRAM_JOINED',
          entityType: 'Program',
          entityId: program.id,
          after: { userId },
        },
      });
    });

    return { message: 'Joined program', programSlug: program.slug };
  }

  static async listOrgPrograms(orgSlug: string, viewerUserId: string) {
    const { org } = await OrganizationService.assertOrgMembership(
      viewerUserId,
      orgSlug,
    );

    const programs = await prisma.program.findMany({
      where: { orgId: org.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        tags: { select: { tag: true } },
        assets: {
          where: { deletedAt: null },
          select: {
            type: true,
            identifier: true,
            inScope: true,
          },
        },
        _count: { select: { reports: true } },
      },
    });

    return programs.map((program) => {
      const domainAssets = program.assets.filter(
        (asset) => asset.type === 'DOMAIN' || asset.type === 'SUBDOMAIN',
      );
      const inScopeDomains = domainAssets
        .filter((asset) => asset.inScope)
        .map((asset) => asset.identifier);
      const outOfScopeDomains = domainAssets
        .filter((asset) => !asset.inScope)
        .map((asset) => asset.identifier);

      return {
        ...program,
        inScopeDomains,
        outOfScopeDomains,
      };
    });
  }
}
