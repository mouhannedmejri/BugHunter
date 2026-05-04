import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Index from './pages/Index.tsx';
import NotFound from './pages/NotFound.tsx';
import Login from './pages/auth/Login.tsx';
import Register from './pages/auth/Register.tsx';
import VerifyEmail from './pages/auth/VerifyEmail.tsx';
import ForgotPassword from './pages/auth/ForgotPassword.tsx';
import ResetPassword from './pages/auth/ResetPassword.tsx';
import TwoFactor from './pages/auth/TwoFactor.tsx';
import OAuthCallback from './pages/auth/OAuthCallback.tsx';
import InvitesAccept from './pages/InvitesAccept.tsx';
import OnboardingChoice from './pages/onboarding/OnboardingChoice.tsx';
import OnboardingPending from './pages/onboarding/OnboardingPending.tsx';
import OnboardingVerify from './pages/onboarding/OnboardingVerify.tsx';
import ResearcherLayout from './components/ResearcherLayout.tsx';
import Dashboard from './pages/researcher/Dashboard.tsx';
import ResearcherDashboard from './app/(researcher)/dashboard/page.tsx';
import Programs from './pages/researcher/Programs.tsx';
import ProgramDetail from './pages/researcher/ProgramDetail.tsx';
import Leaderboard from './pages/researcher/Leaderboard.tsx';
import SubmitReport from './pages/researcher/SubmitReport.tsx';
import ReportDetail from './pages/researcher/ReportDetail.tsx';
import MyReports from './pages/researcher/MyReports.tsx';
import Profile from './pages/researcher/Profile.tsx';
import UserSettings from './pages/shared/UserSettings.tsx';
import Rewards from './pages/researcher/Rewards.tsx';
import OrgLayout from './components/OrgLayout.tsx';
import OrgOverview from './pages/org/Overview.tsx';
import OrgPrograms from './pages/org/OrgPrograms.tsx';
import ProgramWizard from './pages/org/ProgramWizard.tsx';
import ProgramSettings from './pages/org/ProgramSettings.tsx';
import OrgMembers from './pages/org/Members.tsx';
import OrgSettings from './pages/org/OrgSettings.tsx';
import OrgIntegrations from './pages/org/OrgIntegrations.tsx';
import TriageQueue from './pages/org/TriageQueue.tsx';
import TriageReport from './pages/org/TriageReport.tsx';
import OrgAnalytics from './pages/org/OrgAnalytics.tsx';
import OrgRewards from './pages/org/OrgRewards.tsx';
import AdminLayout from './components/AdminLayout.tsx';
import AdminDashboard from './pages/admin/AdminDashboard.tsx';
import AdminUsers from './pages/admin/AdminUsers.tsx';
import AdminOrganizations from './pages/admin/AdminOrganizations.tsx';
import AdminPrograms from './pages/admin/AdminPrograms.tsx';
import AdminProgramDetail from './pages/admin/AdminProgramDetail.tsx';
import AdminAuditLogs from './pages/admin/AdminAuditLogs.tsx';
import AdminQueues from './pages/admin/AdminQueues.tsx';
import AdminFeatureFlags from './pages/admin/AdminFeatureFlags.tsx';
import AdminSystemHealth from './pages/admin/AdminSystemHealth.tsx';
import AdminAnnouncements from './pages/admin/AdminAnnouncements.tsx';
import AdminVerifications from './pages/admin/AdminVerifications.tsx';
import { AuthGuard } from './components/AuthGuard';
import { FullPageSpinner } from './components/LoadingSpinner';
import { hydrateBackendDataForPath } from './lib/backend-bridge';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30s balance freshness vs requests
      retry: 1,
    },
  },
});

function BackendDataBridge({ onHydrated }: { onHydrated: Dispatch<SetStateAction<number>> }) {
  const location = useLocation();

  useEffect(() => {
    let active = true;

    (async () => {
      await hydrateBackendDataForPath(location.pathname);
      if (active) onHydrated((v) => v + 1);
    })();

    return () => {
      active = false;
    };
  }, [location.pathname, onHydrated]);

  return null;
}

const App = () => {
  const [, setHydrationVersion] = useState(0);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <BackendDataBridge onHydrated={setHydrationVersion} />
            <Suspense fallback={<FullPageSpinner />}>
              <Routes>
                <Route path="/" element={<Index />} />
                {/* Auth routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/2fa" element={<TwoFactor />} />
                <Route path="/auth/callback" element={<OAuthCallback />} />
                <Route path="/auth/error" element={<Login />} />
                <Route path="/invites/accept" element={<InvitesAccept />} />
                {/* Onboarding routes */}
                <Route path="/onboarding" element={<OnboardingChoice />} />
                <Route path="/onboarding/pending" element={<OnboardingPending />} />
                <Route path="/onboarding/verify" element={<OnboardingVerify />} />
                {/* Researcher routes */}
                <Route element={<AuthGuard allowedTarget="RESEARCHER" />}>
                  <Route element={<ResearcherLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/dashboard/new" element={<ResearcherDashboard />} />
                    <Route path="/programs" element={<Programs />} />
                    <Route path="/programs/:slug" element={<ProgramDetail />} />
                    <Route path="/programs/:slug/submit" element={<SubmitReport />} />
                    <Route path="/reports" element={<MyReports />} />
                    <Route path="/reports/:id" element={<ReportDetail />} />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/profile/:username" element={<Profile />} />
                    <Route path="/settings" element={<UserSettings />} />
                    <Route path="/rewards" element={<Rewards />} />
                  </Route>
                </Route>
                {/* Org routes */}
                <Route element={<AuthGuard allowedTarget="COMPANY" />}>
                  <Route element={<OrgLayout />}>
                    <Route path="/org/:orgSlug" element={<OrgOverview />} />
                    <Route path="/org/:orgSlug/programs" element={<OrgPrograms />} />
                    <Route path="/org/:orgSlug/programs/new" element={<ProgramWizard />} />
                    <Route
                      path="/org/:orgSlug/programs/:programSlug/settings"
                      element={<ProgramSettings />}
                    />
                    <Route
                      path="/org/:orgSlug/programs/:programSlug/assets"
                      element={<Navigate to="../settings" replace />}
                    />
                    <Route path="/org/:orgSlug/members" element={<OrgMembers />} />
                    <Route path="/org/:orgSlug/settings" element={<OrgSettings />} />
                    <Route path="/org/:orgSlug/user-settings" element={<UserSettings />} />
                    <Route path="/org/:orgSlug/integrations" element={<OrgIntegrations />} />
                    <Route path="/org/:orgSlug/billing" element={<OrgSettings />} />
                    <Route path="/org/:orgSlug/triage" element={<TriageQueue />} />
                    <Route path="/org/:orgSlug/triage/:reportId" element={<TriageReport />} />
                    <Route path="/org/:orgSlug/analytics" element={<OrgAnalytics />} />
                    <Route path="/org/:orgSlug/rewards" element={<OrgRewards />} />
                  </Route>
                </Route>
                {/* Admin routes */}
                <Route element={<AuthGuard allowedTarget="ADMIN" />}>
                  <Route element={<AdminLayout />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/users" element={<AdminUsers />} />
                    <Route path="/admin/organizations" element={<AdminOrganizations />} />
                    <Route path="/admin/programs" element={<AdminPrograms />} />
                    <Route path="/admin/programs/:id" element={<AdminProgramDetail />} />
                    <Route path="/admin/reports" element={<AdminDashboard />} />
                    <Route path="/admin/payouts" element={<AdminDashboard />} />
                    <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
                    <Route path="/admin/queues" element={<AdminQueues />} />
                    <Route path="/admin/feature-flags" element={<AdminFeatureFlags />} />
                    <Route path="/admin/announcements" element={<AdminAnnouncements />} />
                    <Route path="/admin/verifications" element={<AdminVerifications />} />
                    <Route path="/admin/system-health" element={<AdminSystemHealth />} />
                  </Route>
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
