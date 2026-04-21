import { createHmac, randomBytes } from 'node:crypto';
import { Queue } from 'bullmq';
import { SAML } from '@node-saml/node-saml';
import { OrgRole, PlatformRole, prisma, type Prisma } from '@bughuntr/db';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '@bughuntr/shared';
import { decrypt, encrypt, hashToken } from '../../lib/crypto.js';
import { buildRedisConnection } from '../../lib/redis-connection.js';
import type {
  CreateApiKeyBody,
  CreateWebhookBody,
  GithubConfigBody,
  JiraConfigBody,
  LinearConfigBody,
  SsoCallbackBody,
  SsoConfigBody,
  UpdateWebhookBody,
} from './integrations.schemas.js';

const webhookQueue = new Queue('webhook', { connection: buildRedisConnection() });

type IntegrationType = 'jira' | 'linear' | 'github';

async function assertOrgRole(slug: string, actorId: string, roles: OrgRole[]) {
  const member = await prisma.organizationMember.findFirst({
    where: { userId: actorId, role: { in: roles }, org: { slug, deletedAt: null } },
    include: { org: true },
  });
  if (!member) {
    throw new ForbiddenError('Insufficient organization role');
  }
  return member;
}

function getIntegrationSettings(
  settings: Prisma.JsonValue | null | undefined,
): Record<string, unknown> {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return {};
  return settings as Record<string, unknown>;
}

export class IntegrationsService {
  static async createWebhook(slug: string, actorId: string, body: CreateWebhookBody) {
    const member = await assertOrgRole(slug, actorId, [OrgRole.ORG_ADMIN, OrgRole.PROGRAM_MANAGER]);
    const secret = randomBytes(32).toString('hex');
    const webhook = await prisma.webhook.create({
      data: {
        orgId: member.orgId,
        url: body.url,
        events: body.events,
        secret: encrypt(secret),
        isActive: body.active ?? true,
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId,
        orgId: member.orgId,
        action: 'WEBHOOK_CREATED',
        entityType: 'Webhook',
        entityId: webhook.id,
        after: { events: body.events, url: body.url },
      },
    });
    return webhook;
  }

  static async listWebhooks(slug: string, actorId: string) {
    const member = await assertOrgRole(slug, actorId, [OrgRole.ORG_ADMIN, OrgRole.PROGRAM_MANAGER, OrgRole.REVIEWER, OrgRole.FINANCE, OrgRole.VIEWER]);
    return prisma.webhook.findMany({
      where: { orgId: member.orgId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, url: true, events: true, isActive: true, lastStatus: true, createdAt: true },
    });
  }

  static async updateWebhook(
    slug: string,
    webhookId: string,
    actorId: string,
    body: UpdateWebhookBody,
  ) {
    const member = await assertOrgRole(slug, actorId, [OrgRole.ORG_ADMIN, OrgRole.PROGRAM_MANAGER]);
    const existing = await prisma.webhook.findFirst({
      where: { id: webhookId, orgId: member.orgId },
    });
    if (!existing) throw new NotFoundError('Webhook');

    const updated = await prisma.webhook.update({
      where: { id: webhookId },
      data: {
        ...(body.url !== undefined ? { url: body.url } : {}),
        ...(body.events !== undefined ? { events: body.events } : {}),
        ...(body.active !== undefined ? { isActive: body.active } : {}),
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId,
        orgId: member.orgId,
        action: 'WEBHOOK_UPDATED',
        entityType: 'Webhook',
        entityId: webhookId,
        after: body as unknown as Prisma.InputJsonValue,
      },
    });
    return updated;
  }

  static async deleteWebhook(slug: string, webhookId: string, actorId: string) {
    const member = await assertOrgRole(slug, actorId, [OrgRole.ORG_ADMIN, OrgRole.PROGRAM_MANAGER]);
    const existing = await prisma.webhook.findFirst({
      where: { id: webhookId, orgId: member.orgId },
    });
    if (!existing) throw new NotFoundError('Webhook');
    await prisma.$transaction([
      prisma.webhook.delete({ where: { id: webhookId } }),
      prisma.auditLog.create({
        data: {
          actorId,
          orgId: member.orgId,
          action: 'WEBHOOK_DELETED',
          entityType: 'Webhook',
          entityId: webhookId,
        },
      }),
    ]);
    return { message: 'Webhook deleted' };
  }

  static async testWebhook(slug: string, webhookId: string, actorId: string) {
    const member = await assertOrgRole(slug, actorId, [OrgRole.ORG_ADMIN, OrgRole.PROGRAM_MANAGER]);
    const webhook = await prisma.webhook.findFirst({
      where: { id: webhookId, orgId: member.orgId },
    });
    if (!webhook) throw new NotFoundError('Webhook');
    if (!webhook.isActive) throw new BadRequestError('Webhook is inactive');

    await webhookQueue.add(
      'webhook.delivery',
      {
        webhookId: webhook.id,
        url: webhook.url,
        secret: decrypt(webhook.secret),
        event: 'webhook.test',
        payload: {
          ok: true,
          ping: 'pong',
          organizationSlug: slug,
          webhookId,
          sentAt: new Date().toISOString(),
        },
      },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 2000 },
      },
    );

    await prisma.auditLog.create({
      data: {
        actorId,
        orgId: member.orgId,
        action: 'WEBHOOK_TEST_SENT',
        entityType: 'Webhook',
        entityId: webhookId,
      },
    });

    return { message: 'Test webhook queued' };
  }

  static async getWebhookDeliveries(slug: string, webhookId: string, actorId: string) {
    const member = await assertOrgRole(slug, actorId, [OrgRole.ORG_ADMIN, OrgRole.PROGRAM_MANAGER, OrgRole.REVIEWER, OrgRole.FINANCE, OrgRole.VIEWER]);
    const webhook = await prisma.webhook.findFirst({
      where: { id: webhookId, orgId: member.orgId },
    });
    if (!webhook) throw new NotFoundError('Webhook');
    return prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  static async createOrgApiKey(slug: string, actorId: string, body: CreateApiKeyBody) {
    const member = await assertOrgRole(slug, actorId, [OrgRole.ORG_ADMIN]);
    const raw = `bh_${randomBytes(24).toString('base64url')}`;
    const keyHash = hashToken(raw);
    const prefix = raw.slice(0, 10);
    const key = await prisma.apiKey.create({
      data: {
        orgId: member.orgId,
        name: body.name,
        keyHash,
        prefix,
        scopes: body.scopes,
        expiresAt: body.expiresAt,
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId,
        orgId: member.orgId,
        action: 'ORG_API_KEY_CREATED',
        entityType: 'ApiKey',
        entityId: key.id,
      },
    });
    return { id: key.id, key: raw, prefix: key.prefix, createdAt: key.createdAt };
  }

  static async listOrgApiKeys(slug: string, actorId: string) {
    const member = await assertOrgRole(slug, actorId, [OrgRole.ORG_ADMIN]);
    return prisma.apiKey.findMany({
      where: { orgId: member.orgId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        createdAt: true,
        expiresAt: true,
        revokedAt: true,
        lastUsedAt: true,
      },
    });
  }

  static async revokeOrgApiKey(slug: string, keyId: string, actorId: string) {
    const member = await assertOrgRole(slug, actorId, [OrgRole.ORG_ADMIN]);
    const key = await prisma.apiKey.findFirst({
      where: { id: keyId, orgId: member.orgId },
    });
    if (!key) throw new NotFoundError('ApiKey');
    await prisma.apiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });
    await prisma.auditLog.create({
      data: {
        actorId,
        orgId: member.orgId,
        action: 'ORG_API_KEY_REVOKED',
        entityType: 'ApiKey',
        entityId: keyId,
      },
    });
    return { message: 'API key revoked' };
  }

  static async createPersonalApiKey(userId: string, body: CreateApiKeyBody) {
    const raw = `bh_${randomBytes(24).toString('base64url')}`;
    const keyHash = hashToken(raw);
    const prefix = raw.slice(0, 10);
    const key = await prisma.apiKey.create({
      data: {
        userId,
        name: body.name,
        keyHash,
        prefix,
        scopes: body.scopes,
        expiresAt: body.expiresAt,
      },
    });
    return { id: key.id, key: raw, prefix: key.prefix, createdAt: key.createdAt };
  }

  static async listPersonalApiKeys(userId: string) {
    return prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        createdAt: true,
        expiresAt: true,
        revokedAt: true,
        lastUsedAt: true,
      },
    });
  }

  static async revokePersonalApiKey(userId: string, keyId: string) {
    const key = await prisma.apiKey.findFirst({ where: { id: keyId, userId } });
    if (!key) throw new NotFoundError('ApiKey');
    await prisma.apiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });
    return { message: 'API key revoked' };
  }

  static async upsertJira(slug: string, actorId: string, body: JiraConfigBody) {
    const member = await assertOrgRole(slug, actorId, [OrgRole.ORG_ADMIN]);
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: member.orgId } });
    const settings = getIntegrationSettings(org.settings);
    settings['integrations'] = {
      ...(settings['integrations'] as Record<string, unknown> | undefined),
      jira: {
        baseUrl: body.baseUrl,
        projectKey: body.projectKey,
        apiToken: encrypt(body.apiToken),
      },
    };
    await prisma.organization.update({
      where: { id: member.orgId },
      data: { settings: settings as Prisma.InputJsonValue },
    });
    return { message: 'Jira integration configured' };
  }

  static async upsertLinear(slug: string, actorId: string, body: LinearConfigBody) {
    const member = await assertOrgRole(slug, actorId, [OrgRole.ORG_ADMIN]);
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: member.orgId } });
    const settings = getIntegrationSettings(org.settings);
    settings['integrations'] = {
      ...(settings['integrations'] as Record<string, unknown> | undefined),
      linear: {
        apiKey: encrypt(body.apiKey),
        teamId: body.teamId,
      },
    };
    await prisma.organization.update({
      where: { id: member.orgId },
      data: { settings: settings as Prisma.InputJsonValue },
    });
    return { message: 'Linear integration configured' };
  }

  static async upsertGithub(slug: string, actorId: string, body: GithubConfigBody) {
    const member = await assertOrgRole(slug, actorId, [OrgRole.ORG_ADMIN]);
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: member.orgId } });
    const settings = getIntegrationSettings(org.settings);
    settings['integrations'] = {
      ...(settings['integrations'] as Record<string, unknown> | undefined),
      github: {
        token: encrypt(body.token),
        owner: body.owner,
        repo: body.repo,
      },
    };
    await prisma.organization.update({
      where: { id: member.orgId },
      data: { settings: settings as Prisma.InputJsonValue },
    });
    return { message: 'GitHub integration configured' };
  }

  static async deleteIntegration(slug: string, actorId: string, type: IntegrationType) {
    const member = await assertOrgRole(slug, actorId, [OrgRole.ORG_ADMIN]);
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: member.orgId } });
    const settings = getIntegrationSettings(org.settings);
    const integrations = {
      ...(settings['integrations'] as Record<string, unknown> | undefined),
    };
    delete integrations[type];
    settings['integrations'] = integrations;
    await prisma.organization.update({
      where: { id: member.orgId },
      data: { settings: settings as Prisma.InputJsonValue },
    });
    return { message: `${type} integration removed` };
  }

  static async pushReportTicket(reportId: string, actorId: string) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { program: { include: { org: true } }, submitter: true },
    });
    if (!report) throw new NotFoundError('Report');

    const member = await prisma.organizationMember.findUnique({
      where: { orgId_userId: { orgId: report.program.orgId, userId: actorId } },
    });
    if (!member) throw new ForbiddenError('Organization membership required');

    const settings = getIntegrationSettings(report.program.org.settings);
    const integrations = (settings['integrations'] as Record<string, unknown> | undefined) ?? {};

    const issuePayload = {
      title: report.title,
      description: `Report ${report.id}\n\nSeverity: ${report.severityValidated ?? report.severityEstimate}\n\n${report.impactExplanation}`,
    };

    let externalUrl: string | null = null;
    if (integrations['jira']) {
      const jira = integrations['jira'] as Record<string, string | undefined>;
      const jiraBaseUrl = jira['baseUrl'];
      const jiraToken = jira['apiToken'];
      const jiraProjectKey = jira['projectKey'];
      if (!jiraBaseUrl || !jiraToken || !jiraProjectKey) {
        throw new BadRequestError('Jira integration config is incomplete');
      }
      const res = await fetch(`${jiraBaseUrl}/rest/api/3/issue`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${decrypt(jiraToken)}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            project: { key: jiraProjectKey },
            summary: issuePayload.title,
            description: issuePayload.description,
            issuetype: { name: 'Task' },
          },
        }),
      });
      if (!res.ok) throw new BadRequestError(`Jira push failed (${res.status})`);
      const json = (await res.json()) as { key?: string };
      if (!json.key) throw new BadRequestError('Jira issue key missing');
      externalUrl = `${jiraBaseUrl}/browse/${json.key}`;
    } else if (integrations['linear']) {
      const linear = integrations['linear'] as Record<string, string | undefined>;
      const linearApiKey = linear['apiKey'];
      const linearTeamId = linear['teamId'];
      if (!linearApiKey || !linearTeamId) {
        throw new BadRequestError('Linear integration config is incomplete');
      }
      const res = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: {
          Authorization: decrypt(linearApiKey),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query:
            'mutation CreateIssue($teamId: String!, $title: String!, $description: String!) { issueCreate(input: {teamId: $teamId, title: $title, description: $description}) { success issue { id url } } }',
          variables: {
            teamId: linearTeamId,
            title: issuePayload.title,
            description: issuePayload.description,
          },
        }),
      });
      if (!res.ok) throw new BadRequestError(`Linear push failed (${res.status})`);
      const json = (await res.json()) as {
        data?: { issueCreate?: { success?: boolean; issue?: { url?: string } } };
      };
      externalUrl = json.data?.issueCreate?.issue?.url ?? null;
    } else if (integrations['github']) {
      const gh = integrations['github'] as Record<string, string | undefined>;
      const ghOwner = gh['owner'];
      const ghRepo = gh['repo'];
      const ghToken = gh['token'];
      if (!ghOwner || !ghRepo || !ghToken) {
        throw new BadRequestError('GitHub integration config is incomplete');
      }
      const res = await fetch(`https://api.github.com/repos/${ghOwner}/${ghRepo}/issues`, {
        method: 'POST',
        headers: {
          Authorization: `token ${decrypt(ghToken)}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: issuePayload.title,
          body: issuePayload.description,
        }),
      });
      if (!res.ok) throw new BadRequestError(`GitHub push failed (${res.status})`);
      const json = (await res.json()) as { html_url?: string };
      externalUrl = json.html_url ?? null;
    } else {
      throw new BadRequestError('No configured integration found');
    }

    await prisma.report.update({
      where: { id: report.id },
      data: { externalTicketUrl: externalUrl ?? undefined },
    });
    await prisma.auditLog.create({
      data: {
        actorId,
        orgId: report.program.orgId,
        action: 'REPORT_PUSHED_EXTERNAL_TICKET',
        entityType: 'Report',
        entityId: report.id,
        after: { externalTicketUrl: externalUrl },
      },
    });
    return { externalTicketUrl: externalUrl };
  }

  static async initiateSso(orgSlug: string) {
    const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) throw new NotFoundError('Organization');
    const sso = await prisma.orgSsoConfig.findUnique({ where: { orgId: org.id } });
    if (!sso || !sso.enabled) throw new BadRequestError('SSO not configured');

    if (sso.providerType === 'OIDC') {
      if (!sso.oidcIssuerUrl || !sso.oidcClientId || !sso.oidcRedirectUri) {
        throw new BadRequestError('OIDC configuration incomplete');
      }
      const state = randomBytes(16).toString('hex');
      const nonce = randomBytes(16).toString('hex');
      const authUrl = `${sso.oidcIssuerUrl.replace(/\/$/, '')}/authorize?client_id=${encodeURIComponent(
        sso.oidcClientId,
      )}&redirect_uri=${encodeURIComponent(
        sso.oidcRedirectUri,
      )}&response_type=code&scope=${encodeURIComponent(
        'openid email profile',
      )}&state=${encodeURIComponent(state)}&nonce=${encodeURIComponent(nonce)}`;
      return { redirectUrl: authUrl };
    }

    if (!sso.entryPoint || !sso.issuer || !sso.cert) {
      throw new BadRequestError('SAML configuration incomplete');
    }
    const saml = new SAML({
      entryPoint: sso.entryPoint,
      issuer: sso.issuer,
      idpCert: sso.cert,
    } as ConstructorParameters<typeof SAML>[0]);
    const requestUrl = await (saml as unknown as { getAuthorizeUrlAsync: (...args: unknown[]) => Promise<string> }).getAuthorizeUrlAsync(
      {},
      '',
      {},
    );
    return { redirectUrl: requestUrl };
  }

  static async ssoCallback(orgSlug: string, body: SsoCallbackBody) {
    const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) throw new NotFoundError('Organization');
    const sso = await prisma.orgSsoConfig.findUnique({ where: { orgId: org.id } });
    if (!sso || !sso.enabled) throw new UnauthorizedError('SSO disabled');

    const email = body.email.toLowerCase().trim();
    let user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null },
    });
    if (!user) {
      const usernameBase = (body.username ?? email.split('@')[0] ?? 'sso-user')
        .replace(/[^a-zA-Z0-9._-]/g, '')
        .slice(0, 30);
      let username = usernameBase || `sso-${randomBytes(4).toString('hex')}`;
      let n = 1;
      while (
        await prisma.user.findFirst({
          where: { username: { equals: username, mode: 'insensitive' } },
        })
      ) {
        username = `${usernameBase}-${n++}`;
      }
      user = await prisma.user.create({
        data: {
          email,
          username,
          emailVerifiedAt: new Date(),
          platformRole: PlatformRole.USER,
        },
      });
    }
    return { userId: user.id, email: user.email, provider: body.provider };
  }

  static async ssoMetadata(orgSlug: string) {
    const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) throw new NotFoundError('Organization');
    const sso = await prisma.orgSsoConfig.findUnique({ where: { orgId: org.id } });
    if (!sso) throw new NotFoundError('OrgSsoConfig');
    return `<?xml version="1.0"?><EntityDescriptor entityID="${sso.issuer ?? org.slug}"></EntityDescriptor>`;
  }

  static async getSsoConfig(slug: string, actorId: string) {
    const member = await assertOrgRole(slug, actorId, [OrgRole.ORG_ADMIN]);
    return prisma.orgSsoConfig.findUnique({ where: { orgId: member.orgId } });
  }

  static async upsertSsoConfig(slug: string, actorId: string, body: SsoConfigBody) {
    const member = await assertOrgRole(slug, actorId, [OrgRole.ORG_ADMIN]);
    const config = await prisma.orgSsoConfig.upsert({
      where: { orgId: member.orgId },
      create: {
        orgId: member.orgId,
        providerType: body.providerType,
        metadataXml: body.metadataXml,
        issuer: body.issuer,
        entryPoint: body.entryPoint,
        cert: body.cert,
        oidcIssuerUrl: body.oidcIssuerUrl,
        oidcClientId: body.oidcClientId,
        oidcClientSecret: body.oidcClientSecret ? encrypt(body.oidcClientSecret) : undefined,
        oidcRedirectUri: body.oidcRedirectUri,
        enabled: body.enabled,
      },
      update: {
        providerType: body.providerType,
        metadataXml: body.metadataXml,
        issuer: body.issuer,
        entryPoint: body.entryPoint,
        cert: body.cert,
        oidcIssuerUrl: body.oidcIssuerUrl,
        oidcClientId: body.oidcClientId,
        oidcClientSecret: body.oidcClientSecret ? encrypt(body.oidcClientSecret) : undefined,
        oidcRedirectUri: body.oidcRedirectUri,
        enabled: body.enabled,
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId,
        orgId: member.orgId,
        action: 'ORG_SSO_CONFIG_UPDATED',
        entityType: 'OrgSsoConfig',
        entityId: config.id,
      },
    });
    return config;
  }

  static computeWebhookSignature(secret: string, payload: Record<string, unknown>): string {
    return createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }
}
