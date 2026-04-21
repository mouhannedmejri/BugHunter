import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, Clock, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface OrgInfo {
  slug: string;
  name: string;
  verificationStatus: string;
}

const OnboardingPending = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrgInfo = async () => {
      if (!user?.orgMemberships || user.orgMemberships.length === 0) {
        navigate('/onboarding');
        return;
      }

      try {
        const orgSlug = user.orgMemberships[0].org.slug;
        const orgData = await api.get<{ data: OrgInfo }>(`/organizations/${orgSlug}`);
        setOrg(orgData.data);
      } catch (err) {
        toast.error('Failed to load organization');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchOrgInfo();
    }
  }, [user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || user.onboardingStep !== 'PENDING_ORG_APPROVAL' || !org) {
    return null;
  }

  const status = org.verificationStatus as 'PENDING' | 'SUBMITTED' | 'REJECTED';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Organization Verification</h1>
          <p className="text-muted-foreground">{org.name}</p>
        </div>

        {status === 'PENDING' && (
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardHeader className="flex flex-row items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-yellow-700">Verification Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-yellow-700/80">
                Complete your verification form to unlock your organization.
              </p>
              <Button asChild className="w-full">
                <Link to="/onboarding/verify">Complete Verification</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {status === 'SUBMITTED' && (
          <Card className="border-blue-500/50 bg-blue-500/5">
            <CardHeader className="flex flex-row items-center gap-3">
              <Clock className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-blue-700">Under Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center py-4">
                <CheckCircle2 className="h-16 w-16 text-blue-500 animate-pulse" />
              </div>
              <p className="text-sm text-center text-blue-700/80">
                Verification submitted — under review by our team.
                <br />
                Usually within 2 business days.
              </p>
              <p className="text-sm text-center text-muted-foreground">
                We'll email you when approved.
              </p>
            </CardContent>
          </Card>
        )}

        {status === 'REJECTED' && (
          <Card className="border-red-500/50 bg-red-500/5">
            <CardHeader className="flex flex-row items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <CardTitle className="text-red-700">Verification Not Approved</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-700">
                  Your verification was not approved. Please review the reason below and resubmit.
                </p>
              </div>
              <Button asChild className="w-full">
                <Link to="/onboarding/verify">Resubmit Verification</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-2 text-center text-sm">
          <Link
            to="/notifications"
            className="text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1"
          >
            <ExternalLink className="h-4 w-4" />
            Check your notifications for updates
          </Link>

          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
            Continue browsing as researcher
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPending;
