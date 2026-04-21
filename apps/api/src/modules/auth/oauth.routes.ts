import type { FastifyInstance } from 'fastify';
import oauthPlugin from '@fastify/oauth2';
import { prisma } from '@bughuntr/db';
import { env } from '../../config.js';
import { signAccessToken, createRefreshSession, setRefreshCookie } from '../../lib/tokens.js';

const FRONTEND_URL = process.env['FRONTEND_URL'] ?? 'http://localhost:3001';

export async function oauthRoutes(app: FastifyInstance) {
  // ─── Google OAuth ─────────────────────────────────────
  if (process.env['GOOGLE_CLIENT_ID'] && process.env['GOOGLE_CLIENT_SECRET']) {
    await app.register(oauthPlugin, {
      name: 'googleOAuth2',
      scope: ['profile', 'email'],
      credentials: {
        client: {
          id: process.env['GOOGLE_CLIENT_ID'],
          secret: process.env['GOOGLE_CLIENT_SECRET'],
        },
      },
      tokenRequestParams: {},
      discovery: { issuer: 'https://accounts.google.com' },
      startRedirectPath: '/google',
      callbackUri: `http://localhost:${env.PORT}/api/auth/google/callback`,
    });

    app.get('/google/callback', async (request, reply) => {
      try {
        const oauthClient = (
          app as unknown as Record<
            string,
            {
              getAccessTokenFromAuthorizationCodeFlow: (
                req: typeof request,
              ) => Promise<{ token: { access_token: string } }>;
            }
          >
        )['googleOAuth2'];
        if (!oauthClient) throw new Error('Google OAuth not configured');

        const { token } = await oauthClient.getAccessTokenFromAuthorizationCodeFlow(request);

        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${token.access_token}` },
        });
        const profile = (await response.json()) as {
          id: string;
          email: string;
          name: string;
          picture: string;
        };

        const result = await handleOAuthLogin('google', profile.id, {
          email: profile.email,
          displayName: profile.name,
          avatarUrl: profile.picture,
        });

        const accessToken = signAccessToken(app, {
          sub: result.id,
          email: result.email,
          platformRole: result.platformRole,
          onboardingStep: result.onboardingStep,
        });

        const refreshToken = await createRefreshSession(result.id, {
          ip: request.ip,
          userAgent: request.headers['user-agent'],
        });
        setRefreshCookie(reply, refreshToken);

        return reply.redirect(`${FRONTEND_URL}/auth/callback?token=${accessToken}`);
      } catch (err) {
        request.log.error(err, 'Google OAuth callback failed');
        return reply.redirect(`${FRONTEND_URL}/auth/error?provider=google`);
      }
    });
  }

  // ─── GitHub OAuth ─────────────────────────────────────
  if (process.env['GITHUB_CLIENT_ID'] && process.env['GITHUB_CLIENT_SECRET']) {
    await app.register(oauthPlugin, {
      name: 'githubOAuth2',
      scope: ['user:email'],
      credentials: {
        client: {
          id: process.env['GITHUB_CLIENT_ID'],
          secret: process.env['GITHUB_CLIENT_SECRET'],
        },
        auth: {
          authorizeHost: 'https://github.com',
          authorizePath: '/login/oauth/authorize',
          tokenHost: 'https://github.com',
          tokenPath: '/login/oauth/access_token',
        },
      },
      startRedirectPath: '/github',
      callbackUri: `http://localhost:${env.PORT}/api/auth/github/callback`,
    });

    app.get('/github/callback', async (request, reply) => {
      try {
        const oauthClient = (
          app as unknown as Record<
            string,
            {
              getAccessTokenFromAuthorizationCodeFlow: (
                req: typeof request,
              ) => Promise<{ token: { access_token: string } }>;
            }
          >
        )['githubOAuth2'];
        if (!oauthClient) throw new Error('GitHub OAuth not configured');

        const { token } = await oauthClient.getAccessTokenFromAuthorizationCodeFlow(request);

        const [profileRes, emailsRes] = await Promise.all([
          fetch('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${token.access_token}`, 'User-Agent': 'BugHuntr' },
          }),
          fetch('https://api.github.com/user/emails', {
            headers: { Authorization: `Bearer ${token.access_token}`, 'User-Agent': 'BugHuntr' },
          }),
        ]);

        const profile = (await profileRes.json()) as {
          id: number;
          login: string;
          name: string | null;
          avatar_url: string;
        };

        const emails = (await emailsRes.json()) as Array<{
          email: string;
          primary: boolean;
          verified: boolean;
        }>;

        const primaryEmail = emails.find((e) => e.primary && e.verified)?.email ?? emails[0]?.email;
        if (!primaryEmail) {
          return reply.redirect(`${FRONTEND_URL}/auth/error?reason=no_email`);
        }

        const result = await handleOAuthLogin('github', String(profile.id), {
          email: primaryEmail,
          displayName: profile.name ?? profile.login,
          avatarUrl: profile.avatar_url,
          githubHandle: profile.login,
        });

        const accessToken = signAccessToken(app, {
          sub: result.id,
          email: result.email,
          platformRole: result.platformRole,
          onboardingStep: result.onboardingStep,
        });

        const refreshToken = await createRefreshSession(result.id, {
          ip: request.ip,
          userAgent: request.headers['user-agent'],
        });
        setRefreshCookie(reply, refreshToken);

        return reply.redirect(`${FRONTEND_URL}/auth/callback?token=${accessToken}`);
      } catch (err) {
        request.log.error(err, 'GitHub OAuth callback failed');
        return reply.redirect(`${FRONTEND_URL}/auth/error?provider=github`);
      }
    });
  }
}

// ─── Shared OAuth helpers ────────────────────────────────

interface OAuthProfile {
  email: string;
  displayName: string;
  avatarUrl?: string;
  githubHandle?: string;
}

async function handleOAuthLogin(provider: string, providerUid: string, profile: OAuthProfile) {
  const existing = await prisma.oAuthAccount.findUnique({
    where: { provider_providerUid: { provider, providerUid } },
    include: { user: true },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.user.id },
      data: { lastLoginAt: new Date() },
    });
    return existing.user;
  }

  const existingUser = await prisma.user.findUnique({ where: { email: profile.email } });

  if (existingUser) {
    await prisma.oAuthAccount.create({
      data: { userId: existingUser.id, provider, providerUid },
    });
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        lastLoginAt: new Date(),
        emailVerifiedAt: existingUser.emailVerifiedAt ?? new Date(),
      },
    });
    return existingUser;
  }

  const username = await generateUniqueUsername(profile.displayName);
  const user = await prisma.user.create({
    data: {
      email: profile.email,
      username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      githubHandle: profile.githubHandle,
      emailVerifiedAt: new Date(),
      lastLoginAt: new Date(),
      oauthAccounts: {
        create: { provider, providerUid },
      },
    },
  });

  return user;
}

async function generateUniqueUsername(displayName: string): Promise<string> {
  const base = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);

  let candidate = base || 'user';
  let counter = 0;

  while (true) {
    const suffix = counter > 0 ? `-${counter}` : '';
    const username = `${candidate}${suffix}`;
    const exists = await prisma.user.findUnique({ where: { username } });
    if (!exists) return username;
    counter++;
  }
}
