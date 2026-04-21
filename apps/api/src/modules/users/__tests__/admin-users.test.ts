import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlatformRole } from '@bughuntr/db';
import { BadRequestError } from '@bughuntr/shared';
import { UserService } from '../users.service.js';
import { notifyUserBanned } from '../users.email.js';
import { buildApp } from '../../../app.js';

const prismaMock = vi.hoisted(() => ({
  user: {
    findFirst: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  reputationEvent: {
    aggregate: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  report: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  reward: {
    aggregate: vi.fn(),
  },
  payoutProfile: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  session: {
    deleteMany: vi.fn(),
  },
  oAuthAccount: {
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
  $queryRaw: vi.fn(),
}));

vi.mock('@bughuntr/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@bughuntr/db')>();
  return { ...actual, prisma: prismaMock };
});

vi.mock('../users.email.js', () => ({
  notifyUserBanned: vi.fn(() => Promise.resolve()),
}));

describe('UserService admin ban / unban', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ban sets bannedAt, audit log, and notification', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'victim',
      email: 'victim@test.com',
      platformRole: PlatformRole.USER,
    } as never);
    prismaMock.user.update.mockResolvedValue({
      id: 'victim',
      bannedAt: new Date(),
      bannedReason: 'spam',
    } as never);
    prismaMock.auditLog.create.mockResolvedValue({} as never);

    await UserService.adminBan('admin-1', PlatformRole.SUPER_ADMIN, 'victim', {
      reason: 'spam',
    });

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'victim' },
      data: {
        bannedAt: expect.any(Date) as Date,
        bannedReason: 'spam',
      },
    });
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 'admin-1',
        action: 'USER_BANNED',
        entityType: 'User',
        entityId: 'victim',
      }) as Record<string, unknown>,
    });
    expect(notifyUserBanned).toHaveBeenCalledWith('victim@test.com', 'spam');
  });

  it('unban clears ban fields and writes audit log', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'victim',
      bannedAt: new Date(),
    } as never);
    prismaMock.user.update.mockResolvedValue({
      id: 'victim',
      bannedAt: null,
      bannedReason: null,
    } as never);
    prismaMock.auditLog.create.mockResolvedValue({} as never);

    await UserService.adminUnban('admin-1', 'victim');

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'victim' },
      data: { bannedAt: null, bannedReason: null },
    });
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'USER_UNBANNED',
        entityId: 'victim',
      }) as Record<string, unknown>,
    });
    expect(notifyUserBanned).not.toHaveBeenCalled();
  });

  it('rejects banning yourself', async () => {
    await expect(
      UserService.adminBan('same', PlatformRole.SUPER_ADMIN, 'same', {
        reason: 'nope',
      }),
    ).rejects.toBeInstanceOf(BadRequestError);
    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
  });
});

describe('Admin ban HTTP (integration-style)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('PUT /admin/users/:id/ban returns 200 with mocked prisma', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'u-target',
      email: 't@t.com',
      platformRole: PlatformRole.USER,
    } as never);
    prismaMock.user.update.mockResolvedValue({ id: 'u-target' } as never);
    prismaMock.auditLog.create.mockResolvedValue({} as never);

    const app = await buildApp();
    const token = app.jwt.sign({
      sub: 'u-admin',
      email: 'admin@test.com',
      platformRole: PlatformRole.SUPER_ADMIN,
    });

    const res = await app.inject({
      method: 'PUT',
      url: '/api/admin/users/u-target/ban',
      headers: { authorization: `Bearer ${token}` },
      payload: { reason: 'ToS violation' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { data: { id: string } };
    expect(body.data.id).toBe('u-target');
    await app.close();
  });
});
