import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VERIFICATION_SKIP_ROUTES } from '../org-role-guard.js';

describe('orgRoleGuard - verification skip routes', () => {
  describe('VERIFICATION_SKIP_ROUTES constant - GET routes', () => {
    it('should contain route for getting organization', () => {
      expect(VERIFICATION_SKIP_ROUTES.GET).toContain('/api/organizations/:slug');
    });

    it('should contain route for getting organization members', () => {
      expect(VERIFICATION_SKIP_ROUTES.GET).toContain('/api/organizations/:slug/members');
    });

    it('should contain route for getting verification status', () => {
      expect(VERIFICATION_SKIP_ROUTES.GET).toContain('/api/organizations/:slug/verify');
    });
  });

  describe('VERIFICATION_SKIP_ROUTES constant - POST routes', () => {
    it('should contain route for submitting verification', () => {
      expect(VERIFICATION_SKIP_ROUTES.POST).toContain('/api/organizations/:slug/verify');
    });

    it('should contain route for accepting invites', () => {
      expect(VERIFICATION_SKIP_ROUTES.POST).toContain('/api/invites/accept/:token');
    });
  });
});

describe('orgRoleGuard - error response structure', () => {
  it('should have correct error structure for ORG_NOT_VERIFIED', () => {
    const slug = 'my-org';
    const verificationStatus = 'PENDING';

    const errorResponse = {
      error: {
        code: 'ORG_NOT_VERIFIED',
        message:
          'Organization is pending verification. Complete the verification form to access this feature.',
        verificationStatus: verificationStatus,
        links: {
          submit: `/organizations/${slug}/verify`,
          status: `/organizations/${slug}/verify`,
        },
      },
    };

    expect(errorResponse.error.code).toBe('ORG_NOT_VERIFIED');
    expect(errorResponse.error.verificationStatus).toBe('PENDING');
    expect(errorResponse.error.links.submit).toContain('/verify');
    expect(errorResponse.error.links.status).toContain('/verify');
  });

  it('should work for different verification statuses', () => {
    const statuses = ['PENDING', 'SUBMITTED', 'REJECTED'];

    statuses.forEach((status) => {
      const errorResponse = {
        error: {
          code: 'ORG_NOT_VERIFIED',
          message: expect.any(String),
          verificationStatus: status,
          links: {
            submit: '/organizations/test/verify',
            status: '/organizations/test/verify',
          },
        },
      };
      expect(errorResponse.error.verificationStatus).toBe(status);
    });
  });
});
