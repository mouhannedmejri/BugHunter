import type { FastifyInstance } from 'fastify';
import { NotificationService } from './notifications.service.js';
import {
  notificationsQuerySchema,
  upsertPreferencesBodySchema,
  type NotificationsQuery,
  type UpsertPreferencesBody,
} from '../comments/comments.schemas.js';

export async function notificationsRoutes(app: FastifyInstance) {
  // ─── GET /notifications ──────────────────────────────
  app.get<{ Querystring: NotificationsQuery }>(
    '/notifications',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const query = notificationsQuerySchema.parse(request.query);
      const result = await NotificationService.listNotifications(request.user.sub, query);
      return reply.send({ data: result });
    },
  );

  // ─── PUT /notifications/:id/read ─────────────────────
  app.put<{ Params: { id: string } }>(
    '/notifications/:id/read',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const result = await NotificationService.markRead(request.params.id, request.user.sub);
      return reply.send({ data: result });
    },
  );

  // ─── PUT /notifications/read-all ─────────────────────
  app.put(
    '/notifications/read-all',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const result = await NotificationService.markAllRead(request.user.sub);
      return reply.send({ data: result });
    },
  );

  // ─── GET /notifications/stream (SSE) ─────────────────
  app.get(
    '/notifications/stream',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = request.user.sub;

      // Set SSE headers
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // disable nginx buffering
      });

      // Send initial heartbeat
      reply.raw.write('event: connected\ndata: {"status":"connected"}\n\n');

      // Heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          reply.raw.write(':heartbeat\n\n');
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Subscribe to notifications for this user
      const unsubscribe = NotificationService.subscribe(userId, (data: string) => {
        try {
          reply.raw.write(`event: notification\n${data}`);
        } catch {
          // client disconnected
        }
      });

      // Cleanup on close
      request.raw.on('close', () => {
        clearInterval(heartbeat);
        unsubscribe();
      });

      // Don't send reply — we're streaming
      await reply.hijack();
    },
  );

  // ─── GET /notifications/preferences ──────────────────
  app.get(
    '/notifications/preferences',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const prefs = await NotificationService.getPreferences(request.user.sub);
      return reply.send({ data: prefs });
    },
  );

  // ─── PUT /notifications/preferences ──────────────────
  app.put<{ Body: UpsertPreferencesBody }>(
    '/notifications/preferences',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const body = upsertPreferencesBodySchema.parse(request.body);
      const result = await NotificationService.upsertPreferences(request.user.sub, body);
      return reply.send({ data: result });
    },
  );
}
