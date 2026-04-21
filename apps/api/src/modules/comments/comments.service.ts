import { prisma } from '@bughuntr/db';
import { BadRequestError, ForbiddenError, NotFoundError } from '@bughuntr/shared';
import type { PostCommentBody, EditCommentBody, CommentsQuery } from './comments.schemas.js';

// ─── Mention parser ──────────────────────────────────────

const MENTION_REGEX = /@([a-zA-Z0-9_-]{3,30})/g;

function parseMentions(body: string): string[] {
  const matches = body.matchAll(MENTION_REGEX);
  return [...new Set([...matches].map((m) => m[1]))] as string[];
}

// ─── Read-only statuses for researchers ──────────────────

const READ_ONLY_STATUSES = ['CLOSED', 'RESOLVED', 'REWARDED'];

// ─── Comment Service ─────────────────────────────────────

export class CommentService {
  /**
   * Post a new comment on a report.
   */
  static async postComment(
    reportId: string,
    authorId: string,
    body: PostCommentBody,
    isOrgMember: boolean,
  ) {
    const report = await prisma.report.findFirst({
      where: { id: reportId },
      include: { program: { select: { orgId: true } } },
    });
    if (!report) throw new NotFoundError('Report not found');

    // Researchers cannot post to closed/resolved reports
    if (!isOrgMember && READ_ONLY_STATUSES.includes(report.status)) {
      throw new ForbiddenError('Cannot comment on a closed or resolved report');
    }

    // Only org members can post internal comments
    if (body.isInternal && !isOrgMember) {
      throw new ForbiddenError('Only organization members can post internal notes');
    }

    const comment = await prisma.comment.create({
      data: {
        reportId,
        authorId,
        body: body.body,
        isInternal: body.isInternal,
      },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    // If researcher comments on a NEEDS_INFO report, transition back to TRIAGING
    if (!isOrgMember && report.status === 'NEEDS_INFO') {
      await prisma.$transaction([
        prisma.report.update({
          where: { id: reportId },
          data: { status: 'TRIAGING' },
        }),
        prisma.reportStatusHistory.create({
          data: {
            reportId,
            fromStatus: 'NEEDS_INFO',
            toStatus: 'TRIAGING',
            changedBy: authorId,
            reason: 'Researcher responded to info request',
          },
        }),
      ]);
    }

    // Parse @mentions and notify
    const mentionedUsernames = parseMentions(body.body);
    if (mentionedUsernames.length > 0) {
      const mentionedUsers = await prisma.user.findMany({
        where: { username: { in: mentionedUsernames }, deletedAt: null },
        select: { id: true },
      });

      if (mentionedUsers.length > 0) {
        await prisma.notification.createMany({
          data: mentionedUsers.map((u) => ({
            userId: u.id,
            type: 'COMMENT_MENTION',
            channel: 'IN_APP' as const,
            subject: 'You were mentioned in a comment',
            body: `@${comment.author.username} mentioned you on report "${report.title}"`,
            data: { reportId, commentId: comment.id },
          })),
        });
      }
    }

    // Notify all thread participants (except author and mentioned)
    const participants = await prisma.comment.findMany({
      where: { reportId, deletedAt: null, authorId: { not: authorId } },
      select: { authorId: true },
      distinct: ['authorId'],
    });

    // Also include submitter
    const notifyIds = new Set([
      ...participants.map((p) => p.authorId),
      report.submitterId,
    ]);
    notifyIds.delete(authorId); // don't notify self

    // Remove already-mentioned users
    const mentionedIds = new Set(
      (await prisma.user.findMany({
        where: { username: { in: mentionedUsernames } },
        select: { id: true },
      })).map((u) => u.id),
    );
    for (const id of mentionedIds) notifyIds.delete(id);

    // Don't send internal note notifications to researchers
    if (body.isInternal) {
      // Only keep org members
      const orgMembers = await prisma.organizationMember.findMany({
        where: { orgId: report.program.orgId, userId: { in: [...notifyIds] } },
        select: { userId: true },
      });
      const orgMemberIds = new Set(orgMembers.map((m) => m.userId));
      for (const id of notifyIds) {
        if (!orgMemberIds.has(id)) notifyIds.delete(id);
      }
    }

    if (notifyIds.size > 0) {
      await prisma.notification.createMany({
        data: [...notifyIds].map((userId) => ({
          userId,
          type: 'NEW_COMMENT',
          channel: 'IN_APP' as const,
          subject: 'New comment on report',
          body: `${comment.author.username ?? 'Someone'} commented on "${report.title}"`,
          data: { reportId, commentId: comment.id },
        })),
      });
    }

    return comment;
  }

  /**
   * Edit own comment (within 15 minutes).
   */
  static async editComment(
    reportId: string,
    commentId: string,
    authorId: string,
    body: EditCommentBody,
  ) {
    const comment = await prisma.comment.findFirst({
      where: { id: commentId, reportId, deletedAt: null },
    });
    if (!comment) throw new NotFoundError('Comment not found');
    if (comment.authorId !== authorId) {
      throw new ForbiddenError('You can only edit your own comments');
    }

    // 15 minute edit window
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (comment.createdAt < fifteenMinAgo) {
      throw new BadRequestError('Comments can only be edited within 15 minutes of posting');
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { body: body.body },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    return updated;
  }

  /**
   * Soft-delete a comment (author or PM).
   */
  static async deleteComment(
    reportId: string,
    commentId: string,
    actorId: string,
    isOrgPM: boolean,
  ) {
    const comment = await prisma.comment.findFirst({
      where: { id: commentId, reportId, deletedAt: null },
    });
    if (!comment) throw new NotFoundError('Comment not found');

    if (comment.authorId !== actorId && !isOrgPM) {
      throw new ForbiddenError('Only the author or a Program Manager can delete comments');
    }

    await prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });

    return { message: 'Comment deleted' };
  }

  /**
   * List comments (filter internal for researchers).
   */
  static async listComments(
    reportId: string,
    query: CommentsQuery,
    isOrgMember: boolean,
  ) {
    const report = await prisma.report.findFirst({
      where: { id: reportId },
    });
    if (!report) throw new NotFoundError('Report not found');

    const where = {
      reportId,
      deletedAt: null,
      ...(isOrgMember ? {} : { isInternal: false }),
    };

    const [comments, total] = await prisma.$transaction([
      prisma.comment.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      }),
      prisma.comment.count({ where }),
    ]);

    return {
      comments,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * Mark a comment as read.
   */
  static async markCommentRead(commentId: string, userId: string) {
    const comment = await prisma.comment.findFirst({
      where: { id: commentId, deletedAt: null },
    });
    if (!comment) throw new NotFoundError('Comment not found');

    if (!comment.readBy.includes(userId)) {
      await prisma.comment.update({
        where: { id: commentId },
        data: { readBy: { push: userId } },
      });
    }

    return { message: 'Marked as read' };
  }
}

// ─── Template Service ────────────────────────────────────

export class TemplateService {
  /**
   * List templates for an org (including platform-level).
   */
  static async listTemplates(orgId: string) {
    return prisma.replyTemplate.findMany({
      where: {
        OR: [{ orgId }, { orgId: null }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a reply template.
   */
  static async createTemplate(
    orgId: string,
    name: string,
    body: string,
    createdBy: string,
  ) {
    return prisma.replyTemplate.create({
      data: { orgId, name, body, createdBy },
    });
  }

  /**
   * Update a template.
   */
  static async updateTemplate(
    templateId: string,
    orgId: string,
    updates: { name?: string; body?: string },
  ) {
    const template = await prisma.replyTemplate.findFirst({
      where: { id: templateId, orgId },
    });
    if (!template) throw new NotFoundError('Template not found');

    return prisma.replyTemplate.update({
      where: { id: templateId },
      data: {
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.body !== undefined ? { body: updates.body } : {}),
      },
    });
  }

  /**
   * Delete a template.
   */
  static async deleteTemplate(templateId: string, orgId: string) {
    const template = await prisma.replyTemplate.findFirst({
      where: { id: templateId, orgId },
    });
    if (!template) throw new NotFoundError('Template not found');

    await prisma.replyTemplate.delete({ where: { id: templateId } });
    return { message: 'Template deleted' };
  }

  /**
   * Render a template with variables and post as comment.
   */
  static async postFromTemplate(
    reportId: string,
    templateId: string,
    variables: Record<string, string>,
    authorId: string,
    isInternal: boolean,
    orgId: string,
  ) {
    const report = await prisma.report.findFirst({
      where: { id: reportId },
      include: {
        program: { select: { title: true, orgId: true } },
        submitter: { select: { username: true, displayName: true } },
      },
    });
    if (!report) throw new NotFoundError('Report not found');

    const template = await prisma.replyTemplate.findFirst({
      where: {
        id: templateId,
        OR: [{ orgId }, { orgId: null }],
      },
    });
    if (!template) throw new NotFoundError('Template not found');

    // Built-in variables
    const builtInVars: Record<string, string> = {
      researcher_name: report.submitter.displayName ?? report.submitter.username,
      report_title: report.title,
      program_name: report.program.title,
      severity: report.severityValidated ?? report.severityEstimate,
      status: report.status,
    };

    // Merge with user-provided variables (user vars take precedence)
    const mergedVars = { ...builtInVars, ...variables };

    // Simple mustache-style replacement
    let rendered = template.body;
    for (const [key, value] of Object.entries(mergedVars)) {
      rendered = rendered.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), value);
    }

    // Post as a regular comment
    const comment = await CommentService.postComment(
      reportId,
      authorId,
      { body: rendered, isInternal },
      true, // org member posting from template
    );

    return comment;
  }
}
