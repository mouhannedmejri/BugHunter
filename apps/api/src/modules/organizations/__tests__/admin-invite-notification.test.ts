import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrgRole } from '@bughuntr/db';

const mocks = vi.hoisted(() => ({
  createNotification: vi.fn(),
  sendEmail: vi.fn(),
  auditCreate: vi.fn(),
  orgInviteCreate: vi.fn(),
  userFindFirst: vi.fn(),
  orgFindFirst: vi.fn(),
  memberFindUnique: vi.fn(),
  inviteFindFirst: vi.fn(),
  signToken: vi.fn(() => 'jwt-token'),
}));

vi.mock('../../notifications/notifications.service.js', () => ({
  NotificationService: {
    createNotification: (...args: unknown[]) => mocks.createNotification(...args),
  },
}));

vi.mock('../send-org-invite-email.js', () => ({
  sendOrgInviteEmail: (...args: unknown[]) => mocks.sendEmail(...args),
}));

vi.mock('../../../lib/org-invite-jwt.js', () => ({
  signOrgInviteToken: (...args: unknown[]) => mocks.signToken(...args),
  verifyOrgInviteToken: vi.fn(),
}));

vi.mock('@bughuntr/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@bughuntr/db')>();
  return {
    ...actual,
    prisma: {
      user: { findFirst: mocks.userFindFirst },
      organization: { findFirst: mocks.orgFindFirst },
      organizationMember: { findUnique: mocks.memberFindUnique },
      orgInvite: { create: mocks.orgInviteCreate, findFirst: mocks.inviteFindFirst },
      auditLog: { create: mocks.auditCreate },
      notification: { create: vi.fn().mockResolvedValue({ id: 'n1' }) },
      notificationPreference: { findUnique: vi.fn().mockResolvedValue(null) },
    },
  };
});

import { OrganizationService } from '../organizations.service.js';

describe('OrganizationService.adminInviteUserToOrg', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userFindFirst
      .mockResolvedValueOnce({ id: 'actor', deletedAt: null })
      .mockResolvedValueOnce({ id: 'target', email: 't@example.com', deletedAt: null });
    mocks.orgFindFirst.mockResolvedValue({
      id: 'org1',
      name: 'Acme Org',
      slug: 'acme',
      deletedAt: null,
    });
    mocks.memberFindUnique.mockResolvedValue(null);
    mocks.inviteFindFirst.mockResolvedValue(null);
    mocks.orgInviteCreate.mockResolvedValue({
      id: 'inv1',
      orgId: 'org1',
      expiresAt: new Date(),
    });
    mocks.auditCreate.mockResolvedValue({});
  });

  it('creates IN_APP and EMAIL notifications for the target user', async () => {
    await OrganizationService.adminInviteUserToOrg('actor', 'target', {
      orgId: 'org1',
      role: OrgRole.REVIEWER,
    });

    expect(mocks.createNotification).toHaveBeenCalledTimes(2);
    expect(mocks.createNotification).toHaveBeenCalledWith(
      'target',
      'ORG_INVITATION_RECEIVED',
      expect.objectContaining({
        channel: 'IN_APP',
        body: expect.stringContaining('Acme Org'),
      }),
    );
    expect(mocks.createNotification).toHaveBeenCalledWith(
      'target',
      'ORG_INVITATION_RECEIVED',
      expect.objectContaining({
        channel: 'EMAIL',
      }),
    );
  });
});
