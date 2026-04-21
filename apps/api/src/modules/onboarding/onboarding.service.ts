import { prisma, OrgRole, OrgStatus, PlatformRole } from '@bughuntr/db';
import { BadRequestError, ForbiddenError, NotFoundError } from '@bughuntr/shared';
import slugify from 'slugify';
import type { CreateOrgOnboardingBody } from './onboarding.schemas.js';
import { NotificationService } from '../notifications/notifications.service.js';

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

export class OnboardingService {
  static async createOrg(userId: string, body: CreateOrgOnboardingBody) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundError('User');
    if (user.onboardingStep !== 'CHOOSE_PATH') {
      throw new ForbiddenError(
        'Organization creation is only available at the onboarding step CHOOSE_PATH',
      );
    }

    const baseSlug = body.orgSlug ?? slugFromName(body.orgName);
    const finalSlug = await allocateUniqueSlug(baseSlug);

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: body.orgName.trim(),
          slug: finalSlug,
          status: OrgStatus.PENDING,
          verificationStatus: 'PENDING',
          members: {
            create: {
              userId,
              role: OrgRole.ORG_ADMIN,
            },
          },
        },
        select: {
          id: true,
          slug: true,
          name: true,
          verificationStatus: true,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { onboardingStep: 'PENDING_ORG_APPROVAL' },
      });

      return org;
    });

    const superAdmins = await prisma.user.findMany({
      where: { platformRole: PlatformRole.SUPER_ADMIN, deletedAt: null, bannedAt: null },
      select: { id: true },
    });

    const creator = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });
    const username = creator?.username ?? 'user';
    const msgBody = `New org '${result.name}' created by ${username} — awaiting verification.`;

    await Promise.all(
      superAdmins.map((sa) =>
        NotificationService.createNotification(sa.id, 'ORG_CREATED_PENDING_REVIEW', {
          body: msgBody,
          channel: 'IN_APP',
          meta: {
            orgId: result.id,
            orgSlug: result.slug,
            orgName: result.name,
            createdByUserId: userId,
          },
        }),
      ),
    );

    return { org: result };
  }

  static async skipInviteWait(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundError('User');
    if (user.onboardingStep !== 'CHOOSE_PATH') {
      throw new BadRequestError('Skip is only available when onboarding step is CHOOSE_PATH');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { onboardingStep: 'COMPLETE' },
    });

    return { onboardingStep: 'COMPLETE' };
  }
}
