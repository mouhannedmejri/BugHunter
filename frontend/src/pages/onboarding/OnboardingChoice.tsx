import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
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

  const onSkipAsResearcher = async () => {
    setIsSubmitting(true);
    try {
      const result = await api.skipOnboarding();

      if (user) {
        setUser({ ...user, onboardingStep: result.onboardingStep });
      }

      toast.success('Welcome to BugHuntr!');
      navigate('/dashboard');
    } catch (err) {
      toast.error('Failed to continue');
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
            Welcome to BugHuntr — how would you like to get started?
          </h1>
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
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Shield className="h-6 w-6 text-green-500" />
                </div>
                <CardTitle className="text-lg">Join as a Researcher</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                Hunt for bugs on existing programs. Check your notifications for organization
                invitations.
              </CardDescription>
              <Button
                className="w-full"
                variant="outline"
                onClick={onSkipAsResearcher}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Continue as Researcher
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          You can also accept an invitation from an organization via your notification bell.
        </p>
      </div>
    </div>
  );
};

export default OnboardingChoice;
