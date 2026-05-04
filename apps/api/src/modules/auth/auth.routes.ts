import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  registerUser,
  verifyEmail,
  loginUser,
  forgotPassword,
  resetPassword,
  listSessions,
  getLoginHistory,
} from './auth.service.js';
import { setupTotp, verifyAndEnableTotp, disableTotp, verifyTotpCode } from './totp.service.js';
import {
  registerBodySchema,
  loginBodySchema,
  verifyEmailBodySchema,
  forgotPasswordBodySchema,
  resetPasswordBodySchema,
  totpVerifyBodySchema,
  revokeSessionParamsSchema,
  loginHistoryQuerySchema,
} from './auth.schemas.js';
import type {
  RegisterBody,
  LoginBody,
  VerifyEmailBody,
  ForgotPasswordBody,
  ResetPasswordBody,
  TotpVerifyBody,
  RevokeSessionParams,
  LoginHistoryQuery,
} from './auth.schemas.js';
import {
  signAccessToken,
  createRefreshSession,
  verifyRefreshToken,
  rotateRefreshToken,
  deleteSession,
  setRefreshCookie,
  clearRefreshCookie,
} from '../../lib/tokens.js';
import { BadRequestError, UnauthorizedError } from '@bughuntr/shared';
import { prisma } from '@bughuntr/db';

export async function authRoutes(app: FastifyInstance) {
  // ─── Rate-limited endpoints ───────────────────────────
  const strictRateLimit = {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '15 minutes',
      },
    },
  };

  // ─── GET /auth/registration-stats ───────────────────────
  app.get('/registration-stats', {
    schema: {
      description: 'Get registration statistics',
      tags: ['auth'],
      response: {
        200: {
          type: 'object',
          properties: {
            totalUsers: { type: 'integer' },
            recentRegistrations: { 
              type: 'array', 
              items: { 
                type: 'object', 
                properties: { 
                  date: { type: 'string' }, 
                  users: { type: 'integer' } 
                } 
              } 
            },
          },
        },
      },
    },
    handler: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const totalUsers = await prisma.user.count();
      const recentRegistrations = await prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('day', "createdAt")::text as date,
          COUNT(*)::integer as users
        FROM "User" 
        WHERE "createdAt" >= ${thirtyDaysAgo}
        GROUP BY DATE_TRUNC('day', "createdAt")
        ORDER BY date DESC
      ` as Array<{ date: string; users: number }>;

      return {
        totalUsers,
        recentRegistrations,
      };
    },
  });

  // ─── POST /auth/register ──────────────────────────────
  app.post<{ Body: RegisterBody }>('/register', strictRateLimit, async (request, reply) => {
    const body = registerBodySchema.parse(request.body);
    const result = await registerUser(body);
    return reply.status(201).send({
      data: result.user,
      message: 'Registration successful. Please verify your email.',
    });
  });

  // ─── POST /auth/verify-email ──────────────────────────
  app.post<{ Body: VerifyEmailBody }>('/verify-email', async (request, reply) => {
    const { token } = verifyEmailBodySchema.parse(request.body);
    const result = await verifyEmail(token);
    return reply.send({ data: result });
  });

  // ─── POST /auth/login ─────────────────────────────────
  app.post<{ Body: LoginBody }>('/login', strictRateLimit, async (request, reply) => {
    const body = loginBodySchema.parse(request.body);
    const ip = request.ip;
    const userAgent = request.headers['user-agent'];

    const result = await loginUser(body, ip, userAgent);
    const { user } = result;

    // Handle TOTP
    if (result.requiresTotp && user.totpSecret) {
      if (!result.totpCode) {
        throw new UnauthorizedError('TOTP code required');
      }
      const valid = verifyTotpCode(user.totpSecret, result.totpCode);
      if (!valid) {
        throw new UnauthorizedError('Invalid TOTP code');
      }

      // Log successful login after TOTP
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    // Issue tokens
    const accessToken = signAccessToken(app, {
      sub: user.id,
      email: user.email,
      platformRole: user.platformRole,
      onboardingStep: user.onboardingStep,
    });

    const refreshToken = await createRefreshSession(user.id, { ip, userAgent });
    setRefreshCookie(reply, refreshToken);

    return reply.send({
      data: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          platformRole: user.platformRole,
          totpEnabled: user.totpEnabled,
          onboardingStep: user.onboardingStep,
          orgMemberships: user.orgMemberships,
        },
      },
    });
  });

  // ─── POST /auth/refresh ───────────────────────────────
  app.post('/refresh', async (request, reply) => {
    const cookieToken = (request.cookies as Record<string, string | undefined>)?.['refreshToken'];
    const rawToken = cookieToken;

    if (!rawToken) {
      throw new UnauthorizedError('No refresh token provided');
    }

    const session = await verifyRefreshToken(rawToken);
    if (!session) {
      clearRefreshCookie(reply);
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const { user } = session;

    // Check if user is banned
    if (user.bannedAt) {
      clearRefreshCookie(reply);
      throw new UnauthorizedError('Account has been banned');
    }

    // Rotate refresh token
    const newRefreshToken = await rotateRefreshToken(session.id, user.id, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
    setRefreshCookie(reply, newRefreshToken);

    const accessToken = signAccessToken(app, {
      sub: user.id,
      email: user.email,
      platformRole: user.platformRole,
      onboardingStep: user.onboardingStep,
    });

    return reply.send({ data: { accessToken } });
  });

  // ─── POST /auth/logout ────────────────────────────────
  app.post('/logout', { preHandler: [app.authenticate] }, async (request, reply) => {
    const cookieToken = (request.cookies as Record<string, string | undefined>)?.['refreshToken'];

    if (cookieToken) {
      const session = await verifyRefreshToken(cookieToken);
      if (session) {
        await deleteSession(session.id, request.user.sub);
      }
    }

    clearRefreshCookie(reply);
    return reply.send({ data: { message: 'Logged out successfully' } });
  });

  // ─── POST /auth/forgot-password ───────────────────────
  app.post<{ Body: ForgotPasswordBody }>(
    '/forgot-password',
    strictRateLimit,
    async (request, reply) => {
      const { email } = forgotPasswordBodySchema.parse(request.body);
      const result = await forgotPassword(email);
      return reply.send({ data: result });
    },
  );

  // ─── POST /auth/reset-password ────────────────────────
  app.post<{ Body: ResetPasswordBody }>('/reset-password', async (request, reply) => {
    const { token, newPassword } = resetPasswordBodySchema.parse(request.body);
    const result = await resetPassword(token, newPassword);
    return reply.send({ data: result });
  });

  // ─── POST /auth/totp/setup ────────────────────────────
  app.post('/totp/setup', { preHandler: [app.authenticate] }, async (request, reply) => {
    const result = await setupTotp(request.user.sub);
    return reply.send({ data: result });
  });

  // ─── POST /auth/totp/verify ───────────────────────────
  app.post<{ Body: TotpVerifyBody }>(
    '/totp/verify',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { code } = totpVerifyBodySchema.parse(request.body);
      const result = await verifyAndEnableTotp(request.user.sub, code);
      return reply.send({ data: result });
    },
  );

  // ─── POST /auth/totp/disable ──────────────────────────
  app.post<{ Body: TotpVerifyBody }>(
    '/totp/disable',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { code } = totpVerifyBodySchema.parse(request.body);
      const result = await disableTotp(request.user.sub, code);
      return reply.send({ data: result });
    },
  );

  // ─── GET /auth/sessions ───────────────────────────────
  app.get('/sessions', { preHandler: [app.authenticate] }, async (request, reply) => {
    const sessions = await listSessions(request.user.sub);
    return reply.send({ data: sessions });
  });

  // ─── DELETE /auth/sessions/:id ────────────────────────
  app.delete<{ Params: RevokeSessionParams }>(
    '/sessions/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = revokeSessionParamsSchema.parse(request.params);
      const deleted = await deleteSession(id, request.user.sub);
      if (!deleted) {
        throw new BadRequestError('Session not found or already expired');
      }
      return reply.send({ data: { message: 'Session revoked' } });
    },
  );

  // ─── GET /auth/login-history ──────────────────────────
  app.get<{ Querystring: LoginHistoryQuery }>(
    '/login-history',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { limit } = loginHistoryQuerySchema.parse(request.query);
      const history = await getLoginHistory(request.user.sub, limit);
      return reply.send({ data: history });
    },
  );
}
