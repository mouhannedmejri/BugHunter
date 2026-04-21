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

function isAllowlisted(url: string): boolean {
  for (const prefix of ONBOARDING_ALLOWLIST) {
    if (url.startsWith(prefix)) {
      return true;
    }
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
