import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { FullPageSpinner } from '@/components/LoadingSpinner';

export type AllowedTarget = 'RESEARCHER' | 'COMPANY' | 'ADMIN';

interface AuthGuardProps {
  allowedTarget: AllowedTarget;
}

export const AuthGuard = ({ allowedTarget }: AuthGuardProps) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Let the Zustand store finish any initial rehydration check
    if (!isLoading) {
      setIsReady(true);
    }
  }, [isLoading]);

  if (!isReady || isLoading) {
    return <FullPageSpinner />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check onboarding status - redirect to onboarding if not complete
  if (user.onboardingStep === 'CHOOSE_PATH') {
    return <Navigate to="/onboarding" replace />;
  }

  if (user.onboardingStep === 'PENDING_ORG_APPROVAL') {
    return <Navigate to="/onboarding/pending" replace />;
  }

  const isSuperAdmin = user.platformRole === 'SUPER_ADMIN';
  const hasOrganizations = !!user.orgMemberships && user.orgMemberships.length > 0;

  // ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────
  if (allowedTarget === 'ADMIN') {
    if (!isSuperAdmin) {
      // Redirect bad actors back to their respective dashboards
      if (hasOrganizations) {
        return <Navigate to={`/org/${user.orgMemberships![0].org.slug}`} replace />;
      }
      return <Navigate to="/dashboard" replace />;
    }
    return <Outlet />;
  }

  // ─── COMPANY ROUTES ───────────────────────────────────────────────────────────
  if (allowedTarget === 'COMPANY') {
    if (!hasOrganizations && !isSuperAdmin) {
      return <Navigate to="/dashboard" replace />;
    }

    // Optionally: if a normal company user attempts to access an org they don't belong to
    if (orgSlug && hasOrganizations && !isSuperAdmin) {
      const belongsToOrg = user.orgMemberships!.some((m) => m.org.slug === orgSlug);
      if (!belongsToOrg) {
        return <Navigate to={`/org/${user.orgMemberships![0].org.slug}`} replace />;
      }
    }

    return <Outlet />;
  }

  // ─── RESEARCHER ROUTES ────────────────────────────────────────────────────────
  if (allowedTarget === 'RESEARCHER') {
    if (isSuperAdmin) {
      return <Navigate to="/admin" replace />;
    }
    if (hasOrganizations) {
      return <Navigate to={`/org/${user.orgMemberships![0].org.slug}`} replace />;
    }
    return <Outlet />;
  }

  // Fallback safety
  return <Navigate to="/login" replace />;
};
