import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import type { OrgRole } from '@bughuntr/db';
import { ForbiddenError } from '@bughuntr/shared';
import {
  OrganizationService,
  type OrgAccessContext,
} from '../modules/organizations/organizations.service.js';

export interface OrgRoleGuardOptions {
  skipVerificationCheck?: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    orgAccess?: OrgAccessContext;
  }

  interface FastifyInstance {
    orgRoleGuard: (
      allowedRoles: OrgRole[],
      options?: OrgRoleGuardOptions,
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const VERIFICATION_SKIP_ROUTES: Record<string, string[]> = {
  GET: [
    '/api/organizations/:slug',
    '/api/organizations/:slug/members',
    '/api/organizations/:slug/verify',
  ],
  POST: ['/api/organizations/:slug/verify', '/api/invites/accept/:token'],
};

function shouldSkipVerificationCheck(request: FastifyRequest): boolean {
  const method = request.method;
  const url = request.url;

  const skipRoutes = VERIFICATION_SKIP_ROUTES[method] || [];

  for (const route of skipRoutes) {
    const regex = new RegExp('^' + route.replace(/:[^/]+/g, '[^/]+') + '$');
    if (regex.test(url)) {
      return true;
    }
  }

  return false;
}

export default fp(
  async (app: FastifyInstance) => {
    app.decorate(
      'orgRoleGuard',
      (allowedRoles: OrgRole[], options: OrgRoleGuardOptions = {}) =>
        async (request: FastifyRequest, reply: FastifyReply) => {
          await request.jwtVerify();
          const params = request.params as { slug?: string };
          const slug = params.slug;

          if (!slug) {
            throw new ForbiddenError('Missing organization slug');
          }

          const skipVerificationCheck =
            options.skipVerificationCheck || shouldSkipVerificationCheck(request);

          const required = allowedRoles.length > 0 ? allowedRoles : undefined;
          request.orgAccess = await OrganizationService.assertOrgMembership(
            request.user.sub,
            slug,
            required,
          );

          const { org } = request.orgAccess;

          if (!skipVerificationCheck && org.verificationStatus !== 'APPROVED') {
            return reply.status(403).send({
              error: {
                code: 'ORG_NOT_VERIFIED',
                message:
                  'Organization is pending verification. Complete the verification form to access this feature.',
                verificationStatus: org.verificationStatus,
                links: {
                  submit: `/organizations/${slug}/verify`,
                  status: `/organizations/${slug}/verify`,
                },
              },
            });
          }
        },
    );
  },
  {
    name: 'org-role-guard',
    dependencies: ['auth', '@fastify/jwt'],
  },
);
