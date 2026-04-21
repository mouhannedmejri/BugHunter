import { prisma, type NotifChannel, type Prisma } from '@bughuntr/db';
import { NotFoundError } from '@bughuntr/shared';
import type { NotificationsQuery, UpsertPreferencesBody } from '../comments/comments.schemas.js';

// ─── Notification Service ────────────────────────────────

export class NotificationService {
  /**
   * Create a notification (used by all modules).
   * Checks preferences before creating.
   */
  static async createNotification(
    userId: string,
    type: string,
    data: {
      subject?: string;
      body: string;
      channel?: NotifChannel;
      meta?: Record<string, unknown>;
    },
  ) {
    const channel = data.channel ?? 'IN_APP';

    // Check if user has disabled this notification type + channel
    const pref = await prisma.notificationPreference.findUnique({
      where: {
        userId_type_channel: { userId, type, channel },
      },
    });
    if (pref && !pref.enabled) return null; // user opted out

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        channel,
        subject: data.subject,
        body: data.body,
        data: (data.meta ?? {}) as Prisma.InputJsonValue,
        sentAt: channel === 'IN_APP' ? new Date() : null,
      },
    });

    // Emit to SSE listeners
    NotificationService.emit(userId, notification);

    return notification;
  }

  /**
   * List own notifications, paginated.
   */
  static async listNotifications(userId: string, query: NotificationsQuery) {
    const where: Prisma.NotificationWhereInput = { userId };
    if (query.unreadOnly === 'true') {
      where.readAt = null;
    }

    const [notifications, total, unreadCount] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * Mark a single notification as read.
   */
  static async markRead(notificationId: string, userId: string) {
    const notif = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notif) throw new NotFoundError('Notification not found');

    await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    return { message: 'Marked as read' };
  }

  /**
   * Mark all notifications as read.
   */
  static async markAllRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });

    return { message: `${result.count} notifications marked as read` };
  }

  /**
   * Get notification preferences.
   */
  static async getPreferences(userId: string) {
    return prisma.notificationPreference.findMany({
      where: { userId },
      orderBy: [{ type: 'asc' }, { channel: 'asc' }],
    });
  }

  /**
   * Bulk upsert notification preferences.
   */
  static async upsertPreferences(userId: string, body: UpsertPreferencesBody) {
    const ops = body.preferences.map((pref) =>
      prisma.notificationPreference.upsert({
        where: {
          userId_type_channel: {
            userId,
            type: pref.type,
            channel: pref.channel,
          },
        },
        create: {
          userId,
          type: pref.type,
          channel: pref.channel,
          enabled: pref.enabled,
        },
        update: {
          enabled: pref.enabled,
        },
      }),
    );

    await prisma.$transaction(ops);
    return { message: `${body.preferences.length} preferences updated` };
  }

  // ─── SSE Support ─────────────────────────────────────

  private static listeners = new Map<string, Set<(data: string) => void>>();

  static subscribe(userId: string, callback: (data: string) => void) {
    if (!NotificationService.listeners.has(userId)) {
      NotificationService.listeners.set(userId, new Set());
    }
    NotificationService.listeners.get(userId)!.add(callback);

    return () => {
      const set = NotificationService.listeners.get(userId);
      if (set) {
        set.delete(callback);
        if (set.size === 0) NotificationService.listeners.delete(userId);
      }
    };
  }

  static emit(userId: string, notification: unknown) {
    const set = NotificationService.listeners.get(userId);
    if (!set) return;
    const payload = `data: ${JSON.stringify(notification)}\n\n`;
    for (const cb of set) {
      try {
        cb(payload);
      } catch {
        // listener closed
      }
    }
  }
}
