import { createHash, randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { prisma } from '@bughuntr/db';
import { env } from '../config.js';

const REFRESH_TOKEN_BYTES = 48;
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

export interface AccessTokenPayload {
  sub: string;
  email: string;
  platformRole: string;
  onboardingStep?: string;
}

/**
 * Generate an access JWT (15m expiry).
 */
export function signAccessToken(app: FastifyInstance, payload: AccessTokenPayload): string {
  return app.jwt.sign(payload as unknown as Parameters<typeof app.jwt.sign>[0], {
    expiresIn: '15m',
  });
}

export type ImpersonationPayload = AccessTokenPayload & {
  impersonatedBy: string;
  typ: 'impersonation';
};

/**
 * Short-lived token for support impersonation (separate from normal access JWT).
 */
export function signImpersonationToken(
  app: FastifyInstance,
  payload: ImpersonationPayload,
): string {
  return app.jwt.sign(payload as unknown as Parameters<typeof app.jwt.sign>[0], {
    expiresIn: '5m',
  });
}

/**
 * Generate a refresh token, hash it, store in DB session.
 * Returns the raw token to send as cookie.
 */
export async function createRefreshSession(
  userId: string,
  deviceInfo: { ip: string; userAgent: string | undefined },
): Promise<string> {
  const rawToken = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
  const hashedToken = hashRefreshToken(rawToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await prisma.session.create({
    data: {
      userId,
      refreshToken: hashedToken,
      deviceInfo: {
        ip: deviceInfo.ip,
        userAgent: deviceInfo.userAgent ?? null,
      },
      expiresAt,
    },
  });

  return rawToken;
}

/**
 * Verify a refresh token by looking up its hash in the DB.
 * Returns the session if valid, null otherwise.
 */
export async function verifyRefreshToken(rawToken: string) {
  const hashedToken = hashRefreshToken(rawToken);

  const session = await prisma.session.findUnique({
    where: { refreshToken: hashedToken },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  return session;
}

/**
 * Rotate a refresh token: delete old session, create new one.
 */
export async function rotateRefreshToken(
  oldSessionId: string,
  userId: string,
  deviceInfo: { ip: string; userAgent: string | undefined },
): Promise<string> {
  await prisma.session.delete({ where: { id: oldSessionId } }).catch(() => {});
  return createRefreshSession(userId, deviceInfo);
}

/**
 * Delete a session by ID.
 */
export async function deleteSession(sessionId: string, userId: string): Promise<boolean> {
  const result = await prisma.session.deleteMany({
    where: { id: sessionId, userId },
  });
  return result.count > 0;
}

/**
 * Delete all sessions for a user.
 */
export async function deleteAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

/**
 * SHA-256 hash of a refresh token for secure DB storage.
 */
function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Set refresh token as httpOnly cookie.
 */
export function setRefreshCookie(
  reply: { setCookie: (name: string, value: string, options: Record<string, unknown>) => void },
  token: string,
): void {
  reply.setCookie('refreshToken', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
  });
}

/**
 * Clear the refresh token cookie.
 */
export function clearRefreshCookie(reply: {
  clearCookie: (name: string, options: Record<string, unknown>) => void;
}): void {
  reply.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
  });
}
