import { describe, it, expect } from 'vitest';
import {
  triageQueueQuerySchema,
  updateStatusBodySchema,
  assignBodySchema,
  updateSeverityBodySchema,
  markDuplicateBodySchema,
  mergeBodySchema,
  escalateBodySchema,
  linkReportBodySchema,
  bulkAssignBodySchema,
  bulkCloseBodySchema,
} from '../triage.schemas.js';

// ─── triageQueueQuerySchema ──────────────────────────────

describe('triageQueueQuerySchema', () => {
  it('provides defaults for empty query', () => {
    const result = triageQueueQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.sortBy).toBe('createdAt');
    expect(result.sortOrder).toBe('desc');
  });

  it('coerces page and limit from strings', () => {
    const result = triageQueueQuerySchema.parse({ page: '3', limit: '50' });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });

  it('rejects page < 1', () => {
    const result = triageQueueQuerySchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects limit > 100', () => {
    const result = triageQueueQuerySchema.safeParse({ limit: 200 });
    expect(result.success).toBe(false);
  });

  it('accepts valid filter options', () => {
    const result = triageQueueQuerySchema.safeParse({
      status: 'TRIAGING',
      severity: 'HIGH',
      assigneeId: 'user123',
      hasBreachedSla: 'true',
      sortBy: 'slaUrgency',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid sortBy', () => {
    const result = triageQueueQuerySchema.safeParse({ sortBy: 'invalid' });
    expect(result.success).toBe(false);
  });
});

// ─── updateStatusBodySchema ──────────────────────────────

describe('updateStatusBodySchema', () => {
  it('accepts valid status', () => {
    const result = updateStatusBodySchema.safeParse({ status: 'TRIAGING' });
    expect(result.success).toBe(true);
  });

  it('accepts status with reason', () => {
    const result = updateStatusBodySchema.safeParse({
      status: 'CLOSED',
      reason: 'Not a security issue',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = updateStatusBodySchema.safeParse({ status: 'DRAFT' });
    expect(result.success).toBe(false);
  });

  it('rejects missing status', () => {
    const result = updateStatusBodySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects reason > 2000 chars', () => {
    const result = updateStatusBodySchema.safeParse({
      status: 'CLOSED',
      reason: 'x'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});

// ─── assignBodySchema ────────────────────────────────────

describe('assignBodySchema', () => {
  it('accepts valid assignee', () => {
    const result = assignBodySchema.safeParse({ assigneeId: 'user123' });
    expect(result.success).toBe(true);
  });

  it('rejects empty assigneeId', () => {
    const result = assignBodySchema.safeParse({ assigneeId: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing assigneeId', () => {
    const result = assignBodySchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ─── updateSeverityBodySchema ────────────────────────────

describe('updateSeverityBodySchema', () => {
  it('accepts severity without CVSS', () => {
    const result = updateSeverityBodySchema.safeParse({ severity: 'CRITICAL' });
    expect(result.success).toBe(true);
  });

  it('accepts severity with CVSS score', () => {
    const result = updateSeverityBodySchema.safeParse({ severity: 'HIGH', cvssScore: 8.5 });
    expect(result.success).toBe(true);
  });

  it('rejects invalid severity', () => {
    const result = updateSeverityBodySchema.safeParse({ severity: 'EXTREME' });
    expect(result.success).toBe(false);
  });

  it('rejects CVSS > 10', () => {
    const result = updateSeverityBodySchema.safeParse({ severity: 'HIGH', cvssScore: 11 });
    expect(result.success).toBe(false);
  });

  it('rejects CVSS < 0', () => {
    const result = updateSeverityBodySchema.safeParse({ severity: 'LOW', cvssScore: -1 });
    expect(result.success).toBe(false);
  });
});

// ─── markDuplicateBodySchema ─────────────────────────────

describe('markDuplicateBodySchema', () => {
  it('accepts valid duplicate reference', () => {
    const result = markDuplicateBodySchema.safeParse({ duplicateOfId: 'report-abc' });
    expect(result.success).toBe(true);
  });

  it('rejects empty duplicateOfId', () => {
    const result = markDuplicateBodySchema.safeParse({ duplicateOfId: '' });
    expect(result.success).toBe(false);
  });
});

// ─── mergeBodySchema ─────────────────────────────────────

describe('mergeBodySchema', () => {
  it('accepts valid target', () => {
    const result = mergeBodySchema.safeParse({ targetReportId: 'report-xyz' });
    expect(result.success).toBe(true);
  });

  it('rejects empty targetReportId', () => {
    const result = mergeBodySchema.safeParse({ targetReportId: '' });
    expect(result.success).toBe(false);
  });
});

// ─── escalateBodySchema ──────────────────────────────────

describe('escalateBodySchema', () => {
  it('accepts valid reason', () => {
    const result = escalateBodySchema.safeParse({ reason: 'Critical vulnerability requires executive attention' });
    expect(result.success).toBe(true);
  });

  it('rejects empty reason', () => {
    const result = escalateBodySchema.safeParse({ reason: '' });
    expect(result.success).toBe(false);
  });

  it('rejects reason > 2000 chars', () => {
    const result = escalateBodySchema.safeParse({ reason: 'x'.repeat(2001) });
    expect(result.success).toBe(false);
  });
});

// ─── linkReportBodySchema ────────────────────────────────

describe('linkReportBodySchema', () => {
  it('accepts valid link', () => {
    const result = linkReportBodySchema.safeParse({ linkedId: 'report-abc', linkType: 'RELATED' });
    expect(result.success).toBe(true);
  });

  it('accepts DUPLICATE link type', () => {
    const result = linkReportBodySchema.safeParse({ linkedId: 'r1', linkType: 'DUPLICATE' });
    expect(result.success).toBe(true);
  });

  it('accepts CHAINED link type', () => {
    const result = linkReportBodySchema.safeParse({ linkedId: 'r1', linkType: 'CHAINED' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid linkType', () => {
    const result = linkReportBodySchema.safeParse({ linkedId: 'r1', linkType: 'BLOCKS' });
    expect(result.success).toBe(false);
  });

  it('rejects empty linkedId', () => {
    const result = linkReportBodySchema.safeParse({ linkedId: '', linkType: 'RELATED' });
    expect(result.success).toBe(false);
  });
});

// ─── bulkAssignBodySchema ────────────────────────────────

describe('bulkAssignBodySchema', () => {
  it('accepts valid bulk assign', () => {
    const result = bulkAssignBodySchema.safeParse({
      reportIds: ['r1', 'r2', 'r3'],
      assigneeId: 'user123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty reportIds', () => {
    const result = bulkAssignBodySchema.safeParse({ reportIds: [], assigneeId: 'user123' });
    expect(result.success).toBe(false);
  });

  it('rejects > 50 reportIds', () => {
    const ids = Array.from({ length: 51 }, (_, i) => `r${i}`);
    const result = bulkAssignBodySchema.safeParse({ reportIds: ids, assigneeId: 'user123' });
    expect(result.success).toBe(false);
  });

  it('rejects missing assigneeId', () => {
    const result = bulkAssignBodySchema.safeParse({ reportIds: ['r1'] });
    expect(result.success).toBe(false);
  });
});

// ─── bulkCloseBodySchema ─────────────────────────────────

describe('bulkCloseBodySchema', () => {
  it('accepts valid bulk close', () => {
    const result = bulkCloseBodySchema.safeParse({
      reportIds: ['r1', 'r2'],
      reason: 'Duplicate reports',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty reason', () => {
    const result = bulkCloseBodySchema.safeParse({ reportIds: ['r1'], reason: '' });
    expect(result.success).toBe(false);
  });

  it('rejects > 50 reportIds', () => {
    const ids = Array.from({ length: 51 }, (_, i) => `r${i}`);
    const result = bulkCloseBodySchema.safeParse({ reportIds: ids, reason: 'cleanup' });
    expect(result.success).toBe(false);
  });
});
