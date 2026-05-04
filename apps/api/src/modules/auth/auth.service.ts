import { PlatformRole, prisma } from '@bughuntr/db';
import { Queue } from 'bullmq';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
} from '@bughuntr/shared';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { generateSecureToken, hashToken } from '../../lib/crypto.js';
import { buildRedisConnection } from '../../lib/redis-connection.js';
import type { RegisterBody, LoginBody } from './auth.schemas.js';
import geoip from 'geoip-lite';

type EmailJobName = 'verification' | 'password-reset';
type EmailJobData = { to: string; token: string };

let emailQueue: Queue<EmailJobData, unknown, EmailJobName> | null | undefined;

function getEmailQueue(): Queue<EmailJobData, unknown, EmailJobName> | null {
  if (process.env['NODE_ENV'] === 'test') return null;
  if (emailQueue === undefined) {
    emailQueue = new Queue<EmailJobData, unknown, EmailJobName>('email', {
      connection: buildRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 2000 },
      },
    });
  }
  return emailQueue;
}

// ─── Register ────────────────────────────────────────────

export async function registerUser(body: RegisterBody) {
  const existingEmail = await prisma.user.findUnique({ where: { email: body.email } });
  if (existingEmail) throw new ConflictError('Email already registered');

  const existingUsername = await prisma.user.findUnique({ where: { username: body.username } });
  if (existingUsername) throw new ConflictError('Username already taken');

  const passwordHash = await hashPassword(body.password);
  const usertype = PlatformRole.USER;
  const onboardingStep = body.accountType === 'COMPANY' ? 'CHOOSE_PATH' : 'COMPLETE';
  const user = await prisma.user.create({
    data: {
      email: body.email,
      username: body.username,
      displayName: body.displayName ?? body.username,
      passwordHash,
      platformRole: usertype,
      kycStatus: 'PENDING',
      onboardingStep,

    },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      platformRole: true,
      createdAt: true,

      
    },
  });

  // Organizations are created after email verification via onboarding (`/onboarding/create-org`)
  // and go through super-admin verification — not at signup.

  const token = generateSecureToken();
  const hashedToken = hashToken(token);

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken: hashedToken,
      deviceInfo: { type: 'email_verification' },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    },
  });

  const queue = getEmailQueue();
  if (queue) {
    await queue.add('verification', { to: user.email, token });
  }

  return { user, verificationToken: token };
}

// ─── Verify Email ────────────────────────────────────────

export async function verifyEmail(token: string) {
  const hashedToken = hashToken(token);

  const session = await prisma.session.findUnique({
    where: { refreshToken: hashedToken },
  });

  if (!session) throw new BadRequestError('Invalid or expired verification token');

  const deviceInfo = session.deviceInfo as Record<string, unknown> | null;
  if (deviceInfo?.['type'] !== 'email_verification') {
    throw new BadRequestError('Invalid verification token');
  }

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    throw new BadRequestError('Verification token has expired');
  }

  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: session.userId },
      data: {
        // Keep onboarding step chosen at registration:
        // - COMPANY users: CHOOSE_PATH
        // - RESEARCHER users: COMPLETE
        emailVerifiedAt: new Date(),
      },
      select: {
        onboardingStep: true,
      },
    }),
    prisma.session.delete({ where: { id: session.id } }),
  ]);

  return { verified: true, nextStep: updatedUser.onboardingStep };
}

// ─── Login ───────────────────────────────────────────────

export async function loginUser(
  body: LoginBody,
  ip: string,
  userAgent: string | undefined,
) {
  const user = await prisma.user.findUnique({
    where: { email: body.email },
    include: {
      orgMemberships: {
        select: {
          org: { select: { slug: true } }
        }
      }
    }
  });
  const geo = geoip.lookup(ip);
  const country = geo?.country ?? null;
  if (!user || !user.passwordHash) {
    await logLoginAttempt(user?.id ?? 'unknown', ip, userAgent, country, false);
    throw new UnauthorizedError('Invalid email or password');
  }
  if (user.bannedAt) {
    await logLoginAttempt(user.id, ip, userAgent, country, false);
    throw new ForbiddenError(
      user.bannedReason
        ? `Account banned: ${user.bannedReason}`
        : 'Account has been banned',
    );
  }

  const passwordValid = await verifyPassword(user.passwordHash, body.password);
  if (!passwordValid) {
    await logLoginAttempt(user.id, ip, userAgent, country, false);
    throw new UnauthorizedError('Invalid email or password');
  }

  // Require email verification before allowing sign-in.
  // This ensures newly registered org users land on onboarding (CHOOSE_PATH) after verification.
  if (!user.emailVerifiedAt) {
    await logLoginAttempt(user.id, ip, userAgent, country, false);
    throw new ForbiddenError('Please verify your email before signing in');
  }

  if (user.totpEnabled) {
    if (!body.totpCode) {
      throw new UnauthorizedError('TOTP code required');
    }
    return { user, requiresTotp: true, totpCode: body.totpCode };
  }

  await logLoginAttempt(user.id, ip, userAgent, country, true);

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return { user, requiresTotp: false };
}

// ─── Forgot Password ────────────────────────────────────

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success to prevent email enumeration
  if (!user) return { message: 'If the email exists, a reset link has been sent' };

  const token = generateSecureToken();
  const hashedToken = hashToken(token);

  // Delete existing reset tokens for this user
  await prisma.session.deleteMany({
    where: {
      userId: user.id,
      deviceInfo: { path: ['type'], equals: 'password_reset' },
    },
  });

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken: hashedToken,
      deviceInfo: { type: 'password_reset' },
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h
    },
  });

  // TODO: Send reset email via worker queue
  // await emailQueue.add('password-reset', { to: user.email, token });

  return { message: 'If the email exists, a reset link has been sent', resetToken: token };
}

// ─── Reset Password ─────────────────────────────────────

export async function resetPassword(token: string, newPassword: string) {
  const hashedToken = hashToken(token);

  const session = await prisma.session.findUnique({
    where: { refreshToken: hashedToken },
  });

  if (!session) throw new BadRequestError('Invalid or expired reset token');

  const deviceInfo = session.deviceInfo as Record<string, unknown> | null;
  if (deviceInfo?.['type'] !== 'password_reset') {
    throw new BadRequestError('Invalid reset token');
  }

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    throw new BadRequestError('Reset token has expired');
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash },
    }),
    prisma.session.delete({ where: { id: session.id } }),
    // Invalidate all existing sessions for security
    prisma.session.deleteMany({
      where: {
        userId: session.userId,
        NOT: {
          OR: [
            { deviceInfo: { path: ['type'], equals: 'email_verification' } },
            { deviceInfo: { path: ['type'], equals: 'password_reset' } },
          ],
        },
      },
    }),
  ]);

  return { message: 'Password reset successfully' };
}

// ─── Sessions ────────────────────────────────────────────

export async function listSessions(userId: string) {
  const sessions = await prisma.session.findMany({
    where: {
      userId,
      NOT: {
        OR: [
          { deviceInfo: { path: ['type'], equals: 'email_verification' } },
          { deviceInfo: { path: ['type'], equals: 'password_reset' } },
        ],
      },
    },
    select: {
      id: true,
      deviceInfo: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Filter out non-session entries (verification/reset tokens)
  return sessions.filter((s) => {
    const info = s.deviceInfo as Record<string, unknown> | null;
    return !info?.['type'] || (info['type'] !== 'email_verification' && info['type'] !== 'password_reset');
  });
}

export async function getLoginHistory(userId: string, limit: number) {
  return prisma.loginHistory.findMany({
    where: { userId },
    select: {
      id: true,
      ip: true,
      userAgent: true,
      country: true,
      success: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

// ─── Helpers ─────────────────────────────────────────────

async function logLoginAttempt(
  userId: string,
  ip: string,
  userAgent: string | undefined,
  country: string | null,
  success: boolean,
) {
  try {
    await prisma.loginHistory.create({
      data: {
        userId,
        ip,
        userAgent: userAgent ?? null,
        country,
        success,
      },
    });
  } catch {
    // Don't fail the login if history logging fails
  }
}
