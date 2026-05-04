import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import OAuthButtons from '@/components/OAuthButtons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';
import type { ApiError } from '@/lib/api';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      const user = useAuthStore.getState().user;
      const redirectTo = (location.state as { from?: { pathname?: string; search?: string } } | null)
        ?.from;

      if (redirectTo?.pathname?.startsWith('/invites/accept')) {
        navigate(`${redirectTo.pathname}${redirectTo.search ?? ''}`, { replace: true });
        return;
      }

      if (user?.onboardingStep === 'CHOOSE_PATH') {
        navigate('/onboarding');
        return;
      }

      if (user?.onboardingStep === 'PENDING_ORG_APPROVAL') {
        navigate('/onboarding/pending');
        return;
      }

      if (user?.platformRole === 'SUPER_ADMIN') {
        navigate('/admin');
      } else if (user?.orgMemberships && user.orgMemberships.length > 0) {
        navigate(`/org/${user.orgMemberships[0].org.slug}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const error = err as ApiError;
      if (error.message === 'Please verify your email before signing in') {
        toast.error('Please verify your email before signing in.');
        navigate('/verify-email');
        return;
      }
      if (error.message === 'TOTP code required') {
        navigate('/2fa', { state: { email: data.email, password: data.password } });
        return;
      }
      toast.error(error.message || 'Login failed');
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your BugHuntr account">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <OAuthButtons />

        <div className="my-6 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            or
          </span>
          <Separator className="flex-1" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="h-11 w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign in
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link to="/register" className="font-medium text-primary hover:underline">
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Login;
