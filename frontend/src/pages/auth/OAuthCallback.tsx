import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

/**
 * OAuth callback page — the backend redirects here with ?token=<accessToken>.
 * We store the token in the auth store and redirect to /dashboard.
 */
const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser, refresh } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // We have the access token from OAuth redirect.
    // Store it and attempt a refresh to get user data + set refresh cookie.
    // For now, decode the JWT to extract basic user info.
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userData = {
        id: payload.sub,
        email: payload.email,
        username: payload.email.split('@')[0],
        displayName: payload.email.split('@')[0],
        platformRole: payload.platformRole,
        totpEnabled: false,
        onboardingStep: payload.onboardingStep || 'COMPLETE',
      };

      setUser(userData, token);

      // Check onboarding status and redirect accordingly
      if (userData.onboardingStep === 'CHOOSE_PATH') {
        navigate('/onboarding');
      } else if (userData.onboardingStep === 'PENDING_ORG_APPROVAL') {
        navigate('/onboarding/pending');
      } else {
        navigate('/dashboard');
      }
    } catch {
      navigate('/login');
    }
  }, [searchParams, navigate, setUser, refresh]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

export default OAuthCallback;
