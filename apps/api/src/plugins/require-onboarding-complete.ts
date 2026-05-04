import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { prisma } from '@bughuntr/db';
import { ForbiddenError } from '@bughuntr/shared';

declare module 'fastify' {
  interface FastifyInstance {
    requireOnboardingComplete: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const ONBOARDING_ALLOWLIST = [
  '/api/auth/',
  '/api/onboarding/',
  '/api/invites/',
  '/api/notifications/',
  '/api/users/me',
];

const ORG_ONBOARDING_PATH_RE = /^\/api\/organizations\/[^/]+(?:\/verify)?$/;

function isAllowlisted(url: string): boolean {
  const pathname = url.split('?')[0] ?? url;
  for (const prefix of ONBOARDING_ALLOWLIST) {
    if (pathname.startsWith(prefix)) {
      return true;
    }
  }
  // Allow only org endpoints required while onboarding is pending:
  // - GET /api/organizations/:slug
  // - GET/POST /api/organizations/:slug/verify
  if (ORG_ONBOARDING_PATH_RE.test(pathname)) {
    return true;
  }
  return false;
}

export default fp(
  async (app: FastifyInstance) => {
    app.decorate(
      'requireOnboardingComplete',
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (isAllowlisted(request.url)) {
          return;
        }

        try {
          await request.jwtVerify();
        } catch {
          return;
        }

        const userId = request.user?.sub;
        if (!userId) {
          return;
        }

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { onboardingStep: true },
        });

        if (!user) {
          return;
        }

        if (user.onboardingStep === 'PENDING_ORG_APPROVAL') {
          // Self-heal stale onboarding state: if the user already belongs to an approved
          // organization, mark onboarding as complete so guarded routes can be accessed.
          const approvedMembership = await prisma.organizationMember.findFirst({
            where: {
              userId,
              org: {
                deletedAt: null,
                verificationStatus: 'APPROVED',
              },
            },
            select: { orgId: true },
          });

          if (approvedMembership) {
            await prisma.user.update({
              where: { id: userId },
              data: { onboardingStep: 'COMPLETE' },
            });
            return;
          }
        }

        if (user.onboardingStep !== 'COMPLETE') {
          return reply.status(403).send({
            error: {
              code: 'ONBOARDING_INCOMPLETE',
              nextStep: user.onboardingStep,
            },
          });
        }
      },
    );
  },
  {
    name: 'require-onboarding-complete',
    dependencies: ['@fastify/jwt'],
  },
);
