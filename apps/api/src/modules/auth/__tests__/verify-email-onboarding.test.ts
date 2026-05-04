import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../lib/crypto.js', () => ({
  hashToken: (t: string) => `hashed-${t}`,
}));

const prismaMock = vi.hoisted(() => ({
  session: {
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  user: {
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock('@bughuntr/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@bughuntr/db')>();
  return {
    ...actual,
    prisma: prismaMock,
  };
});

import { verifyEmail } from '../auth.service.js';

describe('verifyEmail onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.session.delete.mockResolvedValue({});
    prismaMock.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));
  });

  it('does not override onboardingStep and returns the current nextStep', async () => {
    prismaMock.session.findUnique.mockResolvedValue({
      id: 'sess1',
      userId: 'user1',
      expiresAt: new Date(Date.now() + 3600_000),
      deviceInfo: { type: 'email_verification' },
    });
    prismaMock.user.update.mockResolvedValue({ onboardingStep: 'COMPLETE' });

    const result = await verifyEmail('plain-token');

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user1' },
      data: {
        emailVerifiedAt: expect.any(Date),
      },
      select: { onboardingStep: true },
    });
    expect(prismaMock.session.delete).toHaveBeenCalledWith({ where: { id: 'sess1' } });
    expect(result).toEqual({ verified: true, nextStep: 'COMPLETE' });
  });
});
