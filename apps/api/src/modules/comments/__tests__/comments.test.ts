import { describe, it, expect } from 'vitest';
import {
  postCommentBodySchema,
  editCommentBodySchema,
  commentsQuerySchema,
  fromTemplateBodySchema,
  createTemplateBodySchema,
  updateTemplateBodySchema,
  notificationsQuerySchema,
  upsertPreferencesBodySchema,
} from '../comments.schemas.js';

// ─── postCommentBodySchema ───────────────────────────────

describe('postCommentBodySchema', () => {
  it('accepts valid comment', () => {
    const result = postCommentBodySchema.safeParse({ body: 'Great find!' });
    expect(result.success).toBe(true);
    expect(result.data?.isInternal).toBe(false); // default
  });

  it('accepts internal comment', () => {
    const result = postCommentBodySchema.safeParse({ body: 'Internal note', isInternal: true });
    expect(result.success).toBe(true);
    expect(result.data?.isInternal).toBe(true);
  });

  it('accepts comment with attachments', () => {
    const result = postCommentBodySchema.safeParse({
      body: 'See attached',
      attachmentIds: ['att-1', 'att-2'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty body', () => {
    const result = postCommentBodySchema.safeParse({ body: '' });
    expect(result.success).toBe(false);
  });

  it('rejects body > 10000 chars', () => {
    const result = postCommentBodySchema.safeParse({ body: 'x'.repeat(10001) });
    expect(result.success).toBe(false);
  });

  it('rejects > 10 attachments', () => {
    const result = postCommentBodySchema.safeParse({
      body: 'test',
      attachmentIds: Array.from({ length: 11 }, (_, i) => `att-${i}`),
    });
    expect(result.success).toBe(false);
  });
});

// ─── editCommentBodySchema ───────────────────────────────

describe('editCommentBodySchema', () => {
  it('accepts valid edit', () => {
    const result = editCommentBodySchema.safeParse({ body: 'Updated comment' });
    expect(result.success).toBe(true);
  });

  it('rejects empty body', () => {
    const result = editCommentBodySchema.safeParse({ body: '' });
    expect(result.success).toBe(false);
  });
});

// ─── commentsQuerySchema ─────────────────────────────────

describe('commentsQuerySchema', () => {
  it('provides defaults', () => {
    const result = commentsQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);
  });

  it('coerces string values', () => {
    const result = commentsQuerySchema.parse({ page: '2', limit: '25' });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(25);
  });
});

// ─── fromTemplateBodySchema ──────────────────────────────

describe('fromTemplateBodySchema', () => {
  it('accepts valid template reference', () => {
    const result = fromTemplateBodySchema.safeParse({ templateId: 'tmpl-1' });
    expect(result.success).toBe(true);
    expect(result.data?.isInternal).toBe(false);
  });

  it('accepts with variables', () => {
    const result = fromTemplateBodySchema.safeParse({
      templateId: 'tmpl-1',
      variables: { custom_field: 'value' },
      isInternal: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing templateId', () => {
    const result = fromTemplateBodySchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ─── createTemplateBodySchema ────────────────────────────

describe('createTemplateBodySchema', () => {
  it('accepts valid template', () => {
    const result = createTemplateBodySchema.safeParse({
      name: 'Need More Info',
      body: 'Hi {{researcher_name}}, we need more info about {{report_title}}.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = createTemplateBodySchema.safeParse({ name: '', body: 'content' });
    expect(result.success).toBe(false);
  });

  it('rejects empty body', () => {
    const result = createTemplateBodySchema.safeParse({ name: 'test', body: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name > 100 chars', () => {
    const result = createTemplateBodySchema.safeParse({ name: 'x'.repeat(101), body: 'ok' });
    expect(result.success).toBe(false);
  });

  it('rejects body > 5000 chars', () => {
    const result = createTemplateBodySchema.safeParse({ name: 'ok', body: 'x'.repeat(5001) });
    expect(result.success).toBe(false);
  });
});

// ─── updateTemplateBodySchema ────────────────────────────

describe('updateTemplateBodySchema', () => {
  it('accepts partial update (name only)', () => {
    const result = updateTemplateBodySchema.safeParse({ name: 'New Name' });
    expect(result.success).toBe(true);
  });

  it('accepts partial update (body only)', () => {
    const result = updateTemplateBodySchema.safeParse({ body: 'New body content' });
    expect(result.success).toBe(true);
  });

  it('accepts empty object', () => {
    const result = updateTemplateBodySchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

// ─── notificationsQuerySchema ────────────────────────────

describe('notificationsQuerySchema', () => {
  it('provides defaults', () => {
    const result = notificationsQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('accepts unreadOnly filter', () => {
    const result = notificationsQuerySchema.safeParse({ unreadOnly: 'true' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid unreadOnly value', () => {
    const result = notificationsQuerySchema.safeParse({ unreadOnly: 'maybe' });
    expect(result.success).toBe(false);
  });
});

// ─── upsertPreferencesBodySchema ─────────────────────────

describe('upsertPreferencesBodySchema', () => {
  it('accepts valid preferences', () => {
    const result = upsertPreferencesBodySchema.safeParse({
      preferences: [
        { type: 'REPORT_STATUS_CHANGE', channel: 'EMAIL', enabled: true },
        { type: 'NEW_COMMENT', channel: 'IN_APP', enabled: false },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts all channels', () => {
    const channels = ['EMAIL', 'IN_APP', 'WEBHOOK', 'SMS'] as const;
    for (const channel of channels) {
      const result = upsertPreferencesBodySchema.safeParse({
        preferences: [{ type: 'TEST', channel, enabled: true }],
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid channel', () => {
    const result = upsertPreferencesBodySchema.safeParse({
      preferences: [{ type: 'TEST', channel: 'PUSH', enabled: true }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty preferences', () => {
    const result = upsertPreferencesBodySchema.safeParse({ preferences: [] });
    expect(result.success).toBe(false);
  });

  it('rejects > 50 preferences', () => {
    const prefs = Array.from({ length: 51 }, (_, i) => ({
      type: `TYPE_${i}`, channel: 'EMAIL', enabled: true,
    }));
    const result = upsertPreferencesBodySchema.safeParse({ preferences: prefs });
    expect(result.success).toBe(false);
  });
});
