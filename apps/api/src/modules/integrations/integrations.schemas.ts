import { z } from 'zod';

export const orgSlugParamsSchema = z.object({
  slug: z.string().min(1).max(80),
});

export const webhookIdParamsSchema = z.object({
  slug: z.string().min(1).max(80),
  id: z.string().min(1),
});

export const createWebhookBodySchema = z.object({
  url: z.string().url().max(2048),
  events: z.array(z.string().min(1).max(120)).min(1).max(50),
  active: z.boolean().optional(),
});
export type CreateWebhookBody = z.infer<typeof createWebhookBodySchema>;

export const updateWebhookBodySchema = z.object({
  url: z.string().url().max(2048).optional(),
  events: z.array(z.string().min(1).max(120)).min(1).max(50).optional(),
  active: z.boolean().optional(),
});
export type UpdateWebhookBody = z.infer<typeof updateWebhookBodySchema>;

export const createApiKeyBodySchema = z.object({
  name: z.string().min(1).max(120),
  scopes: z.array(z.string().min(1).max(120)).max(50).default([]),
  expiresAt: z.coerce.date().optional(),
});
export type CreateApiKeyBody = z.infer<typeof createApiKeyBodySchema>;

export const apiKeyIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const integrationTypeParamsSchema = z.object({
  slug: z.string().min(1).max(80),
  type: z.enum(['jira', 'linear', 'github']),
});

export const jiraConfigBodySchema = z.object({
  baseUrl: z.string().url().max(2048),
  projectKey: z.string().min(1).max(50),
  apiToken: z.string().min(1).max(1000),
});
export type JiraConfigBody = z.infer<typeof jiraConfigBodySchema>;

export const linearConfigBodySchema = z.object({
  apiKey: z.string().min(1).max(1000),
  teamId: z.string().min(1).max(100),
});
export type LinearConfigBody = z.infer<typeof linearConfigBodySchema>;

export const githubConfigBodySchema = z.object({
  token: z.string().min(1).max(1000),
  owner: z.string().min(1).max(120),
  repo: z.string().min(1).max(120),
});
export type GithubConfigBody = z.infer<typeof githubConfigBodySchema>;

export const reportIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const ssoOrgParamsSchema = z.object({
  orgSlug: z.string().min(1).max(80),
});

export const ssoCallbackBodySchema = z.object({
  email: z.string().email(),
  provider: z.enum(['SAML', 'OIDC']).default('SAML'),
  username: z.string().min(3).max(39).optional(),
});
export type SsoCallbackBody = z.infer<typeof ssoCallbackBodySchema>;

export const ssoConfigBodySchema = z.object({
  providerType: z.enum(['SAML', 'OIDC']),
  metadataXml: z.string().optional(),
  issuer: z.string().optional(),
  entryPoint: z.string().url().optional(),
  cert: z.string().optional(),
  oidcIssuerUrl: z.string().url().optional(),
  oidcClientId: z.string().optional(),
  oidcClientSecret: z.string().optional(),
  oidcRedirectUri: z.string().url().optional(),
  enabled: z.boolean().default(true),
});
export type SsoConfigBody = z.infer<typeof ssoConfigBodySchema>;
