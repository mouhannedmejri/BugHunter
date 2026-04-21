import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { UnauthorizedError, ForbiddenError } from '@bughuntr/shared';
import type { PlatformRole } from '@bughuntr/db';

/** JWT payload shape — iat/exp are added automatically by the JWT library */
export interface JwtPayload {
  sub: string;
  email: string;
  platformRole: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

async function authPlugin(app: FastifyInstance) {
  app.decorate('authenticate', async (request: FastifyRequest) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
  });

  app.decorate(
    'requireRole',
    (...roles: PlatformRole[]) =>
      async (request: FastifyRequest, _reply: FastifyReply) => {
        try {
          await request.jwtVerify();
        } catch {
          throw new UnauthorizedError('Invalid or expired token');
        }
        const user = request.user;
        if (!roles.includes(user.platformRole as PlatformRole)) {
          throw new ForbiddenError(
            `This action requires one of the following roles: ${roles.join(', ')}`,
          );
        }
      },
  );
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>;
    requireRole: (
      ...roles: PlatformRole[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['@fastify/jwt'],
});
