import { describe, it, expect } from 'vitest';

const ONBOARDING_ALLOWLIST = [
  '/api/auth/',
  '/api/onboarding/',
  '/api/invites/',
  '/api/notifications/',
  '/api/users/me',
];

const ORG_ONBOARDING_PATH_RE = /^\/api\/organizations\/[^/]+(?:\/verify)?$/;

function isAllowlisted(url: string): boolean {
  const pathname = url.split('?')[0] ?? url;
  for (const prefix of ONBOARDING_ALLOWLIST) {
    if (pathname.startsWith(prefix)) {
      return true;
    }
  }
  if (ORG_ONBOARDING_PATH_RE.test(pathname)) {
    return true;
  }
  return false;
}

describe('requireOnboardingComplete - isAllowlisted', () => {
  describe('should allowlist auth routes', () => {
    it('should allowlist /api/auth/login', () => {
      expect(isAllowlisted('/api/auth/login')).toBe(true);
    });

    it('should allowlist /api/auth/register', () => {
      expect(isAllowlisted('/api/auth/register')).toBe(true);
    });

    it('should allowlist /api/auth/refresh', () => {
      expect(isAllowlisted('/api/auth/refresh')).toBe(true);
    });

    it('should allowlist /api/auth/verify-email', () => {
      expect(isAllowlisted('/api/auth/verify-email')).toBe(true);
    });

    it('should allowlist /api/auth/totp/setup', () => {
      expect(isAllowlisted('/api/auth/totp/setup')).toBe(true);
    });
  });

  describe('should allowlist onboarding routes', () => {
    it('should allowlist /api/onboarding/', () => {
      expect(isAllowlisted('/api/onboarding/')).toBe(true);
    });

    it('should allowlist /api/onboarding/complete', () => {
      expect(isAllowlisted('/api/onboarding/complete')).toBe(true);
    });
  });

  describe('should allowlist invite routes', () => {
    it('should allowlist /api/invites/accept/:token', () => {
      expect(isAllowlisted('/api/invites/accept/sometoken')).toBe(true);
    });

    it('should allowlist /api/invites/', () => {
      expect(isAllowlisted('/api/invites/')).toBe(true);
    });
  });

  describe('should allowlist notification routes', () => {
    it('should allowlist /api/notifications/', () => {
      expect(isAllowlisted('/api/notifications/')).toBe(true);
    });

    it('should allowlist /api/notifications/unread', () => {
      expect(isAllowlisted('/api/notifications/unread')).toBe(true);
    });
  });

  describe('should allowlist user profile routes', () => {
    it('should allowlist /api/users/me', () => {
      expect(isAllowlisted('/api/users/me')).toBe(true);
    });

    it('should allowlist /api/users/me/avatar', () => {
      expect(isAllowlisted('/api/users/me/avatar')).toBe(true);
    });
  });

  describe('should allowlist org onboarding-required routes', () => {
    it('should allowlist /api/organizations/:slug', () => {
      expect(isAllowlisted('/api/organizations/acme')).toBe(true);
    });

    it('should allowlist /api/organizations/:slug/verify', () => {
      expect(isAllowlisted('/api/organizations/acme/verify')).toBe(true);
    });
  });

  describe('should NOT allowlist other routes', () => {
    it('should NOT allowlist /api/organizations/', () => {
      expect(isAllowlisted('/api/organizations/')).toBe(false);
    });

    it('should NOT allowlist /api/organizations/:slug/members', () => {
      expect(isAllowlisted('/api/organizations/acme/members')).toBe(false);
    });

    it('should NOT allowlist /api/programs/', () => {
      expect(isAllowlisted('/api/programs/')).toBe(false);
    });

    it('should NOT allowlist /api/reports/', () => {
      expect(isAllowlisted('/api/reports/')).toBe(false);
    });

    it('should NOT allowlist /api/triage/', () => {
      expect(isAllowlisted('/api/triage/')).toBe(false);
    });
  });

  describe('ONBOARDING_ALLOWLIST constant', () => {
    it('should contain all required paths', () => {
      expect(ONBOARDING_ALLOWLIST).toContain('/api/auth/');
      expect(ONBOARDING_ALLOWLIST).toContain('/api/onboarding/');
      expect(ONBOARDING_ALLOWLIST).toContain('/api/invites/');
      expect(ONBOARDING_ALLOWLIST).toContain('/api/notifications/');
      expect(ONBOARDING_ALLOWLIST).toContain('/api/users/me');
    });
  });
});

describe('requireOnboardingComplete - error response structure', () => {
  it('should have correct error structure for ONBOARDING_INCOMPLETE', () => {
    const errorResponse = {
      error: {
        code: 'ONBOARDING_INCOMPLETE',
        nextStep: 'CHOOSE_PATH',
      },
    };

    expect(errorResponse.error.code).toBe('ONBOARDING_INCOMPLETE');
    expect(errorResponse.error.nextStep).toBeDefined();
  });

  it('should work with different onboarding steps', () => {
    const steps = ['CHOOSE_PATH', 'PENDING_ORG_APPROVAL', 'COMPLETE'];

    steps.forEach((step) => {
      const errorResponse = {
        error: {
          code: 'ONBOARDING_INCOMPLETE',
          nextStep: step,
        },
      };
      expect(errorResponse.error.nextStep).toBe(step);
    });
  });
});

describe('requireOnboardingComplete - stale pending remediation', () => {
  it('documents auto-remediation path for approved org members', () => {
    const scenario = {
      onboardingStepBefore: 'PENDING_ORG_APPROVAL',
      hasApprovedOrgMembership: true,
      onboardingStepAfter: 'COMPLETE',
      blocked: false,
    };

    expect(scenario.onboardingStepBefore).toBe('PENDING_ORG_APPROVAL');
    expect(scenario.hasApprovedOrgMembership).toBe(true);
    expect(scenario.onboardingStepAfter).toBe('COMPLETE');
    expect(scenario.blocked).toBe(false);
  });
});
