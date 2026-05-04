import { randomBytes } from 'node:crypto';
import slugify from 'slugify';
import {
  prisma,
  OrgRole,
  type Organization,
  type OrganizationMember,
  type Prisma,
} from '@bughuntr/db';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '@bughuntr/shared';
import { env } from '../../config.js';
import { signOrgInviteToken, verifyOrgInviteToken } from '../../lib/org-invite-jwt.js';
import { sendOrgInviteEmail } from './send-org-invite-email.js';
import { NotificationService } from '../notifications/notifications.service.js';
import type {
  ChangeMemberRoleBody,
  CreateOrganizationBody,
  InviteMemberBody,
  UpdateOrganizationBody,
} from './organizations.schemas.js';

function orgInviteSecret(): string {
  return env.ORG_INVITE_JWT_SECRET ?? env.JWT_SECRET;
}

function maxMembersForPlan(plan: string): number | null {
  switch (plan) {
    case 'FREE':
      return 5;
    case 'STARTER':
      return 20;
    case 'PRO':
    case 'ENTERPRISE':
      return null;
    default:
      return 5;
  }
}

function slugFromName(name: string): string {
  let s = slugify(name, { lower: true, strict: true, trim: true });
  if (!s) s = 'org';
  return s.slice(0, 60);
}

async function allocateUniqueSlug(preferred: string): Promise<string> {
  let candidate = preferred;
  let n = 2;
  while (
    await prisma.organization.findFirst({
      where: { slug: candidate, deletedAt: null },
    })
  ) {
    const suffix = `-${n++}`;
    candidate = `${preferred.slice(0, Math.max(1, 60 - suffix.length))}${suffix}`;
  }
  return candidate;
}

async function countOccupiedMemberSlots(orgId: string): Promise<number> {
  const [members, pendingInvites] = await Promise.all([
    prisma.organizationMember.count({ where: { orgId } }),
    prisma.orgInvite.count({
      where: {
        orgId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    }),
  ]);
  return members + pendingInvites;
}

async function countOrgAdmins(orgId: string): Promise<number> {
  return prisma.organizationMember.count({
    where: { orgId, role: OrgRole.ORG_ADMIN },
  });
}

export type OrgAccessContext = {
  org: Organization;
  member: OrganizationMember;
};

export class OrganizationService {
  static async assertOrgMembership(
    userId: string,
    slug: string,
    requiredRoles?: OrgRole[],
  ): Promise<OrgAccessContext> {
    const org = await prisma.organization.findFirst({
      where: { slug, deletedAt: null },
    });
    if (!org) throw new NotFoundError('Organization');

    const member = await prisma.organizationMember.findUnique({
      where: { orgId_userId: { orgId: org.id, userId } },
    });
    if (!member) {
      throw new ForbiddenError('You are not a member of this organization');
    }
    if (requiredRoles?.length && !requiredRoles.includes(member.role)) {
      throw new ForbiddenError('Insufficient organization role');
    }
    return { org, member };
  }

  static async createOrganization(
    creatorId: string,
    body: CreateOrganizationBody,
  ): Promise<Organization> {
    const baseSlug = body.slug ?? slugFromName(body.name);
    const finalSlug = await allocateUniqueSlug(baseSlug);

    const org = await prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: {
          name: body.name,
          slug: finalSlug,
          website: body.website ?? undefined,
          description: body.description ?? undefined,
          billingEmail: body.billingEmail ?? undefined,
          members: {
            create: { userId: creatorId, role: OrgRole.ORG_ADMIN },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: creatorId,
          orgId: created.id,
          action: 'ORG_CREATED',
          entityType: 'Organization',
          entityId: created.id,
          after: { name: created.name, slug: created.slug },
        },
      });

      return created;
    });

    return org;
  }

  static async getOrganizationDetail(slug: string, viewerUserId: string) {
    const { org } = await OrganizationService.assertOrgMembership(viewerUserId, slug);
    const orgWithVerification = await prisma.organization.findUnique({
      where: { id: org.id },
      include: { orgVerification: true },
    });
    if (!orgWithVerification) throw new NotFoundError('Organization');
    return orgWithVerification;
  }

  static async updateOrganization(
    slug: string,
    actorUserId: string,
    body: UpdateOrganizationBody,
  ): Promise<Organization> {
    const { org } = await OrganizationService.assertOrgMembership(actorUserId, slug, [
      OrgRole.ORG_ADMIN,
    ]);

    const data: Prisma.OrganizationUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.website !== undefined) data.website = body.website;
    if (body.description !== undefined) data.description = body.description;
    if (body.billingEmail !== undefined) data.billingEmail = body.billingEmail;
    if (body.logoUrl !== undefined) data.logoUrl = body.logoUrl;

    const verificationData: Prisma.OrgVerificationUpdateInput = {};
    if (body.legalName !== undefined) verificationData.legalName = body.legalName;
    if (body.registrationNumber !== undefined) verificationData.registrationNumber = body.registrationNumber;
    if (body.country !== undefined) verificationData.country = body.country;
    if (body.address !== undefined) verificationData.address = body.address;
    if (body.primaryUseCase !== undefined) verificationData.primaryUseCase = body.primaryUseCase;
    if (body.estimatedPrograms !== undefined) verificationData.estimatedPrograms = body.estimatedPrograms;
    if (body.contactName !== undefined) verificationData.contactName = body.contactName;
    if (body.contactEmail !== undefined) verificationData.contactEmail = body.contactEmail;
    if (body.contactPhone !== undefined) verificationData.contactPhone = body.contactPhone;

    const hasVerificationUpdates = Object.keys(verificationData).length > 0;

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.organization.update({
        where: { id: org.id },
        data,
      });
      
      if (hasVerificationUpdates) {
        const existingVerification = await tx.orgVerification.findUnique({
          where: { orgId: org.id },
        });
        
        if (existingVerification) {
          await tx.orgVerification.update({
            where: { orgId: org.id },
            data: verificationData,
          });
        }
      }

      await tx.auditLog.create({
        data: {
          actorId: actorUserId,
          orgId: org.id,
          action: 'ORG_UPDATED',
          entityType: 'Organization',
          entityId: org.id,
          after: JSON.parse(JSON.stringify(body)) as Prisma.InputJsonValue,
        },
      });
      return next;
    });

    return await OrganizationService.getOrganizationDetail(updated.slug, actorUserId);
  }

  static async softDeleteOrganization(
    slug: string,
    platformAdminId: string,
  ): Promise<{ message: string }> {
    const org = await prisma.organization.findFirst({
      where: { slug, deletedAt: null },
    });
    if (!org) throw new NotFoundError('Organization');

    await prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id: org.id },
        data: { deletedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorId: platformAdminId,
          orgId: org.id,
          action: 'ORG_DELETED',
          entityType: 'Organization',
          entityId: org.id,
          before: { deletedAt: null },
          after: { deletedAt: new Date().toISOString() },
        },
      });
    });

    return { message: 'Organization deleted' };
  }

  static async listMembers(slug: string, viewerUserId: string) {
    const { org } = await OrganizationService.assertOrgMembership(viewerUserId, slug);

    const members = await prisma.organizationMember.findMany({
      where: { orgId: org.id },
      orderBy: { joinedAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            avatarUrl: true,
            displayName: true,
          },
        },
      },
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      email: m.user.email,
      username: m.user.username,
      avatarUrl: m.user.avatarUrl,
      displayName: m.user.displayName,
    }));
  }

  static async inviteMember(slug: string, inviterUserId: string, body: InviteMemberBody) {
    const { org } = await OrganizationService.assertOrgMembership(inviterUserId, slug, [
      OrgRole.ORG_ADMIN,
    ]);

    const limit = maxMembersForPlan(org.plan);
    const occupied = await countOccupiedMemberSlots(org.id);
    if (limit !== null && occupied >= limit) {
      throw new ConflictError(
        `Member limit reached for plan ${org.plan} (${limit} seats including pending invites)`,
      );
    }

    const emailNorm = body.email.trim().toLowerCase();

    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: emailNorm, mode: 'insensitive' }, deletedAt: null },
    });
    if (existingUser) {
      const already = await prisma.organizationMember.findUnique({
        where: {
          orgId_userId: { orgId: org.id, userId: existingUser.id },
        },
      });
      if (already) throw new ConflictError('User is already a member');
    }

    const pendingSameEmail = await prisma.orgInvite.findFirst({
      where: {
        orgId: org.id,
        email: { equals: emailNorm, mode: 'insensitive' },
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (pendingSameEmail) {
      throw new ConflictError('An active invite already exists for this email');
    }

    const rowToken = randomBytes(32).toString('hex');

    const invite = await prisma.orgInvite.create({
      data: {
        orgId: org.id,
        email: emailNorm,
        role: body.role,
        token: rowToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const jwt = signOrgInviteToken(
      {
        sub: invite.id,
        orgId: org.id,
        email: emailNorm,
        role: body.role,
      },
      orgInviteSecret(),
    );

    const acceptUrl = `${env.FRONTEND_URL}/invites/accept?token=${encodeURIComponent(jwt)}`;

    await sendOrgInviteEmail({
      to: emailNorm,
      orgName: org.name,
      role: body.role,
      acceptUrl,
    });

    await prisma.auditLog.create({
      data: {
        actorId: inviterUserId,
        orgId: org.id,
        action: 'ORG_INVITE_SENT',
        entityType: 'OrgInvite',
        entityId: invite.id,
        after: { email: emailNorm, role: body.role },
      },
    });

    return { inviteId: invite.id, expiresAt: invite.expiresAt };
  }

  static async listPendingInvites(slug: string, viewerUserId: string) {
    const { org } = await OrganizationService.assertOrgMembership(viewerUserId, slug, [
      OrgRole.ORG_ADMIN,
    ]);

    const invites = await prisma.orgInvite.findMany({
      where: {
        orgId: org.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return invites;
  }

  static async revokeInvite(
    slug: string,
    actorUserId: string,
    inviteId: string,
  ): Promise<{ message: string }> {
    const { org } = await OrganizationService.assertOrgMembership(actorUserId, slug, [
      OrgRole.ORG_ADMIN,
    ]);

    const invite = await prisma.orgInvite.findFirst({
      where: { id: inviteId, orgId: org.id },
    });
    if (!invite) throw new NotFoundError('Invite');
    if (invite.usedAt) throw new ConflictError('Invite already used');

    await prisma.$transaction(async (tx) => {
      await tx.orgInvite.delete({ where: { id: inviteId } });
      await tx.auditLog.create({
        data: {
          actorId: actorUserId,
          orgId: org.id,
          action: 'ORG_INVITE_REVOKED',
          entityType: 'OrgInvite',
          entityId: inviteId,
          after: { email: invite.email },
        },
      });
    });

    return { message: 'Invite revoked' };
  }

  static async removeMember(
    slug: string,
    actorUserId: string,
    targetUserId: string,
  ): Promise<{ message: string }> {
    const { org, member: actorMember } = await OrganizationService.assertOrgMembership(
      actorUserId,
      slug,
    );

    const isSelf = actorUserId === targetUserId;
    const isOrgAdmin = actorMember.role === OrgRole.ORG_ADMIN;
    if (!isSelf && !isOrgAdmin) {
      throw new ForbiddenError('Only an organization admin can remove other members');
    }

    const target = await prisma.organizationMember.findUnique({
      where: { orgId_userId: { orgId: org.id, userId: targetUserId } },
    });
    if (!target) throw new NotFoundError('Member');

    if (target.role === OrgRole.ORG_ADMIN) {
      const admins = await countOrgAdmins(org.id);
      if (admins <= 1) {
        throw new ForbiddenError('Cannot remove the last organization admin');
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.organizationMember.delete({
        where: { orgId_userId: { orgId: org.id, userId: targetUserId } },
      });
      await tx.auditLog.create({
        data: {
          actorId: actorUserId,
          orgId: org.id,
          action: 'ORG_MEMBER_REMOVED',
          entityType: 'OrganizationMember',
          entityId: target.id,
          after: { removedUserId: targetUserId },
        },
      });
    });

    return { message: 'Member removed' };
  }

  static async changeMemberRole(
    slug: string,
    actorUserId: string,
    targetUserId: string,
    body: ChangeMemberRoleBody,
  ) {
    const { org } = await OrganizationService.assertOrgMembership(actorUserId, slug, [
      OrgRole.ORG_ADMIN,
    ]);

    if (actorUserId === targetUserId) {
      throw new BadRequestError('Use another admin to change your own role');
    }

    const target = await prisma.organizationMember.findUnique({
      where: { orgId_userId: { orgId: org.id, userId: targetUserId } },
    });
    if (!target) throw new NotFoundError('Member');

    if (target.role === OrgRole.ORG_ADMIN && body.role !== OrgRole.ORG_ADMIN) {
      const admins = await countOrgAdmins(org.id);
      if (admins <= 1) {
        throw new ForbiddenError('Cannot demote the last organization admin');
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const m = await tx.organizationMember.update({
        where: { orgId_userId: { orgId: org.id, userId: targetUserId } },
        data: { role: body.role },
      });
      await tx.auditLog.create({
        data: {
          actorId: actorUserId,
          orgId: org.id,
          action: 'ORG_MEMBER_ROLE_CHANGED',
          entityType: 'OrganizationMember',
          entityId: m.id,
          before: { role: target.role },
          after: { role: body.role },
        },
      });
      return m;
    });

    return updated;
  }

  static async acceptInvite(jwtToken: string, userId: string, userEmail: string) {
    const payload = verifyOrgInviteToken(jwtToken, orgInviteSecret());

    const invite = await prisma.orgInvite.findFirst({
      where: { id: payload.sub, orgId: payload.orgId, usedAt: null },
    });
    if (!invite) {
      throw new ConflictError('Invite not found or already used');
    }
    if (invite.expiresAt < new Date()) {
      throw new ConflictError('Invite has expired');
    }

    const emailNorm = userEmail.trim().toLowerCase();

    if (invite.userId) {
      if (invite.userId !== userId) {
        throw new ForbiddenError('This invite is for a different user account');
      }
    } else if (invite.email.toLowerCase() !== emailNorm) {
      throw new ForbiddenError('Signed-in account email does not match the invite');
    }

    if (
      invite.role !== payload.role ||
      invite.email.toLowerCase() !== payload.email.toLowerCase()
    ) {
      throw new UnauthorizedError('Invite payload mismatch');
    }
    if (payload.userId && payload.userId !== userId) {
      throw new ForbiddenError('Invite token is bound to a different user');
    }
    if (invite.userId && payload.userId && invite.userId !== payload.userId) {
      throw new UnauthorizedError('Invite payload mismatch');
    }

    const org = await prisma.organization.findFirst({
      where: { id: invite.orgId, deletedAt: null },
    });
    if (!org) throw new NotFoundError('Organization');

    const limit = maxMembersForPlan(org.plan);
    const members = await prisma.organizationMember.count({ where: { orgId: org.id } });
    if (limit !== null && members >= limit) {
      throw new ConflictError('Organization has reached its member limit');
    }

    const existing = await prisma.organizationMember.findUnique({
      where: { orgId_userId: { orgId: org.id, userId } },
    });
    if (existing) {
      throw new ConflictError('Already a member of this organization');
    }

    await prisma.$transaction(async (tx) => {
      await tx.organizationMember.create({
        data: {
          orgId: org.id,
          userId,
          role: invite.role,
        },
      });
      await tx.orgInvite.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      });
      await tx.notification.deleteMany({
        where: {
          userId,
          type: 'ORG_INVITATION_RECEIVED',
          data: {
            path: ['inviteId'],
            equals: invite.id,
          },
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: { onboardingStep: 'COMPLETE' },
      });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          orgId: org.id,
          action: 'ORG_MEMBER_ADDED',
          entityType: 'OrganizationMember',
          entityId: userId,
          after: { viaInviteId: invite.id, role: invite.role },
        },
      });
    });

    return { orgSlug: org.slug, role: invite.role };
  }

  /**
   * Super-admin: invite an existing user to an organization by user id.
   * Sends in-app + email notifications; acceptance uses POST /invites/accept/:token.
   */
  static async adminInviteUserToOrg(
    actorUserId: string,
    targetUserId: string,
    body: { orgId: string; role: OrgRole },
  ) {
    const actor = await prisma.user.findFirst({
      where: { id: actorUserId, deletedAt: null },
    });
    if (!actor) throw new NotFoundError('User');

    const target = await prisma.user.findFirst({
      where: { id: targetUserId, deletedAt: null },
    });
    if (!target) throw new NotFoundError('User');

    const org = await prisma.organization.findFirst({
      where: { id: body.orgId, deletedAt: null },
    });
    if (!org) throw new NotFoundError('Organization');

    const existingMember = await prisma.organizationMember.findUnique({
      where: { orgId_userId: { orgId: org.id, userId: target.id } },
    });
    if (existingMember) throw new ConflictError('User is already a member');

    const pendingSameUser = await prisma.orgInvite.findFirst({
      where: {
        orgId: org.id,
        userId: target.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (pendingSameUser) {
      throw new ConflictError('An active invite already exists for this user');
    }

    const emailNorm = target.email.trim().toLowerCase();
    const rowToken = randomBytes(32).toString('hex');

    const invite = await prisma.orgInvite.create({
      data: {
        orgId: org.id,
        email: emailNorm,
        userId: target.id,
        role: body.role,
        token: rowToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const jwt = signOrgInviteToken(
      {
        sub: invite.id,
        orgId: org.id,
        email: emailNorm,
        role: body.role,
        userId: target.id,
      },
      orgInviteSecret(),
    );

    const acceptUrl = `${env.FRONTEND_URL}/invites/accept?token=${encodeURIComponent(jwt)}`;

    const notifBody = `You've been invited to join '${org.name}' as ${body.role.replace(/_/g, ' ')}.`;
    const meta = {
      inviteToken: jwt,
      inviteId: invite.id,
      orgName: org.name,
      orgSlug: org.slug,
      role: body.role,
    };

    await NotificationService.createNotification(target.id, 'ORG_INVITATION_RECEIVED', {
      body: notifBody,
      channel: 'IN_APP',
      meta,
    });
    await NotificationService.createNotification(target.id, 'ORG_INVITATION_RECEIVED', {
      body: notifBody,
      channel: 'EMAIL',
      meta,
    });

    await sendOrgInviteEmail({
      to: emailNorm,
      orgName: org.name,
      role: body.role,
      acceptUrl,
    });

    await prisma.auditLog.create({
      data: {
        actorId: actorUserId,
        orgId: org.id,
        action: 'ORG_INVITE_SENT_BY_ADMIN',
        entityType: 'OrgInvite',
        entityId: invite.id,
        after: { targetUserId: target.id, role: body.role },
      },
    });

    return { inviteId: invite.id, expiresAt: invite.expiresAt };
  }

  static async listAuditLogs(slug: string, viewerUserId: string, limit: number = 8) {
    const { org } = await OrganizationService.assertOrgMembership(viewerUserId, slug);

    const logs = await prisma.auditLog.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        actor: {
          select: {
            username: true,
            displayName: true,
          },
        },
      },
    });

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      target: `${log.entityType} ${log.entityId}`,
      timestamp: log.createdAt,
      actor: log.actor?.displayName || log.actor?.username || 'System',
    }));
  }

  static async submitVerification(
    slug: string,
    actorUserId: string,
    body: {
      legalName: string;
      registrationNumber?: string;
      country: string;
      address: string;
      website?: string;
      primaryUseCase: string;
      estimatedPrograms: number;
      contactName: string;
      contactEmail: string;
      contactPhone?: string;
      documents?: string[];
    },
  ) {
    const { org, member } = await OrganizationService.assertOrgMembership(actorUserId, slug, [
      OrgRole.ORG_ADMIN,
    ]);

    if (org.verificationStatus === 'APPROVED') {
      throw new ConflictError('Organization is already verified');
    }

    const verificationData = {
      orgId: org.id,
      legalName: body.legalName,
      registrationNumber: body.registrationNumber ?? null,
      country: body.country,
      address: body.address,
      website: body.website ?? '',
      primaryUseCase: body.primaryUseCase,
      estimatedPrograms: body.estimatedPrograms,
      contactName: body.contactName,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone ?? null,
      documents: body.documents ?? [],
    };

    const existingVerification = await prisma.orgVerification.findUnique({
      where: { orgId: org.id },
    });

    let verification;
    if (existingVerification) {
      verification = await prisma.orgVerification.update({
        where: { orgId: org.id },
        data: verificationData,
      });
    } else {
      verification = await prisma.orgVerification.create({
        data: verificationData,
      });
    }

    await prisma.organization.update({
      where: { id: org.id },
      data: {
        verificationStatus: 'SUBMITTED',
        verificationSubmittedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actorUserId,
        orgId: org.id,
        action: 'ORG_VERIFICATION_SUBMITTED',
        entityType: 'OrgVerification',
        entityId: verification.id,
        after: { status: 'SUBMITTED' },
      },
    });

    return {
      verificationStatus: 'SUBMITTED',
      verificationSubmittedAt: new Date(),
    };
  }
}
