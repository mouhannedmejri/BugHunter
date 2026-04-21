import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  createNotification: vi.fn(),
  orgFindFirst: vi.fn(),
  userFindFirst: vi.fn(),
  userFindMany: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  txOrgCreate: vi.fn(),
  txUserUpdate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('../../notifications/notifications.service.js', () => ({
  NotificationService: {
    createNotification: (...args: unknown[]) => mocks.createNotification(...args),
  },
}));

vi.mock('@bughuntr/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@bughuntr/db')>();
  return {
    ...actual,
    prisma: {
      organization: { findFirst: mocks.orgFindFirst },
      user: {
        findFirst: mocks.userFindFirst,
        findMany: mocks.userFindMany,
        findUnique: mocks.userFindUnique,
        update: mocks.userUpdate,
      },
      $transaction: mocks.transaction,
    },
  };
});

import { OnboardingService } from '../onboarding.service.js';

describe('OnboardingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.orgFindFirst.mockResolvedValue(null);
  });

  it('createOrg rejects when onboardingStep is not CHOOSE_PATH', async () => {
    mocks.userFindFirst.mockResolvedValue({
      id: 'u1',
      onboardingStep: 'COMPLETE',
    });

    await expect(OnboardingService.createOrg('u1', { orgName: 'Acme' })).rejects.toThrow(
      /CHOOSE_PATH/,
    );
  });

  it('createOrg creates org, sets PENDING_ORG_APPROVAL, notifies super admins', async () => {
    mocks.userFindFirst.mockResolvedValue({
      id: 'u1',
      onboardingStep: 'CHOOSE_PATH',
    });

    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        organization: {
          create: mocks.txOrgCreate,
        },
        user: {
          update: mocks.txUserUpdate,
        },
      };
      mocks.txOrgCreate.mockResolvedValue({
        id: 'org1',
        slug: 'acme',
        name: 'Acme',
        verificationStatus: 'PENDING',
      });
      mocks.txUserUpdate.mockResolvedValue({});
      return fn(tx);
    });

    mocks.userFindMany.mockResolvedValue([{ id: 'sa1' }]);
    mocks.userFindUnique.mockResolvedValue({ username: 'alice' });

    const out = await OnboardingService.createOrg('u1', { orgName: 'Acme' });

    expect(out.org).toMatchObject({
      id: 'org1',
      slug: 'acme',
      name: 'Acme',
      verificationStatus: 'PENDING',
    });
    expect(mocks.txUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { onboardingStep: 'PENDING_ORG_APPROVAL' },
      }),
    );
    expect(mocks.createNotification).toHaveBeenCalledWith(
      'sa1',
      'ORG_CREATED_PENDING_REVIEW',
      expect.objectContaining({
        body: expect.stringContaining("New org 'Acme'"),
        channel: 'IN_APP',
      }),
    );
  });

  it('skipInviteWait returns onboardingStep COMPLETE when step is CHOOSE_PATH', async () => {
    mocks.userFindFirst.mockResolvedValue({
      id: 'u1',
      onboardingStep: 'CHOOSE_PATH',
    });
    mocks.userUpdate.mockResolvedValue({});

    const out = await OnboardingService.skipInviteWait('u1');
    expect(out).toEqual({ onboardingStep: 'COMPLETE' });
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { onboardingStep: 'COMPLETE' },
    });
  });

  it('skipInviteWait rejects when not CHOOSE_PATH', async () => {
    mocks.userFindFirst.mockResolvedValue({
      id: 'u1',
      onboardingStep: 'COMPLETE',
    });

    await expect(OnboardingService.skipInviteWait('u1')).rejects.toThrow(/CHOOSE_PATH/);
  });
});
