import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Loader2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';
import { api, apiPaths } from '@/lib/api';
import { toast } from 'sonner';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

const orgNameSchema = z.object({
  orgName: z.string().min(1, 'Organization name is required').max(200),
  orgSlug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

type OrgNameForm = z.infer<typeof orgNameSchema>;

const OnboardingChoice = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteToken, setInviteToken] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OrgNameForm>({
    resolver: zodResolver(orgNameSchema),
    defaultValues: {
      orgName: '',
      orgSlug: '',
    },
  });

  const orgNameValue = watch('orgName');

  const handleOrgNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setValue('orgName', name);
    if (!showOrgForm || watch('orgSlug')) return;
    const slug = generateSlug(name);
    setValue('orgSlug', slug);
  };

  const onCreateOrg = async (data: OrgNameForm) => {
    setIsSubmitting(true);
    try {
      const result = await api.createOrgOnboarding({
        orgName: data.orgName,
        orgSlug: data.orgSlug || undefined,
      });

      if (user) {
        setUser({
          ...user,
          onboardingStep: 'PENDING_ORG_APPROVAL',
          orgMemberships: [{ org: { slug: result.org.slug } }],
        });
      }

      toast.success('Organization created!');
      navigate('/onboarding/pending');
    } catch (err) {
      toast.error('Failed to create organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onAcceptInviteCode = async () => {
    const token = inviteToken.trim();
    if (!token) {
      toast.error('Please paste your invitation code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await api.post<{ orgSlug: string; role: string }>(apiPaths.invites.accept(token));

      if (user) {
        setUser({
          ...user,
          onboardingStep: 'COMPLETE',
          orgMemberships: [{ org: { slug: result.orgSlug } }],
        });
      }

      toast.success('Invitation accepted.');
      navigate(`/org/${result.orgSlug}`);
    } catch (err) {
      toast.error('Failed to accept invitation code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user || user.onboardingStep !== 'CHOOSE_PATH') {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Organization onboarding
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose one: create a new organization, or join an existing one using your unique invite
            link/code.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card
            className="hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => !showOrgForm && setShowOrgForm(true)}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Create an Organization</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                Run your own bug bounty programs. Invite researchers, manage reports, and pay out
                rewards.
              </CardDescription>
              {showOrgForm ? (
                <form onSubmit={handleSubmit(onCreateOrg)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="orgName">Organization Name</Label>
                    <Input
                      id="orgName"
                      placeholder="Acme Corp"
                      {...register('orgName')}
                      onChange={handleOrgNameChange}
                    />
                    {errors.orgName && (
                      <p className="text-sm text-destructive">{errors.orgName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orgSlug">URL Slug</Label>
                    <Input id="orgSlug" placeholder="acme-corp" {...register('orgSlug')} />
                    {errors.orgSlug && (
                      <p className="text-sm text-destructive">{errors.orgSlug.message}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Create Organization
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowOrgForm(false);
                    }}
                  >
                    Cancel
                  </Button>
                </form>
              ) : (
                <Button className="w-full" variant="secondary">
                  Create Organization
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <KeyRound className="h-6 w-6 text-blue-500" />
                </div>
                <CardTitle className="text-lg">Join Existing Organization</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                Paste your organization invitation code/token. Invite links are unique and can be
                bound to your account.
              </CardDescription>
              <div className="space-y-3">
                <Input
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                  placeholder="Paste invite token"
                />
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={onAcceptInviteCode}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Accept Invitation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          You can also open your invite URL directly from email/notifications.
        </p>
      </div>
    </div>
  );
};

export default OnboardingChoice;
