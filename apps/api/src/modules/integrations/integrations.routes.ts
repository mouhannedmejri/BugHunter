import type { FastifyInstance } from 'fastify';
import { OrgRole } from '@bughuntr/db';
import { IntegrationsService } from './integrations.service.js';
import {
  apiKeyIdParamsSchema,
  createApiKeyBodySchema,
  createWebhookBodySchema,
  githubConfigBodySchema,
  integrationTypeParamsSchema,
  jiraConfigBodySchema,
  linearConfigBodySchema,
  orgSlugParamsSchema,
  reportIdParamsSchema,
  ssoCallbackBodySchema,
  ssoConfigBodySchema,
  ssoOrgParamsSchema,
  updateWebhookBodySchema,
  webhookIdParamsSchema,
} from './integrations.schemas.js';

export async function integrationsRoutes(app: FastifyInstance) {
  app.post('/organizations/:slug/webhooks', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { slug } = orgSlugParamsSchema.parse(request.params);
    const body = createWebhookBodySchema.parse(request.body);
    const data = await IntegrationsService.createWebhook(slug, request.user.sub, body);
    return reply.status(201).send({ data });
  });

  app.get('/organizations/:slug/webhooks', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { slug } = orgSlugParamsSchema.parse(request.params);
    const data = await IntegrationsService.listWebhooks(slug, request.user.sub);
    return reply.send({ data });
  });

  app.put('/organizations/:slug/webhooks/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { slug, id } = webhookIdParamsSchema.parse(request.params);
    const body = updateWebhookBodySchema.parse(request.body);
    const data = await IntegrationsService.updateWebhook(slug, id, request.user.sub, body);
    return reply.send({ data });
  });

  app.delete('/organizations/:slug/webhooks/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { slug, id } = webhookIdParamsSchema.parse(request.params);
    const data = await IntegrationsService.deleteWebhook(slug, id, request.user.sub);
    return reply.send({ data });
  });

  app.post('/organizations/:slug/webhooks/:id/test', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { slug, id } = webhookIdParamsSchema.parse(request.params);
    const data = await IntegrationsService.testWebhook(slug, id, request.user.sub);
    return reply.send({ data });
  });

  app.get('/organizations/:slug/webhooks/:id/deliveries', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { slug, id } = webhookIdParamsSchema.parse(request.params);
    const data = await IntegrationsService.getWebhookDeliveries(slug, id, request.user.sub);
    return reply.send({ data });
  });

  app.post('/organizations/:slug/api-keys', { preHandler: [app.orgRoleGuard([OrgRole.ORG_ADMIN])] }, async (request, reply) => {
    const { slug } = orgSlugParamsSchema.parse(request.params);
    const body = createApiKeyBodySchema.parse(request.body);
    const data = await IntegrationsService.createOrgApiKey(slug, request.user.sub, body);
    return reply.status(201).send({ data });
  });

  app.get('/organizations/:slug/api-keys', { preHandler: [app.orgRoleGuard([OrgRole.ORG_ADMIN])] }, async (request, reply) => {
    const { slug } = orgSlugParamsSchema.parse(request.params);
    const data = await IntegrationsService.listOrgApiKeys(slug, request.user.sub);
    return reply.send({ data });
  });

  app.delete('/organizations/:slug/api-keys/:id', { preHandler: [app.orgRoleGuard([OrgRole.ORG_ADMIN])] }, async (request, reply) => {
    const { slug, id } = webhookIdParamsSchema.parse(request.params);
    const data = await IntegrationsService.revokeOrgApiKey(slug, id, request.user.sub);
    return reply.send({ data });
  });

  app.post('/users/me/api-keys', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = createApiKeyBodySchema.parse(request.body);
    const data = await IntegrationsService.createPersonalApiKey(request.user.sub, body);
    return reply.status(201).send({ data });
  });

  app.get('/users/me/api-keys', { preHandler: [app.authenticate] }, async (request, reply) => {
    const data = await IntegrationsService.listPersonalApiKeys(request.user.sub);
    return reply.send({ data });
  });

  app.delete('/users/me/api-keys/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = apiKeyIdParamsSchema.parse(request.params);
    const data = await IntegrationsService.revokePersonalApiKey(request.user.sub, id);
    return reply.send({ data });
  });

  app.post('/organizations/:slug/integrations/jira', { preHandler: [app.orgRoleGuard([OrgRole.ORG_ADMIN])] }, async (request, reply) => {
    const { slug } = orgSlugParamsSchema.parse(request.params);
    const body = jiraConfigBodySchema.parse(request.body);
    const data = await IntegrationsService.upsertJira(slug, request.user.sub, body);
    return reply.send({ data });
  });

  app.post('/organizations/:slug/integrations/linear', { preHandler: [app.orgRoleGuard([OrgRole.ORG_ADMIN])] }, async (request, reply) => {
    const { slug } = orgSlugParamsSchema.parse(request.params);
    const body = linearConfigBodySchema.parse(request.body);
    const data = await IntegrationsService.upsertLinear(slug, request.user.sub, body);
    return reply.send({ data });
  });

  app.post('/organizations/:slug/integrations/github', { preHandler: [app.orgRoleGuard([OrgRole.ORG_ADMIN])] }, async (request, reply) => {
    const { slug } = orgSlugParamsSchema.parse(request.params);
    const body = githubConfigBodySchema.parse(request.body);
    const data = await IntegrationsService.upsertGithub(slug, request.user.sub, body);
    return reply.send({ data });
  });

  app.delete('/organizations/:slug/integrations/:type', { preHandler: [app.orgRoleGuard([OrgRole.ORG_ADMIN])] }, async (request, reply) => {
    const { slug, type } = integrationTypeParamsSchema.parse(request.params);
    const data = await IntegrationsService.deleteIntegration(slug, request.user.sub, type);
    return reply.send({ data });
  });

  app.post('/reports/:id/integrations/push-ticket', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = reportIdParamsSchema.parse(request.params);
    const data = await IntegrationsService.pushReportTicket(id, request.user.sub);
    return reply.send({ data });
  });

  app.get('/auth/sso/:orgSlug', async (request, reply) => {
    const { orgSlug } = ssoOrgParamsSchema.parse(request.params);
    const data = await IntegrationsService.initiateSso(orgSlug);
    return reply.send({ data });
  });

  app.post('/auth/sso/:orgSlug/callback', async (request, reply) => {
    const { orgSlug } = ssoOrgParamsSchema.parse(request.params);
    const body = ssoCallbackBodySchema.parse(request.body);
    const data = await IntegrationsService.ssoCallback(orgSlug, body);
    return reply.send({ data });
  });

  app.get('/auth/sso/:orgSlug/metadata', async (request, reply) => {
    const { orgSlug } = ssoOrgParamsSchema.parse(request.params);
    const data = await IntegrationsService.ssoMetadata(orgSlug);
    return reply.type('application/xml').send(data);
  });

  app.get('/organizations/:slug/sso-config', { preHandler: [app.orgRoleGuard([OrgRole.ORG_ADMIN])] }, async (request, reply) => {
    const { slug } = orgSlugParamsSchema.parse(request.params);
    const data = await IntegrationsService.getSsoConfig(slug, request.user.sub);
    return reply.send({ data });
  });

  app.put('/organizations/:slug/sso-config', { preHandler: [app.orgRoleGuard([OrgRole.ORG_ADMIN])] }, async (request, reply) => {
    const { slug } = orgSlugParamsSchema.parse(request.params);
    const body = ssoConfigBodySchema.parse(request.body);
    const data = await IntegrationsService.upsertSsoConfig(slug, request.user.sub, body);
    return reply.send({ data });
  });
}
