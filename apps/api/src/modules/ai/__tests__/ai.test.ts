import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reportIdParamSchema, submissionCopilotBodySchema } from '../ai.schemas.js';
import { AiService } from '../ai.service.js';
import { VulnCategory } from '@bughuntr/shared';

// ─── Mock @bughuntr/db so tests run without a live database ───────────────────
vi.mock('@bughuntr/db', () => ({
  prisma: {
    report: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    reportEmbedding: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    aiTriageAssessment: {
      upsert: vi.fn(),
    },
    asset: {
      findMany: vi.fn(),
    },
    securityKnowledge: {
      upsert: vi.fn(),
    },
    $executeRawUnsafe: vi.fn(),
  },
}));

// ─── AI Route Schemas ─────────────────────────────────────────────────────────

describe('AI Route Schemas', () => {
  describe('reportIdParamSchema', () => {
    it('accepts a valid report id', () => {
      const result = reportIdParamSchema.safeParse({ id: 'clx123abc' });
      expect(result.success).toBe(true);
    });

    it('rejects empty report id', () => {
      const result = reportIdParamSchema.safeParse({ id: '' });
      expect(result.success).toBe(false);
    });

    it('rejects missing report id', () => {
      const result = reportIdParamSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('submissionCopilotBodySchema', () => {
    it('accepts a fully populated body', () => {
      const result = submissionCopilotBodySchema.safeParse({
        title: 'Stored XSS in profile bio',
        vulnCategory: VulnCategory.XSS,
        targetAsset: 'app.example.com',
        reproSteps: '1. Navigate to profile\n2. Inject payload',
        impactExplanation: 'Allows cookie theft',
      });
      expect(result.success).toBe(true);
    });

    it('applies empty-string defaults for missing text fields', () => {
      const result = submissionCopilotBodySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('');
        expect(result.data.reproSteps).toBe('');
        expect(result.data.impactExplanation).toBe('');
        expect(result.data.targetAsset).toBe('');
        expect(result.data.vulnCategory).toBeUndefined();
      }
    });

    it('rejects an invalid vulnCategory enum value', () => {
      const result = submissionCopilotBodySchema.safeParse({
        vulnCategory: 'NOT_A_REAL_CATEGORY',
      });
      expect(result.success).toBe(false);
    });
  });
});

// ─── AiService.createDeterministicEmbedding ───────────────────────────────────

describe('AiService.createDeterministicEmbedding', () => {
  it('returns a vector of the requested dimension', () => {
    const vec = AiService.createDeterministicEmbedding('sql injection payload', 1536);
    expect(vec).toHaveLength(1536);
  });

  it('returns a unit-normalized vector (L2 norm approximately 1)', () => {
    const vec = AiService.createDeterministicEmbedding('cross-site scripting alert(1)', 1536);
    const norm = Math.sqrt(vec.reduce((acc, v) => acc + v * v, 0));
    expect(norm).toBeCloseTo(1.0, 3);
  });

  it('is deterministic - same input produces same output', () => {
    const vecA = AiService.createDeterministicEmbedding('SSRF via webhook URL', 64);
    const vecB = AiService.createDeterministicEmbedding('SSRF via webhook URL', 64);
    expect(vecA).toEqual(vecB);
  });

  it('produces different vectors for semantically different inputs', () => {
    const vecA = AiService.createDeterministicEmbedding('SQL injection bypass', 64);
    const vecB = AiService.createDeterministicEmbedding('privilege escalation kernel', 64);
    const dotProduct = vecA.reduce((acc, v, i) => acc + v * vecB[i]!, 0);
    expect(dotProduct).toBeLessThan(0.999);
  });

  it('handles empty string gracefully', () => {
    const vec = AiService.createDeterministicEmbedding('', 8);
    expect(vec).toHaveLength(8);
    const norm = Math.sqrt(vec.reduce((acc, v) => acc + v * v, 0));
    expect(norm).toBeCloseTo(0, 5);
  });

  it('works with a custom dimension count', () => {
    const vec = AiService.createDeterministicEmbedding('IDOR in /api/users', 128);
    expect(vec).toHaveLength(128);
  });
});

// ─── AiService.submissionCopilot ─────────────────────────────────────────────

describe('AiService.submissionCopilot', () => {
  it('returns NEEDS_WORK for an empty draft', async () => {
    const result = await AiService.submissionCopilot({
      title: '',
      reproSteps: '',
      impactExplanation: '',
    });
    expect(result.readinessStatus).toBe('NEEDS_WORK');
    expect(result.completenessScore).toBeLessThan(60);
  });

  it('returns EXCELLENT for a high-quality complete report', async () => {
    const result = await AiService.submissionCopilot({
      title: 'Reflected XSS via q parameter on /search endpoint',
      vulnCategory: VulnCategory.XSS,
      targetAsset: 'app.target.com',
      reproSteps: '1. Navigate to https://app.target.com/search?q=payload\n2. POST /api/endpoint\n3. Observe JavaScript execution in the browser console',
      impactExplanation: 'Allows an attacker to execute arbitrary JavaScript enabling cookie theft and session hijacking.',
    });
    expect(result.readinessStatus).toBe('EXCELLENT');
    expect(result.completenessScore).toBeGreaterThanOrEqual(80);
    expect(result.detectedSecretsCount).toBe(0);
  });

  it('detects leaked API keys and returns SECURITY_ALERT feedback', async () => {
    const result = await AiService.submissionCopilot({
      title: 'API key exposure in source',
      reproSteps: 'Sent request with Authorization: Bearer sk-1234567890abcdef1234567890abcdef to the endpoint.',
      impactExplanation: 'API key found in source code',
    });
    expect(result.detectedSecretsCount).toBeGreaterThanOrEqual(1);
    const securityAlert = result.feedback.find((f) => f.type === 'SECURITY_ALERT');
    expect(securityAlert).toBeDefined();
    expect(securityAlert?.id).toBe('secrets-detected');
  });

  it('warns when reproduction steps are too short', async () => {
    const result = await AiService.submissionCopilot({
      title: 'SQL Injection in login form allows full DB access',
      reproSteps: 'type payload',
      impactExplanation: 'Allows full DB access and credential exfiltration',
    });
    const warning = result.feedback.find((f) => f.id === 'repro-short');
    expect(warning).toBeDefined();
  });

  it('warns when title is too vague', async () => {
    const result = await AiService.submissionCopilot({
      title: 'bug',
      reproSteps: '1. Do something important\n2. Notice the vulnerability occurs via POST /api/endpoint\n3. Confirm impact',
      impactExplanation: 'Users sensitive data can be exfiltrated by attacker',
    });
    const warning = result.feedback.find((f) => f.id === 'title-short');
    expect(warning).toBeDefined();
  });

  it('completeness score is always clamped between 0 and 100', async () => {
    const results = await Promise.all([
      AiService.submissionCopilot({ title: '', reproSteps: '', impactExplanation: '' }),
      AiService.submissionCopilot({
        title: 'Reflected XSS via q parameter on /search endpoint with persistent payload',
        reproSteps: '1. Navigate to https://app.target.com/search?q=xss\n2. curl -X POST https://app.target.com/api with payload\n3. Observe execution',
        impactExplanation: 'Cookie theft, session hijacking, and full account takeover are possible for all users.',
      }),
    ]);
    for (const result of results) {
      expect(result.completenessScore).toBeGreaterThanOrEqual(0);
      expect(result.completenessScore).toBeLessThanOrEqual(100);
    }
  });
});

// ─── AiService.evaluateScope ─────────────────────────────────────────────────

describe('AiService.evaluateScope', () => {
  beforeEach(async () => {
    const { prisma } = await import('@bughuntr/db');
    vi.mocked(prisma.asset.findMany).mockReset();
  });

  it('returns IN_SCOPE when no assets defined for the program', async () => {
    const { prisma } = await import('@bughuntr/db');
    vi.mocked(prisma.asset.findMany).mockResolvedValue([]);
    const result = await AiService.evaluateScope('prog-1', null);
    expect(result.status).toBe('IN_SCOPE');
    expect(result.rationale).toMatch(/open scope/i);
  });

  it('returns IN_SCOPE when assetId matches an in-scope asset', async () => {
    const { prisma } = await import('@bughuntr/db');
    vi.mocked(prisma.asset.findMany).mockResolvedValue([
      { id: 'asset-1', identifier: 'app.example.com', inScope: true, programId: 'prog-1', type: 'DOMAIN', description: null, deletedAt: null, createdAt: new Date(), updatedAt: new Date() } as any,
    ]);
    const result = await AiService.evaluateScope('prog-1', 'asset-1', 'app.example.com');
    expect(result.status).toBe('IN_SCOPE');
    expect(result.rationale).toMatch(/in-scope asset/i);
  });

  it('returns OUT_OF_SCOPE when assetId matches an out-of-scope asset', async () => {
    const { prisma } = await import('@bughuntr/db');
    vi.mocked(prisma.asset.findMany).mockResolvedValue([
      { id: 'asset-2', identifier: 'admin.example.com', inScope: false, programId: 'prog-1', type: 'SUBDOMAIN', description: null, deletedAt: null, createdAt: new Date(), updatedAt: new Date() } as any,
    ]);
    const result = await AiService.evaluateScope('prog-1', 'asset-2');
    expect(result.status).toBe('OUT_OF_SCOPE');
    expect(result.rationale).toMatch(/out of scope/i);
  });

  it('resolves IN_SCOPE via wildcard domain matching on identifier', async () => {
    const { prisma } = await import('@bughuntr/db');
    vi.mocked(prisma.asset.findMany).mockResolvedValue([
      { id: 'asset-3', identifier: '*.example.com', inScope: true, programId: 'prog-1', type: 'SUBDOMAIN', description: null, deletedAt: null, createdAt: new Date(), updatedAt: new Date() } as any,
    ]);
    const result = await AiService.evaluateScope('prog-1', null, 'api.example.com');
    expect(result.status).toBe('IN_SCOPE');
    expect(result.rationale).toMatch(/wildcard/i);
  });

  it('returns UNCERTAIN when target does not match any defined asset', async () => {
    const { prisma } = await import('@bughuntr/db');
    vi.mocked(prisma.asset.findMany).mockResolvedValue([
      { id: 'asset-4', identifier: 'app.example.com', inScope: true, programId: 'prog-1', type: 'DOMAIN', description: null, deletedAt: null, createdAt: new Date(), updatedAt: new Date() } as any,
    ]);
    const result = await AiService.evaluateScope('prog-1', null, 'completely-different-site.io');
    expect(result.status).toBe('UNCERTAIN');
  });
});
