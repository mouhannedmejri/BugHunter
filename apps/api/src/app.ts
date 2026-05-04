import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './config.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { oauthRoutes } from './modules/auth/oauth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { adminUsersRoutes } from './modules/users/admin-users.routes.js';
import { onboardingRoutes } from './modules/onboarding/onboarding.routes.js';
import { organizationsRoutes } from './modules/organizations/organizations.routes.js';
import { programsRoutes } from './modules/programs/programs.routes.js';
import { assetsRoutes } from './modules/assets/assets.routes.js';
import { triageRoutes } from './modules/triage/triage.routes.js';
import { commentsRoutes, templateRoutes } from './modules/comments/comments.routes.js';
import { notificationsRoutes } from './modules/notifications/notifications.routes.js';
import { rewardsRoutes } from './modules/rewards/rewards.routes.js';
import { analyticsRoutes } from './modules/analytics/analytics.routes.js';
import { searchRoutes } from './modules/search/search.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { integrationsRoutes } from './modules/integrations/integrations.routes.js';
import { reportsRoutes } from './modules/reports/reports.routes.js';
import authPlugin from './plugins/auth.js';
import orgRoleGuardPlugin from './plugins/org-role-guard.js';
import requireOnboardingCompletePlugin from './plugins/require-onboarding-complete.js';
import apiKeyAuthPlugin from './plugins/api-key-auth.js';
import { errorHandler } from './plugins/error-handler.js';
import { MAX_FILE_SIZE_BYTES, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from '@bughuntr/shared';

export async function buildApp() {
  const app = Fastify({
    maxParamLength: 1000,
    logger: {
      level: env.LOG_LEVEL,
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  await app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production',
  });

  await app.register(cors, {
    origin: env.NODE_ENV === 'production' ? false : true,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: RATE_LIMIT_MAX,
    timeWindow: RATE_LIMIT_WINDOW_MS,
  });

  await app.register(cookie, {
    secret: env.JWT_REFRESH_SECRET,
    parseOptions: {},
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: '15m' },
  });

  await app.register(authPlugin);
  await app.register(orgRoleGuardPlugin);
  await app.register(requireOnboardingCompletePlugin);
  await app.register(apiKeyAuthPlugin);

  app.addHook('preHandler', async (request, reply) => {
    const publicRoutes = [
      '/api/health',
      '/api/auth/login',
      '/api/auth/register',
      '/docs',
      '/swagger',
    ];
    for (const route of publicRoutes) {
      if (request.url.startsWith(route)) {
        return;
      }
    }
    await app.requireOnboardingComplete(request, reply);
  });

  await app.register(multipart, {
    limits: {
      fileSize: MAX_FILE_SIZE_BYTES,
    },
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'BugHuntr API',
        description: 'Bug bounty platform REST API',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${env.PORT}`,
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  app.setErrorHandler(errorHandler);

  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(oauthRoutes, { prefix: '/api/auth' });
  await app.register(usersRoutes, { prefix: '/api' });
  await app.register(adminUsersRoutes, { prefix: '/api' });
  await app.register(onboardingRoutes, { prefix: '/api' });
  await app.register(organizationsRoutes, { prefix: '/api' });
  await app.register(programsRoutes, { prefix: '/api' });
  await app.register(assetsRoutes, { prefix: '/api' });
  await app.register(triageRoutes, { prefix: '/api' });
  await app.register(commentsRoutes, { prefix: '/api' });
  await app.register(templateRoutes, { prefix: '/api' });
  await app.register(notificationsRoutes, { prefix: '/api' });
  await app.register(rewardsRoutes, { prefix: '/api' });
  await app.register(analyticsRoutes, { prefix: '/api' });
  await app.register(searchRoutes, { prefix: '/api' });
  await app.register(adminRoutes, { prefix: '/api' });
  await app.register(integrationsRoutes, { prefix: '/api' });
  await app.register(reportsRoutes, { prefix: '/api' });

  return app;
}
