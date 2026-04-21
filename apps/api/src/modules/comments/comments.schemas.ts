import { z } from 'zod';

// ─── Comments ────────────────────────────────────────────

export const postCommentBodySchema = z.object({
  body: z.string().min(1, 'Comment body is required').max(10000),
  isInternal: z.boolean().default(false),
  attachmentIds: z.array(z.string()).max(10).optional(),
});
export type PostCommentBody = z.infer<typeof postCommentBodySchema>;

export const editCommentBodySchema = z.object({
  body: z.string().min(1).max(10000),
});
export type EditCommentBody = z.infer<typeof editCommentBodySchema>;

export const commentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type CommentsQuery = z.infer<typeof commentsQuerySchema>;

export const fromTemplateBodySchema = z.object({
  templateId: z.string().min(1),
  variables: z.record(z.string()).optional(),
  isInternal: z.boolean().default(false),
});
export type FromTemplateBody = z.infer<typeof fromTemplateBodySchema>;

// ─── Templates ───────────────────────────────────────────

export const createTemplateBodySchema = z.object({
  name: z.string().min(1).max(100),
  body: z.string().min(1).max(5000),
});
export type CreateTemplateBody = z.infer<typeof createTemplateBodySchema>;

export const updateTemplateBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  body: z.string().min(1).max(5000).optional(),
});
export type UpdateTemplateBody = z.infer<typeof updateTemplateBodySchema>;

// ─── Notifications ───────────────────────────────────────

export const notificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.enum(['true', 'false']).optional(),
});
export type NotificationsQuery = z.infer<typeof notificationsQuerySchema>;

export const upsertPreferencesBodySchema = z.object({
  preferences: z.array(
    z.object({
      type: z.string().min(1),
      channel: z.enum(['EMAIL', 'IN_APP', 'WEBHOOK', 'SMS']),
      enabled: z.boolean(),
    }),
  ).min(1).max(50),
});
export type UpsertPreferencesBody = z.infer<typeof upsertPreferencesBodySchema>;

// ─── Shared params ───────────────────────────────────────

export const reportIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const commentIdParamsSchema = z.object({
  id: z.string().min(1),
  commentId: z.string().min(1),
});

export const templateIdParamsSchema = z.object({
  slug: z.string().min(1),
  id: z.string().min(1),
});

export const notificationIdParamsSchema = z.object({
  id: z.string().min(1),
});
